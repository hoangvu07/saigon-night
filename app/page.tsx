// app/page.tsx - Saigon Night Audio Mixer - FINAL VERSION
'use client';
import { useState, useEffect, useRef } from 'react';

const TRACKS = [
  { id: 'rain', name: 'Mưa nhẹ', icon: '🌧️', src: 'https://www.myinstants.com/media/sounds/rain.mp3' },
  { id: 'forest', name: 'Rừng đêm', icon: '🌲', src: 'https://www.myinstants.com/media/sounds/forest-ambience.mp3' },
  { id: 'ocean', name: 'Sóng biển', icon: '🌊', src: 'https://www.myinstants.com/media/sounds/ocean-waves.mp3' },
  { id: 'thunder', name: 'Mưa dông', icon: '⛈️', src: 'https://www.myinstants.com/media/sounds/thunderstorm.mp3' },
  { id: 'city', name: 'Phố xá', icon: '🏙️', src: 'https://www.myinstants.com/media/sounds/city-ambience.mp3' },
  { id: 'cafe', name: 'Quán cafe', icon: '☕', src: 'https://www.myinstants.com/media/sounds/cafe-ambient.mp3' },
  { id: 'white', name: 'White Noise', icon: '🔇', src: '', type: 'noise' },
  { id: 'piano', name: 'Piano', icon: '🎹', src: 'https://www.myinstants.com/media/sounds/piano-meditation.mp3' },
];

export default function Home() {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [masterVol, setMasterVol] = useState(0.7);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const noiseContexts = useRef<Map<string, AudioContext>>(new Map());
  const noiseNodes = useRef<Map<string, any>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  useEffect(() => {
    TRACKS.forEach(track => {
      if (track.type !== 'noise') {
        const audio = new Audio(track.src);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0.5;
        audioRefs.current.set(track.id, audio);
      }
      setVolumes(prev => ({ ...prev, [track.id]: 0.5 }));
    });

    return () => {
      cleanupAll();
    };
  }, []);

  // Sleep timer
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
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sleepTimer]);

  const cleanupAll = () => {
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    noiseNodes.current.forEach(node => {
      try { node.stop(); } catch(e) {}
    });
    noiseContexts.current.forEach(ctx => {
      try { ctx.close(); } catch(e) {}
    });
    audioRefs.current.clear();
    noiseNodes.current.clear();
    noiseContexts.current.clear();
  };

  const toggleTrack = async (track: any) => {
    const isActive = active.has(track.id);

    if (isActive) {
      // Stop
      if (track.type === 'noise') {
        const node = noiseNodes.current.get(track.id);
        const ctx = noiseContexts.current.get(track.id);
        if (node) { try { node.stop(); } catch(e) {} }
        if (ctx) { try { ctx.close(); } catch(e) {} }
        noiseNodes.current.delete(track.id);
        noiseContexts.current.delete(track.id);
      } else {
        const audio = audioRefs.current.get(track.id);
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
      setActive(prev => {
        const newSet = new Set(prev);
        newSet.delete(track.id);
        return newSet;
      });
    } else {
      // Play
      if (track.type === 'noise') {
        // White Noise generator
        const ctx = new AudioContext();
        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;
        
        const gainNode = ctx.createGain();
        gainNode.gain.value = (volumes[track.id] || 0.5) * masterVol * 0.3;
        
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
            audio.volume = (volumes[track.id] || 0.5) * masterVol;
            await audio.play();
          } catch (err) {
            console.error('Playback error:', err);
            alert('Click lại nút để phát âm thanh');
            return;
          }
        }
      }
      setActive(prev => new Set(prev).add(track.id));
    }
  };

  const changeVolume = (trackId: string, value: number) => {
    setVolumes(prev => ({ ...prev, [trackId]: value }));
    
    const audio = audioRefs.current.get(trackId);
    if (audio && active.has(trackId)) {
      audio.volume = value * masterVol;
    }
    
    const node = noiseNodes.current.get(trackId) as any;
    if (node && node.gainNode && active.has(trackId)) {
      node.gainNode.gain.value = value * masterVol * 0.3;
    }
  };

  const changeMasterVolume = (value: number) => {
    setMasterVol(value);
    
    TRACKS.forEach(track => {
      if (active.has(track.id)) {
        if (track.type === 'noise') {
          const node = noiseNodes.current.get(track.id) as any;
          if (node && node.gainNode) {
            node.gainNode.gain.value = (volumes[track.id] || 0.5) * value * 0.3;
          }
        } else {
          const audio = audioRefs.current.get(track.id);
          if (audio) {
            audio.volume = (volumes[track.id] || 0.5) * value;
          }
        }
      }
    });
  };

  const stopAll = () => {
    cleanupAll();
    setActive(new Set());
    setSleepTimer(null);
    setTimerRemaining(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030712 0%, #1e1b4b 50%, #3b0764 100%)',
      color: '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '2rem 1rem',
      paddingBottom: '120px'
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', padding: '2rem 0' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          background: 'linear-gradient(90deg, #818cf8, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem'
        }}>
          Saigon Night 🌙
        </h1>
        <p style={{ color: '#9ca3af' }}>Trộn âm thanh • Thư giãn • Ngủ ngon</p>
      </header>

      {/* Sleep Timer */}
      <div style={{ maxWidth: '600px', margin: '0 auto 2rem', background: 'rgba(31,41,55,0.5)', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: 500 }}>
          ⏱️ Sleep Timer
          {timerRemaining && (
            <span style={{ float: 'right', color: '#818cf8', fontFamily: 'monospace' }}>
              {formatTime(timerRemaining)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[15, 30, 45, 60].map(mins => (
            <button
              key={mins}
              onClick={() => setSleepTimer(sleepTimer === mins ? null : mins)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '8px',
                background: sleepTimer === mins ? '#6366f1' : '#374151',
                color: sleepTimer === mins ? 'white' : '#d1d5db',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {mins}m
            </button>
          ))}
          {sleepTimer && (
            <button
              onClick={() => { setSleepTimer(null); setTimerRemaining(null); }}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '8px',
                background: 'rgba(220,38,38,0.5)',
                color: '#fca5a5',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      {/* Master Volume */}
      <div style={{ maxWidth: '600px', margin: '0 auto 2rem', background: 'rgba(31,41,55,0.5)', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
          <span>🎚️ Master Volume</span>
          <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{Math.round(masterVol * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={masterVol}
          onChange={(e) => changeMasterVolume(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#818cf8', cursor: 'pointer' }}
        />
      </div>

      {/* Audio Tracks Grid */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem'
      }}>
        {TRACKS.map(track => {
          const isActive = active.has(track.id);
          return (
            <div
              key={track.id}
              onClick={() => toggleTrack(track)}
              style={{
                background: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(31,41,55,0.5)',
                border: `2px solid ${isActive ? '#818cf8' : '#374151'}`,
                borderRadius: '16px',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 10px 30px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{track.icon}</div>
              <div style={{ fontWeight: 500, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{track.name}</div>
              
              {isActive && (
                <div onClick={e => e.stopPropagation()}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volumes[track.id] || 0.5}
                    onChange={(e) => changeVolume(track.id, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#818cf8', cursor: 'pointer' }}
                  />
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.75rem', 
                    color: '#9ca3af',
                    marginTop: '0.25rem'
                  }}>
                    <span>Vol</span>
                    <span>{Math.round((volumes[track.id] || 0.5) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed Bottom Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(17,24,39,0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid #374151',
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              {active.size}/8 tracks active
            </span>
            {timerRemaining && (
              <span style={{
                color: '#818cf8',
                fontFamily: 'monospace',
                marginLeft: '1rem',
                fontSize: '0.9rem'
              }}>
                ⏱️ {formatTime(timerRemaining)}
              </span>
            )}
          </div>
          <button
            onClick={stopAll}
            disabled={active.size === 0}
            style={{
              padding: '0.75rem 2rem',
              border: 'none',
              borderRadius: '12px',
              background: active.size > 0 ? '#dc2626' : '#4b5563',
              color: 'white',
              fontWeight: 600,
              cursor: active.size > 0 ? 'pointer' : 'not-allowed',
              opacity: active.size === 0 ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            ⏹ Stop All
          </button>
        </div>
      </div>
    </div>
  );
}