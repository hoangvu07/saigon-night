import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userMessage } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Model siêu nhanh của Groq
        messages: [
          { role: 'system', content: 'Bạn là Saigon Night - trợ lý âm thanh thư giãn. Trả lời ngắn gọn (2-3 câu), ấm áp, tiếng Việt. Gợi ý không gian âm thanh phù hợp tâm trạng.' },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Groq Error:', data);
      return NextResponse.json({
        advice: 'Mình đang gặp chút trục trặc kỹ thuật. Thử lại sau nhé! 💙',
        error: data.error?.message || `Lỗi ${res.status}`
      });
    }

    const aiReply = data.choices?.[0]?.message?.content || 'Xin lỗi, mình chưa hiểu.';
    console.log('🤖 Groq AI:', aiReply);

    return NextResponse.json({
      advice: aiReply,
      mix: {
        version: '1.0',
        mood: 'relax',
        duration_sec: 300,
        stems: { rain: { volume: 0.8 }, stream: { volume: 0.3 }, ocean: { volume: 0.4 }, night: { volume: 0.5 } },
        spatial: { azimuth: 0, elevation: 0, distance: 2 },
        effects: { reverb_wet: 0.2, delay_time: 0.3 }
      }
    });
  } catch (error) {
    console.error('💥 Lỗi server:', error);
    return NextResponse.json({ error: 'Lỗi kết nối', advice: 'Thử lại sau!' }, { status: 500 });
  }
}