'use client';
import { useState, useEffect, useRef } from 'react';

const TRACKS = [
  { id: 'suoi1', name: 'Suối 02', icon: '💧', src: '/sounds/back_suoi_02.mp3' },
  { id: 'suoi2', name: 'Suối 03', icon: '🌊', src: '/sounds/back_suoi_03.mp3' },
  { id: 'mua',   name: 'Mưa dông', icon: '⛈️', src: '/sounds/back_suoi_04.mp3' },
  { id: 'cafe',  name: 'Cafe',     icon: '☕', src: '/sounds/back_suoi_06.mp3' },
  { id: 'suoi5', name: 'Suối 07', icon: '️', src: '/sounds/back_suoi_07.mp3' },
  { id: 'chim1', name: 'Chim 02', icon: '🐦', src: '/sounds/effect_chim-hot_02.mp3' },
  { id: 'chim2', name: 'Chim 04', icon: '🕊️', src: '/sounds/effect_chim-hot_04.mp3' },
  { id: 'pho',   name: 'Phố xá',  icon: '️', src: '/sounds/effect_pho_01.mp3' },
];

function ChatBox() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [chat, setChat] = useState<{role: string, text: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const send = async () => {
    if (!msg.trim() || loading) return;
    const userMsg = msg; setMsg('');
    setChat(p => [...p, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai-composer', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ message: userMsg }) });
      const data = await res.json();
      setChat(p => [...p, { role: 'ai', text: data.reply || '...' }]);
    } catch { setChat(p => [...p, { role: 'ai', text: 'Lỗi AI!' }]); }
    finally { setLoading(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ position:'fixed', bottom:100, right:20, width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', fontSize:28, cursor:'pointer', boxShadow:'0 4px 20px rgba(99,102,241,0.4)', zIndex:999 }}>💬</button>
  );

  return (
    <div style={{ position:'fixed', bottom:100, right:20, width:320, height:450, background:'rgba(17,24,39,0.98)', border:'1px solid #374151', borderRadius:16, boxShadow:'0 10px 40px rgba(0,0,0,0.5)', zIndex:999, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'1rem', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:600 }}> AI Trợ Lý</span>
        <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:28, height:28, borderRadius:'50%', cursor:'pointer' }}>✕</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
        {chat.length === 0 && <div style={{ textAlign:'center', color:'#6b7280', marginTop:'2rem', fontSize:'0.875rem' }}>🎧 Hỏi tôi về nhạc ngủ!</div>}
        {chat.map((c, i) => (
          <div key={i} style={{ alignSelf: c.role==='user'?'flex-end':'flex-start', background: c.role==='user'?'#6366f1':'#374151', color:'#fff', padding:'0.5rem 0.8rem', borderRadius:12, maxWidth:'85%', fontSize:'0.8rem', lineHeight:1.4 }}>{c.text}</div>
        ))}
        {loading && <div style={{ alignSelf:'flex-start', background:'#374151', color:'#9ca3af', padding:'0.5rem 0.8rem', borderRadius:12, fontSize:'0.8rem' }}>Đang nghĩ...</div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding:'0.75rem', display:'flex', gap:'0.5rem', borderTop:'1px solid #374151' }}>
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key==='Enter' && send()} placeholder="Nhập..." style={{ flex:1, padding:'0.5rem', borderRadius:8, border:'1px solid #4b5563', background:'#111827', color:'#fff', fontSize:'0.8rem', outline:'none' }} />
        <button onClick={send} disabled={loading || !msg.trim()} style={{ padding:'0.5rem 0.8rem', background: msg.trim()?'#6366f1':'#4b5563', border:'none', borderRadius:8, color:'#fff', cursor: msg.trim()?'pointer':'not-allowed' }}>➤</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [masterVol, setMasterVol] = useState(0.7);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    TRACKS.forEach(t => {
      if (!volumes[t.id]) setVolumes(p => ({...p, [t.id]: 0.5}));
      if (t.src) { const a = new Audio(t.src); a.loop = true; a.preload = 'auto'; audioRefs.current.set(t.id, a); }
    });
    return () => { audioRefs.current.forEach(a => a.pause()); if(timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (sleepTimer && sleepTimer > 0) {
      setTimerRemaining(sleepTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerRemaining(p => {
          if (p === null || p <= 1) { stopAll(); setSleepTimer(null); if(timerRef.current) clearInterval(timerRef.current); return null; }
          return p - 1;
        });
      }, 1000);
    }
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [sleepTimer]);

  const toggle = async (t: any) => {
    if (active.has(t.id)) {
      const a = audioRefs.current.get(t.id); if(a) { a.pause(); a.currentTime=0; }
      setActive(p => { const s=new Set(p); s.delete(t.id); return s; });
    } else {
      const a = audioRefs.current.get(t.id);
      if(a) { try { a.volume = (volumes[t.id]||0.5)*masterVol; await a.play(); } catch{} }
      setActive(p => new Set(p).add(t.id));
    }
  };

  const changeVol = (id: string, v: number) => {
    setVolumes(p => ({...p, [id]: v}));
    const a = audioRefs.current.get(id); if(a && active.has(id)) a.volume = v * masterVol;
  };

  const changeMaster = (v: number) => {
    setMasterVol(v);
    TRACKS.forEach(t => { if(active.has(t.id)) { const a=audioRefs.current.get(t.id); if(a) a.volume = (volumes[t.id]||0.5)*v; } });
  };

  const stopAll = () => {
    audioRefs.current.forEach(a => { a.pause(); a.currentTime=0; });
    setActive(new Set()); setSleepTimer(null); setTimerRemaining(null);
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const S: Record<string, any> = {
    page: { minHeight:'100vh', background:'linear-gradient(180deg,#030712 0%,#1e1b4b 50%,#3b0764 100%)', color:'#f3f4f6', fontFamily:'system-ui,sans-serif', padding:'2rem 1rem', paddingBottom:'100px' },
    header: { textAlign:'center', padding:'2rem 0' },
    h1: { fontSize:'2.5rem', fontWeight:700, background:'linear-gradient(90deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:0 },
    sub: { color:'#9ca3af', marginTop:'0.5rem' },
    panel: { maxWidth:'600px', margin:'0 auto 1.5rem', background:'rgba(31,41,55,0.5)', borderRadius:12, padding:'1rem', border:'1px solid #374151' },
    row: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem', fontSize:'0.9rem', fontWeight:500 },
    slider: { width:'100%', accentColor:'#818cf8', cursor:'pointer' },
    btn: (a: boolean) => ({ padding:'0.4rem 0.8rem', border:'none', borderRadius:6, background:a?'#6366f1':'#374151', color:a?'#fff':'#d1d5db', cursor:'pointer', marginRight:5, marginBottom:5 }),
    grid: { maxWidth:'1000px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'1rem' },
    card: (on: boolean) => ({ background:on?'rgba(99,102,241,0.2)':'rgba(31,41,55,0.5)', border:`2px solid ${on?'#818cf8':'#374151'}`, borderRadius:16, padding:'1.5rem 1rem', textAlign:'center', cursor:'pointer', transition:'all 0.2s' }),
    bottom: { position:'fixed', bottom:0, left:0, right:0, background:'rgba(17,24,39,0.95)', backdropFilter:'blur(10px)', borderTop:'1px solid #374151', padding:'1rem' },
    stopBtn: (d: boolean) => ({ padding:'0.6rem 1.5rem', borderRadius:12, border:'none', background:d?'#4b5563':'#dc2626', color:'#fff', fontWeight:600, cursor:d?'not-allowed':'pointer', opacity:d?0.5:1 })
  };

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>Saigon Night 🌙</h1>
        <p style={S.sub}>Trộn âm thanh • Thư giãn • Ngủ ngon</p>
      </header>

      <div style={S.panel}>
        <div style={S.row}><span>⏱️ Sleep Timer</span>{timerRemaining && <span style={{color:'#818cf8', fontFamily:'monospace'}}>{fmt(timerRemaining)}</span>}</div>
        <div>
          {[15,30,45,60].map(m => <button key={m} onClick={() => setSleepTimer(sleepTimer===m?null:m)} style={S.btn(sleepTimer===m)}>{m}m</button>)}
          {sleepTimer && <button onClick={() => { setSleepTimer(null); setTimerRemaining(null); }} style={S.btn(false)}>Hủy</button>}
        </div>
      </div>

      <div style={S.panel}>
        <div style={S.row}><span>🎚️ Master Volume</span><span style={{color:'#818cf8', fontFamily:'monospace'}}>{Math.round(masterVol*100)}%</span></div>
        <input type="range" min="0" max="1" step="0.05" value={masterVol} onChange={e => changeMaster(parseFloat(e.target.value))} style={S.slider} />
      </div>

      <div style={S.grid}>
        {TRACKS.map(t => {
          const on = active.has(t.id);
          return (
            <div key={t.id} onClick={() => toggle(t)} style={S.card(on)}>
              <div style={{fontSize:'2rem', marginBottom:'0.5rem'}}>{t.icon}</div>
              <div style={{fontWeight:500, fontSize:'0.9rem'}}>{t.name}</div>
              {on && <input type="range" min="0" max="1" step="0.05" value={volumes[t.id]||0.5} onChange={e => { e.stopPropagation(); changeVol(t.id, parseFloat(e.target.value)); }} onClick={e => e.stopPropagation()} style={{...S.slider, marginTop:'0.75rem'}} />}
            </div>
          );
        })}
      </div>

      <div style={S.bottom}>
        <div style={{maxWidth:'600px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{color:'#9ca3af', fontSize:'0.9rem'}}>{active.size}/8 active</span>
          <button onClick={stopAll} disabled={active.size===0} style={S.stopBtn(active.size===0)}>⏹ Stop All</button>
        </div>
      </div>

      <ChatBox />
    </div>
  );
}