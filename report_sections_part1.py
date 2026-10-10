import docx
from docx.shared import Inches, Pt
from report_utils import (
    add_title, add_subtitle, add_meta_box, add_h1, add_h2, add_h3,
    add_p, add_bullet, add_callout, add_table
)

def add_part1(doc):
    # ==========================================================================
    # TRANG BÌA & THÔNG TIN DỰ ÁN
    # ==========================================================================
    add_title(doc, "BÁO CÁO TOÀN DIỆN KIẾN TRÚC & PHÁT TRIỂN DỰ ÁN\nHỆ THỐNG VI HỌC TẬP THÔNG MINH MICROLEARNING")
    add_subtitle(doc, "Tài liệu kỹ thuật tổng quan dành cho Quản lý cấp cao & Đội ngũ Kỹ sư Phát triển")
    
    meta_info = {
        "Tên Dự Án": "Microlearning - Nền Tảng Học Tập Vi Mô Trực Tuyến & Ngoại Tuyến (Offline-First)",
        "Kiến Trúc Tổng Thể": "Modular Monolith Backend (.NET 8 Web API) + Hybrid Cloud (Azure SQL & Azure Blob)",
        "Nền Tảng Client": "Web App (React 18, TypeScript, Tailwind CSS) & Mobile App (React Native, Expo, SQLite)",
        "Động Cơ Trí Tuệ Nhân Tạo": "Google Gemini Pro AI & Open Notebook RAG (Retrieval-Augmented Generation)",
        "Ngày Lập Báo Cáo": "Tháng 10 / 2026",
        "Trạng Thái Dự Án": "Đã hoàn tất tích hợp, kiểm thử và đồng bộ toàn bộ mã nguồn về nhánh chính (main)",
        "Phạm Vi Báo Cáo": "Toàn bộ kiến trúc CSDL, Backend Services, Luồng nghiệp vụ, Web, Mobile, Deploy & Bảo mật"
    }
    add_meta_box(doc, meta_info)
    
    add_callout(
        doc,
        "Dự án Microlearning được thiết kế nhằm giải quyết triệt để vấn đề 'Bội thực thông tin' và 'Thiếu hụt thời gian' "
        "của người học hiện đại thông qua phương pháp chia nhỏ kiến thức thành từng bài học 3 - 7 phút (Micro-lessons). "
        "Điểm đột phá kỹ thuật cốt lõi là kiến trúc Ngoại tuyến (Offline-First) trên di động với cơ sở dữ liệu SQLite cục bộ, "
        "cho phép học viên tại các khu vực đường truyền mạng không ổn định vẫn học tập, xem video bài giảng và thi trắc nghiệm mượt mà, "
        "sau đó tự động đồng bộ hai chiều (Delta Sync) ngay khi kết nối lại mạng.",
        title="TỔNG QUAN ĐỊNH VỊ DỰ ÁN & GIÁ TRỊ DOANH NGHIỆP"
    )

    # ==========================================================================
    # MỤC 0: MÔ HÌNH DỰ ÁN, CẤU TRÚC THƯ MỤC, PHÂN NHÁNH VÀ PHÂN QUYỀN
    # ==========================================================================
    add_h1(doc, "MỤC 0: MÔ HÌNH DỰ ÁN, CẤU TRÚC THƯ MỤC, PHÂN NHÁNH VÀ PHÂN QUYỀN")
    
    add_h2(doc, "0.1. Mô hình Kiến trúc Dự án (Architecture Pattern)")
    add_p(
        doc,
        "Dự án Microlearning áp dụng mô hình 3-Tier Enterprise kết hợp với kiến trúc Modular Monolith ở tầng Backend. "
        "Các phân hệ chức năng lớn được đóng gói thành các Vùng nghiệp vụ độc lập (Areas) có ranh giới rõ ràng, dùng chung một DbContext trung tâm "
        "nhưng giao tiếp qua các Interface trừu tượng, giúp dễ dàng mở rộng thành Microservices trong tương lai mà không làm phức tạp hóa khâu vận hành ban đầu."
    )
    
    tech_matrix_headers = ["Phân Tầng", "Công Nghệ Cốt Lõi", "Thư Viện & Tiêu Chuẩn Nổi Bật", "Vai Trò Kiến Trúc"]
    tech_matrix_data = [
        ["Backend Web API", "ASP.NET Core 8 (.NET 8)", "EF Core 8, Identity, JWT, FFmpeg, Azure SDK", "Xử lý nghiệp vụ tập trung, cấp phát token, xử lý media, điều phối đồng bộ"],
        ["Cơ Sở Dữ Liệu", "Azure SQL Database", "SQL Server 2022 Serverless, 3NF, B-Tree Indexes", "Lưu trữ toàn vẹn dữ liệu hệ thống, bảng CDC theo dõi biến động dữ liệu"],
        ["Lưu Trữ Đám Mây", "Azure Blob Storage", "Hot Tier Container, SHA-256 Checksum", "Lưu trữ tập trung video bài giảng, tệp audio thuyết minh TTS, tài liệu học tập"],
        ["Web Frontend", "React 18 + TypeScript", "Vite, Tailwind CSS, TanStack Query, IndexedDB", "Cổng thông tin học tập, bảng tin Studio cho giảng viên, quản trị hệ thống"],
        ["Mobile App", "React Native (Expo SDK 52)", "Expo Router v4, SQLite (expo-sqlite), NativeWind", "Ứng dụng học tập bỏ túi hỗ trợ Offline-First, phát video tải về và đồng bộ ngầm"],
        ["Trí Tuệ Nhân Tạo", "Google Gemini & RAG", "Open Notebook Container, Document Extractor", "Trợ lý AI gia sư ảo hỗ trợ bóc tách tài liệu Word/PDF và trả lời ngữ cảnh khóa học"]
    ]
    add_table(doc, tech_matrix_headers, tech_matrix_data, [Inches(1.5), Inches(1.8), Inches(1.8), Inches(1.6)])
    
    add_h2(doc, "0.2. Cấu trúc Thư mục Toàn Dự án")
    add_p(
        doc,
        "Toàn bộ mã nguồn dự án được tổ chức theo chuẩn cấu trúc rõ ràng, tách bạch giữa Backend, Client Web và Client Mobile:"
    )
    
    folder_headers = ["Đường Dẫn / Thư Mục", "Phân Cấp Phụ Trách", "Mô Tả Chức Năng Cốt Lõi"]
    folder_data = [
        ["Areas/Admin", "Backend - Quản trị", "Chứa dịch vụ quản lý người dùng, phân quyền và trích xuất số liệu thống kê học tập (Student Analytics)"],
        ["Areas/AI", "Backend - Trí tuệ nhân tạo", "Bộ điều khiển tiếp nhận câu hỏi học viên, tích hợp Open Notebook AI và Google Gemini RAG"],
        ["Areas/Auth", "Backend - Xác thực", "Dịch vụ đăng ký, đăng nhập mật khẩu, SMS OTP (SpeedSMS/Twilio), Google/Facebook OAuth2, JWT & RefreshToken"],
        ["Areas/Catalog", "Backend - Đào tạo", "Quản lý cây đào tạo phân cấp: Khóa học (Course) -> Môn học (Subject) -> Bài học (Lesson) -> Tài liệu (Attachment)"],
        ["Areas/Common", "Backend - Dùng chung", "Các bộ kiểm tra tình trạng dịch vụ (HealthCheck), phản hồi chuẩn hóa, tiện ích chuyển đổi dữ liệu"],
        ["Areas/Device", "Backend - Thiết bị", "Quản lý danh sách thiết bị di động đã đăng ký (DeviceId, OsVersion, Model) phục vụ đồng bộ"],
        ["Areas/Enrollment", "Backend - Ghi danh", "Quản lý việc học viên đăng ký tham gia khóa học, xác thực quyền xem nội dung có phí/khóa"],
        ["Areas/Gamification", "Backend - Trò chơi hóa", "Theo dõi chuỗi ngày học liên tục (User Streak), vinh danh học viên chuyên cần"],
        ["Areas/Media", "Backend - Đa phương tiện", "Tải lên video dung lượng lớn (500MB), tích hợp Azure Blob, hàng đợi ngầm FFmpeg và Text-to-Speech"],
        ["Areas/Progress", "Backend - Tiến độ", "Theo dõi thời lượng xem video trực tuyến với chiến lược kiểm tra độ bao phủ thời gian chống tua gian lận"],
        ["Areas/Quiz", "Backend - Đánh giá", "Quản lý câu hỏi trắc nghiệm, chấm điểm tự động, nhập đề từ file Word .docx, và Két câu hỏi sai (Mistake Vault)"],
        ["Areas/Sync", "Backend - Đồng bộ", "Xử lý hàng đợi đồng bộ ngoại tuyến (Outbox Queue), phát hiện xung đột và ghi vết biến động dữ liệu (CDC)"],
        ["Model/", "Backend - Thực thể CSDL", "Chứa DbContext trung tâm (ApplicationDbContext), 24 thực thể bảng dữ liệu và các DTOs tương ứng"],
        ["client/src/", "Frontend - Web React", "Gồm components (Studio, Player, Dashboard, Notebook), hooks, services, utils trích xuất tài liệu"],
        ["mobile/app/ & mobile/src/", "Frontend - Mobile Expo", "Màn hình Expo Router (tabs, course, lesson, ai), kho lưu trữ SQLite cục bộ (7 Repositories) và DownloadManager"]
    ]
    add_table(doc, folder_headers, folder_data, [Inches(1.8), Inches(1.7), Inches(3.2)])

    add_h2(doc, "0.3. Chiến lược Phân nhánh Git (Branching Strategy)")
    add_p(
        doc,
        "Dự án tuân thủ nghiêm ngặt quy trình quản lý mã nguồn phân nhánh kết hợp Atomic Commits và Conventional Commits:"
    )
    add_bullet(doc, "Nhánh chính cao nhất, luôn ở trạng thái sẵn sàng triển khai (Production Ready). Mã nguồn trên main được đảm bảo đã tích hợp đầy đủ Backend, Web và Mobile sau khi chạy kiểm thử và build thành công.", "Nhánh main: ")
    add_bullet(doc, "Nhánh tích hợp các tính năng giao diện người dùng mới nhất cho cả Web và Mobile. Nhánh này đóng vai trò cầu nối kiểm thử toàn diện trước khi gộp về main.", "Nhánh FE: ")
    add_bullet(doc, "Nhánh chuyên biệt dành cho phát triển ứng dụng di động React Native Expo, tối ưu SQLite và kiểm thử trên thiết bị vật lý.", "Nhánh Mobile: ")
    add_bullet(doc, "Nhánh chuyên sâu cho các thành phần giao diện web, tối ưu giao diện Studio và trình phát video trên trình duyệt.", "Nhánh Front-End-Web: ")
    add_bullet(doc, "Các nhánh độc lập dùng để nghiên cứu sâu tính năng đồng bộ ngoại tuyến (Offline-Frist) và hạ tầng xác thực (Auth).", "Nhánh Chuyên Đề: ")

    add_h2(doc, "0.4. Ma trận Phân quyền Hệ thống (Role-Based Access Control - RBAC)")
    add_p(
        doc,
        "Hệ thống phân quyền dựa trên chuẩn ASP.NET Core Identity với 4 nhóm vai trò được gán quyền chi tiết như sau:"
    )
    
    rbac_headers = ["Tính Năng / Thẩm Quyền", "Admin", "Teacher (Giảng Viên)", "Student (Học Viên)", "User (Vãng Lai)"]
    rbac_data = [
        ["Quản lý Người dùng & Khóa tài khoản", "Toàn quyền", "Không", "Không", "Không"],
        ["Xem Thống kê Học tập Học sinh (Analytics)", "Toàn quyền", "Chỉ học sinh lớp mình", "Không", "Không"],
        ["Tạo / Sửa / Xóa Khóa học & Môn học", "Toàn quyền", "Khóa học của mình", "Không", "Không"],
        ["Tải Video bài giảng lên Azure Blob", "Toàn quyền", "Bài giảng của mình", "Không", "Không"],
        ["Soạn Quiz & Import đề thi từ Word (.docx)", "Toàn quyền", "Bài giảng của mình", "Không", "Không"],
        ["Ghi danh học tập & Theo dõi tiến độ bài học", "Có", "Có", "Toàn quyền", "Cần đăng nhập"],
        ["Tải video về máy học Offline (Mobile)", "Có", "Có", "Toàn quyền", "Không"],
        ["Tương tác Trợ lý AI Notebook (Hỏi đáp RAG)", "Toàn quyền", "Toàn quyền", "Toàn quyền", "Bị giới hạn"],
        ["Ôn luyện Két câu hỏi sai (Mistake Vault)", "Có", "Có", "Toàn quyền", "Không"]
    ]
    add_table(doc, rbac_headers, rbac_data, [Inches(2.5), Inches(1.0), Inches(1.2), Inches(1.0), Inches(1.0)])

    # ==========================================================================
    # MỤC 1: CSDL SQL SERVER - MÔ TẢ KIẾN TRÚC, ĐẶC TẢ, LÝ DO VÀ KHẢO SÁT
    # ==========================================================================
    add_h1(doc, "MỤC 1: CSDL SQL SERVER - KIẾN TRÚC ĐẶC TẢ, LÝ DO VÀ KHẢO SÁT 24 BẢNG")
    
    add_h2(doc, "1.1. Kiến trúc Tổng quan và Nguyên tắc Thiết kế CSDL")
    add_p(
        doc,
        "Cơ sở dữ liệu của dự án Microlearning được triển khai trên nền tảng Azure SQL Database Serverless. "
        "Mô hình dữ liệu được thiết kế đạt chuẩn hóa bậc 3 (3NF) nhằm loại bỏ hoàn toàn dư thừa dữ liệu, đồng thời bổ sung các chỉ mục hỗn hợp (Composite Indexes) "
        "tại các cặp trường thường xuyên tra cứu trong môi trường nhiều người dùng đồng thời."
    )
    add_p(
        doc,
        "Điểm đặc biệt trong thiết kế là sự hiện diện của phân hệ Ghi nhận thay đổi nội dung (ContentChanges - CDC) "
        "và Hàng đợi thao tác đồng bộ ngoại tuyến (SyncOperations - Outbox), giúp máy chủ phản hồi các yêu cầu Delta Sync của ứng dụng di động "
        "chỉ trong vài mili-giây mà không cần quét lại toàn bộ cơ sở dữ liệu."
    )

    add_h2(doc, "1.2. Khảo sát và Đặc tả Chi tiết Toàn bộ 24 Bảng Dữ Liệu")
    
    db_tables_headers = ["STT", "Tên Bảng (Entity)", "Khóa Chính / Khóa Ngoại", "Mục Đích Sử Dụng", "Lý Do & Bài Toán Thực Tế Giải Quyết"]
    db_tables_data = [
        ["1", "Accounts", "PK: Id (string)\nFK: IdentityRole", "Lưu danh tính người dùng, họ tên, số điện thoại, mật khẩu băm, trạng thái khóa.", "Kế thừa chuẩn IdentityUser giúp quản trị bảo mật đăng nhập đa kênh, chống tấn công brute-force với cơ chế Lockout."],
        ["2", "RefreshTokens", "PK: Id\nFK: AccountId -> Accounts", "Duy trì phiên đăng nhập lâu dài cho ứng dụng Web và Mobile.", "Bảo mật nâng cao: Chỉ lưu TokenHash (SHA-256) trên máy chủ, thu hồi token ngay khi phát hiện đăng nhập trái phép."],
        ["3", "OtpVerifications", "PK: Id\nIndex: PhoneNumber, Purpose", "Lưu trữ mã xác minh OTP gửi qua SMS (SpeedSMS / Twilio).", "Giải quyết bài toán đăng nhập không cần nhớ mật khẩu, chống gian lận với thời hạn OTP 5 phút và mã hóa băm."],
        ["4", "Courses", "PK: Id\nIndex: IsPublished", "Khóa học vi mô cốt lõi, lưu tiêu đề, mô tả, ảnh đại diện, danh mục, phiên bản đồng bộ.", "Đơn vị đóng gói kiến thức tổng thể; trường Version hỗ trợ Mobile kiểm tra cập nhật mà không cần tải lại toàn bộ."],
        ["5", "Enrollments", "PK: Id\nUnique: AccountId, CourseId", "Lưu vết ghi danh học viên vào khóa học.", "Kiểm soát bản quyền khóa học, ngăn chặn học viên truy cập nội dung bài học khi chưa được cấp quyền."],
        ["6", "Subjects", "PK: Id\nFK: CourseId -> Courses", "Phân cấp môn học/chương trong khóa học, quản lý thứ tự hiển thị.", "Giúp chia nhỏ chương trình học lớn thành các học phần mạch lạc theo lộ trình sư phạm."],
        ["7", "Lessons", "PK: Id\nFK: SubjectId -> Subjects", "Đơn vị học tập vi mô (3 - 7 phút), lưu đường dẫn video, cờ quiz, thời lượng bài.", "Cốt lõi triết lý Microlearning: giúp học viên hoàn thành một mục tiêu kiến thức cụ thể trong thời gian ngắn nhất."],
        ["8", "LessonAttachments", "PK: Id\nFK: LessonId -> Lessons", "Lưu tệp đính kèm bài giảng (.docx, .doc, .pdf) trên Azure Blob Storage.", "Hỗ trợ học viên tải tài liệu ôn tập và là kho dữ liệu nền tảng để AI Notebook trích xuất văn bản phục vụ hỏi đáp."],
        ["9", "MediaAssets", "PK: Id\nFK: LessonId -> Lessons", "Quản lý tệp đa phương tiện nhị phân, BlobKey, mã băm Checksum, kích thước.", "Đảm bảo tính toàn vẹn của tệp video và audio tải lên, phát hiện các tệp bị lỗi hoặc bị giả mạo."],
        ["10", "NarrationScripts", "PK: Id\nUnique FK: MediaAssetId", "Kịch bản thuyết minh Text-to-Speech (TTS), giọng đọc, ngôn ngữ.", "Tự động hóa chuyển đổi văn bản bài giảng thành giọng nói AI truyền cảm, phục vụ học viên thích nghe podcast."],
        ["11", "MediaJobs", "PK: Id\nFK: MediaAssetId", "Hàng đợi xử lý ngầm (Background Jobs) cho việc chuyển mã video và ghép audio.", "Tránh làm nghẽn luồng xử lý Web chính khi người dùng tải lên các video dung lượng lớn hàng trăm megabytes."],
        ["12", "Quizzes", "PK: Id\nUnique FK: LessonId -> Lessons", "Bộ đề kiểm tra đánh giá gắn liền với từng bài học, điểm đạt tối thiểu.", "Mỗi bài học vi mô đều có một bài kiểm tra ngắn ngay sau đó để củng cố kiến thức theo cơ chế Active Recall."],
        ["13", "Questions", "PK: Id\nFK: QuizId -> Quizzes", "Ngân hàng câu hỏi trắc nghiệm, nội dung câu hỏi, điểm số, lời giải thích.", "Lưu trữ nội dung trắc nghiệm chi tiết, hỗ trợ bóc tách tự động từ file Word của giáo viên."],
        ["14", "QuizOptions", "PK: Id\nFK: QuestionId -> Questions", "Các đáp án lựa chọn của từng câu hỏi, cờ IsCorrect.", "Hỗ trợ linh hoạt cả câu hỏi một đáp án đúng (Single Choice) và nhiều đáp án đúng (Multiple Choice)."],
        ["15", "QuizAttempts", "PK: Id\nIndex: ClientAttemptId (Unique)", "Lịch sử từng lần nộp bài của học viên, điểm số, thời gian nộp bài.", "Giải quyết bài toán nộp bài Offline: ClientAttemptId đảm bảo tính lũy đẳng (Idempotency), không bị nộp trùng lặp."],
        ["16", "QuizAnswers", "PK: Id\nFK: QuizAttemptId, QuestionId", "Ghi nhận từng câu trả lời chi tiết của học viên trong một lần làm bài.", "Cung cấp dữ liệu để hệ thống phân tích câu hỏi nào học sinh hay làm sai nhất, từ đó cải tiến bài giảng."],
        ["17", "QuizAnswerOptions", "PK: Id\nFK: QuizAnswerId, QuizOptionId", "Bảng trung gian liên kết giữa câu trả lời và các phương án được chọn.", "Chuẩn hóa quan hệ nhiều-nhiều (N-N) cho dạng bài trắc nghiệm cho phép tích chọn nhiều đáp án đúng."],
        ["18", "LessonProgresses", "PK: Id\nUnique: AccountId, LessonId", "Tiến độ học tập chi tiết (% hoàn thành, giây đã xem, trạng thái hoàn tất).", "Đồng bộ liên tục giữa Web và Mobile. Tích hợp chiến lược chống tua video để đảm bảo chất lượng học thật."],
        ["19", "Devices", "PK: Id\nUnique: AccountId, DeviceId", "Thông tin thiết bị di động đăng nhập của học viên (Model, OS, Ngày đăng ký).", "Quản lý bảo mật phiên đăng nhập trên nhiều thiết bị và làm căn cứ điều phối đồng bộ ngoại tuyến."],
        ["20", "ContentChanges", "PK: Sequence (Auto)\nIndex: ChangedAt", "Bảng theo dõi biến động dữ liệu (Change Data Capture - CDC).", "Trái tim của Delta Sync: Mobile chỉ cần gửi lên mã Sequence cuối cùng, server sẽ trả về chính xác phần thay đổi."],
        ["21", "SyncOperations", "PK: ClientOperationId\nFK: AccountId", "Bảng hàng đợi các thao tác ngoại tuyến (Outbox Sync) từ mobile gửi lên.", "Đảm bảo tính lũy đẳng: dù mạng chập chờn gửi lại 1 thao tác nhiều lần, máy chủ chỉ thực thi đúng 1 lần duy nhất."],
        ["22", "UserCourseAccesses", "PK: AccountId, CourseId", "Quyền truy cập đặc biệt hoặc phân quyền khóa học trả phí theo tài khoản.", "Bảo vệ các khóa học nội bộ/doanh nghiệp, chỉ cho phép học viên được phân bổ mới nhìn thấy nội dung."],
        ["23", "UserStreaks", "PK: AccountId (1-1 Account)", "Theo dõi chuỗi ngày học liên tục (CurrentStreak, LongestStreak, Ngày cuối).", "Ứng dụng tâm lý học Gamification: thúc đẩy học viên duy trì thói quen học mỗi ngày để giữ ngọn lửa Streak."],
        ["24", "UserQuizMistakes", "PK: Id\nIndex: AccountId, IsResolved", "Két câu hỏi sai (Mistake Vault), tự động lưu các câu hỏi làm sai.", "Áp dụng phương pháp lặp lại ngắt quãng (Spaced Repetition): biến lỗi sai thành bài học, hỗ trợ ôn đến khi giải đúng."],
        ["25", "UserFavoriteSubjects", "PK: AccountId, SubjectId", "Danh sách các môn học yêu thích được học viên đánh dấu ghim lên đầu.", "Tăng cường trải nghiệm cá nhân hóa, giúp học viên truy cập ngay vào môn học trọng tâm của mình."],
        ["26", "UserMediaBookmarks", "PK: Id (string)\nIndex: AccountId, LessonId", "Đánh dấu mốc thời gian quan trọng trong video kèm ghi chú cá nhân của người học.", "Giúp học viên lưu lại những khoảnh khắc bài giảng tâm đắc hoặc chưa hiểu để xem lại tức thì mà không cần tìm kiếm."]
    ]
    add_table(doc, db_tables_headers, db_tables_data, [Inches(0.4), Inches(1.5), Inches(1.5), Inches(1.7), Inches(1.6)])

print("Part 1 built successfully.")
