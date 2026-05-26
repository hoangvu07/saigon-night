// app/page.tsx - Saigon Night Audio Mixer (Final UI)
'use client';
import { useState, useEffect, useRef } from 'react';

const TRACKS = [
  { id: 'suoi1', name: 'Suối 02', icon: '💧', src: '/sounds/back_suoi_02.mp3' },
  { id: 'suoi2', name: 'Suối 03', icon: '🌊', src: '/sounds/back_suoi_03.mp3' },
  { id: 'mua', name: 'Mưa dông', icon: '⛈️', src: '/sounds/back_suoi_04.mp3' },
  { id: 'cafe', name: 'Cafe', icon: '☕', src: '/sounds/back_suoi_06.mp3' },
  { id: 'suoi5', name: 'Suối 07', icon: '🏔️', src: '/sounds/back_suoi_07.mp3' },
  { id: 'chim1', name: 'Chim 02', icon: '🐦', src: '/sounds/effect_chim-hot_02.mp3' },
  { id: 'chim2', name: 'Chim 04', icon: '🕊️', src: '/sounds/effect_chim-hot_04.mp3' },
  { id: 'pho', name: 'Phố xá', icon: '🏙️', src: '/sounds/effect_pho_01.mp3' },
];

export default function Home() {
  const [active, setActive] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [masterVol, setMasterVol] = useState(0.7);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [mixName, setMixName] = useState('');
  const [savedMixes, setSavedMixes] = useState<{name: string, active: string[], masterVol: number}[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const saved = localStorage.getItem('saigon-night-state');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.active) setActive(new Set(p.active));
        if (p.masterVol) setMasterVol(p.masterVol);
        if (p.volumes) setVolumes(p.volumes);
      } catch {}
    }
    const mixes = localStorage.getItem('saigon-night-mixes');
    if (mixes) setSavedMixes(JSON.parse(mixes));

    TRACKS.forEach(t => {
      if (!volumes[t.id]) setVolumes(p => ({...p, [t.id]: 0.5}));
      if (t.src) {
        const a = new Audio(t.src); 
        a.loop = true; 
        a.preload = 'auto';
        audioRefs.current.set(t.id, a);
      }
    });
    return () => { 
      audioRefs.current.forEach(a => a.pause()); 
      if(timerRef.current) clearInterval(timerRef.current); 
    };
  }, []);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('saigon-night-state', JSON.stringify({
      active: Array.from(active), masterVol, volumes
    }));
  }, [active, masterVol, volumes]);

  // Timer
  useEffect(() => {
    if (sleepTimer && sleepTimer > 0) {
      setTimerRemaining(sleepTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerRemaining(p => {
          if (p === null || p <= 1) { 
            stopAll(); 
            setSleepTimer(null); 
            if(timerRef.current) clearInterval(timerRef.current); 
            return null; 
          }
          return p - 1;
        });
      }, 1000);
    }
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [sleepTimer]);

  // Chat scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const toggle = async (t: any) => {
    if (active.has(t.id)) {
      const a = audioRefs.current.get(t.id); 
      if(a) { a.pause(); a.currentTime=0; }
      setActive(p => { const s=new Set(p); s.delete(t.id); return s; });
    } else {
      const a = audioRefs.current.get(t.id);
      if(a) { 
        try { 
          a.volume = (volumes[t.id]||0.5)*masterVol; 
          await a.play(); 
        } catch{} 
      }
      setActive(p => new Set(p).add(t.id));
    }
  };

  const changeVol = (id: string, v: number) => {
    setVolumes(p => ({...p, [id]: v}));
    const a = audioRefs.current.get(id); 
    if(a && active.has(id)) a.volume = v * masterVol;
  };

  const changeMaster = (v: number) => {
    setMasterVol(v);
    TRACKS.forEach(t => { 
      if(active.has(t.id)) { 
        const a=audioRefs.current.get(t.id); 
        if(a) a.volume = (volumes[t.id]||0.5)*v; 
      } 
    });
  };

  const stopAll = () => {
    audioRefs.current.forEach(a => { a.pause(); a.currentTime=0; });
    setActive(new Set()); 
    setSleepTimer(null); 
    setTimerRemaining(null);
  };

  const saveMix = () => {
    if (!mixName.trim()) return;
    const newMix = { name: mixName, active: Array.from(active), masterVol };
    const updated = [...savedMixes, newMix];
    setSavedMixes(updated);
    localStorage.setItem('saigon-night-mixes', JSON.stringify(updated));
    setMixName('');
    alert('💾 Đã lưu mix!');
  };

  const loadMix = (name: string) => {
    const mix = savedMixes.find(m => m.name === name);
    if (!mix) return;
    stopAll();
    setTimeout(() => {
      setActive(new Set(mix.active));
      setMasterVol(mix.masterVol);
      mix.active.forEach(id => {
        const a = audioRefs.current.get(id);
        if(a) { 
          a.volume = (volumes[id]||0.5)*mix.masterVol; 
          a.play().catch(()=>{}); 
        }
      });
    }, 50);
  };

  const deleteMix = (name: string) => {
    const updated = savedMixes.filter(m => m.name !== name);
    setSavedMixes(updated);
    localStorage.setItem('saigon-night-mixes', JSON.stringify(updated));
  };

  const sendChat = async () => {
    if (!chatMsg.trim() || chatLoading) return;
    const userMsg = chatMsg; 
    setChatMsg('');
    setChatHistory(p => [...p, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai-composer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setChatHistory(p => [...p, { role: 'ai', text: data.reply || '...' }]);
    } catch {
      setChatHistory(p => [...p, { role: 'ai', text: 'Lỗi kết nối!' }]);
    } finally { 
      setChatLoading(false); 
    }
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 text-gray-100 font-sans pb-32">
      {/* HEADER */}
      <header className="text-center py-12 px-4">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-3">
          Saigon Night 🌙
        </h1>
        <p className="text-gray-400 text-lg">Trộn âm thanh • Thư giãn • Ngủ ngon</p>
      </header>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* TIMER SECTION */}
        <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>⏱️</span> Sleep Timer
            </h2>
            {timerRemaining && (
              <span className="text-indigo-400 font-mono text-lg">{fmt(timerRemaining)}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {[15, 30, 45, 60].map(m => (
              <button
                key={m}
                onClick={() => setSleepTimer(sleepTimer === m ? null : m)}
                className={`px-6 py-2 rounded-xl font-medium transition-all ${
                  sleepTimer === m
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {m}m
              </button>
            ))}
            {sleepTimer && (
              <button
                onClick={() => { setSleepTimer(null); setTimerRemaining(null); }}
                className="px-6 py-2 rounded-xl bg-red-600/80 text-white hover:bg-red-600 transition-all"
              >
                Hủy
              </button>
            )}
          </div>
        </section>

        {/* MASTER VOLUME */}
        <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>🎚️</span> Master Volume
            </h2>
            <span className="text-indigo-400 font-mono">{Math.round(masterVol * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={masterVol}
            onChange={(e) => changeMaster(parseFloat(e.target.value))}
            className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </section>

        {/* AUDIO TRACKS GRID */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {TRACKS.map(t => {
            const on = active.has(t.id);
            return (
              <div
                key={t.id}
                onClick={() => toggle(t)}
                className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                  on
                    ? 'bg-indigo-600/20 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20'
                    : 'bg-slate-900/50 border-2 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="text-5xl mb-3 text-center">{t.icon}</div>
                <div className="text-center font-semibold text-lg mb-3">{t.name}</div>
                {on && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volumes[t.id] || 0.5}
                      onChange={(e) => changeVol(t.id, parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                    <div className="text-center text-xs text-gray-400 mt-1">
                      {Math.round((volumes[t.id] || 0.5) * 100)}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* SAVE/LOAD MIX */}
        <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>💾</span> Lưu & Tải Mix
          </h2>
          <div className="flex gap-3 mb-4">
            <input
              value={mixName}
              onChange={(e) => setMixName(e.target.value)}
              placeholder="Tên mix mới..."
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={saveMix}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all"
            >
              Lưu
            </button>
          </div>
          {savedMixes.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {savedMixes.map(m => (
                <div
                  key={m.name}
                  className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl"
                >
                  <button
                    onClick={() => loadMix(m.name)}
                    className="text-left flex-1 hover:text-indigo-400 transition-colors"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-500 text-sm ml-2">({m.active.length} tracks)</span>
                  </button>
                  <button
                    onClick={() => deleteMix(m.name)}
                    className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm transition-all"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* FIXED BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-gray-400 font-medium">
            {active.size}/8 tracks active
          </span>
          <button
            onClick={stopAll}
            disabled={active.size === 0}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              active.size > 0
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            ⏹ Stop All
          </button>
        </div>
      </div>

      {/* CHAT BUTTON */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-xl shadow-indigo-500/40 flex items-center justify-center text-2xl hover:scale-110 transition-transform z-40"
      >
        💬
      </button>

      {/* CHAT MODAL */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[600px] flex flex-col shadow-2xl">
            {/* Chat Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span>🤖</span> AI Trợ Lý Âm Nhạc
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-white/80 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">🎧</div>
                  <div>Hỏi tôi về âm nhạc thư giãn!</div>
                  <div className="text-sm mt-2">Ví dụ: "Nhạc nào giúp ngủ ngon?"</div>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-800 text-gray-200 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-gray-400 px-4 py-2 rounded-2xl rounded-bl-sm">
                    Đang nghĩ...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-2">
                <input
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatMsg.trim()}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    chatMsg.trim() && !chatLoading
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}