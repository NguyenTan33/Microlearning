import type { CourseDetail, QuizDetail } from '../types/catalog.types';

export const SAMPLE_COURSES: CourseDetail[] = [
  // ==========================================
  // KHÓA HỌC 1: MICROSOFT EXCEL
  // ==========================================
  {
    id: 1,
    title: 'Thành Thạo Microsoft Excel Từ Cơ Bản Đến Chuyên Sâu',
    description: 'Lộ trình thực chiến kỹ năng bảng tính: các hàm xử lý dữ liệu (VLOOKUP, XLOOKUP, INDEX-MATCH), định dạng có điều kiện, bảng Pivot Table và tự động hóa báo cáo phân tích.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600',
    version: 1,
    isPublished: true,
    createdAt: '2026-10-01T08:00:00Z',
    totalSubjects: 2,
    subjects: [
      {
        id: 101,
        courseId: 1,
        title: 'Hàm Xử Lý & Tính Toán Dữ Liệu Nâng Cao',
        description: 'Làm chủ các hàm điều kiện, tìm kiếm tham chiếu dữ liệu phức tạp trong thực tế công việc.',
        sortOrder: 1,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 3,
        lessons: [
          {
            id: 1001,
            subjectId: 101,
            title: 'Tuyệt chiêu hàm dò tìm VLOOKUP và XLOOKUP thực tế',
            description: 'Hiểu rõ cơ chế tìm kiếm chính xác và gần đúng, khắc phục lỗi #N/A phổ biến khi dò tìm bảng phụ.',
            durationSeconds: 180,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 1002,
            subjectId: 101,
            title: 'Kỹ thuật kết hợp INDEX & MATCH xử lý bảng tính phức tạp',
            description: 'Giải pháp thay thế linh hoạt vượt giới hạn của VLOOKUP khi làm việc với cơ sở dữ liệu lớn.',
            durationSeconds: 210,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 1003,
            subjectId: 101,
            title: 'Ứng dụng hàm điều kiện IF, IFS, SUMIFS và COUNTIFS',
            description: 'Tổng hợp và đếm dữ liệu theo nhiều tiêu chí lọc cùng lúc cho báo cáo bán hàng.',
            durationSeconds: 190,
            sortOrder: 3,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
      {
        id: 102,
        courseId: 1,
        title: 'Phân Tích Dữ Liệu & Báo Cáo Pivot Table',
        description: 'Biến hàng nghìn dòng dữ liệu thô thành báo cáo tổng hợp trực quan chỉ với vài thao tác kéo thả.',
        sortOrder: 2,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 2,
        lessons: [
          {
            id: 1004,
            subjectId: 102,
            title: 'Khai phá sức mạnh Pivot Table & Slicer lọc đa chiều',
            description: 'Tạo báo cáo doanh số, cơ cấu tỷ trọng và tích hợp bộ lọc thời gian trực quan Slicer.',
            durationSeconds: 240,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 1005,
            subjectId: 102,
            title: 'Thiết kế biểu đồ động Dashboard chuyên nghiệp',
            description: 'Kết hợp Conditional Formatting, Sparklines và biểu đồ phân tích xu hướng kinh doanh.',
            durationSeconds: 220,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
    ],
  },

  // ==========================================
  // KHÓA HỌC 2: MICROSOFT WORD
  // ==========================================
  {
    id: 2,
    title: 'Kỹ Năng Microsoft Word Soạn Thảo Văn Bản Chuyên Nghiệp',
    description: 'Chuẩn hóa văn bản hành chính, quản lý hệ thống Style phân cấp, đánh số trang tự động theo chương mục, mục lục tự động và kỹ thuật trộn thư Mail Merge gửi hợp đồng hàng loạt.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600',
    version: 1,
    isPublished: true,
    createdAt: '2026-10-01T08:00:00Z',
    totalSubjects: 2,
    subjects: [
      {
        id: 201,
        courseId: 2,
        title: 'Quy Chuẩn Thể Thức & Hệ Thống Styles Phân Cấp',
        description: 'Thiết lập văn bản quy chuẩn hành chính và tự động hóa mục lục tài liệu lớn.',
        sortOrder: 1,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 2,
        lessons: [
          {
            id: 2001,
            subjectId: 201,
            title: 'Thiết lập lề trang, dãn dòng và font chữ chuẩn Nghị định',
            description: 'Quy định căn lề A4 chuẩn, khoảng cách đoạn Before/After và Line Spacing theo thể thức văn bản hành chính.',
            durationSeconds: 160,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 2002,
            subjectId: 201,
            title: 'Tự động hóa định dạng với hệ thống Styles & Mục lục tự động',
            description: 'Xây dựng Heading 1, 2, 3 gắn liền với Navigation Pane và chèn Table of Contents cập nhật 1 chạm.',
            durationSeconds: 195,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
      {
        id: 202,
        courseId: 2,
        title: 'Ngắt Trang Section Break & Trộn Thư Mail Merge',
        description: 'Kỹ thuật phân chia vùng tài liệu độc lập và tạo thư mời, hợp đồng tự động.',
        sortOrder: 2,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 2,
        lessons: [
          {
            id: 2003,
            subjectId: 202,
            title: 'Đánh số trang linh hoạt phân chia Section Breaks',
            description: 'Kỹ thuật ngắt liên kết Link to Previous để trang bìa, mục lục và nội dung chính có cách đánh số trang khác nhau.',
            durationSeconds: 175,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 2004,
            subjectId: 202,
            title: 'Ứng dụng trộn thư Mail Merge gửi hợp đồng hàng loạt',
            description: 'Kết nối danh sách Excel vào biểu mẫu Word để tự động in và gửi hàng trăm tài liệu cá nhân hóa.',
            durationSeconds: 230,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
    ],
  },

  // ==========================================
  // KHÓA HỌC 3: LẬP TRÌNH WEB IT (REACT & TYPESCRIPT)
  // ==========================================
  {
    id: 3,
    title: 'Lập Trình Web Hiện Đại Với React 18, TypeScript & Tailwind CSS',
    description: 'Chuyên đề thực chiến về Functional Components, Custom Hooks, quản lý Server State với TanStack Query, tối ưu hiệu năng re-render và xây dựng kiến trúc Frontend chuẩn doanh nghiệp.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
    version: 1,
    isPublished: true,
    createdAt: '2026-10-01T08:00:00Z',
    totalSubjects: 2,
    subjects: [
      {
        id: 301,
        courseId: 3,
        title: 'Nền Tảng React Hooks & TypeScript Strict Mode',
        description: 'Xây dựng mã nguồn sạch, type-safe và tách biệt UI với Business Logic.',
        sortOrder: 1,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 2,
        lessons: [
          {
            id: 3001,
            subjectId: 301,
            title: 'Tư duy React Component, Hooks & Tách Biệt Nghiệp Vụ',
            description: 'Áp dụng Custom Hooks để đóng gói logic tương tác API và giữ Dumb Components thuần túy trình bày.',
            durationSeconds: 220,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 3002,
            subjectId: 301,
            title: 'Tối ưu hiệu năng re-render với useMemo, useCallback & React.memo',
            description: 'Đo lường chi phí render và ngăn chặn các re-render con cháu không cần thiết trong bảng dữ liệu lớn.',
            durationSeconds: 250,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
      {
        id: 302,
        courseId: 3,
        title: 'Server State & Kiến Trúc Offline-First',
        description: 'Lưu trữ dữ liệu cục bộ với IndexedDB và đồng bộ 2 chiều qua hàng đợi Outbox.',
        sortOrder: 2,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 2,
        lessons: [
          {
            id: 3003,
            subjectId: 302,
            title: 'Quản lý dữ liệu máy chủ và Caching với TanStack Query',
            description: 'Tận dụng cơ chế stale-while-revalidate, retry tự động và mutation optimistic updates.',
            durationSeconds: 210,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 3004,
            subjectId: 302,
            title: 'Thiết kế bộ nhớ cục bộ IndexedDB cho ứng dụng Offline-First',
            description: 'Tạo các Object Stores lưu trữ Video Blob, Outbox queue và Metadata với Web Crypto SHA-256.',
            durationSeconds: 270,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
    ],
  },

  // ==========================================
  // KHÓA HỌC 4: QUẢN TRỊ CSDL SQL SERVER IT
  // ==========================================
  {
    id: 4,
    title: 'Quản Trị Cơ Sở Dữ Liệu SQL Server & T-SQL Chuyên Sâu',
    description: 'Nắm vững kỹ thuật viết truy vấn JOIN hiệu năng cao, thiết kế chỉ mục Clustered/Non-Clustered Indexes, đọc Execution Plan và quản lý giao dịch ACID tránh Deadlock.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600',
    version: 1,
    isPublished: true,
    createdAt: '2026-10-01T08:00:00Z',
    totalSubjects: 2,
    subjects: [
      {
        id: 401,
        courseId: 4,
        title: 'Tối Ưu Hóa Truy Vấn & Đánh Chỉ Mục Indexing',
        description: 'Cách biến câu lệnh SQL chạy vài phút xuống còn vài mili-giây trên cơ sở dữ liệu triệu bản ghi.',
        sortOrder: 1,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 2,
        lessons: [
          {
            id: 4001,
            subjectId: 401,
            title: 'Kỹ thuật viết truy vấn JOIN, GROUP BY và Window Functions',
            description: 'Sử dụng ROW_NUMBER(), DENSE_RANK() và CTE để phân trang dữ liệu và giải quyết bài toán trùng lặp.',
            durationSeconds: 230,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 4002,
            subjectId: 401,
            title: 'Thiết kế Clustered & Non-Clustered Index chống nghẽn I/O',
            description: 'Đọc Execution Plan, phát hiện Table Scan, RID Lookup và tối ưu Covering Index.',
            durationSeconds: 260,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
      {
        id: 402,
        courseId: 4,
        title: 'Giao Dịch ACID & Cơ Chế Khóa Concurrency',
        description: 'Đảm bảo tính nhất quán dữ liệu trong môi trường nhiều giao dịch đồng thời.',
        sortOrder: 2,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 1,
        lessons: [
          {
            id: 4003,
            subjectId: 402,
            title: 'Quản lý Transaction, Isolation Levels và phòng tránh Deadlock',
            description: 'Phân tích 4 cấp độ cô lập giao dịch Read Uncommitted, Read Committed, Repeatable Read và Serializable.',
            durationSeconds: 240,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
    ],
  },

  // ==========================================
  // KHÓA HỌC 5: LẬP TRÌNH C# .NET 8 BACKEND IT
  // ==========================================
  {
    id: 5,
    title: 'Lập trình C# & .NET 8 Hiện Đại',
    description: 'Khóa học nền tảng toàn diện về C# 12, ASP.NET Core Web API, Entity Framework Core 8, Dependency Injection và nguyên tắc SOLID trong các dự án thực tế.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600',
    version: 1,
    isPublished: true,
    createdAt: '2026-10-01T08:00:00Z',
    totalSubjects: 1,
    subjects: [
      {
        id: 501,
        courseId: 5,
        title: 'Cơ bản về .NET 8 & Clean Architecture',
        description: 'Tìm hiểu vòng đời ứng dụng .NET, Dependency Injection và tổ chức mã nguồn sạch.',
        sortOrder: 1,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 2,
        lessons: [
          {
            id: 5001,
            subjectId: 501,
            title: 'Giới thiệu ASP.NET Core & Dependency Injection',
            description: 'Nắm vững cách hoạt động của IoC Container, Scoped, Singleton, Transient trong .NET 8.',
            durationSeconds: 240,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 5002,
            subjectId: 501,
            title: 'Nguyên lý SOLID & Thin Controllers',
            description: 'Tách biệt rõ ràng tầng Controller, Service và Repository để code dễ bảo trì.',
            durationSeconds: 280,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
    ],
  },

  // ==========================================
  // KHÓA HỌC 6: KIẾN TRÚC OFFLINE-FIRST MOBILE & WEB APP
  // ==========================================
  {
    id: 6,
    title: 'Kiến trúc Offline-First Mobile & Web App',
    description: 'Chuyên đề chuyên sâu về Idempotency, Monotonic Merge, Outbox Pattern và Sequence Delta Sync trong các hệ thống phân tán và ứng dụng không coi mất mạng là lỗi.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600',
    version: 1,
    isPublished: true,
    createdAt: '2026-10-01T08:00:00Z',
    totalSubjects: 1,
    subjects: [
      {
        id: 601,
        courseId: 6,
        title: 'Thuật toán Đồng bộ & Giải quyết Xung đột',
        description: 'Cách giải quyết xung đột dữ liệu giữa nhiều thiết bị và hàng đợi ngoại tuyến.',
        sortOrder: 1,
        createdAt: '2026-10-01T08:00:00Z',
        totalLessons: 2,
        lessons: [
          {
            id: 18,
            subjectId: 601,
            title: 'Monotonic Merge chống tụt lùi tiến độ',
            description: 'Ứng dụng hàm Math.Max để đảm bảo tiến độ học tập trên máy tính và điện thoại luôn nhất quán.',
            durationSeconds: 240,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 6001,
            subjectId: 601,
            title: 'Monotonic Merge chống tụt lùi tiến độ',
            description: 'Ứng dụng hàm Math.Max để đảm bảo tiến độ học tập trên máy tính và điện thoại luôn nhất quán.',
            durationSeconds: 240,
            sortOrder: 1,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 19,
            subjectId: 601,
            title: 'Idempotency Key & Chống nộp bài trùng lặp',
            description: 'Sử dụng ClientAttemptId dạng GUID để bảo vệ server khỏi duplicate requests khi mạng lag.',
            durationSeconds: 250,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
          {
            id: 6002,
            subjectId: 601,
            title: 'Idempotency Key & Chống nộp bài trùng lặp',
            description: 'Sử dụng ClientAttemptId dạng GUID để bảo vệ server khỏi duplicate requests khi mạng lag.',
            durationSeconds: 250,
            sortOrder: 2,
            version: 1,
            isPublished: true,
            createdAt: '2026-10-01T08:00:00Z',
            hasQuiz: true,
            mediaAssetCount: 1,
          },
        ],
      },
    ],
  },
];

export const SAMPLE_QUIZZES: Record<number, QuizDetail> = {
  1001: {
    id: 101,
    lessonId: 1001,
    title: 'Đánh giá: Ứng dụng hàm VLOOKUP & XLOOKUP trong Excel',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Trong hàm =VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup]), đối số [range_lookup] cần đặt là gì để tìm kiếm giá trị chính xác tuyệt đối?',
        explanation: 'Đặt range_lookup là 0 (hoặc FALSE) để Excel dò tìm giá trị chính xác 100%.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: '0 hoặc FALSE', sortOrder: 1 },
          { id: 2, optionText: '1 hoặc TRUE', sortOrder: 2 },
          { id: 3, optionText: 'Bỏ trống không điền', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Ưu điểm vượt trội lớn nhất của hàm XLOOKUP so với VLOOKUP truyền thống là gì?',
        explanation: 'XLOOKUP có thể dò tìm từ phải sang trái, không cần đếm số thứ tự cột và mặc định dò tìm chính xác.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Có thể dò tìm hai chiều (trái sang phải hoặc phải sang trái) linh hoạt.', sortOrder: 1 },
          { id: 2, optionText: 'Chỉ hoạt động được khi dữ liệu đã sắp xếp thứ tự A-Z.', sortOrder: 2 },
          { id: 3, optionText: 'Tự động đổi màu ô dữ liệu mà không cần định dạng.', sortOrder: 3 },
        ],
      },
    ],
  },

  1002: {
    id: 102,
    lessonId: 1002,
    title: 'Đánh giá: Kỹ thuật kết hợp INDEX & MATCH trong Excel',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Trong cặp hàm INDEX & MATCH, hàm nào đóng vai trò xác định vị trí số dòng hoặc số cột?',
        explanation: 'Hàm MATCH tìm kiếm giá trị và trả về vị trí tương đối (số dòng hoặc cột) của giá trị đó.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Hàm MATCH', sortOrder: 1 },
          { id: 2, optionText: 'Hàm INDEX', sortOrder: 2 },
          { id: 3, optionText: 'Cả hai hàm cùng lúc', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Tại sao INDEX & MATCH thường chạy nhanh hơn VLOOKUP trên các bảng tính hàng chục nghìn dòng?',
        explanation: 'INDEX & MATCH chỉ tham chiếu đúng 2 cột (cột tìm kiếm và cột kết quả), không phải tải toàn bộ mảng dữ liệu table_array vào bộ nhớ.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Chỉ tham chiếu đến các cột cần thiết thay vì toàn bộ bảng.', sortOrder: 1 },
          { id: 2, optionText: 'Tự động nén dung lượng file Excel.', sortOrder: 2 },
          { id: 3, optionText: 'Chỉ dùng được trên Excel 365.', sortOrder: 3 },
        ],
      },
    ],
  },

  1003: {
    id: 103,
    lessonId: 1003,
    title: 'Đánh giá: Hàm điều kiện SUMIFS & COUNTIFS trong Excel',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Cú pháp của hàm SUMIFS khác hàm SUMIF như thế nào?',
        explanation: 'Trong SUMIFS, vùng tính tổng (sum_range) được đặt ở vị trí đầu tiên, sau đó là các cặp vùng điều kiện và điều kiện.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Vùng cần tính tổng (sum_range) nằm ở vị trí đầu tiên.', sortOrder: 1 },
          { id: 2, optionText: 'Vùng cần tính tổng nằm ở vị trí cuối cùng.', sortOrder: 2 },
          { id: 3, optionText: 'Không có sự khác biệt về vị trí đối số.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Để đếm số đơn hàng có giá trị trên 500.000đ trong tháng 10, ta dùng hàm nào tối ưu nhất?',
        explanation: 'Hàm COUNTIFS cho phép đếm theo nhiều điều kiện đồng thời.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'COUNTIFS', sortOrder: 1 },
          { id: 2, optionText: 'SUMIFS', sortOrder: 2 },
          { id: 3, optionText: 'VLOOKUP', sortOrder: 3 },
        ],
      },
    ],
  },

  1004: {
    id: 104,
    lessonId: 1004,
    title: 'Đánh giá: Khai phá sức mạnh Pivot Table & Slicer',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Công cụ Slicer trong Pivot Table được sử dụng nhằm mục đích gì?',
        explanation: 'Slicer là bộ lọc trực quan giúp lọc dữ liệu Pivot Table chỉ bằng các nút bấm bấm tương tác.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Bộ lọc đồ họa trực quan giúp lọc nhanh dữ liệu báo cáo.', sortOrder: 1 },
          { id: 2, optionText: 'Xóa các ô dữ liệu bị trùng lặp.', sortOrder: 2 },
          { id: 3, optionText: 'Đổi tên các sheet trong tệp Excel.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Muốn thay đổi phép tính tổng Sum thành Đếm Count trong Pivot Table, ta tùy chỉnh ở đâu?',
        explanation: 'Vào Value Field Settings và chọn hàm tổng hợp tương ứng (Sum, Count, Average, Max, Min).',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Vào Value Field Settings (Cài đặt trường giá trị).', sortOrder: 1 },
          { id: 2, optionText: 'Vào Page Layout -> Margins.', sortOrder: 2 },
          { id: 3, optionText: 'Xóa bảng và tạo lại từ đầu.', sortOrder: 3 },
        ],
      },
    ],
  },

  1005: {
    id: 105,
    lessonId: 1005,
    title: 'Đánh giá: Thiết kế biểu đồ động Dashboard Excel',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Biểu đồ Sparklines trong Excel là gì?',
        explanation: 'Sparklines là các biểu đồ thu nhỏ nằm gọn trong một ô bảng tính để hiển thị xu hướng dữ liệu.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Biểu đồ mini nằm gọn trong một ô tính để phản ánh xu hướng.', sortOrder: 1 },
          { id: 2, optionText: 'Biểu đồ hình tròn 3D toàn màn hình.', sortOrder: 2 },
          { id: 3, optionText: 'Một loại mã vạch xuất sang máy in.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Tính năng Conditional Formatting thường được kết hợp trên Dashboard nhằm mục đích gì?',
        explanation: 'Tự động làm nổi bật các giá trị vượt chỉ tiêu, cảnh báo rủi ro dựa trên quy tắc điều kiện.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Tự động đổi màu cảnh báo trực quan theo điều kiện giá trị.', sortOrder: 1 },
          { id: 2, optionText: 'Khóa mật khẩu bảo vệ file tính.', sortOrder: 2 },
          { id: 3, optionText: 'Tính tổng cột doanh thu tự động.', sortOrder: 3 },
        ],
      },
    ],
  },

  2001: {
    id: 201,
    lessonId: 2001,
    title: 'Đánh giá: Quy chuẩn thể thức soạn thảo văn bản Word',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Theo quy định thể thức văn bản hành chính, khoảng cách căn lề chuẩn khổ giấy A4 là:',
        explanation: 'Lề trên: 20-25mm, Lề dưới: 20-25mm, Lề trái: 30-35mm (đóng gáy), Lề phải: 15-20mm.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Trên 20-25mm, Dưới 20-25mm, Trái 30-35mm, Phải 15-20mm', sortOrder: 1 },
          { id: 2, optionText: 'Bốn cạnh đều căn đều 20mm', sortOrder: 2 },
          { id: 3, optionText: 'Lề trái 15mm, Lề phải 30mm', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Để tạo Mục lục tự động (Table of Contents) chính xác trong Word, bạn bắt buộc phải làm bước nào trước?',
        explanation: 'Các tiêu đề chương mục phải được gán hệ thống Heading Styles (Heading 1, Heading 2, Heading 3).',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Gán các cấp độ Heading Styles tương ứng cho từng tiêu đề mục.', sortOrder: 1 },
          { id: 2, optionText: 'Tô màu vàng cho tất cả các tiêu đề.', sortOrder: 2 },
          { id: 3, optionText: 'Đánh số trang thủ công bằng bàn phím.', sortOrder: 3 },
        ],
      },
    ],
  },

  2002: {
    id: 202,
    lessonId: 2002,
    title: 'Đánh giá: Quản lý hệ thống Styles & Mục lục tự động trong Word',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Lợi ích của việc hiệu chỉnh Modify Style thay vì định dạng thủ công từng đoạn là gì?',
        explanation: 'Khi Modify Style, tất cả các đoạn văn bản đang áp dụng Style đó trên toàn bộ tài liệu sẽ tự động đồng bộ thay đổi.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Tất cả các đoạn áp dụng Style sẽ tự động đồng bộ theo định dạng mới.', sortOrder: 1 },
          { id: 2, optionText: 'Giúp Word không bao giờ bị tắt đột ngột.', sortOrder: 2 },
          { id: 3, optionText: 'Tự động dịch sang tiếng Anh.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Phím tắt nào giúp cập nhật toàn bộ mục lục (Update Entire Table) trong Word?',
        explanation: 'Nhấn F9 khi con trỏ đang ở trong bảng mục lục để cập nhật số trang và tiêu đề.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Phím F9', sortOrder: 1 },
          { id: 2, optionText: 'Phím F5', sortOrder: 2 },
          { id: 3, optionText: 'Phím Esc', sortOrder: 3 },
        ],
      },
    ],
  },

  2003: {
    id: 203,
    lessonId: 2003,
    title: 'Đánh giá: Section Breaks & Đánh số trang linh hoạt trong Word',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Để trang bìa không có số trang và trang nội dung bắt đầu từ số 1, ta cần dùng tính năng gì?',
        explanation: 'Chèn Section Break (Next Page) và ngắt liên kết Link to Previous ở Header/Footer của Section 2.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Section Break (Next Page) và ngắt Link to Previous.', sortOrder: 1 },
          { id: 2, optionText: 'Chèn ngắt trang Page Break thông thường.', sortOrder: 2 },
          { id: 3, optionText: 'Xóa toàn bộ chân trang Footer.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Khác biệt căn bản giữa Page Break và Section Break là gì?',
        explanation: 'Page Break chỉ đẩy nội dung sang trang mới, còn Section Break cho phép thay đổi lề, khổ giấy, header/footer độc lập giữa các phần.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Section Break cho phép định dạng lề, hướng giấy và Header/Footer độc lập.', sortOrder: 1 },
          { id: 2, optionText: 'Page Break chỉ dùng được trên máy Mac.', sortOrder: 2 },
          { id: 3, optionText: 'Không có điểm khác nhau nào.', sortOrder: 3 },
        ],
      },
    ],
  },

  2004: {
    id: 204,
    lessonId: 2004,
    title: 'Đánh giá: Ứng dụng Mail Merge gửi hợp đồng hàng loạt',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Trong quy trình Mail Merge, nguồn dữ liệu (Data Source) thường được lấy từ đâu phổ biến nhất?',
        explanation: 'Bảng tính Excel (.xlsx) chứa danh sách họ tên, mã số, thông tin hợp đồng của các đối tượng.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'File bảng tính Microsoft Excel (.xlsx)', sortOrder: 1 },
          { id: 2, optionText: 'File ảnh Photoshop (.psd)', sortOrder: 2 },
          { id: 3, optionText: 'File âm thanh MP3', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Để xem trước nội dung sau khi ghép trường dữ liệu trong Mail Merge, ta dùng tính năng nào?',
        explanation: 'Tính năng Preview Results trên tab Mailings cho phép duyệt từng bản ghi thực tế.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Preview Results (Xem trước kết quả)', sortOrder: 1 },
          { id: 2, optionText: 'Format Painter', sortOrder: 2 },
          { id: 3, optionText: 'Spelling & Grammar', sortOrder: 3 },
        ],
      },
    ],
  },

  3001: {
    id: 301,
    lessonId: 3001,
    title: 'Đánh giá: React Hooks & TypeScript Best Practices',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Lợi ích quan trọng nhất của việc viết Custom Hook để bọc logic nghiệp vụ là gì?',
        explanation: 'Giúp tách biệt logic khỏi giao diện (Separation of Concerns), dễ tái sử dụng và viết Unit Test.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Tách biệt rõ ràng Business Logic và UI, tăng tính tái sử dụng và dễ kiểm thử.', sortOrder: 1 },
          { id: 2, optionText: 'Làm cho component chạy nhanh gấp 10 lần mà không tốn RAM.', sortOrder: 2 },
          { id: 3, optionText: 'Bắt buộc trong quy định của React compiler.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Hook useMemo trong React được sử dụng với mục đích chính là gì?',
        explanation: 'useMemo ghi nhớ (memoize) kết quả tính toán tốn kém tài nguyên để tránh tính lại ở mỗi lần render.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Ghi nhớ kết quả của một phép tính toán nặng để tránh thực thi lại khi re-render không cần thiết.', sortOrder: 1 },
          { id: 2, optionText: 'Gọi API bất đồng bộ mỗi khi mount component.', sortOrder: 2 },
          { id: 3, optionText: 'Thay thế hoàn toàn cho biến trạng thái useState.', sortOrder: 3 },
        ],
      },
    ],
  },

  3002: {
    id: 302,
    lessonId: 3002,
    title: 'Đánh giá: Tối ưu hiệu năng re-render trong React',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'React.memo giúp tối ưu hóa hiệu năng render cho Component khi nào?',
        explanation: 'React.memo bỏ qua việc render lại component nếu các props truyền vào không thay đổi giá trị (shallow comparison).',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Khi props truyền vào component không thay đổi giá trị.', sortOrder: 1 },
          { id: 2, optionText: 'Khi người dùng cuộn chuột qua component.', sortOrder: 2 },
          { id: 3, optionText: 'Chỉ khi component sử dụng Redux.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Tại sao cần truyền useCallback khi truyền hàm callback xuống component con được bọc React.memo?',
        explanation: 'Nếu không dùng useCallback, hàm mới sẽ được tạo lại ở mỗi lần render cha, làm phá vỡ cơ chế shallow comparison của React.memo.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Giữ nguyên tham chiếu bộ nhớ của hàm để tránh làm React.memo render lại.', sortOrder: 1 },
          { id: 2, optionText: 'Để hàm chạy đa luồng (multi-threaded).', sortOrder: 2 },
          { id: 3, optionText: 'Để ép buộc trình duyệt bật tăng tốc đồ họa GPU.', sortOrder: 3 },
        ],
      },
    ],
  },

  3003: {
    id: 303,
    lessonId: 3003,
    title: 'Đánh giá: TanStack Query & Server State Management',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Chiến lược Caching "stale-while-revalidate" của TanStack Query hoạt động như thế nào?',
        explanation: 'Trả về dữ liệu cũ đã cache ngay lập tức để người dùng không phải chờ đợi, đồng thời ngầm gửi request kiểm tra và cập nhật dữ liệu mới.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Hiển thị dữ liệu cache ngay, đồng thời ngầm tải dữ liệu mới từ server.', sortOrder: 1 },
          { id: 2, optionText: 'Xóa toàn bộ cache mỗi 5 giây.', sortOrder: 2 },
          { id: 3, optionText: 'Chặn toàn bộ tương tác màn hình đến khi API trả về.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Thuộc tính staleTime trong useQuery quy định điều gì?',
        explanation: 'Khoảng thời gian dữ liệu được xem là "tươi mới", trong thời gian này TanStack Query sẽ không tự động fetch lại.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Thời gian dữ liệu được coi là tươi mới và không cần fetch lại.', sortOrder: 1 },
          { id: 2, optionText: 'Thời gian chờ timeout của request mạng.', sortOrder: 2 },
          { id: 3, optionText: 'Thời gian session đăng nhập hết hạn.', sortOrder: 3 },
        ],
      },
    ],
  },

  3004: {
    id: 304,
    lessonId: 3004,
    title: 'Đánh giá: IndexedDB & Kiến trúc Offline-First',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Tại sao IndexedDB phù hợp cho việc lưu trữ Video ngoại tuyến hơn LocalStorage?',
        explanation: 'IndexedDB hỗ trợ lưu trữ dữ liệu nhị phân Blob dung lượng hàng trăm MB/GB và có giao dịch bất đồng bộ phi chặn.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Hỗ trợ lưu trữ nhị phân Blob dung lượng lớn và giao dịch bất đồng bộ.', sortOrder: 1 },
          { id: 2, optionText: 'Chỉ vì IndexedDB có màu tím đẹp hơn.', sortOrder: 2 },
          { id: 3, optionText: 'LocalStorage bị giới hạn tối đa chỉ khoảng 5MB chuỗi text.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Để kiểm tra tính toàn vẹn của file tải về trước khi lưu vào IndexedDB, ta nên áp dụng giải pháp nào?',
        explanation: 'Tính mã băm SHA-256 của file tải về và so sánh với mã băm Checksum do máy chủ cung cấp.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Băm mã SHA-256 qua Web Crypto API và đối chiếu với Checksum máy chủ.', sortOrder: 1 },
          { id: 2, optionText: 'Đo kích thước chiều rộng pixel của video.', sortOrder: 2 },
          { id: 3, optionText: 'Đổi đuôi file thành .txt để xem mã nhị phân.', sortOrder: 3 },
        ],
      },
    ],
  },

  4001: {
    id: 401,
    lessonId: 4001,
    title: 'Đánh giá: T-SQL Indexing & Execution Plans',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Một bảng (Table) trong SQL Server có thể có tối đa bao nhiêu Clustered Index?',
        explanation: 'Mỗi bảng chỉ có thể có duy nhất 1 Clustered Index vì dữ liệu vật lý trên ổ đĩa chỉ có thể sắp xếp theo 1 trật tự.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Chỉ duy nhất 1 Clustered Index.', sortOrder: 1 },
          { id: 2, optionText: 'Tối đa 249 Clustered Indexes.', sortOrder: 2 },
          { id: 3, optionText: 'Không giới hạn số lượng.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Hiện tượng Index Scan so với Index Seek có ý nghĩa gì về mặt hiệu năng?',
        explanation: 'Index Seek tìm thẳng tới bản ghi thông qua cấu trúc cây B-Tree (rất nhanh), trong khi Index Scan phải duyệt toàn bộ cây chỉ mục.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Index Seek tối ưu hơn vì nhảy trực tiếp tới node dữ liệu, trong khi Index Scan phải quét tuần tự.', sortOrder: 1 },
          { id: 2, optionText: 'Index Scan luôn nhanh hơn Index Seek.', sortOrder: 2 },
          { id: 3, optionText: 'Cả hai có tốc độ hoàn toàn tương đương nhau.', sortOrder: 3 },
        ],
      },
    ],
  },

  4002: {
    id: 402,
    lessonId: 4002,
    title: 'Đánh giá: Chỉ mục Non-Clustered & Covering Index trong SQL Server',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Thế nào là một "Covering Index" trong cơ sở dữ liệu SQL Server?',
        explanation: 'Là chỉ mục chứa tất cả các cột cần thiết cho câu truy vấn (bao gồm cột điều kiện WHERE và các cột SELECT trong mệnh đề INCLUDE).',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Chỉ mục chứa đầy đủ các cột được SELECT mà không cần RID/Key Lookup về bảng gốc.', sortOrder: 1 },
          { id: 2, optionText: 'Chỉ mục che giấu mật khẩu người dùng.', sortOrder: 2 },
          { id: 3, optionText: 'Chỉ mục chỉ áp dụng cho bảng tạm #Temp.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Hiện tượng Key Lookup trong Execution Plan báo hiệu điều gì?',
        explanation: 'Truy vấn phải quay lại bảng dữ liệu chính để lấy thêm các cột không có trong chỉ mục Non-Clustered, làm tăng I/O.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Chỉ mục Non-Clustered thiếu cột và phải tra cứu ngược lại bảng gốc.', sortOrder: 1 },
          { id: 2, optionText: 'Khóa chính của bảng bị mất.', sortOrder: 2 },
          { id: 3, optionText: 'Máy chủ SQL đang chạy ở chế độ Single User.', sortOrder: 3 },
        ],
      },
    ],
  },

  4003: {
    id: 403,
    lessonId: 4003,
    title: 'Đánh giá: Transaction ACID & Phòng ngừa Deadlock',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Chữ cái "I" (Isolation) trong thuộc tính ACID đại diện cho tính chất gì?',
        explanation: 'Tính cô lập đảm bảo các giao dịch chạy song song không nhìn thấy dữ liệu trung gian chưa hoàn tất của nhau.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Tính cô lập (Isolation) giữa các giao dịch đồng thời.', sortOrder: 1 },
          { id: 2, optionText: 'Tính toàn vẹn (Integrity).', sortOrder: 2 },
          { id: 3, optionText: 'Tính tức thời (Immediacy).', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Để giảm thiểu tối đa hiện tượng Deadlock, nguyên tắc lập trình nào là quan trọng nhất?',
        explanation: 'Luôn truy cập và cập nhật các bảng dữ liệu theo một thứ tự nhất quán trong tất cả các transaction.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Truy cập các tài nguyên bảng theo một thứ tự cố định, nhất quán.', sortOrder: 1 },
          { id: 2, optionText: 'Không bao giờ sử dụng lệnh COMMIT.', sortOrder: 2 },
          { id: 3, optionText: 'Cho thời gian timeout của giao dịch lên 24 giờ.', sortOrder: 3 },
        ],
      },
    ],
  },

  5001: {
    id: 501,
    lessonId: 5001,
    title: 'Đánh giá: Dependency Injection & Clean Architecture .NET 8',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Vòng đời "Scoped" trong ASP.NET Core có ý nghĩa như thế nào?',
        explanation: 'Scoped service được tạo một lần duy nhất cho mỗi HTTP Request và được giải phóng khi request kết thúc.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Được tạo một lần duy nhất cho mỗi HTTP Request.', sortOrder: 1 },
          { id: 2, optionText: 'Được tạo mới mỗi khi inject vào constructor.', sortOrder: 2 },
          { id: 3, optionText: 'Được tạo một lần duy nhất cho toàn bộ vòng đời ứng dụng.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Lợi ích lớn nhất của việc dùng Interface cho Service trong .NET là gì?',
        explanation: 'Giúp lỏng liên kết (Loose Coupling), dễ bảo trì và dễ viết Unit Test giả lập (Mocking).',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Giảm liên kết phụ thuộc, dễ dàng thay thế và viết Unit Test.', sortOrder: 1 },
          { id: 2, optionText: 'Giúp ứng dụng chạy nhanh hơn gấp 2 lần.', sortOrder: 2 },
          { id: 3, optionText: 'Bắt buộc trong cú pháp của C#.', sortOrder: 3 },
        ],
      },
    ],
  },

  5002: {
    id: 502,
    lessonId: 5002,
    title: 'Đánh giá: Nguyên lý SOLID & Thin Controllers trong Web API',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Nguyên tắc "Thin Controller" trong kiến trúc Clean Architecture quy định Controller nên làm gì?',
        explanation: 'Controller chỉ nên nhận request, gọi Service nghiệp vụ xử lý và trả về HTTP Response tương ứng, không chứa business logic phức tạp.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Chỉ điều phối request và response, đẩy toàn bộ nghiệp vụ cho tầng Service.', sortOrder: 1 },
          { id: 2, optionText: 'Viết toàn bộ câu lệnh SQL trực tiếp trong Action của Controller.', sortOrder: 2 },
          { id: 3, optionText: 'Không được trả về mã trạng thái HTTP 200.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Chữ "S" trong viết tắt các nguyên tắc SOLID đại diện cho điều gì?',
        explanation: 'Single Responsibility Principle - Mỗi class chỉ nên có một lý do duy nhất để thay đổi (một nhiệm vụ duy nhất).',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Single Responsibility Principle (Đơn trách nhiệm).', sortOrder: 1 },
          { id: 2, optionText: 'Security First Principle (Bảo mật hàng đầu).', sortOrder: 2 },
          { id: 3, optionText: 'Shared Database Principle (Cơ sở dữ liệu chia sẻ).', sortOrder: 3 },
        ],
      },
    ],
  },

  6001: {
    id: 601,
    lessonId: 6001,
    title: 'Đánh giá: Thuật toán Monotonic Merge chống tụt lùi tiến độ',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Bản chất của thuật toán Monotonic Merge trong tiến độ học tập đa thiết bị là gì?',
        explanation: 'Tiến độ đồng bộ luôn đơn điệu tăng (Monotonic) bằng hàm Math.Max(local, remote), không bao giờ bị ghi đè lùi lại mốc thời gian cũ hơn.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Tiến độ chỉ tăng đơn điệu (Math.Max), không bao giờ bị ghi đè lùi lại.', sortOrder: 1 },
          { id: 2, optionText: 'Luôn ưu tiên dữ liệu của máy chủ bất kể mốc thời gian.', sortOrder: 2 },
          { id: 3, optionText: 'Xóa tiến độ cũ và bắt đầu học lại từ đầu khi kết nối mạng.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Khi học viên xem video ngoại tuyến đến 80%, sau đó mở máy tính trực tuyến đang ở 50%, tiến độ sau khi sync sẽ là bao nhiêu?',
        explanation: 'Do áp dụng Monotonic Merge: Max(80%, 50%) = 80%.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: '80% (mốc cao nhất được bảo lưu).', sortOrder: 1 },
          { id: 2, optionText: '50% (bị máy tính ghi đè).', sortOrder: 2 },
          { id: 3, optionText: '65% (lấy giá trị trung bình).', sortOrder: 3 },
        ],
      },
    ],
  },

  6002: {
    id: 602,
    lessonId: 6002,
    title: 'Đánh giá: Thiết kế Idempotency Key chống nộp bài trùng lặp',
    passScore: 80,
    version: 1,
    questions: [
      {
        id: 1,
        content: 'Mục đích chính của ClientAttemptId (GUID) trong cơ chế Idempotency là gì?',
        explanation: 'Định danh duy nhất một lần nộp bài từ client, giúp máy chủ nhận diện nếu mạng lag gửi nhiều lần thì chỉ xử lý đúng một lần và trả lại kết quả ban đầu.',
        points: 50,
        sortOrder: 1,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Định danh duy nhất lượt làm bài, giúp máy chủ không chấm điểm trùng lặp.', sortOrder: 1 },
          { id: 2, optionText: 'Mã hóa đề thi để tránh lộ đáp án.', sortOrder: 2 },
          { id: 3, optionText: 'Dùng làm mật khẩu đăng nhập tạm thời.', sortOrder: 3 },
        ],
      },
      {
        id: 2,
        content: 'Nếu một yêu cầu nộp bài có ClientAttemptId đã tồn tại trong CSDL, Server nên phản hồi như thế nào?',
        explanation: 'Server nhận diện đây là yêu cầu trùng lặp hợp lệ, trả về kết quả đã chấm trước đó kèm cờ isDuplicate = true mà không tạo record mới.',
        points: 50,
        sortOrder: 2,
        questionType: 1,
        options: [
          { id: 1, optionText: 'Trả về kết quả lần nộp trước đó mà không trừ thêm lượt hay chấm lại.', sortOrder: 1 },
          { id: 2, optionText: 'Báo lỗi 500 sập máy chủ.', sortOrder: 2 },
          { id: 3, optionText: 'Tạo thêm một bản ghi điểm số mới đè lên bản cũ.', sortOrder: 3 },
        ],
      },
    ],
  },
};

// Ánh xạ ID tương thích 100% với các mã bài học được sinh từ Database Backend (1 đến 19)
SAMPLE_QUIZZES[1] = { ...SAMPLE_QUIZZES[5001], lessonId: 1 };
SAMPLE_QUIZZES[2] = { ...SAMPLE_QUIZZES[1001], lessonId: 2 };
SAMPLE_QUIZZES[3] = { ...SAMPLE_QUIZZES[1002], lessonId: 3 };
SAMPLE_QUIZZES[4] = { ...SAMPLE_QUIZZES[1003], lessonId: 4 };
SAMPLE_QUIZZES[5] = { ...SAMPLE_QUIZZES[1004], lessonId: 5 };
SAMPLE_QUIZZES[6] = { ...SAMPLE_QUIZZES[1005], lessonId: 6 };
SAMPLE_QUIZZES[7] = { ...SAMPLE_QUIZZES[2001], lessonId: 7 };
SAMPLE_QUIZZES[8] = { ...SAMPLE_QUIZZES[2002], lessonId: 8 };
SAMPLE_QUIZZES[9] = { ...SAMPLE_QUIZZES[2003], lessonId: 9 };
SAMPLE_QUIZZES[10] = { ...SAMPLE_QUIZZES[2004], lessonId: 10 };
SAMPLE_QUIZZES[11] = { ...SAMPLE_QUIZZES[3001], lessonId: 11 };
SAMPLE_QUIZZES[12] = { ...SAMPLE_QUIZZES[3002], lessonId: 12 };
SAMPLE_QUIZZES[13] = { ...SAMPLE_QUIZZES[3003], lessonId: 13 };
SAMPLE_QUIZZES[14] = { ...SAMPLE_QUIZZES[3004], lessonId: 14 };
SAMPLE_QUIZZES[15] = { ...SAMPLE_QUIZZES[4001], lessonId: 15 };
SAMPLE_QUIZZES[16] = { ...SAMPLE_QUIZZES[4002], lessonId: 16 };
SAMPLE_QUIZZES[17] = { ...SAMPLE_QUIZZES[4003], lessonId: 17 };
SAMPLE_QUIZZES[18] = { ...SAMPLE_QUIZZES[6001], lessonId: 18 };
SAMPLE_QUIZZES[19] = { ...SAMPLE_QUIZZES[6002], lessonId: 19 };

/**
 * Trả về đề thi trắc nghiệm tương ứng với bài học, đảm bảo luôn có bài tập thực chiến 100%
 */
export function getSampleQuizByLesson(lessonId: number): QuizDetail {
  if (SAMPLE_QUIZZES[lessonId]) {
    return SAMPLE_QUIZZES[lessonId];
  }
  const allQuizzes = Object.values(SAMPLE_QUIZZES);
  const fallback = allQuizzes[Math.abs(lessonId) % allQuizzes.length];
  return {
    ...fallback,
    lessonId,
  };
}
