// app/page.tsx - DEBUG VERSION
'use client';

const TRACKS = [
  { id: '1', name: 'Test 1', src: '/sounds/back_suoi_02.mp3' },
  { id: '2', name: 'Test 2', src: '/sounds/back_suoi_03.mp3' },
  { id: '3', name: 'Test 3', src: '/sounds/back_suoi_04.mp3' },
  { id: '4', name: 'Test 4', src: '/sounds/back_suoi_06.mp3' },
  { id: '5', name: 'Test 5', src: '/sounds/back_suoi_07.mp3' },
  { id: '6', name: 'Test 6', src: '/sounds/effect_chim-hot_02.mp3' },
  { id: '7', name: 'Test 7', src: '/sounds/effect_chim-hot_04.mp3' },
  { id: '8', name: 'Test 8', src: '/sounds/effect_pho_01.mp3' },
];

export default function Home() {
  const play = async (src: string, name: string) => {
    console.log(`🎵 Playing: ${name}`, src);
    try {
      const audio = new Audio(src);
      await audio.play();
      console.log(`✅ Playing: ${name}`);
    } catch (e) {
      console.error(`❌ Error playing ${name}:`, e);
      alert(`Lỗi: ${e}`);
    }
  };

  return (
    <div style={{ padding: '2rem', background: '#000', color: '#fff', minHeight: '100vh' }}>
      <h1>🔊 DEBUG: 8 Tracks Test</h1>
      <p style={{ color: '#888' }}>Click từng nút → Check Console (F12) để xem log</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem', marginTop: '2rem' }}>
        {TRACKS.map(t => (
          <button
            key={t.id}
            onClick={() => play(t.src, t.name)}
            style={{
              padding: '1rem',
              background: '#333',
              border: '2px solid #555',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            ▶ {t.name}
          </button>
        ))}
      </div>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#222', borderRadius: '8px' }}>
        <strong>📋 Hướng dẫn test:</strong>
        <ol style={{ marginTop: '0.5rem', color: '#aaa' }}>
          <li>Mở Console: F12 → Tab "Console"</li>
          <li>Click nút "Test 1" → Xem log 🎵/✅/❌</li>
          <li>Lặp lại với các nút khác</li>
          <li>Chụp màn hình Console gửi mình nếu có lỗi ❌</li>
        </ol>
      </div>
    </div>
  );
}