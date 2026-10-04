# 📚 HỆ THỐNG BACKEND MICROLEARNING (OFFLINE-FIRST ARCHITECTURE)

> **Kỹ sư phụ trách**: Nguyễn Minh Tân (Backend Lead & Sync Architect)  
> **Nền tảng công nghệ**: .NET 8 Web API, C#, SQL Server 2022, FFmpeg, Microsoft Neural TTS, Docker.  
> **Kiến trúc cốt lõi**: Offline-First Mobile Sync (Sequence Delta Pull & Outbox Batch Push ACID), HTTP 206 Partial Content Streaming, Monotonic Merge `Math.Max`, Idempotency Deduplication.

---

## 🎯 1. ĐẶC TẢ KIẾN TRÚC LÕI

1. **Chuẩn Clean Architecture, OOP & SOLID**:
   - **Tách tầng nghiêm ngặt**: `Controller` -> `Service` -> `ApplicationDbContext`.
   - **Mẫu thiết kế DTO & Record**: 100% sử dụng Request/Response DTO dạng `record` bất biến, không rò rỉ Entity.
   - **Nhà máy Validation (Validation Factory)**: Tách rời kiểm tra hợp lệ dữ liệu vào `Infrastructure/Validation/`, tự động quét nạp qua Reflection.
   - **Bắt lỗi nghiệp vụ tập trung**: Bắt lỗi qua `BusinessException` và `ExceptionHandlingMiddleware`, trả về chuẩn HTTP 400 Json.

2. **Cơ chế Offline-First đặc thù**:
   - **Delta Sync Pull**: Kéo vi sai qua con trỏ `afterSequence`, chỉ tải dữ liệu mới từ bảng `ContentChanges`.
   - **Outbox Batch Sync Push**: Nhận mảng thao tác học offline, bọc toàn bộ lô trong 1 Database Transaction ACID duy nhất.
   - **Thuật toán Monotonic Merge**: Bảo vệ tiến độ học tập bằng `Math.Max(current, incoming)` chống tụt lùi khi học trên nhiều thiết bị.
   - **Chống gian lận & Idempotency**: Chấm điểm thi hoàn toàn trên Server theo `ClientAttemptId` (GUID), không bao giờ gửi đáp án `IsCorrect` xuống client.
   - **Tombstone Pattern**: Đánh dấu xóa mềm (`Deleted`) bài học để Mobile tự động xóa tệp video cache cục bộ.

3. **Hệ thống Xử lý Media Chạy ngầm (Background Worker & AI TTS)**:
   - **Streaming Video**: Chuẩn HTTP 206 Range Stream hỗ trợ tua mượt mà với hàng nghìn học viên đồng thời.
   - **Checksum SHA-256**: Xác thực toàn vẹn tệp tin tải về chống hỏng dữ liệu.
   - **AI Text-to-Speech**: Tự động chuyển kịch bản lời giảng sang file âm thanh MP3 tiếng Việt 48kHz.
   - **FFmpeg Muxing**: Ghép âm thanh vào video không re-encode (`-c:v copy`) và trích xuất thumbnail.
   - **MediaJob Worker**: `BackgroundService` điều phối hàng đợi xử lý ngầm, áp dụng `IServiceScopeFactory` giải phóng bộ nhớ.

---

## 🚀 2. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

### Cách 1: Chạy trực tiếp trên máy (Visual Studio / .NET CLI)
1. Cấu hình chuỗi kết nối trong `appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost;Database=Microlearning;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
   }

