/**
 * Dịch vụ tích hợp trực tiếp Google Gemini AI phía Client (Web Browser)
 * Cung cấp khả năng gọi AI siêu tốc, không phụ thuộc trung gian.
 * 
 * QUAN TRỌNG: Chỉ dùng các model đã được Google xác nhận khả dụng.
 * Tham khảo: https://ai.google.dev/gemini-api/docs/models/gemini
 */

// Model Gemini đã verified hoạt động với key AQ. (kiểm tra 2026-10-06)
// gemini-3.5-flash-lite: ✅ HTTP 200
// gemini-3.5-flash: ❌ 503 ServiceUnavailable
// gemini-2.0-flash-lite / 2.0-flash: ❌ 404 Not Found  
// gemini-1.5-flash / 1.5-flash-8b: ❌ 404 Not Found
const FAST_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',  // ✅ Primary - verified hoạt động
  'gemini-3.5-flash',       // Thử nếu flash-lite lỗi
];

/**
 * Lấy API Key từ biến môi trường, fallback về key mặc định
 */
export function getGeminiApiKey(): string {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 10 && !envKey.includes('REPLACE_WITH')) {
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

/**
 * Gọi Google Gemini API trực tiếp để hỏi đáp
 * @param prompt - Câu hỏi / prompt của người dùng
 * @param context - Ngữ cảnh bài học từ SQL (lessonId, courseId, description...)
 * @param systemInstruction - Chỉ dẫn cho AI
 * @param timeoutMs - Timeout tính bằng ms (mặc định 12s)
 * @param history - Lịch sử hội thoại trước đó (tối đa 6-8 lượt gần nhất)
 */
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
    'súc tích, có ví dụ minh họa trực quan. Nếu có dữ liệu bài học kèm theo, hãy BẮT BUỘC bám sát nội dung ' +
    'thực tế của bài học đó thay vì trả lời chung chung. Luôn trả lời bằng tiếng Việt.';

  const fullUserPrompt =
    context && context.trim().length > 0
      ? `Dưới đây là tài liệu / nội dung bài học thực tế từ hệ thống:\n${context.trim()}\n\n---\nCâu hỏi của học viên: ${prompt}`
      : prompt;

  // Xây dựng contents payload cho Gemini API (hỗ trợ Multi-turn)
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

  // Thêm câu hỏi hiện tại kèm context bài học
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
      } else if (response.status === 400 || response.status === 404) {
        // Model không tồn tại hoặc request sai → thử model kế tiếp
        continue;
      } else if (response.status === 429) {
        // Rate limited → thử model kế tiếp (có thể quota khác)
        continue;
      }
    } catch (err) {
      // Timeout hoặc lỗi mạng → thử model kế tiếp
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (!isAbort) continue;
      continue;
    }
  }

  throw new Error('Không thể kết nối đến Google Gemini API. Vui lòng kiểm tra VITE_GEMINI_API_KEY trong file .env');
}

/**
 * Sinh kịch bản âm thanh Podcast bài giảng chuyên nghiệp bằng tiếng Việt
 * @param topic - Chủ đề podcast
 * @param profileName - Kiểu podcast (solo_expert, dialogue...)
 * @param lessonContext - Nội dung thực tế từ SQL để AI bám sát
 */
export async function generatePodcastScript(
  topic: string,
  profileName: string,
  lessonContext?: string
): Promise<string> {
  const isDualHost = profileName.toLowerCase().includes('dialogue') || profileName.toLowerCase().includes('duo');

  const prompt = isDualHost
    ? `Hãy đóng vai trò nhà sản xuất Podcast giáo dục chuyên nghiệp.
Viết kịch bản tập Podcast (2-3 phút đọc) về chủ đề: "${topic}".
Định dạng: Hội thoại tự nhiên giữa **Host (Minh Tuấn)** - người dẫn gần gũi, tò mò và **Chuyên gia (Thanh Hà)** - giảng viên giải thích súc tích.
${lessonContext ? `\nNỘI DUNG BÀI HỌC THỰC TẾ (bắt buộc bám sát):\n${lessonContext}` : ''}

Cấu trúc kịch bản:
1. [Nhạc intro] - Lời chào hấp dẫn của Host
2. Host đặt câu hỏi mở về chủ đề
3. Chuyên gia giải thích 2-3 điểm cốt lõi với ví dụ thực tế
4. Trao đổi về ứng dụng thực chiến
5. Host tóm tắt 3 bài học quan trọng nhất
6. [Nhạc outro] - Lời kết truyền cảm hứng

Viết bằng tiếng Việt tự nhiên, gần gũi như chương trình radio thực tế.`
    : `Hãy đóng vai trò chuyên gia giáo dục.
Viết bài giảng Podcast độc thoại (2-3 phút đọc) về chủ đề: "${topic}".
${lessonContext ? `\nNỘI DUNG BÀI HỌC THỰC TẾ (bắt buộc bám sát):\n${lessonContext}` : ''}

Cấu trúc:
1. Tiêu đề + giới thiệu hấp dẫn
2. 3 điểm kiến thức cốt lõi với ví dụ minh họa cụ thể
3. Ứng dụng thực tế trong công việc/học tập
4. 3 bài học rút ra quan trọng nhất
5. Lời kết ngắn gọn truyền cảm hứng

Viết bằng tiếng Việt tự nhiên, súc tích, có cảm xúc.`;

  try {
    return await callGeminiDirect(
      prompt,
      undefined,
      'Bạn là nhà sản xuất nội dung Podcast giáo dục âm thanh hàng đầu. Hãy viết kịch bản thoại sinh động, hấp dẫn, bám sát nội dung bài học thực tế.',
      15000
    );
  } catch {
    // Kịch bản mẫu nếu không có mạng hoặc API lỗi
    return `### Kịch bản Podcast: ${topic}
**Thời lượng dự kiến:** 3 phút
**Nhân vật:** Host (Minh Tuấn) & Chuyên gia (Thanh Hà)

[Tiếng nhạc intro lo-fi nhẹ nhàng mở đầu]

**Host (Minh Tuấn):** Chào mừng các bạn đến với MicroLearning Audio Podcast! Trong tập hôm nay, chúng ta sẽ cùng khám phá chủ đề: "${topic}". Đồng hành với chúng ta là chuyên gia Thanh Hà. Chị Hà có thể chia sẻ điểm mấu chốt nhất không ạ?

**Chuyên gia (Thanh Hà):** Chào Tuấn và các bạn! Điểm cốt lõi khi tiếp cận "${topic}" là hiểu được nguyên lý cơ bản trước khi đi vào chi tiết. Đừng cố nhớ vẹt, hãy gắn kiến thức vào tình huống thực tế hàng ngày!

**Host (Minh Tuấn):** 3 bài học quan trọng nhất hôm nay:
1. Nắm vững bản chất kiến thức cốt lõi.
2. Thực hành ngay với bài tập thực tế.
3. Ứng dụng đều đặn vào công việc mỗi ngày.

[Nhạc outro kết thúc tập]`;
  }
}
