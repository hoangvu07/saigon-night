// app/page.tsx - Saigon Night Audio Mixer (FULL VERSION)
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ✅ KHỚP CHÍNH XÁC TÊN FILE TRONG public/sounds/
const TRACKS = [
  { id: 'suoi1', name: 'Suối 02', icon: '💧', src: '/sounds/back_suoi_02.mp3' },
  { id: 'suoi2', name: 'Suối 03', icon: '', src: '/sounds/back_suoi_03.mp3' },
  { id: 'mua',   name: 'Mưa dông', icon: '⛈️', src: '/sounds/back_suoi_04.mp3' },
  { id: 'cafe',  name: 'Cafe',     icon: '☕', src: '/sounds/back_suoi_06.mp3' },
  { id: 'suoi5', name: 'Suối 07', icon: '️', src: '/sounds/back_suoi_07.mp3' },
  { id: 'chim1', name: 'Chim 02', icon: '🐦', src: '/sounds/effect_chim-hot_02.mp3' },
  { id: 'chim2', name: 'Chim 04', icon: '🕊️', src: '/sounds/effect_chim-hot_04.mp3' },
  { id: 'pho',   name: 'Phố xá',  icon: '🏙️', src: '/sounds/effect_pho_01.mp3' },
];

export default function Home() {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [masterVol, setMasterVol] = useState(0.7);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [savedMixes, setSavedMixes] = useState<string[]>([]);
  const [mixName, setMixName] = useState('');

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const noiseCtx = useRef<Map<string, AudioContext>>(new Map());
  const noiseNodes = useRef<Map<string, any>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Khởi tạo audio & load mix đã lưu
  useEffect(() => {
    const saved = localStorage.getItem('saigon-night-mix');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.trackStates) setActive(new Set(Object.keys(parsed.trackStates).filter(k => parsed.trackStates[k])));
        if (parsed.masterVolume) setMasterVol(parsed.masterVolume);
      } catch (e) { console.error(e); }
    }
    const savedMixesList = localStorage.getItem('saigon-night-saved-mixes');
    if (savedMixesList) setSavedMixes(JSON.parse(savedMixesList));

    TRACKS.forEach(track => {
      if (!volumes[track.id]) setVolumes(prev => ({ ...prev, [track.id]: 0.5 }));
      if (track.src) {
        const audio = new Audio(track.src);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0.35; // Khởi tạo volume an toàn
        audioRefs.current.set(track.id, audio);
      }
    });
    return () => cleanupAll();
  }, []);

  // Auto-save trạng thái
  useEffect(() => {
    localStorage.setItem('saigon-night-mix', JSON.stringify({
      trackStates: Object.fromEntries(TRACKS.map(t => [t.id, active.has(t.id)])),
      masterVolume: masterVol
    }));
  }, [active, masterVol]);

  // Sleep Timer
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
    audioRefs.current.forEach(a => { a.pause(); a.currentTime = 0; });
    noiseNodes.current.forEach(n => { try { n.stop(); } catch(e){} });
    noiseCtx.current.forEach(c => { try { c.close(); } catch(e){} });
  };

  const toggleTrack = async (track: any) => {
    console.log(`🔊 Toggle: ${track.name} | Path: ${track.src}`);
    if (active.has(track.id)) {
      // STOP
      if (track.src) {
        const a = audioRefs.current.get(track.id);
        if (a) { a.pause(); a.currentTime = 0; }
      }
      setActive(prev => { const s = new Set(prev); s.delete(track.id); return s; });
    } else {
      // PLAY
      if (track.src) {
        const a = audioRefs.current.get(track.id);
        if (a) {
          try {
            a.volume = (volumes[track.id] || 0.5) * masterVol;
            await a.play();
            console.log(`✅ Playing: ${track.name}`);
          } catch (err) {
            console.warn('⚠️ Click lại để phát (browser policy):', err);
          }
        }
      }
      setActive(prev => new Set(prev).add(track.id));
    }
  };

  const changeVolume = (id: string, v: number) => {
    setVolumes(prev => ({ ...prev, [id]: v }));
    const a = audioRefs.current.get(id);
    if (a && active.has(id)) a.volume = v * masterVol;
  };

  const changeMaster = (v: number) => {
    setMasterVol(v);
    TRACKS.forEach(t => {
      if (active.has(t.id) && t.src) {
        const a = audioRefs.current.get(t.id);
        if (a) a.volume = (volumes[t.id] || 0.5) * v;
      }
    });
  };

  const stopAll = () => {
    cleanupAll();
    setActive(new Set());
    setSleepTimer(null);
    setTimerRemaining(null);
  };

  const saveMix = () => {
    if (!mixName.trim()) return;
    const mixData = { name: mixName, active: Array.from(active), masterVol, savedAt: new Date().toISOString() };
    const existing = JSON.parse(localStorage.getItem('saigon-night-saved-mixes') || '[]');
    const updated = [...existing, mixData];
    localStorage.setItem('saigon-night-saved-mixes', JSON.stringify(updated));
    setSavedMixes(updated.map((m: any) => m.name));
    setMixName('');
    alert('💾 Đã lưu mix!');
  };

  const loadMix = (name: string) => {
    const existing = JSON.parse(localStorage.getItem('saigon-night-saved-mixes') || '[]');
    const mix = existing.find((m: any) => m.name === name);
    if (mix) {
      stopAll();
      setTimeout(() => {
        setActive(new Set(mix.active));
        setMasterVol(mix.masterVol);
        // Phát lại các track đã active
        mix.active.forEach((id: string) => {
          const track = TRACKS.find(t => t.id === id);
          if (track && track.src) {
            const a = audioRefs.current.get(id);
            if (a) {
              a.volume = (volumes[id] || 0.5) * mix.masterVol;
              a.play().catch(()=>{});
            }
          }
        });
      }, 100);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  // Inline Styles
  const S = {
    page: { minHeight: '100vh', background: 'linear-gradient(180deg, #030712 0%, #1e1b4b 50%, #3b0764 100%)', color: '#f3f4f6', fontFamily: 'system-ui, sans-serif', padding: '2rem 1rem', paddingBottom: '100px' },
    header: { textAlign: 'center', padding: '2rem 0' },
    h1: { fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(90deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 },
    sub: { color: '#9ca3af', marginTop: '0.5rem' },
    panel: { maxWidth: '600px', margin: '0 auto 1.5rem', background: 'rgba(31,41,55,0.5)', borderRadius: '12px', padding: '1rem', border: '1px solid #374151' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 },
    slider: { width: '100%', accentColor: '#818cf8', cursor: 'pointer' },
    btn: (active: boolean) => ({ padding: '0.4rem 0.8rem', border: 'none', borderRadius: '6px', background: active ? '#6366f1' : '#374151', color: active ? '#fff' : '#d1d5db', cursor: 'pointer', marginRight: '0.5rem', marginBottom: '0.5rem' }),
    grid: { maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' },
    card: (on: boolean) => ({ background: on ? 'rgba(99,102,241,0.2)' : 'rgba(31,41,55,0.5)', border: `2px solid ${on ? '#818cf8' : '#374151'}`, borderRadius: '16px', padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }),
    bottom: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #374151', padding: '1rem' },
    stopBtn: (dis: boolean) => ({ padding: '0.6rem 1.5rem', borderRadius: '12px', border: 'none', background: dis ? '#4b5563' : '#dc2626', color: '#fff', fontWeight: 600, cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.5 : 1 }),
    input: { flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff', marginRight: '0.5rem' },
    sel: { padding: '0.5rem', borderRadius: '6px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff', cursor: 'pointer' }
  };

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>Saigon Night 🌙</h1>
        <p style={S.sub}>Trộn âm thanh • Thư giãn • Ngủ ngon</p>
      </header>

      {/* Timer */}
      <div style={S.panel}>
        <div style={S.row}>
          <span>⏱️ Sleep Timer</span>
          {timerRemaining && <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{formatTime(timerRemaining)}</span>}
        </div>
        <div>
          {[15, 30, 45, 60].map(m => (
            <button key={m} onClick={() => setSleepTimer(sleepTimer === m ? null : m)} style={S.btn(sleepTimer === m)}>{m}m</button>
          ))}
          {sleepTimer && <button onClick={() => { setSleepTimer(null); setTimerRemaining(null); }} style={S.btn(false)}>Hủy</button>}
        </div>
      </div>

      {/* Master Volume */}
      <div style={S.panel}>
        <div style={S.row}>
          <span>🎚️ Master Volume</span>
          <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{Math.round(masterVol * 100)}%</span>
        </div>
        <input type="range" min="0" max="1" step="0.05" value={masterVol} onChange={e => changeMaster(parseFloat(e.target.value))} style={S.slider} />
      </div>

      {/* Audio Grid */}
      <div style={S.grid}>
        {TRACKS.map(t => {
          const on = active.has(t.id);
          return (
            <div key={t.id} onClick={() => toggleTrack(t)} style={S.card(on)}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{t.icon}</div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{t.name}</div>
              {on && (
                <input type="range" min="0" max="1" step="0.05" value={volumes[t.id] || 0.5} 
                  onChange={e => { e.stopPropagation(); changeVolume(t.id, parseFloat(e.target.value)); }}
                  onClick={e => e.stopPropagation()} style={{ ...S.slider, marginTop: '0.75rem' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Save / Load */}
      <div style={{ ...S.panel, marginTop: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={saveMix} style={{ ...S.btn(true), flex: 1 }}>💾 Lưu Mix</button>
          {savedMixes.length > 0 && (
            <select onChange={e => e.target.value && loadMix(e.target.value)} defaultValue="" style={S.sel}>
              <option value="">📂 Tải Mix...</option>
              {savedMixes.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </div>
        <input type="text" placeholder="Tên mix..." value={mixName} onChange={e => setMixName(e.target.value)} style={{ ...S.input, marginTop: '0.75rem' }} />
      </div>

      {/* Bottom Bar */}
      <div style={S.bottom}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{active.size}/8 active</span>
          <button onClick={stopAll} disabled={active.size === 0} style={S.stopBtn(active.size === 0)}>⏹ Stop All</button>
        </div>
      </div>
    </div>
  );
}