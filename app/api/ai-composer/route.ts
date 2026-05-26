import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    
    if (!apiKey) return NextResponse.json({ reply: "⚠️ Chưa có API Key" });

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Bạn là trợ lý âm nhạc Saigon Night. Gợi ý combo nhạc ngắn gọn, thân thiện, dùng emoji. Web có: Suối, Chim, Mưa, Cafe, Phố xá, White Noise.' },
          { role: 'user', content: message }
        ],
        max_tokens: 150
      })
    });
    const data = await res.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || 'AI chưa phản hồi!' });
  } catch {
    return NextResponse.json({ reply: 'Lỗi kết nối AI!' });
  }
}