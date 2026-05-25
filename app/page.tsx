// app/page.tsx - Saigon Night Audio Mixer (8 Tracks Verified)
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// Danh sách 8 tracks - Kiểm tra kỹ src trùng với file trong public/sounds/
const TRACKS = [
  { id: 'suoi1', name: 'Suối nhẹ', icon: '💧', src: '/sounds/back_suoi_02.mp3' },
  { id: 'suoi2', name: 'Suối mạnh', icon: '🌊', src: '/sounds/back_suoi_03.mp3' },
  { id: 'suoi3', name: 'Suối 04', icon: '💦', src: '/sounds/back_suoi_04.mp3' },
  { id: 'suoi4', name: 'Suối 06', icon: '🏞️', src: '/sounds/back_suoi_06.mp3' },
  { id: 'suoi5', name: 'Suối 07', icon: '🏔️', src: '/sounds/back_suoi_07.mp3' },
  { id: 'chim1', name: 'Chim hót 1', icon: '🐦', src: '/sounds/effect_chim-hot_02.mp3' },
  { id: 'chim2', name: 'Chim hót 2', icon: '🕊️', src: '/sounds/effect_chim-hot_04.mp3' },
  { id: 'pho1', name: 'Phố xá', icon: '🏙️', src: '/sounds/effect_pho_01.mp3' },
];

export default function Home() {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [masterVol, setMasterVol] = useState(1);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Khởi tạo audio khi load trang
  useEffect(() => {
    TRACKS.forEach(track => {
      const audio = new Audio(track.src);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0.5;
      audioRefs.current.set(track.id, audio);
      setVolumes(prev => ({ ...prev, [track.id]: 0.5 }));
    });
    return () => {
      audioRefs.current.forEach(a => a.pause());
      audioRefs.current.clear();
    };
  }, []);

  // Toggle Play/Pause từng track
  const toggleTrack = async (id: string) => {
    const audio = audioRefs.current.get(id);
    if (!audio) return;

    if (active.has(id)) {
      audio.pause();
      audio.currentTime = 0;
      setActive(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      try {
        audio.volume = (volumes[id] || 0.5) * masterVol;
        await audio.play();
        setActive(prev => new Set(prev).add(id));
      } catch (err) {
        console.warn('Click lại để phát:', err);
      }
    }
  };

  // Change volume từng track
  const changeVolume = (id: string, val: number) => {
    setVolumes(prev => ({ ...prev, [id]: val }));
    const audio = audioRefs.current.get(id);
    if (audio && active.has(id)) {
      audio.volume = val * masterVol;
    }
  };

  // Master Volume
  const changeMaster = (val: number) => {
    setMasterVol(val);
    audioRefs.current.forEach((audio, id) => {
      if (active.has(id)) {
        audio.volume = (volumes[id] || 0.5) * val;
      }
    });
  };

  // Stop all
  const stopAll = () => {
    audioRefs.current.forEach(a => { a.pause(); a.currentTime = 0; });
    setActive(new Set());
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #030712 0%, #1e1b4b 50%, #3b0764 100%)',
      color: '#f3f4f6',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem 1rem',
      paddingBottom: '100px'
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', padding: '2rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(90deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Saigon Night 🌙
        </h1>
        <p style={{ color: '#9ca3af' }}>Trộn 8 âm thanh • Thư giãn • Ngủ ngon</p>
      </header>

      {/* Master Volume */}
      <div style={{ maxWidth: '600px', margin: '0 auto 2rem', background: 'rgba(31,41,55,0.5)', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          <span>🎚️ Master Volume</span>
          <span style={{ color: '#818cf8' }}>{Math.round(masterVol * 100)}%</span>
        </div>
        <input type="range" min="0" max="1" step="0.05" value={masterVol} 
          onChange={(e) => changeMaster(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#818cf8' }} />
      </div>

      {/* Audio Grid */}
      <div style={{ 
        maxWidth: '1000px', margin: '0 auto', 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem' 
      }}>
        {TRACKS.map(track => {
          const isActive = active.has(track.id);
          return (
            <div key={track.id}
              onClick={() => toggleTrack(track.id)}
              style={{
                background: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(31,41,55,0.5)',
                border: `2px solid ${isActive ? '#818cf8' : '#374151'}`,
                borderRadius: '16px',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{track.icon}</div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{track.name}</div>
              
              {isActive && (
                <input type="range" min="0" max="1" step="0.1" 
                  value={volumes[track.id] || 0.5}
                  onChange={(e) => { e.stopPropagation(); changeVolume(track.id, parseFloat(e.target.value)); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '100%', marginTop: '0.75rem', accentColor: '#818cf8' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(17,24,39,0.95)', borderTop: '1px solid #374151',
        padding: '1rem', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{active.size}/8 tracks active</span>
          <button onClick={stopAll} disabled={active.size === 0}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '12px', border: 'none',
              background: active.size > 0 ? '#dc2626' : '#4b5563',
              color: 'white', fontWeight: 600, cursor: active.size > 0 ? 'pointer' : 'not-allowed'
            }}>
            ⏹ Stop All
          </button>
        </div>
      </div>
    </div>
  );
}