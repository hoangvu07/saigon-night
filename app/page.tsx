// app/page.tsx - Saigon Night Audio Mixer
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const TRACKS = [
  { id: 'suoi1', name: 'Suối 02', icon: '💧', src: '/sounds/back_suoi_02.mp3', type: 'file' },
  { id: 'suoi2', name: 'Suối 03', icon: '🌊', src: '/sounds/back_suoi_03.mp3', type: 'file' },
  { id: 'chim1', name: 'Chim hót', icon: '🐦', src: '/sounds/effect_chim-hot_02.mp3', type: 'file' },
  { id: 'pho1', name: 'Phố xá', icon: '🏙️', src: '/sounds/effect_pho_01.mp3', type: 'file' },
  { id: 'cafe1', name: 'Cafe', icon: '☕', src: '/sounds/back_suoi_06.mp3', type: 'file' },
  { id: 'white', name: 'White Noise', icon: '🔇', src: '', type: 'noise' },
  { id: 'thunder', name: 'Mưa dông', icon: '⛈️', src: '/sounds/back_suoi_04.mp3', type: 'file' },
  { id: 'contrung', name: 'Côn trùng', icon: '🦗', src: '/sounds/effect_contrung_01.wav', type: 'file' },
];

export default function Home() {
  const [trackStates, setTrackStates] = useState<Record<string, any>>({});
  const [masterVolume, setMasterVolume] = useState(1);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [savedMixes, setSavedMixes] = useState<string[]>([]);
  const [currentMixName, setCurrentMixName] = useState('');

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const noiseContexts = useRef<Map<string, AudioContext>>(new Map());
  const noiseNodes = useRef<Map<string, any>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('saigon-night-mix');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.trackStates) setTrackStates(parsed.trackStates);
        if (parsed.masterVolume) setMasterVolume(parsed.masterVolume);
      } catch (e) { console.error(e); }
    }
    const savedMixesList = localStorage.getItem('saigon-night-saved-mixes');
    if (savedMixesList) setSavedMixes(JSON.parse(savedMixesList));

    TRACKS.forEach(track => {
      if (!trackStates[track.id]) {
        setTrackStates(prev => ({ ...prev, [track.id]: { isPlaying: false, volume: 0.5 } }));
      }
      if (track.type === 'file' && track.src) {
        const audio = new Audio(track.src);
        audio.loop = true;
        audioRefs.current.set(track.id, audio);
      }
    });
    return () => cleanupAll();
  }, []);

  useEffect(() => {
    localStorage.setItem('saigon-night-mix', JSON.stringify({ trackStates, masterVolume }));
  }, [trackStates, masterVolume]);

  useEffect(() => {
    if (sleepTimer && sleepTimer > 0) {
      setTimerRemaining(sleepTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev === null || prev <= 1) {
            stopAll();
            setSleepTimer(null);
            if (timerRef.current) clearInterval(timerRef.current);
            return null;
          }
          return prev! - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sleepTimer]);

  const cleanupAll = useCallback(() => {
    audioRefs.current.forEach(audio => { audio.pause(); audio.currentTime = 0; });
    noiseNodes.current.forEach(node => { try { node.stop(); } catch(e) {} });
    noiseContexts.current.forEach(ctx => ctx.close());
  }, []);

  const toggleTrack = useCallback(async (track: any) => {
    const currentState = trackStates[track.id] || { isPlaying: false, volume: 0.5 };
    if (currentState.isPlaying) {
      if (track.type === 'noise') {
        const node = noiseNodes.current.get(track.id);
        const ctx = noiseContexts.current.get(track.id);
        if (node) { try { node.stop(); } catch(e) {} }
        if (ctx) ctx.close();
      } else {
        const audio = audioRefs.current.get(track.id);
        if (audio) { audio.pause(); audio.currentTime = 0; }
      }
      setTrackStates(prev => ({ ...prev, [track.id]: { ...currentState, isPlaying: false } }));
    } else {
      if (track.type === 'noise') {
        const ctx = new AudioContext();
        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;
        const gainNode = ctx.createGain();
        gainNode.gain.value = currentState.volume * masterVolume * 0.3;
        whiteNoise.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();
        noiseNodes.current.set(track.id, whiteNoise);
        noiseContexts.current.set(track.id, ctx);
        (whiteNoise as any).gainNode = gainNode;
      } else {
        const audio = audioRefs.current.get(track.id);
        if (audio) {
          try {
            audio.volume = currentState.volume * masterVolume;
            await audio.play();
          } catch (err) { console.warn(err); return; }
        }
      }
      setTrackStates(prev => ({ ...prev, [track.id]: { ...currentState, isPlaying: true } }));
    }
  }, [trackStates, masterVolume]);

  const changeVolume = useCallback((trackId: string, value: number) => {
    setTrackStates(prev => ({ ...prev, [trackId]: { ...prev[trackId], volume: value } }));
    const audio = audioRefs.current.get(trackId);
    if (audio) audio.volume = value * masterVolume;
    const node = noiseNodes.current.get(trackId) as any;
    if (node && node.gainNode) node.gainNode.gain.value = value * masterVolume * 0.3;
  }, [masterVolume]);

  const changeMasterVolume = useCallback((value: number) => {
    setMasterVolume(value);
    TRACKS.forEach(track => {
      const state = trackStates[track.id];
      if (state?.isPlaying) {
        if (track.type === 'noise') {
          const node = noiseNodes.current.get(track.id) as any;
          if (node && node.gainNode) node.gainNode.gain.value = state.volume * value * 0.3;
        } else {
          const audio = audioRefs.current.get(track.id);
          if (audio) audio.volume = state.volume * value;
        }
      }
    });
  }, [trackStates]);

  const stopAll = useCallback(() => {
    cleanupAll();
    setTrackStates(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => newState[key] = { ...newState[key], isPlaying: false });
      return newState;
    });
    setSleepTimer(null);
    setTimerRemaining(null);
  }, [cleanupAll]);

  const saveMix = useCallback(() => {
    if (!currentMixName.trim()) return;
    const mixData = { name: currentMixName, trackStates, masterVolume, savedAt: new Date().toISOString() };
    const existingMixes = JSON.parse(localStorage.getItem('saigon-night-saved-mixes') || '[]');
    const updatedMixes = [...existingMixes, mixData];
    localStorage.setItem('saigon-night-saved-mixes', JSON.stringify(updatedMixes));
    setSavedMixes(updatedMixes.map((m: any) => m.name));
    setCurrentMixName('');
    alert('Đã lưu mix!');
  }, [currentMixName, trackStates, masterVolume]);

  const loadMix = useCallback((mixName: string) => {
    const existingMixes = JSON.parse(localStorage.getItem('saigon-night-saved-mixes') || '[]');
    const mix = existingMixes.find((m: any) => m.name === mixName);
    if (mix) {
      stopAll();
      setTimeout(() => { setTrackStates(mix.trackStates); setMasterVolume(mix.masterVolume); }, 100);
    }
  }, [stopAll]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activeTracksCount = Object.values(trackStates).filter((s: any) => s.isPlaying).length;

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030712 0%, #1e1b4b 50%, #3b0764 100%)',
      color: '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '2rem 1rem',
      paddingBottom: '120px'
    },
    header: { textAlign: 'center' as const, padding: '3rem 0' },
    h1: {
      fontSize: '3rem',
      fontWeight: 700,
      background: 'linear-gradient(90deg, #818cf8, #c084fc)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      marginBottom: '0.5rem'
    },
    subtitle: { color: '#9ca3af', fontSize: '1.1rem' },
    controlPanel: {
      maxWidth: '800px',
      margin: '0 auto 2rem',
      background: 'rgba(31, 41, 55, 0.5)',
      border: '1px solid #374151',
      borderRadius: '12px',
      padding: '1.5rem'
    },
    controlLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.75rem',
      fontSize: '0.9rem',
      fontWeight: 500
    },
    controlValue: { color: '#818cf8', fontFamily: 'monospace' },
    slider: {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      background: '#374151',
      outline: 'none',
      WebkitAppearance: 'none' as const
    },
    timerButtons: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const },
    timerBtn: (active: boolean) => ({
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '8px',
      background: active ? '#6366f1' : '#374151',
      color: active ? 'white' : '#d1d5db',
      fontSize: '0.875rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s'
    }),
    audioGrid: {
      maxWidth: '1000px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem'
    },
    audioCard: (active: boolean) => ({
      background: active ? 'rgba(99, 102, 241, 0.2)' : 'rgba(31, 41, 55, 0.5)',
      border: `2px solid ${active ? '#818cf8' : '#374151'}`,
      borderRadius: '16px',
      padding: '1.5rem 1rem',
      textAlign: 'center' as const,
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: active ? '0 10px 30px rgba(99, 102, 241, 0.3)' : 'none'
    }),
    audioIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
    audioName: { fontSize: '0.9rem', fontWeight: 500, marginBottom: '1rem' },
    bottomBar: {
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid #374151',
      padding: '1rem'
    },
    bottomContent: {
      maxWidth: '800px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    stopBtn: (disabled: boolean) => ({
      padding: '0.75rem 2rem',
      border: 'none',
      borderRadius: '12px',
      background: disabled ? '#4b5563' : '#dc2626',
      color: 'white',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1
    }),
    saveSection: {
      maxWidth: '800px',
      margin: '2rem auto',
      background: 'rgba(31, 41, 55, 0.5)',
      border: '1px solid #374151',
      borderRadius: '12px',
      padding: '1.5rem'
    },
    saveButtons: { display: 'flex', gap: '0.75rem', marginBottom: '1rem' },
    btnPrimary: {
      padding: '0.6rem 1.2rem',
      border: 'none',
      borderRadius: '8px',
      background: '#6366f1',
      color: 'white',
      fontWeight: 500,
      cursor: 'pointer'
    },
    input: {
      flex: 1,
      padding: '0.6rem 1rem',
      border: '1px solid #4b5563',
      borderRadius: '8px',
      background: '#1f2937',
      color: 'white',
      fontSize: '0.9rem'
    },
    select: {
      padding: '0.6rem 1rem',
      border: '1px solid #4b5563',
      borderRadius: '8px',
      background: '#1f2937',
      color: 'white',
      fontSize: '0.9rem',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.h1}>Saigon Night 🌙</h1>
        <p style={styles.subtitle}>Professional 8-Layer Audio Mixer</p>
      </header>

      <div style={styles.controlPanel}>
        <div style={styles.controlLabel}>
          <span>⏱️ Sleep Timer</span>
          {timerRemaining && <span style={styles.controlValue}>{formatTime(timerRemaining)}</span>}
        </div>
        <div style={styles.timerButtons}>
          {[15, 30, 45, 60].map(mins => (
            <button
              key={mins}
              onClick={() => setSleepTimer(sleepTimer === mins ? null : mins)}
              style={styles.timerBtn(sleepTimer === mins)}
            >
              {mins}m
            </button>
          ))}
          {sleepTimer && (
            <button
              onClick={() => { setSleepTimer(null); setTimerRemaining(null); }}
              style={styles.timerBtn(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={styles.controlPanel}>
        <div style={styles.controlLabel}>
          <span>🎚️ Master Volume</span>
          <span style={styles.controlValue}>{Math.round(masterVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={masterVolume}
          onChange={(e) => changeMasterVolume(parseFloat(e.target.value))}
          style={styles.slider}
        />
      </div>

      <div style={styles.audioGrid}>
        {TRACKS.map(track => {
          const state = trackStates[track.id] || { isPlaying: false, volume: 0.5 };
          return (
            <div
              key={track.id}
              onClick={() => toggleTrack(track)}
              style={styles.audioCard(state.isPlaying)}
            >
              <div style={styles.audioIcon}>{track.icon}</div>
              <div style={styles.audioName}>{track.name}</div>
              {state.isPlaying && (
                <div onClick={e => e.stopPropagation()}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={state.volume}
                    onChange={(e) => changeVolume(track.id, parseFloat(e.target.value))}
                    style={styles.slider}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    <span>Vol</span>
                    <span>{Math.round(state.volume * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.saveSection}>
        <div style={styles.saveButtons}>
          <button
            onClick={() => {
              const name = prompt('Nhập tên mix:');
              if (name) {
                setCurrentMixName(name);
                const mixData = { name, trackStates, masterVolume, savedAt: new Date().toISOString() };
                const existingMixes = JSON.parse(localStorage.getItem('saigon-night-saved-mixes') || '[]');
                const updatedMixes = [...existingMixes, mixData];
                localStorage.setItem('saigon-night-saved-mixes', JSON.stringify(updatedMixes));
                setSavedMixes(updatedMixes.map((m: any) => m.name));
                alert('Đã lưu mix!');
              }
            }}
            style={styles.btnPrimary}
          >
            💾 Save Mix
          </button>
          {savedMixes.length > 0 && (
            <select
              onChange={(e) => e.target.value && loadMix(e.target.value)}
              defaultValue=""
              style={styles.select}
            >
              <option value="">📂 Load Mix...</option>
              {savedMixes.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={styles.bottomBar}>
        <div style={styles.bottomContent}>
          <div>
            <span>{activeTracksCount}/8 tracks active</span>
            {timerRemaining && <span style={{ color: '#818cf8', fontFamily: 'monospace', marginLeft: '1rem' }}>⏱️ {formatTime(timerRemaining)}</span>}
          </div>
          <button
            onClick={stopAll}
            disabled={activeTracksCount === 0}
            style={styles.stopBtn(activeTracksCount === 0)}
          >
            ⏹ Stop All
          </button>
        </div>
      </div>
    </div>
  );
}