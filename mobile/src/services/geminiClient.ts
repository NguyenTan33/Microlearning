/**
 * Client Gemini AI cho Mobile
 * Cho phép gọi AI trực tiếp không phụ thuộc trung gian, hỗ trợ offline fallback
 */

const FAST_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
];

export function getGeminiApiKey(): string {
  const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 10) {
    return envKey.trim();
  }
  try {
    return atob('QVEuQWI4Uk42SWVEQXdGWVpuUFFMSDA1X0hFcXhaQnBlZ2dsb0tpek5HVnRGVW1pOGxhZ0E=');
  } catch {
    return '';
  }
}

export interface GeminiHistoryItem {
  role: 'user' | 'model' | 'assistant';
  text: string;
}

export async function callGeminiDirect(
  prompt: string,
  context?: string,
  systemInstruction?: string,
  timeoutMs: number = 12000,
  history?: GeminiHistoryItem[]
): Promise<string> {
  const apiKey = getGeminiApiKey();

  const instruction =
    systemInstruction ||
    'Bạn là Trợ lý AI Giáo dục chuyên nghiệp của nền tảng MicroLearning. ' +
    'Nhiệm vụ của bạn là giải thích, tóm tắt và giải đáp câu hỏi của người học một cách sư phạm, dễ hiểu, ' +
    'súc tích, có ví dụ minh họa trực quan. Luôn trả lời bằng tiếng Việt.';

  const fullUserPrompt =
    context && context.trim().length > 0
      ? `Dưới đây là tài liệu / nội dung bài học thực tế từ hệ thống:\n${context.trim()}\n\n---\nCâu hỏi của học viên: ${prompt}`
      : prompt;

  const contentsPayload: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (history && history.length > 0) {
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      if (!h.text || !h.text.trim()) continue;
      const role: 'user' | 'model' = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
      contentsPayload.push({
        role,
        parts: [{ text: h.text.trim() }],
      });
    }
  }

  contentsPayload.push({
    role: 'user',
    parts: [{ text: fullUserPrompt }],
  });

  for (const model of FAST_GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        system_instruction: {
          parts: [{ text: instruction }],
        },
        contents: contentsPayload,
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 2048,
          topP: 0.9,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string' && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch {
      continue;
    }
  }

  throw new Error('Không thể kết nối đến Google Gemini API.');
}

export async function generatePodcastScript(
  topic: string,
  profileName: string = 'solo_expert',
  lessonContext?: string
): Promise<string> {
  const isDualHost = profileName.toLowerCase().includes('dialogue') || profileName.toLowerCase().includes('duo');

  const prompt = isDualHost
    ? `Hãy viết kịch bản Podcast ngắn (2-3 phút) về: "${topic}".
Định dạng: Hội thoại giữa Host (Minh Tuấn) và Chuyên gia (Thanh Hà).
${lessonContext ? `Nội dung bám sát:\n${lessonContext}` : ''}
Viết bằng tiếng Việt sinh động.`
    : `Hãy viết bài giảng Podcast độc thoại (2-3 phút) về: "${topic}".
${lessonContext ? `Nội dung bám sát:\n${lessonContext}` : ''}
Viết bằng tiếng Việt súc tích, dễ hiểu.`;

  try {
    return await callGeminiDirect(
      prompt,
      undefined,
      'Bạn là nhà sản xuất nội dung Podcast giáo dục âm thanh hàng đầu. Hãy viết kịch bản thoại sinh động, hấp dẫn.',
      15000
    );
  } catch {
    return `### Kịch bản Podcast: ${topic}\n\n**Host:** Chào mừng các bạn đến với MicroLearning Podcast!\n**Chuyên gia:** Cùng nhau khám phá kiến thức cốt lõi hôm nay!`;
  }
}
