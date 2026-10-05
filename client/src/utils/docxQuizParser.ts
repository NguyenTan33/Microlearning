import mammoth from 'mammoth';

export interface ParsedQuizQuestion {
  content: string;
  explanation: string;
  points: number;
  options: Array<{
    optionText: string;
    isCorrect: boolean;
  }>;
}

/**
 * Phân tích chuỗi văn bản từ file Word (.docx) hoặc văn bản dán trực tiếp
 * Hỗ trợ các định dạng câu hỏi trắc nghiệm phổ biến tại Việt Nam:
 * - "Câu 1: ...", "Câu 1.", "1. ...", "1: ..."
 * - Các lựa chọn: "A. ...", "B. ...", "C. ...", "D. ..." hoặc "A) ...", "*A. ..."
 * - Dấu hiệu đáp án đúng:
 *   + Ký tự '*' trước hoặc sau: "*A. ..." hoặc "A. ... *"
 *   + Đánh dấu: "[x] A. ..." hoặc "A. ... (Đúng)" hoặc "A. ... [Đúng]"
 *   + Dòng đáp án riêng: "Đáp án: A", "Đáp án đúng: B", "Key: C", "Answer: A"
 * - Lời giải: "Giải thích: ...", "Lời giải: ...", "Explanation: ..."
 */
export function parseQuizText(rawText: string): ParsedQuizQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  // Chuẩn hóa dòng: thay thế CRLF bằng LF, tách dòng
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: ParsedQuizQuestion[] = [];

  // Regex nhận diện bắt đầu một câu hỏi mới:
  // "Câu 1:", "Câu 1.", "Câu 1 -", "Bài 1:", "Question 1:", "1.", "1:"
  const questionStartRegex = /^(?:câu|bài|question)\s*(\d+)[\s.:\-)]|^\b(\d+)[\s.:)]\s+/i;

  // Regex nhận diện phương án đơn:
  // "A.", "A)", "*A.", "[x] A.", "a.", "B.", etc.
  const optionPrefixRegex = /^(?:[*•-]\s*)?(?:\[([ xX])\]\s*)?([A-Ea-e])[\s.:)]\s*(.*)$/;

  // Regex nhận diện dòng đáp án:
  // "Đáp án: A", "Đáp án đúng: B", "Answer: C", "Key: D"
  const answerKeyRegex = /^(?:đáp án(?: đúng)?|answer|key)[\s.:=]+([A-Ea-e])/i;

  // Regex nhận diện lời giải / giải thích:
  // "Giải thích: ...", "Lời giải: ..."
  const explanationRegex = /^(?:giải thích|lời giải|explanation)[\s.:=]+(.*)$/i;

  let currentQuestion: {
    contentLines: string[];
    options: Array<{ letter: string; text: string; isCorrect: boolean }>;
    answerLetter?: string;
    explanation?: string;
  } | null = null;

  const finalizeQuestion = () => {
    if (!currentQuestion) return;
    const content = currentQuestion.contentLines.join(' ').trim();
    if (!content || currentQuestion.options.length < 2) return;

    // Xác định đáp án đúng
    let hasCorrect = currentQuestion.options.some((o) => o.isCorrect);

    // Nếu có dòng "Đáp án: X", cập nhật đáp án đúng theo ký tự X
    if (currentQuestion.answerLetter) {
      const targetLetter = currentQuestion.answerLetter.toUpperCase();
      let matched = false;
      currentQuestion.options.forEach((opt) => {
        if (opt.letter.toUpperCase() === targetLetter) {
          opt.isCorrect = true;
          matched = true;
        } else {
          opt.isCorrect = false;
        }
      });
      if (matched) hasCorrect = true;
    }

    // Nếu vẫn chưa có đáp án đúng nào, mặc định chọn phương án đầu tiên
    if (!hasCorrect && currentQuestion.options.length > 0) {
      currentQuestion.options[0].isCorrect = true;
    }

    questions.push({
      content,
      explanation: currentQuestion.explanation?.trim() || 'Đây là đáp án chính xác theo nội dung bài học.',
      points: 10,
      options: currentQuestion.options.map((opt) => ({
        optionText: opt.text.trim(),
        isCorrect: opt.isCorrect,
      })),
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Kiểm tra dòng có phải là đáp án riêng "Đáp án: A"
    const ansMatch = line.match(answerKeyRegex);
    if (ansMatch && currentQuestion) {
      currentQuestion.answerLetter = ansMatch[1];
      continue;
    }

    // 2. Kiểm tra dòng có phải là giải thích "Giải thích: ..."
    const expMatch = line.match(explanationRegex);
    if (expMatch && currentQuestion) {
      currentQuestion.explanation = expMatch[1] || '';
      continue;
    }

    // 3. Kiểm tra dòng câu hỏi mới
    const isNewQuestion = questionStartRegex.test(line);
    if (isNewQuestion) {
      finalizeQuestion();
      // Bỏ tiền tố "Câu X:" hoặc "1." nếu muốn nội dung sạch
      const cleanContent = line.replace(questionStartRegex, '').trim() || line;
      currentQuestion = {
        contentLines: [cleanContent],
        options: [],
      };
      continue;
    }

    // 4. Kiểm tra dòng có các phương án (có thể 1 dòng có nhiều phương án: "A. X    B. Y")
    // Tách các phương án nếu nằm cùng 1 dòng
    const multiOptionParts = line.split(/(?=\s+[B-E][.:\)])/);
    if (multiOptionParts.length > 1 && currentQuestion) {
      let allMatch = true;
      const parsedParts: Array<{ letter: string; text: string; isCorrect: boolean }> = [];
      for (const part of multiOptionParts) {
        const pTrim = part.trim();
        const m = pTrim.match(optionPrefixRegex);
        if (m) {
          const isMarked =
            pTrim.startsWith('*') ||
            pTrim.endsWith('*') ||
            m[1]?.toLowerCase() === 'x' ||
            /\((?:đúng|chính xác)\)|\[(?:đúng|chính xác)\]/i.test(pTrim);

          const cleanText = m[3]
            .replace(/\*$/, '')
            .replace(/\s*\((?:đúng|chính xác)\)/i, '')
            .replace(/\s*\[(?:đúng|chính xác)\]/i, '')
            .trim();

          parsedParts.push({
            letter: m[2],
            text: cleanText,
            isCorrect: isMarked,
          });
        } else {
          allMatch = false;
          break;
        }
      }

      if (allMatch && parsedParts.length >= 2) {
        currentQuestion.options.push(...parsedParts);
        continue;
      }
    }

    // Kiểm tra dòng phương án đơn
    const optMatch = line.match(optionPrefixRegex);
    if (optMatch && currentQuestion) {
      const isMarked =
        line.startsWith('*') ||
        line.endsWith('*') ||
        optMatch[1]?.toLowerCase() === 'x' ||
        /\((?:đúng|chính xác)\)|\[(?:đúng|chính xác)\]/i.test(line);

      const cleanText = optMatch[3]
        .replace(/\*$/, '')
        .replace(/\s*\((?:đúng|chính xác)\)/i, '')
        .replace(/\s*\[(?:đúng|chính xác)\]/i, '')
        .trim();

      currentQuestion.options.push({
        letter: optMatch[2],
        text: cleanText,
        isCorrect: isMarked,
      });
      continue;
    }

    // Nếu không khớp với cái nào trên:
    if (currentQuestion) {
      if (currentQuestion.options.length === 0) {
        // Vẫn đang trong phần nội dung câu hỏi (nhiều dòng)
        currentQuestion.contentLines.push(line);
      } else {
        // Nối vào nội dung phương án cuối cùng hoặc giải thích
        const lastOpt = currentQuestion.options[currentQuestion.options.length - 1];
        lastOpt.text += ` ${line}`;
      }
    }
  }

  // Kết thúc câu hỏi cuối cùng
  finalizeQuestion();

  // Chia đều điểm số sao cho tổng điểm là 100 nếu có câu hỏi
  if (questions.length > 0) {
    const pointsPerQuestion = Math.max(1, Math.round(100 / questions.length));
    questions.forEach((q) => {
      q.points = pointsPerQuestion;
    });
  }

  return questions;
}

/**
 * Trích xuất văn bản từ tệp Word (.docx) và phân tích thành danh sách câu hỏi trắc nghiệm
 */
export async function parseDocxQuizFile(file: File): Promise<{
  questions: ParsedQuizQuestion[];
  rawText: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value;
  const questions = parseQuizText(rawText);
  return { questions, rawText };
}
