import Groq from "groq-sdk"; // <-- Bạn đang thiếu dòng này

const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

export const groq = new Groq({ 
    apiKey: apiKey,
    dangerouslyAllowBrowser: true 
});