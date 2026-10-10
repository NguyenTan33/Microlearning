import docx
from docx.shared import Inches, Pt
from report_utils import (
    add_h1, add_h2, add_h3, add_p, add_bullet, add_callout, add_table, add_meta_box
)

def add_part3(doc):
    # ==========================================================================
    # MỤC 5: TỔNG KẾT ROADMAP PHÁT TRIỂN DỰ ÁN
    # ==========================================================================
    add_h1(doc, "MỤC 5: TỔNG KẾT ROADMAP PHÁT TRIỂN DỰ ÁN")
    
    add_p(
        doc,
        "Dự án Microlearning được phát triển theo mô hình Agile/Scrum qua 5 giai đoạn tiến hóa rõ rệt, "
        "từ lúc đặt nền móng kiến trúc đến khi hoàn thiện toàn diện giải pháp công nghệ tiên tiến phục vụ hàng nghìn người học đồng thời:"
    )
    
    roadmap_headers = ["Giai Đoạn", "Tên Trọng Tâm Chiến Lược", "Thời Gian / Phạm Vi", "Kết Quả Đạt Được Cốt Lõi"]
    roadmap_data = [
        ["Giai đoạn 1", "Khởi tạo Nền tảng & Kiến trúc (Foundation)", "Sprint 1 - 2", "Thiết kế CSDL SQL Server 3NF, xây dựng khung .NET 8 Modular Monolith, hạ tầng xác thực đa kênh (SMS OTP, JWT, OAuth2)."],
        ["Giai đoạn 2", "Xử lý Đa phương tiện & Đào tạo (Core Media)", "Sprint 3 - 4", "Cấu trúc hóa cây đào tạo Microlearning, tích hợp Azure Blob Storage, hàng đợi FFmpeg nén video và chuyển đổi giọng đọc TTS."],
        ["Giai đoạn 3", "Tương tác, Đánh giá & Gamification", "Sprint 5 - 6", "Xây dựng hệ thống Quiz tự động hóa, nhập đề thi từ Word, thuật toán chống tua gian lận video, Két câu hỏi sai (Mistake Vault), chuỗi Streak."],
        ["Giai đoạn 4", "Đột phá Ngoại tuyến (Offline-First Mobility)", "Sprint 7 - 8", "Tích hợp SQLite trên Mobile (7 Repositories), bộ quản lý DownloadManager, động cơ AutoSync Delta đồng bộ hai chiều ngầm."],
        ["Giai đoạn 5", "Trí tuệ Nhân tạo & Báo cáo Chuyên sâu (AI RAG)", "Sprint 9 - 10", "Tích hợp Google Gemini & Open Notebook, xây dựng bộ Document Extractor bóc tách Word/PDF, hệ thống thống kê học tập Student Analytics."]
    ]
    add_table(doc, roadmap_headers, roadmap_data, [Inches(1.2), Inches(1.8), Inches(1.3), Inches(2.4)])

    # ==========================================================================
    # MỤC 6: BẢO MẬT ỨNG DỤNG (APPLICATION SECURITY)
    # ==========================================================================
    add_h1(doc, "MỤC 6: BẢO MẬT ỨNG DỤNG (APPLICATION SECURITY)")
    
    add_p(
        doc,
        "An toàn thông tin và bảo vệ quyền riêng tư của học viên là ưu tiên hàng đầu trong toàn bộ vòng đời phát triển dự án. "
        "Hệ thống triển khai mô hình Bảo mật đa tầng (Defense-in-Depth) từ mạng, máy chủ đến thiết bị đầu cuối của người dùng:"
    )
    
    add_h2(doc, "6.1. Bảo mật Xác thực & Quản lý Phiên (Authentication & Token Security)")
    add_bullet(doc, "Thời hạn ngắn (60 phút), ký bằng thuật toán đối xứng HMAC-SHA256 với khóa bí mật an toàn trên máy chủ. Token chứa các Claims đã được mã hóa, không lộ thông tin nhạy cảm.", "JWT Access Token: ")
    add_bullet(doc, "Không lưu trực tiếp chuỗi token thô vào CSDL. Thay vào đó, máy chủ chỉ lưu mã băm SHA-256 (TokenHash). Khi người dùng đăng xuất hoặc đổi mật khẩu, Refresh Token bị hủy bỏ ngay lập tức.", "Quay vòng Refresh Token: ")
    add_bullet(doc, "Thời hạn chỉ 5 phút, được băm một chiều và xóa ngay sau khi xác minh thành công. Cơ chế chống dò quét (Anti-Brute Force) tự động khóa số điện thoại nếu nhập sai quá 5 lần.", "Mã xác thực OTP SMS: ")

    add_h2(doc, "6.2. Chống Tấn công Quá tải & Lạm dụng Dịch vụ (Rate Limiting)")
    add_p(
        doc,
        "Được tích hợp trực tiếp tại tầng Kestrel Middleware của ASP.NET Core 8 thông qua các chính sách Fixed Window Rate Limiter:"
    )
    add_bullet(doc, "Tối đa 5 yêu cầu gửi mã OTP trong 1 phút trên mỗi địa chỉ IP / số điện thoại để ngăn chặn tình trạng spam làm hao tốn chi phí SMS Brandname.", "Chính sách SendOtpPolicy: ")
    add_bullet(doc, "Tối đa 10 yêu cầu thử mã OTP trong 1 phút nhằm triệt tiêu hoàn toàn khả năng dò mã tự động.", "Chính sách VerifyOtpPolicy: ")
    add_bullet(doc, "Tối đa 20 yêu cầu xác thực trong 1 phút đối với các endpoint đăng nhập thông thường.", "Chính sách AuthPolicy: ")
    add_bullet(doc, "Tối đa 60 yêu cầu mỗi phút nhằm đảm bảo tính ổn định của máy chủ khi hàng nghìn thiết bị di động kích hoạt đồng bộ.", "Chính sách SyncPolicy: ")

    add_h2(doc, "6.3. Toàn vẹn Dữ liệu & Bảo mật Lưu trữ Di động")
    add_bullet(doc, "Mọi tệp tin video và tài liệu đính kèm khi tải lên đều được tính toán mã băm SHA-256 Checksum lưu vào CSDL. Trước khi phát luồng hoặc cho phép tải về, hệ thống kiểm tra đối chiếu mã này để chống lại nguy cơ tệp tin bị can thiệp trái phép.", "Mã băm Checksum (SHA-256): ")
    add_bullet(doc, "Trên ứng dụng di động, các token nhạy cảm được lưu trữ an toàn trong vùng nhớ phần cứng chuyên dụng (iOS Keychain và Android Keystore thông qua expo-secure-store), hoàn toàn không lưu dưới dạng văn bản thô (Plaintext) trong LocalStorage hay AsyncStorage thông thường.", "Vùng nhớ phần cứng bảo mật: ")

    # ==========================================================================
    # MỤC 7: MÔ HÌNH VÀ PHƯƠNG THỨC DEPLOYMENT (DEPLOYMENT ARCHITECTURE)
    # ==========================================================================
    add_h1(doc, "MỤC 7: PHƯƠNG THỨC VÀ CẤU TRÚC MÔ HÌNH DEPLOY")
    
    add_p(
        doc,
        "Hệ thống Microlearning được thiết kế theo kiến trúc Đám mây hỗn hợp (Hybrid Cloud Architecture) "
        "kết hợp tính linh hoạt của nền tảng PaaS với sức mạnh của công nghệ đóng gói Container:"
    )

    deploy_headers = ["Thành Phần Hệ Thống", "Môi Trường Triển Khai", "Cấu Hình & Khả Năng Mở Rộng (Scalability)"]
    deploy_data = [
        ["Backend API (.NET 8)", "Docker Container trên Linux VM / Azure App Service", "Chạy trên cổng 8080 (Mapping ra ngoài 5124), cài đặt sẵn FFmpeg trong container, tự động co giãn (Auto-scale) theo tải CPU/RAM."],
        ["Cơ Sở Dữ Liệu", "Azure SQL Database (Serverless)", "Đặt tại Data Center Đông Á (East Asia), tự động điều chỉnh vCore theo nhu cầu thực tế, sao lưu tự động hàng ngày và mã hóa TDE."],
        ["Kho Lưu Trữ Tệp (Storage)", "Azure Blob Storage (Hot Tier)", "Container 'videos' lưu video bài giảng và tài liệu học tập, độ sẵn sàng cao SLA 99.99%, hỗ trợ HTTP Range Request cho phép tua video mượt."],
        ["Động Cơ Trợ Lý AI", "Azure Container Apps (East Asia)", "Triển khai ứng dụng Open Notebook AI chuyên biệt, kết nối bảo mật với Google Gemini Pro API phục vụ xử lý RAG độ trễ thấp."],
        ["Ứng Dụng Web (Frontend)", "Azure Static Web Apps / Vercel / Nginx", "Đóng gói mã tĩnh (Static Assets) qua Vite, phân phối qua mạng biên CDN toàn cầu giúp tải trang trong dưới 1 giây."],
        ["Ứng Dụng Mobile", "Expo Application Services (EAS Build)", "Xuất bản gói ứng dụng Android (AAB/APK) và iOS (IPA) chuẩn hóa, tích hợp ký chứng chỉ số tự động để phân phối lên Google Play & App Store."]
    ]
    add_table(doc, deploy_headers, deploy_data, [Inches(1.8), Inches(2.2), Inches(2.7)])

    add_callout(
        doc,
        "Môi Trường Phát Triển & Kiểm Thử Ngoại Tuyến (Local Dev Environment):\n"
        "Dự án cung cấp tệp docker-compose.yml hoàn chỉnh gồm 2 container phối hợp nhịp nhàng:\n"
        "- microlearning-sqlserver: SQL Server 2022 Express chạy trên cổng 1433 với ổ lưu trữ dữ liệu bền vững (Volume).\n"
        "- microlearning-api: Bản build container hóa của .NET 8 Web API với biến môi trường kết nối trực tiếp vào mạng nội bộ bridge.\n"
        "Điều này giúp các kỹ sư mới có thể khởi động toàn bộ môi trường backend chỉ bằng 1 câu lệnh duy nhất 'docker compose up -d' "
        "mà không cần cài đặt SQL Server hay SDK thủ công trên máy cá nhân.",
        title="TIÊU CHUẨN ĐÓNG GÓI DOCKER ĐỒNG NHẤT"
    )

    # ==========================================================================
    # MỤC 8: GIẢI QUYẾT VẤN ĐỀ ĐỜI SỐNG & ỨNG DỤNG THỰC TIỄN
    # ==========================================================================
    add_h1(doc, "MỤC 8: GIẢI QUYẾT VẤN ĐỀ GÌ CHO CUỘC SỐNG - ỨNG DỤNG THỰC TIỄN")
    
    add_p(
        doc,
        "Dự án Microlearning không chỉ là một bài toán công nghệ thuần túy, mà xuất phát từ việc thấu hiểu sâu sắc "
        "những rào cản lớn nhất của người học trong kỷ nguyên số hiện đại:"
    )

    add_h2(doc, "8.1. Giải quyết bài toán 'Thiếu hụt thời gian' bằng Triết lý Vi học tập (Microlearning)")
    add_p(
        doc,
        "Trong nhịp sống bận rộn ngày nay, rất ít người có đủ 1 - 2 tiếng liên tục ngồi trước máy tính để nghe một bài giảng dài dòng. "
        "Microlearning bẻ khóa bài toán này bằng cách chia nhỏ kiến thức thành từng 'viên nang tri thức' kéo dài chỉ từ 3 đến 7 phút. "
        "Người đi làm hoặc học sinh có thể tranh thủ học 1 bài học trọn vẹn trong lúc chờ xe bus, trong giờ nghỉ trưa hoặc trước khi đi ngủ. "
        "Kiến thức được cô đọng, đi thẳng vào trọng tâm, giải phóng tối đa áp lực tâm lý cho người học."
    )

    add_h2(doc, "8.2. Bình đẳng Giáo dục cho Vùng sâu Vùng xa qua Tính năng Ngoại tuyến (Offline-First)")
    add_p(
        doc,
        "Tại nhiều vùng nông thôn, vùng cao, hải đảo hoặc trên các phương tiện di chuyển công cộng, kết nối Internet 4G/Wifi thường xuyên chập chờn hoặc đắt đỏ. "
        "Hầu hết các nền tảng học trực tuyến hiện nay sẽ bị 'đơ' hoặc văng lỗi khi mất mạng. "
        "Với Microlearning Mobile, học viên chỉ cần tải trước các bài học về máy tại trường học hoặc quán cafe có Wifi. "
        "Sau đó, khi về nhà ở khu vực không có sóng, họ vẫn xem video sắc nét, làm bài kiểm tra trắc nghiệm, nhận điểm số tức thì "
        "và hệ thống sẽ tự động cập nhật tiến độ lên máy chủ ngay khi có sóng trở lại. Đây là đóng góp nhân văn to lớn cho việc phổ cập tri thức bình đẳng."
    )

    add_h2(doc, "8.3. Cá nhân hóa Học tập với Gia sư Trí tuệ Nhân tạo 24/7 (AI RAG)")
    add_p(
        doc,
        "Khi học sinh gặp một khái niệm khó hiểu trong bài giảng vào lúc đêm khuya, thông thường họ phải chờ đến buổi học tiếp theo để hỏi thầy cô. "
        "Với trợ lý AI Notebook tích hợp công nghệ RAG, học sinh có ngay một người gia sư kiên nhẫn 24/7. "
        "AI đọc hiểu chính xác các tệp tài liệu Word và bài giảng của giảng viên để giải thích cặn kẽ, đưa ra ví dụ minh họa "
        "mà không làm phiền thời gian nghỉ ngơi của giáo viên."
    )

    add_h2(doc, "8.4. Biến Lỗi Sai thành Động lực với Két Câu Hỏi Sai (Mistake Vault)")
    add_p(
        doc,
        "Tâm lý thông thường của người học là sợ làm sai hoặc làm sai xong thì bỏ qua và tiếp tục mắc lại lỗi đó trong kỳ thi thật. "
        "Két câu hỏi sai tự động gom các câu trả lời chưa đúng lại một nơi, khuyến khích học viên xem lại bài giảng và làm lại. "
        "Khi giải đúng, câu hỏi sẽ được mở khóa thành công, mang lại cảm giác chinh phục thử thách theo nguyên lý tâm lý học tích cực."
    )

    # ==========================================================================
    # MỤC 9: CÁC MỤC TIÊU ĐÃ HOÀN TẤT VÀ KỲ VỌNG TƯƠNG LAI
    # ==========================================================================
    add_h1(doc, "MỤC 9: CÁC MỤC TIÊU ĐÃ HOÀN TẤT VÀ KỲ VỌNG PHÁT TRIỂN TƯƠNG LAI")
    
    add_h2(doc, "9.1. Đánh giá Mức độ Hoàn thành Mục tiêu Dự án")
    
    goals_headers = ["Hạng Mục Mục Tiêu", "Chỉ Số Cam Kết", "Kết Quả Nghiệm Thu Thực Tế", "Đánh Giá"]
    goals_data = [
        ["Hạ Tầng Backend .NET 8", "Kiến trúc chuẩn Clean Architecture, chạy mượt mà trên Azure", "Hoàn tất 100%, 0 lỗi biên dịch, build thành công với 24 bảng CSDL và 30+ Services", "XUẤT SẮC"],
        ["Đồng Bộ Ngoại Tuyến (Offline)", "Học và làm quiz không cần mạng, đồng bộ tự động", "Hoàn tất 100%, tích hợp SQLite Mobile (7 Repositories), DownloadManager và AutoSync", "XUẤT SẮC"],
        ["Xử Lý Video Đa Dạng", "Hỗ trợ video tải lên Azure Blob và video nhúng YouTube", "Hoàn tất 100%, Hybrid Video Player xử lý mượt cả 2 nguồn, ẩn nút tải cho YouTube", "XUẤT SẮC"],
        ["Trợ Lý Trí Tuệ Nhân Tạo AI", "Hỏi đáp RAG bóc tách tài liệu Word/PDF trên cả Web & Mobile", "Hoàn tất 100%, tích hợp Document Extractor tự động hồi phục nội dung (Auto-Hydration)", "XUẤT SẮC"],
        ["Chống Gian Lận Xem Video", "Ngăn chặn tua nhanh video để hoàn thành bài giảng", "Hoàn tất 100%, thuật toán StrictCoverage kiểm tra độ bao phủ thời lượng >= 80%", "XUẤT SẮC"],
        ["Tạo Quiz Tự Động Từ File", "Tải tệp Word .docx bóc tách câu hỏi và đáp án tự động", "Hoàn tất 100%, hỗ trợ giảng viên soạn đề thi siêu tốc trong vài giây", "XUẤT SẮC"]
    ]
    add_table(doc, goals_headers, goals_data, [Inches(1.8), Inches(2.0), Inches(2.2), Inches(0.7)])

    add_h2(doc, "9.2. Kế hoạch Mở rộng & Định hướng Tương lai (Future Roadmap)")
    add_bullet(doc, "Tích hợp phòng học vi mô tương tác trực tiếp với giảng viên (Micro-Workshop) thông qua WebRTC / Azure Communication Services.", "Học tập Trực tiếp Tương tác (Live Workshops): ")
    add_bullet(doc, "Ứng dụng mô hình AI Deep Learning phân tích lịch sử trả lời trắc nghiệm để tự động thiết kế lộ trình học riêng biệt cho từng cá nhân, bù đắp chính xác các lỗ hổng kiến thức.", "Học tập Thích ứng Thông minh (Adaptive Learning AI): ")
    add_bullet(doc, "Mở rộng nền tảng thành một sàn giao dịch giáo dục (Creator Marketplace), cho phép các chuyên gia và giáo viên độc lập tự tạo và bán các khóa học vi mô chất lượng cao.", "Thị trường Sáng tạo Nội dung (Creator Economy): ")
    add_bullet(doc, "Phát triển gói sản phẩm Microlearning Enterprise dành cho các tập đoàn lớn để đào tạo nội bộ (Onboarding, Quy trình an toàn lao động, Tuân thủ nghiệp vụ) với bảng điều khiển B2B chuyên biệt.", "Phiên bản Doanh nghiệp (B2B SaaS): ")

    # ==========================================================================
    # MỤC 10: KẾT THÚC BÁO CÁO & LỜI KẾT
    # ==========================================================================
    add_h1(doc, "MỤC 10: KẾT THÚC BÁO CÁO & LỜI KẾT")
    
    add_p(
        doc,
        "Dự án Hệ thống Vi học tập Thông minh Microlearning là một bước tiến công nghệ đột phá kết hợp hài hòa "
        "giữa lý thuyết sư phạm hiện đại với các chuẩn mực kỹ thuật phần mềm tiên tiến nhất hiện nay. "
        "Toàn bộ mã nguồn trên các nhánh phát triển (FE, Mobile, Front-End-Web) đã được kiểm thử nghiêm ngặt, đạt 0 lỗi biên dịch "
        "và được hợp nhất trọn vẹn vào nhánh chính (main)."
    )
    add_p(
        doc,
        "Hệ thống đã sẵn sàng 100% để chuyển giao sang giai đoạn vận hành thử nghiệm trên diện rộng (UAT / Pilot Launch) "
        "và tự tin đáp ứng xuất sắc các kỳ vọng kinh doanh cũng như sứ mệnh nâng cao chất lượng giáo dục cộng đồng."
    )
    
    add_meta_box(doc, {
        "Đại diện Đội ngũ Kỹ sư": "Trưởng Nhóm Kiến Trúc & Phát Triển Phần Mềm (Senior Lead Engineer)",
        "Tình trạng Nghiệm thu": "ĐÃ HOÀN TẤT TOÀN DIỆN & SẴN SÀNG CHUYỂN GIAO SẢN PHẨM",
        "Ngày bàn giao": "Tháng 10 / 2026",
        "Chữ ký xác nhận": "Nguyễn Tấn & Đội Ngũ Phát Triển Dự Án Microlearning"
    })

print("Part 3 built successfully.")
