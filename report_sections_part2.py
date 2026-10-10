import docx
from docx.shared import Inches, Pt
from report_utils import (
    add_h1, add_h2, add_h3, add_p, add_bullet, add_callout, add_table
)

def add_part2(doc):
    # ==========================================================================
    # MỤC 2: BACKEND (.NET 8 WEB API) - PHÂN TÍCH NHIỆM VỤ TỪNG SERVICE & LUỒNG
    # ==========================================================================
    add_h1(doc, "MỤC 2: BACKEND (.NET 8 WEB API) - PHÂN TÍCH NHIỆM VỤ TỪNG SERVICE, NGHIỆP VỤ VÀ LUỒNG DỮ LIỆU")
    
    add_p(
        doc,
        "Tầng Backend đóng vai trò 'bộ não' điều phối của toàn bộ hệ thống Microlearning, được xây dựng trên nền tảng "
        "ASP.NET Core 8 Web API hiện đại nhất của Microsoft. Mã nguồn được cấu trúc theo triết lý 'Thin Controllers & Rich Services' kết hợp Clean Architecture, "
        "nghĩa là các Controller chỉ nhận và validate HTTP Request sơ bộ, toàn bộ logic tính toán, kiểm tra nghiệp vụ và giao dịch dữ liệu đều nằm trong tầng Services."
    )
    add_p(
        doc,
        "Dưới đây là bản phân tích chi tiết từng phân hệ nghiệp vụ (Areas) và các Service tương ứng để người đọc có thể dễ dàng đối chiếu trực tiếp với mã nguồn dự án:"
    )

    # 2.1. Phân hệ Xác thực (Areas/Auth)
    add_h2(doc, "2.1. Phân hệ Xác thực & Quản trị Danh tính (Areas/Auth)")
    add_p(
        doc,
        "Phân hệ Auth chịu trách nhiệm bảo vệ toàn bộ các điểm truy cập API, hỗ trợ đăng nhập đa kênh an toàn và tiện lợi cho người dùng di động:"
    )
    
    auth_srv_headers = ["Tên Service (Interface)", "Tệp Triển Khai", "Nhiệm Vụ Nghiệp Vụ Cụ Thể"]
    auth_srv_data = [
        ["IAuthenticationService", "AuthenticationService.cs", "Tiếp nhận thông tin đăng nhập, xác minh mật khẩu/OTP, kiểm tra cờ khóa tài khoản và điều phối cấp token."],
        ["ITokenService", "TokenService.cs", "Sinh chuỗi JWT Bearer chứa các Claim (UserId, Role, Phone) với thời hạn 60 phút, và quản lý cặp khóa Refresh Token."],
        ["IOtpService", "OtpService.cs", "Tạo mã OTP ngẫu nhiên 6 chữ số, mã hóa băm SHA-256 lưu vào bảng OtpVerifications, kiểm tra giới hạn thời gian (5 phút)."],
        ["ISmsService & IPhoneService", "SmsService.cs, PhoneService.cs", "Tích hợp cổng SMS Brandname (SpeedSMS) và Twilio Verify API gửi tin nhắn mã xác thực tức thì về điện thoại."],
        ["IGoogleAuthService & IFacebookAuthService", "GoogleAuthService.cs, FacebookAuthService.cs", "Xác thực danh tính người dùng thông qua mã truy cập OAuth2 của Google và Facebook, tự động tạo tài khoản nếu lần đầu đăng nhập."],
        ["IPasswordService & IHashService", "PasswordService.cs, HashService.cs", "Xử lý băm mật khẩu một chiều an toàn và cung cấp thuật toán băm SHA-256 cho Refresh Token và mã Checksum."]
    ]
    add_table(doc, auth_srv_headers, auth_srv_data, [Inches(2.0), Inches(1.8), Inches(2.9)])

    add_callout(
        doc,
        "Luồng Nghiệp Vụ Đăng Nhập OTP SMS Điển Hình:\n"
        "1. Học viên nhập số điện thoại -> Hệ thống kiểm tra Rate Limit (tối đa 5 yêu cầu/phút qua SendOtpPolicy).\n"
        "2. OtpService sinh mã 6 số, băm lưu vào CSDL -> SmsService chuyển tiếp tới SpeedSMS/Twilio đẩy về máy học viên.\n"
        "3. Học viên nhập mã OTP -> OtpService kiểm tra tính hợp lệ và thời hạn 5 phút.\n"
        "4. Nếu hợp lệ, TokenService cấp phát Access Token (JWT) và RefreshToken (lưu mã băm vào CSDL) trả về cho Client.",
        title="LUỒNG XÁC THỰC AN TOÀN ĐA TẦNG"
    )

    # 2.2. Phân hệ Quản lý Đào tạo (Areas/Catalog)
    add_h2(doc, "2.2. Phân hệ Quản lý Đào tạo & Bài giảng (Areas/Catalog)")
    add_p(
        doc,
        "Phân hệ Catalog quản lý toàn bộ cấu trúc sư phạm từ khóa học lớn đến các bài học vi mô và tài liệu đính kèm:"
    )
    
    catalog_srv_headers = ["Tên Service (Interface)", "Tệp Triển Khai", "Nhiệm Vụ Nghiệp Vụ Cụ Thể"]
    catalog_srv_data = [
        ["ICourseService", "CourseService.cs", "Quản lý vòng đời khóa học (Tạo, Sửa, Xóa, Công khai/Ẩn, Khóa học trả phí). Quản lý tăng Version khi có bài học mới."],
        ["ISubjectService", "SubjectService.cs", "Quản lý môn học/chương trong khóa học, sắp xếp thứ tự học tập theo lộ trình sư phạm."],
        ["ILessonService", "LessonService.cs", "Quản lý bài giảng vi mô: cập nhật videoUrl (hỗ trợ cả video đám mây và link YouTube), thời lượng, liên kết quiz."],
        ["ILessonAttachmentService", "LessonAttachmentService.cs", "Quản lý tệp tài liệu giảng dạy (.docx, .doc, .pdf) gắn vào bài học, tích hợp lưu trữ an toàn trên Azure Blob."],
        ["ICourseAccessService", "CourseAccessService.cs", "Kiểm tra phân quyền học viên có quyền xem khóa học trả phí hay nội bộ hay không."],
        ["IFavoriteSubjectService", "FavoriteSubjectService.cs", "Quản lý danh sách môn học yêu thích được học viên đánh dấu ghim lên trang chủ cá nhân."],
        ["IMediaBookmarkService", "MediaBookmarkService.cs", "Quản lý các điểm mốc thời gian quan trọng trong video bài giảng kèm ghi chú cá nhân của học viên."]
    ]
    add_table(doc, catalog_srv_headers, catalog_srv_data, [Inches(2.1), Inches(1.8), Inches(2.8)])

    # 2.3. Phân hệ Đa phương tiện & Xử lý Video (Areas/Media)
    add_h2(doc, "2.3. Phân hệ Đa phương tiện & Xử lý Video (Areas/Media)")
    add_p(
        doc,
        "Đảm nhiệm xử lý các tệp tin video bài giảng và chuyển đổi giọng đọc AI (TTS) với quy mô công nghiệp:"
    )
    add_bullet(doc, "Tiếp nhận tệp tin video tải lên (hỗ trợ tới 500 MB), phân đoạn và truyền thẳng lên kho lưu trữ Azure Blob Storage, sinh URL streaming bảo mật.", "MediaService: ")
    add_bullet(doc, "Sử dụng FFmpeg trong Docker Container để nén video, trích xuất ảnh bìa tự động (thumbnail) và bóc tách luồng âm thanh.", "MediaProcessingService: ")
    add_bullet(doc, "Chuyển đổi kịch bản bài học thành âm thanh giọng đọc tiếng Việt mượt mà qua công nghệ Text-to-Speech.", "TtsService: ")
    add_bullet(doc, "Tiến trình chạy ngầm (IHostedService) xử lý tuần tự các tác vụ nặng trong hàng đợi MediaJobs, đảm bảo server không bao giờ bị nghẽn.", "MediaJobBackgroundWorker: ")

    # 2.4. Phân hệ Đánh giá & Két câu hỏi sai (Areas/Quiz)
    add_h2(doc, "2.4. Phân hệ Đánh giá Trắc nghiệm & Két câu hỏi sai (Areas/Quiz)")
    add_p(
        doc,
        "Hệ thống kiểm tra trắc nghiệm được tối ưu hóa cho học tập vi mô ngay sau khi xem video bài giảng:"
    )
    add_bullet(doc, "Quản lý ngân hàng câu hỏi, các lựa chọn đúng/sai, chấm điểm tự động bài làm của học viên theo thang điểm 10, lưu lịch sử QuizAttempts.", "QuizService: ")
    add_bullet(doc, "Một tính năng độc quyền mang tính nhân văn: Tự động gom toàn bộ các câu hỏi học sinh trả lời sai vào một 'Két sắt' riêng biệt. Khi học viên mở két ôn tập và trả lời đúng lại câu hỏi đó, trạng thái sẽ được chuyển thành IsResolved = true.", "QuizMistakeVaultService: ")

    # 2.5. Phân hệ Tiến độ & Chống tua gian lận (Areas/Progress & Gamification)
    add_h2(doc, "2.5. Phân hệ Theo dõi Tiến độ & Chống gian lận (Areas/Progress & Gamification)")
    add_p(
        doc,
        "Để đảm bảo học viên thực sự tiếp thu kiến thức chứ không chỉ tua nhanh video để lấy chứng chỉ, hệ thống áp dụng chiến lược kiểm soát thời gian nghiêm ngặt:"
    )
    add_bullet(doc, "Thuật toán kiểm tra độ bao phủ thời lượng xem video. Bài học chỉ được đánh dấu 'Đã hoàn thành' khi tổng thời gian thực tế học viên theo dõi đạt từ 80% thời lượng bài học trở lên. Nếu học viên tua video từ đầu đến cuối chỉ trong vài giây, hệ thống sẽ từ chối ghi nhận hoàn thành.", "StrictCoverageVideoCompletionStrategy: ")
    add_bullet(doc, "Ghi nhận nhịp tim học tập hàng ngày. Nếu học viên học bài liên tục mỗi ngày, chỉ số CurrentStreak sẽ tăng lên. Nếu gián đoạn quá 24h, streak sẽ được tính toán lại theo quy tắc để duy trì động lực.", "UserStreakService: ")

    # 2.6. Phân hệ Đồng bộ Ngoại tuyến (Areas/Sync & Device)
    add_h2(doc, "2.6. Phân hệ Đồng bộ Ngoại tuyến & Quản lý Thiết bị (Areas/Sync & Device)")
    add_p(
        doc,
        "Cốt lõi của kiến trúc Offline-First: cho phép thiết bị di động đồng bộ hai chiều (Bi-directional Sync) siêu tốc:"
    )
    add_bullet(doc, "Tiếp nhận mã Sequence cuối cùng từ Mobile, truy vấn bảng ContentChanges và chỉ trả về đúng những bản ghi có thay đổi (Delta Payload), tiết kiệm 95% băng thông so với việc tải lại toàn bộ danh mục.", "Pull Changes (SyncService): ")
    add_bullet(doc, "Tiếp nhận hàng đợi thao tác ngoại tuyến (Outbox) gồm tiến độ học và kết quả làm quiz từ máy học viên. Mỗi thao tác gắn một ClientOperationId duy nhất để đảm bảo dù gửi lại nhiều lần do mạng lag, hệ thống chỉ ghi nhận 1 lần (Idempotency).", "Push Changes (SyncService): ")
    add_bullet(doc, "Xử lý các thực thể bị xóa thông qua mô hình Tombstone (xóa mềm), đảm bảo thiết bị di động khi đồng bộ về sẽ biết chính xác bài học nào đã bị xóa trên web để dọn dẹp bộ nhớ máy.", "TombstoneService: ")

    # 2.7. Phân hệ Trợ lý Trí tuệ Nhân tạo (Areas/AI)
    add_h2(doc, "2.7. Phân hệ Trợ lý Trí tuệ Nhân tạo & RAG (Areas/AI)")
    add_p(
        doc,
        "Tích hợp mô hình ngôn ngữ lớn Google Gemini và hệ thống Open Notebook AI Container:"
    )
    add_bullet(doc, "Nhận câu hỏi của học viên kèm ngữ cảnh tài liệu khóa học đã được trích xuất (lên tới 4.500 ký tự mỗi nguồn).", "AiAssistantController: ")
    add_bullet(doc, "Áp dụng kỹ thuật RAG (Retrieval-Augmented Generation): AI chỉ trả lời dựa trên nội dung bài giảng và tài liệu Word/PDF chính thống do giảng viên cung cấp, tuyệt đối không bịa đặt (hallucination) kiến thức ngoài lề.", "Mô hình RAG Chuyên Biệt: ")

    # ==========================================================================
    # MỤC 3: PHÂN TÍCH BẢN WEB (REACT 18 + TYPESCRIPT)
    # ==========================================================================
    add_h1(doc, "MỤC 3: PHÂN TÍCH BẢN WEB - CÔNG NGHỆ, KIẾN TRÚC & TÍNH NĂNG NỔI BẬT")
    
    add_h2(doc, "3.1. Nền tảng Công nghệ & Tổ chức Giao diện")
    add_p(
        doc,
        "Bản Web được xây dựng trên nền tảng React 18, TypeScript ở chế độ Strict Mode và Tailwind CSS, đóng gói bởi Vite cho tốc độ khởi động tức thì. "
        "Giao diện được thiết kế theo triết lý Mobile-First đáp ứng hoàn hảo trên mọi kích thước màn hình từ điện thoại, máy tính bảng đến màn hình máy tính lớn (Responsive Layout)."
    )
    
    web_modules_headers = ["Phân Hệ Giao Diện Web", "Thành Phần Mã Nguồn (Components)", "Chức Năng & Điểm Nhấn Trải Nghiệm (UX)"]
    web_modules_data = [
        ["Trang Chủ & Bảng Tin Học Tập", "StudyDashboard.tsx, CatalogGrid.tsx", "Hiển thị tổng quan các khóa học đang theo dõi, tiến độ hoàn thành, ngọn lửa Streak và danh mục môn học yêu thích."],
        ["Phòng Thu Giảng Viên (Studio)", "CourseManagementModal.tsx", "Khu vực chuyên biệt cho giáo viên tạo khóa học, tải video lên Azure Blob, đính kèm tệp tài liệu và nhập đề trắc nghiệm trực quan."],
        ["Nhập Đề Thi Tự Động Từ Word", "docxQuizParser.ts", "Giảng viên chỉ cần kéo thả tệp Word (.docx) soạn sẵn, hệ thống tự động bóc tách câu hỏi, các đáp án A/B/C/D và đáp án đúng vào form."],
        ["Trình Phát Video Chuyên Nghiệp", "VideoLessonPlayer.tsx", "Phát video streaming trực tiếp từ Azure Blob hoặc YouTube, thanh trượt âm lượng mượt mà, ghi chú mốc thời gian (Bookmarks) tức thì."],
        ["Trợ Lý Sổ Tay AI Hub", "NotebookHubView.tsx, useNotebook.ts", "Giao diện trò chuyện RAG thông minh với khung cuộn nội bộ chống bể layout, hỗ trợ gắn tài liệu khóa học và trích xuất chữ tự động."],
        ["Két Câu Hỏi Sai (Mistake Vault)", "MistakeVaultModal.tsx", "Khu vực ôn tập các câu hỏi học viên từng làm sai, cho phép làm lại bài tập để khắc sâu kiến thức."],
        ["Bảng Thống Kê Học Sinh (Admin)", "StudentProgressAnalytics.tsx", "Biểu đồ trực quan theo dõi số giờ học, tỷ lệ đỗ quiz, phát hiện học sinh có nguy cơ bỏ dở để hỗ trợ kịp thời."]
    ]
    add_table(doc, web_modules_headers, web_modules_data, [Inches(2.0), Inches(2.0), Inches(2.7)])

    # ==========================================================================
    # MỤC 4: BẢN MOBILE VÀ CÁC LỢI THẾ VƯỢT TRỘI
    # ==========================================================================
    add_h1(doc, "MỤC 4: BẢN MOBILE - CÁC LỢI THẾ VƯỢT TRỘI & CÔNG NGHỆ ĐỘC QUYỀN")
    
    add_p(
        doc,
        "Ứng dụng Mobile (Microlearning App) được phát triển bằng React Native kết hợp Expo SDK 52 và Expo Router v4. "
        "Đây không đơn thuần là một bản rút gọn của Web, mà sở hữu những vũ khí công nghệ vượt trội được thiết kế riêng cho trải nghiệm học tập di động:"
    )

    add_h2(doc, "4.1. Lợi thế 1: Kiến trúc Ngoại tuyến Toàn diện (Offline-First với SQLite Cục bộ)")
    add_p(
        doc,
        "Điểm khác biệt lớn nhất so với các ứng dụng học trực tuyến thông thường là Microlearning Mobile tích hợp sẵn "
        "cơ sở dữ liệu SQLite ngay trong bộ nhớ thiết bị thông qua expo-sqlite. Hệ thống bao gồm 7 Repository độc lập:"
    )
    add_bullet(doc, "Lưu trữ toàn bộ danh mục khóa học, môn học, bài học và đường dẫn tài liệu. Mất mạng học viên vẫn duyệt danh mục bình thường.", "catalogRepository: ")
    add_bullet(doc, "Lưu trữ toàn bộ ngân hàng câu hỏi trắc nghiệm đã tải về, cho phép làm bài kiểm tra và chấm điểm ngay khi thiết bị hoàn toàn ngắt mạng.", "quizRepository: ")
    add_bullet(doc, "Lưu trữ phần trăm hoàn thành, số giây đã xem video và trạng thái hoàn tất bài học trên máy.", "progressRepository: ")
    add_bullet(doc, "Lưu danh sách các tệp video đã tải về máy, đường dẫn trong sandbox của thiết bị, kích thước và cờ trạng thái tải.", "downloadRepository: ")
    add_bullet(doc, "Lưu trữ các mốc thời gian học viên đánh dấu trong video bài học.", "bookmarkRepository: ")
    add_bullet(doc, "Hàng đợi lưu các thao tác tiến độ và bài làm khi mất mạng để chờ gửi lên máy chủ.", "outboxRepository: ")
    add_bullet(doc, "Lưu trữ mã Sequence và thời gian của lần đồng bộ gần nhất.", "syncMetaRepository: ")

    add_h2(doc, "4.2. Lợi thế 2: Bộ Quản lý Tải dữ liệu Tự động (DownloadManager)")
    add_p(
        doc,
        "Hỗ trợ học viên tải video bài học về bộ nhớ máy để học khi đi máy bay, tàu xe hoặc những nơi không có Wifi/4G. "
        "DownloadManager hỗ trợ tiếp tục tải khi bị gián đoạn (Resume Download), tự động phát hiện đường dẫn video ngoài (như link YouTube) "
        "để ẩn nút tải về nhằm bảo vệ bộ nhớ thiết bị và tôn trọng bản quyền phát luồng của nền tảng đối tác."
    )

    add_h2(doc, "4.3. Lợi thế 3: Trình phát Video Lai Thông minh (HybridVideoPlayer)")
    add_p(
        doc,
        "Trình phát video được thiết kế lai (Hybrid): tự động nhận diện nguồn phát để lựa chọn công nghệ tối ưu:"
    )
    add_bullet(doc, "Khi học viên mở bài học đã tải về máy, trình phát sử dụng công nghệ phát video gốc của Expo, giải mã mượt mà không độ trễ, tiết kiệm tối đa pin thiết bị.", "Chế độ Ngoại tuyến (Local Video): ")
    add_bullet(doc, "Khi bài học là liên kết YouTube, hệ thống sử dụng trình phát nhúng WebView chuyên dụng với nguồn gốc máy chủ xác thực, khắc phục triệt để lỗi Google iframe 152.", "Chế độ YouTube Trực tuyến: ")
    add_bullet(doc, "Khi bài giảng được lưu trên Azure Blob Storage, trình phát sử dụng chuẩn phát luồng HTTPS có hỗ trợ đệm dữ liệu (Buffering).", "Chế độ Đám Mây Azure: ")

    add_h2(doc, "4.4. Lợi thế 4: Động cơ Đồng bộ Tự động Ngầm (autoSyncEngine)")
    add_p(
        doc,
        "Học viên không cần phải bấm bất kỳ nút 'Đồng bộ' thủ công nào. autoSyncEngine liên tục lắng nghe trạng thái kết nối mạng của thiết bị qua NetInfo. "
        "Ngay khi thiết bị có mạng trở lại sau thời gian ngắt kết nối, động cơ sẽ tự động kích hoạt tiến trình đồng bộ ngầm: "
        "đẩy toàn bộ tiến độ xem bài và điểm thi trắc nghiệm đã làm offline lên máy chủ, đồng thời kéo các cập nhật mới nhất từ giáo viên về máy trong tích tắc."
    )

    add_h2(doc, "4.5. Lợi thế 5: Trợ lý AI Bỏ túi & Trích xuất Tài liệu Trực tiếp từ Máy")
    add_p(
        doc,
        "Màn hình AI Notebook trên di động hỗ trợ người học chọn tài liệu trực tiếp từ Tệp trong máy hoặc Thư viện ảnh, "
        "tự động trích xuất nội dung văn bản sạch sẽ của các file Word (.docx, .doc), PDF để nạp vào AI. "
        "Đặc biệt, hệ thống có cơ chế gọi trực tiếp Google Gemini API dự phòng (Fallback) giúp người học vẫn nhận được phản hồi thông minh "
        "kể cả trong trường hợp máy chủ Backend tạm thời bảo trì."
    )

print("Part 2 built successfully.")
