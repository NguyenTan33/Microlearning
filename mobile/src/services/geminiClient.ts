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
    ? `Hãy đóng vai trò nhà sản xuất và phát thanh viên Podcast giáo dục chuyên nghiệp.
Viết kịch bản tập Podcast (thời lượng 2-3 phút) về chủ đề: "${topic}".
Định dạng: Hội thoại hai người giữa **Host (Minh Tuấn)** - người dẫn dắt gần gũi, khéo đặt câu hỏi và **Chuyên gia (Thanh Hà)** - giảng viên uyên bác, giải thích sâu sắc, dễ hiểu.

${lessonContext ? `\n=== TÀI LIỆU HỌC TẬP GỐC TỪ SỔ TAY (BẮT BUỘC ĐỌC VÀ LẤY KIẾN THỨC TỪ ĐÂY ĐỂ BIÊN SOẠN) ===\n${lessonContext}\n` : ''}

YÊU CẦU BẮT BUỘC:
1. Hai nhân vật phải trực tiếp thảo luận, phân tích và trích dẫn các khái niệm, luận điểm, định nghĩa và ví dụ có trong tài liệu học tập được đính kèm ở trên.
2. Không bịa đặt kiến thức ngoài tài liệu. Giải thích các thuật ngữ khó theo cách trực quan, dễ nhớ.
3. Cấu trúc kịch bản:
   - [Intro] Lời chào hấp dẫn của Host và giới thiệu chuyên gia khách mời cùng chủ đề tập Podcast.
   - Thảo luận đào sâu 2-4 kiến thức cốt lõi quan trọng nhất có trong tài liệu.
   - Phân tích ví dụ thực tế và ứng dụng thực tiễn của tài liệu vào đời sống / công việc.
   - Host và Chuyên gia cùng đúc kết 3 bài học đắt giá nhất cần nhớ.
   - [Outro] Lời kết súc tích, truyền cảm hứng hành động.

Viết kịch bản hoàn toàn bằng tiếng Việt tự nhiên, có ngữ điệu trò chuyện chân thực, thích hợp để chuyển thành giọng nói (TTS).`
    : `Hãy đóng vai trò chuyên gia giáo dục và diễn giả Podcast hàng đầu.
Viết bài giảng Podcast độc thoại (thời lượng 2-3 phút) về chủ đề: "${topic}".

${lessonContext ? `\n=== TÀI LIỆU HỌC TẬP GỐC TỪ SỔ TAY (BẮT BUỘC ĐỌC VÀ LẤY KIẾN THỨC TỪ ĐÂY ĐỂ BIÊN SOẠN) ===\n${lessonContext}\n` : ''}

YÊU CẦU BẮT BUỘC:
1. BẮT BUỘC đọc kỹ và lấy toàn bộ kiến thức, luận điểm, định nghĩa, ví dụ từ tài liệu học tập được đính kèm ở trên để giảng giải.
2. Không nói chung chung; hãy trực tiếp giải thích chi tiết các nội dung, định nghĩa, bước thực hiện có trong tài liệu.
3. Cấu trúc bài giảng:
   - Mở đầu lôi cuốn về tầm quan trọng của chủ đề bài học.
   - Trình bày mạch lạc 2-4 điểm kiến thức cốt lõi được rút ra từ tài liệu.
   - Đưa ra ví dụ minh họa và ứng dụng thực tế.
   - Đúc kết 3 bài học quan trọng nhất học viên cần nắm vững.
   - Lời kết súc tích, truyền động lực học tập.

Viết kịch bản bằng tiếng Việt tự nhiên, truyền cảm, khúc chiết, thích hợp để chuyển thành giọng nói (TTS).`;

  try {
    return await callGeminiDirect(
      prompt,
      undefined,
      'Bạn là nhà sản xuất nội dung Podcast giáo dục âm thanh hàng đầu. Hãy viết kịch bản thoại sinh động, hấp dẫn, bám sát nội dung tài liệu học tập thực tế.',
      15000
    );
  } catch {
    return `### Kịch bản Podcast: ${topic}\n\n**Host:** Chào mừng các bạn đến với MicroLearning Podcast!\n**Chuyên gia:** Cùng nhau khám phá kiến thức cốt lõi hôm nay!`;
  }
}
