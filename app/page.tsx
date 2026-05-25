// app/page.tsx - FINAL STABLE VERSION
'use client';
import { useState, useEffect, useRef } from 'react';

const TRACKS = [
  { id: 'rain', name: 'Mưa nhẹ', icon: '🌧️', src: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3' },
  { id: 'forest', name: 'Rừng đêm', icon: '🌲', src: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5bb8d6e8f5.mp3' },
  { id: 'ocean', name: 'Sóng biển', icon: '🌊', src: 'https://cdn.pixabay.com/audio/2022/02/07/audio_337359b056.mp3' },
  { id: 'thunder', name: 'Mưa dông', icon: '⛈️', src: 'https://cdn.pixabay.com/audio/2022/01/17/audio_2010546648.mp3' },
  { id: 'city', name: 'Phố xá', icon: '🏙️', src: 'https://cdn.pixabay.com/audio/2022/03/09/audio_c8f20b5b5d.mp3' },
  { id: 'cafe', name: 'Quán cafe', icon: '☕', src: 'https://cdn.pixabay.com/audio/2022/01/18/audio_0625c1539c.mp3' },
  { id: 'white', name: 'White Noise', icon: '', src: '', type: 'noise' },
  { id: 'piano', name: 'Piano', icon: '🎹', src: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1c6a3f8e8b.mp3' },
];

export default function Home() {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [masterVol, setMasterVol] = useState(0.7);
  
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const noiseCtx = useRef<Map<string, AudioContext>>(new Map());
  const noiseNodes = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    console.log('🚀 Saigon Night Loaded - Version: FINAL_STABLE');
    TRACKS.forEach(track => {
      if (track.type !== 'noise') {
        const audio = new Audio(track.src);
        audio.loop = true;
        audio.volume = 0.5;
        audioRefs.current.set(track.id, audio);
      }
      setVolumes(prev => ({ ...prev, [track.id]: 0.5 }));
    });
    return () => {
      audioRefs.current.forEach(a => a.pause());
      noiseNodes.current.forEach(n => { try { n.stop(); } catch(e){} });
      noiseCtx.current.forEach(c => c.close());
    };
  }, []);

  const toggleTrack = async (track: any) => {
    if (active.has(track.id)) {
      // STOP
      if (track.type === 'noise') {
        const n = noiseNodes.current.get(track.id);
        const c = noiseCtx.current.get(track.id);
        if (n) { try { n.stop(); } catch(e){} }
        if (c) c.close();
        noiseNodes.current.delete(track.id);
        noiseCtx.current.delete(track.id);
      } else {
        const a = audioRefs.current.get(track.id);
        if (a) { a.pause(); a.currentTime = 0; }
      }
      setActive(prev => { const s = new Set(prev); s.delete(track.id); return s; });
    } else {
      // PLAY
      if (track.type === 'noise') {
        const ctx = new AudioContext();
        const buf = ctx.createBuffer(1, 2 * ctx.sampleRate, ctx.sampleRate);
        const out = buf.getChannelData(0);
        for (let i = 0; i < buf.length; i++) out[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = (volumes[track.id] || 0.5) * masterVol * 0.3;
        src.connect(gain); gain.connect(ctx.destination); src.start();
        noiseNodes.current.set(track.id, src);
        noiseCtx.current.set(track.id, ctx);
        (src as any).gain = gain;
      } else {
        const a = audioRefs.current.get(track.id);
        if (a) {
          try {
            a.volume = (volumes[track.id] || 0.5) * masterVol;
            await a.play();
          } catch (e) { console.warn('Click lại để phát'); return; }
        }
      }
      setActive(prev => new Set(prev).add(track.id));
    }
  };

  const changeVol = (id: string, v: number) => {
    setVolumes(prev => ({ ...prev, [id]: v }));
    const a = audioRefs.current.get(id);
    if (a && active.has(id)) a.volume = v * masterVol;
    const n = noiseNodes.current.get(id) as any;
    if (n?.gain && active.has(id)) n.gain.gain.value = v * masterVol * 0.3;
  };

  const changeMaster = (v: number) => {
    setMasterVol(v);
    TRACKS.forEach(t => {
      if (active.has(t.id)) {
        if (t.type === 'noise') {
          const n = noiseNodes.current.get(t.id) as any;
          if (n?.gain) n.gain.gain.value = (volumes[t.id]||0.5) * v * 0.3;
        } else {
          const a = audioRefs.current.get(t.id);
          if (a) a.volume = (volumes[t.id]||0.5) * v;
        }
      }
    });
  };

  const stopAll = () => {
    audioRefs.current.forEach(a => { a.pause(); a.currentTime = 0; });
    noiseNodes.current.forEach(n => { try { n.stop(); } catch(e){} });
    noiseCtx.current.forEach(c => c.close());
    setActive(new Set());
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #030712 0%, #1e1b4b 50%, #3b0764 100%)', color: '#f3f4f6', fontFamily: 'system-ui, sans-serif', padding: '2rem 1rem', paddingBottom: '100px' }}>
      <header style={{ textAlign: 'center', padding: '2rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(90deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Saigon Night </h1>
        <p style={{ color: '#9ca3af' }}>Trộn âm thanh • Thư giãn • Ngủ ngon</p>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto 2rem', background: 'rgba(31,41,55,0.5)', borderRadius: '12px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
          <span>🎚️ Master Volume</span>
          <span style={{ color: '#818cf8' }}>{Math.round(masterVol * 100)}%</span>
        </div>
        <input type="range" min="0" max="1" step="0.05" value={masterVol} onChange={(e) => changeMaster(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#818cf8' }} />
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {TRACKS.map(track => {
          const isOn = active.has(track.id);
          return (
            <div key={track.id} onClick={() => toggleTrack(track)} style={{ background: isOn ? 'rgba(99,102,241,0.2)' : 'rgba(31,41,55,0.5)', border: `2px solid ${isOn ? '#818cf8' : '#374151'}`, borderRadius: '16px', padding: '1.5rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{track.icon}</div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{track.name}</div>
              {isOn && (
                <input type="range" min="0" max="1" step="0.05" value={volumes[track.id]||0.5} onChange={(e) => { e.stopPropagation(); changeVol(track.id, parseFloat(e.target.value)); }} onClick={(e) => e.stopPropagation()} style={{ width: '100%', marginTop: '0.75rem', accentColor: '#818cf8' }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid #374151', padding: '1rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{active.size}/8 active</span>
          <button onClick={stopAll} disabled={active.size===0} style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', border: 'none', background: active.size>0 ? '#dc2626' : '#4b5563', color: 'white', fontWeight: 600, cursor: active.size>0 ? 'pointer' : 'not-allowed' }}>⏹ Stop All</button>
        </div>
      </div>
    </div>
  );
}