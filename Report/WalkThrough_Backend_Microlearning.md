# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN BACKEND MICROLEARNING (OFFLINE-FIRST)
**Kỹ sư phụ trách**: Nguyễn Minh Tân (Backend Architect & Sync Engine Lead)  
**Người hướng dẫn (Senior Mentor)**: Antigravity AI Senior Mentor  
**Nhánh Git**: `Offline-Frist`  
**Thời gian cập nhật**: 04/10/2026  
**Tiến độ tổng thể của Tân**: **13 / 14 Ngày (~92.9% lộ trình - Đã hoàn thành 100% tính năng lõi)**  

---

## 🎯 1. TỔNG QUAN HỆ THỐNG & KIẾN TRÚC ĐẠT ĐƯỢC

Toàn bộ Backend được phát triển bám sát 100% các nguyên lý kiến trúc cao cấp và quy chuẩn trong [GEMINI.md](file:///d:/Web%20App/MicroLearning/GEMINI.md):
1. **Chuẩn OOP & SOLID**:
   - **Single Responsibility (SRP)**: Tách rời toàn bộ logic kiểm tra hợp lệ dữ liệu sang **Nhà máy Validation Factory** (`Infrastructure/Validation/`).
   - **Open/Closed Principle (OCP)**: Xử lý đa hình các loại sự kiện đồng bộ thông qua `ISyncOperationHandler` (Strategy Pattern), mở rộng không giới hạn mà không sửa code cũ.
   - **Dependency Inversion (DIP)**: 100% Service đều có Interface trừu tượng hóa và đăng ký trong [Program.cs](file:///d:/Web%20App/MicroLearning/Program.cs).
2. **Kiến trúc Thin Controllers & Thin Services**:
   - Controller chỉ tiếp nhận HTTP request, trích xuất danh tính và trả về mã HTTP chuẩn (200, 202, 400).
   - Service chỉ đóng vai trò điều phối luồng nghiệp vụ, không rò rỉ Entity ra ngoài.
3. **Cơ chế Offline-First đặc thù**:
   - **Sequence Delta Sync (Pull)**: Client chỉ kéo đúng các bản ghi thay đổi từ sau mốc `afterSequence`, tiết kiệm tối đa băng thông.
   - **Outbox Batch Sync (Push)**: Client gửi mảng thao tác học offline lên server xử lý trong 1 Database Transaction duy nhất.
   - **Idempotency & Deduplication**: Chống nộp bài hoặc ghi nhận tiến độ trùng lặp khi mạng chập chờn ($O(1)$ qua Unique Index `ClientOperationId`).
   - **Thuật toán Monotonic Merge (`Math.Max`)**: Tiến độ học chỉ tăng hoặc giữ nguyên, tuyệt đối không bị tụt lùi khi học trên nhiều thiết bị.
   - **Tombstone Pattern**: Đánh dấu xóa mềm bài học để Mobile tự động dọn dẹp file offline.
4. **Hệ thống Xử lý Media Chạy ngầm (Background Worker & AI TTS)**:
   - Tích hợp AI Text-to-Speech chuyển đổi kịch bản thuyết minh bài giảng thành giọng đọc tiếng Việt chuẩn phòng thu.
   - FFmpeg Engine ghép âm thanh vào video bài giảng không re-encode (`-c:v copy`) và trích xuất ảnh thumbnail 2s đầu.
   - `MediaJobBackgroundWorker` chạy ngầm điều phối hàng đợi chuẩn vòng đời Scoped bên trong Singleton qua `IServiceScopeFactory`.

---

## 📋 2. CHI TIẾT KẾT QUẢ ĐÃ HOÀN THÀNH (TỪ NGÀY 1 ĐẾN NGÀY 13)

### 🔹 NGÀY 1: CẤU HÌNH NỀN TẢNG & MODULE DEVICE API
- [Program.cs](file:///d:/Web%20App/MicroLearning/Program.cs): Đăng ký `ExceptionHandlingMiddleware` bắt lỗi tập trung; cấu hình Swagger Bearer Authentication.
- [Areas/Device/Controllers/DevicesController.cs](file:///d:/Web%20App/MicroLearning/Areas/Device/Controllers/DevicesController.cs): API `POST /api/devices/register` có `[Authorize]`, lấy an toàn `AccountId` từ JWT Claims.
- [Areas/Device/Services/DeviceService.cs](file:///d:/Web%20App/MicroLearning/Areas/Device/Services/DeviceService.cs): Xử lý cơ chế Idempotent Upsert (cập nhật thông tin nếu thiết bị đã tồn tại, tránh báo lỗi crash app).
- [Infrastructure/Validation/Device/RegisterDeviceValidationRule.cs](file:///d:/Web%20App/MicroLearning/Infrastructure/Validation/Device/RegisterDeviceValidationRule.cs): Kiểm tra tính hợp lệ của `DeviceId`, `Platform` enum.

### 🔹 NGÀY 2: BỘ THEO DÕI BIẾN ĐỘNG NỘI DUNG (CONTENT CHANGE TRACKER)
- [Areas/Sync/Interfaces/IContentChangeTracker.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Interfaces/IContentChangeTracker.cs) & [Areas/Sync/Services/ContentChangeTracker.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Services/ContentChangeTracker.cs): Ghi log biến động vào bảng `ContentChanges` với `Sequence` tự tăng (`bigint IDENTITY(1,1)`).
- [Areas/Sync/Controllers/SyncController.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Controllers/SyncController.cs): Endpoint `POST /api/sync/test-log-change`.

### 🔹 NGÀY 3: MEDIA STREAMING HTTP 206 PARTIAL CONTENT
- [Areas/Media/Services/MediaService.cs](file:///d:/Web%20App/MicroLearning/Areas/Media/Services/MediaService.cs): Mở `FileStream` ở chế độ `FileAccess.Read, FileShare.Read` cho phép hàng nghìn học viên xem đồng thời.
- [Areas/Media/Controllers/MediaController.cs](file:///d:/Web%20App/MicroLearning/Areas/Media/Controllers/MediaController.cs): API `GET /api/media/{id}/stream` trả về `File(stream, contentType, enableRangeProcessing: true)` kích hoạt tua video tức thì theo byte-range.

### 🔹 NGÀY 4: THÔNG TIN TẢI VỀ & MÃ BĂM CHECKSUM SHA-256 CHO OFFLINE
- [Areas/Media/DTOs/MediaDTOs.cs](file:///d:/Web%20App/MicroLearning/Areas/Media/DTOs/MediaDTOs.cs): Dùng `public record` chuẩn .NET 8 bảo đảm tính bất biến (Immutability).
- Thuật toán `CalculateSha256Async`: Băm file vật lý ra chuỗi hex 64 ký tự chuẩn quốc tế để Mobile đối chiếu sau khi tải xong, chống hỏng file.
- API `GET /api/media/{id}/download-info` và `GET /api/media/{id}/download`.

### 🔹 NGÀY 5: ĐẶC TẢ GIAO THỨC SYNC PUSH & STRATEGY DISPATCHER
- [Areas/Sync/DTOs/SyncDTOs.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/DTOs/SyncDTOs.cs): `SyncPushRequest`, `SyncOperationItem`, `SyncPushResponse`.
- [Areas/Sync/Interfaces/ISyncOperationHandler.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Interfaces/ISyncOperationHandler.cs): Định nghĩa Strategy Interface phân luồng đa hình theo `OperationType`.
- [Infrastructure/Validation/Sync/SyncPushValidationRule.cs](file:///d:/Web%20App/MicroLearning/Infrastructure/Validation/Sync/SyncPushValidationRule.cs): Giới hạn Batch $\le 50$ thao tác chống tấn công DOS.

### 🔹 NGÀY 6: TRANSACTION MANAGEMENT ACID & IDEMPOTENT DEDUPLICATION
- [Areas/Sync/Services/SyncService.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Services/SyncService.cs): Dùng `Database.BeginTransactionAsync()` bọc toàn bộ batch; quét bảng `SyncOperations` theo `ClientOperationId` để Dedup bỏ qua thao tác trùng; tự động `RollbackAsync()` khi có lỗi.
- API `POST /api/sync/push` có `[Authorize]`.

### 🔹 NGÀY 7: RÀ SOÁT HỆ THỐNG & API HEALTH CHECK
- [Areas/Common/Controllers/HealthController.cs](file:///d:/Web%20App/MicroLearning/Areas/Common/Controllers/HealthController.cs): API `GET /api/health` kiểm tra kết nối SQL Server và thư mục lưu trữ `Videos`.

### 🔹 NGÀY 8: TÍCH HỢP TOÀN DIỆN THUẬT TOÁN TIẾN ĐỘ & CHẤM ĐIỂM TRẮC NGHIỆM
- [Areas/Sync/DTOs/SyncPayloadDTOs.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/DTOs/SyncPayloadDTOs.cs): `LessonProgressPayload`, `QuizAttemptPayload`.
- [Areas/Sync/Services/LessonProgressSyncHandler.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Services/LessonProgressSyncHandler.cs): Thuật toán Monotonic Merge `Math.Max` bảo vệ tiến độ học không bị thụt lùi khi học trên nhiều thiết bị.
- [Areas/Sync/Services/QuizAttemptSyncHandler.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Services/QuizAttemptSyncHandler.cs): Chấm điểm bài thi an toàn trên Server, Idempotency theo `ClientAttemptId`.

### 🔹 NGÀY 9: API DELTA SYNC PULL (KÉO DỮ LIỆU VI SAI THEO SEQUENCE)
- [Areas/Sync/DTOs/SyncPullDTOs.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/DTOs/SyncPullDTOs.cs): `SyncPullRequest`, `ContentChangeItemDto`, `SyncPullResponse`.
- [Infrastructure/Validation/Sync/SyncPullValidationRule.cs](file:///d:/Web%20App/MicroLearning/Infrastructure/Validation/Sync/SyncPullValidationRule.cs): Kiểm tra `AfterSequence >= 0` và `Limit` từ 1 đến 100.
- [Areas/Sync/Services/SyncService.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Services/SyncService.cs): Hàm `PullSyncChangesAsync` truy vấn `ContentChanges WHERE Sequence > afterSequence` kèm kỹ thuật `Take(Limit + 1)` xác định `HasMoreChanges` siêu tốc.
- API `GET /api/sync/pull?afterSequence=0&limit=50`.

### 🔹 NGÀY 10: CƠ CHẾ SOFT-DELETE & TOMBSTONE PATTERN CHO SYNC
- [Areas/Sync/DTOs/TombstoneDTOs.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/DTOs/TombstoneDTOs.cs): `TombstoneRequest`, `TombstoneResponse`.
- [Areas/Sync/Services/TombstoneService.cs](file:///d:/Web%20App/MicroLearning/Areas/Sync/Services/TombstoneService.cs): Gỡ bỏ bài giảng bằng cách đánh dấu `IsPublished = false` và ghi sự kiện `ChangeType = Deleted` vào `ContentChanges` để toàn bộ Client Mobile tự động xóa file offline khi Pull.
- API `POST /api/sync/tombstone` có `[Authorize]`.

### 🔹 NGÀY 11: MEDIA WORKER - TÍCH HỢP AI TEXT-TO-SPEECH (TTS)
- [Areas/Media/Interfaces/ITtsService.cs](file:///d:/Web%20App/MicroLearning/Areas/Media/Interfaces/ITtsService.cs) & [Areas/Media/Services/TtsService.cs](file:///d:/Web%20App/MicroLearning/Areas/Media/Services/TtsService.cs): Tích hợp engine `EdgeTtsSharp` sinh giọng đọc AI tiếng Việt chuẩn 48kHz từ `NarrationScript`.
- [Infrastructure/Validation/Media/TtsSynthesizeTestValidationRule.cs](file:///d:/Web%20App/MicroLearning/Infrastructure/Validation/Media/TtsSynthesizeTestValidationRule.cs): Validation kịch bản đầu vào.
- API `POST /api/media/tts/test` và `POST /api/media/tts/narration/{scriptId}`.

### 🔹 NGÀY 12: MEDIA WORKER - FFMPEG & BACKGROUND SERVICE
- [Areas/Media/Interfaces/IMediaProcessingService.cs](file:///d:/Web%20App/MicroLearning/Areas/Media/Interfaces/IMediaProcessingService.cs) & [Areas/Media/Services/MediaProcessingService.cs](file:///d:/Web%20App/MicroLearning/Areas/Media/Services/MediaProcessingService.cs): Ghép Audio vào Video bằng FFmpeg không re-encode (`-c:v copy`) và trích xuất Thumbnail 2s đầu.
- [Areas/Media/Services/MediaJobBackgroundWorker.cs](file:///d:/Web%20App/MicroLearning/Areas/Media/Services/MediaJobBackgroundWorker.cs): Tiến trình chạy ngầm quét hàng đợi `MediaJobs`, giải quyết triệt để bài toán Scoped Service trong Singleton qua `IServiceScopeFactory`.
- API `POST /api/media/jobs/enqueue` (trả HTTP 202 Accepted) và `GET /api/media/jobs/{id}`.

### 🔹 NGÀY 13: TEST AIRPLANE MODE, TỐI ƯU INDEX SQL SERVER & RATE LIMITING
- Đặt 3 Index hiệu năng cao trên SQL Server:
  - `IX_SyncOperations_ClientOperationId` (UNIQUE NONCLUSTERED INDEX): Tối ưu Deduplication $O(1)$.
  - `IX_MediaJobs_Status_CreatedAt`: Tối ưu Worker quét hàng đợi.
  - `IX_ContentChanges_Entity`: Tối ưu tra cứu phiên bản thực thể.
- Kích hoạt Rate Limiting `SyncPolicy` (60 req/min) trên `SyncController`.
- Vượt qua bài kiểm thử mô phỏng Chế độ máy bay (Airplane Mode): Gửi lô offline đợt 1 thành công; gửi lặp lại đợt 2 kích hoạt Idempotency an toàn 100%.

---

## 🔍 3. TÌNH TRẠNG BIÊN DỊCH & CODE QUALITY
- **Trạng thái Build**: `Build succeeded. 0 Warning(s), 0 Error(s)`.
- **Pure Async Pipeline**: 100% phương thức từ Controller xuống Service và EF Core đều là bất đồng bộ (`async Task`, `await`, `CancellationToken`).
- **An toàn bảo mật**: Bảo vệ tuyệt đối bằng `[Authorize]`, không để lộ đáp án `IsCorrect`, Rate Limiting chống DDoS.

---

## 🚀 4. BƯỚC CUỐI CÙNG: NGÀY 14 (ĐÓNG GÓI & BÀN GIAO)
- Xuất file đặc tả OpenAPI Specification (`openapi.json`).
- Tạo cấu hình Docker (`Dockerfile` và `docker-compose.yml`).
- Viết tài liệu kỹ thuật hoàn chỉnh [README_BACKEND.md](file:///d:/Web%20App/MicroLearning/README_BACKEND.md).
- Xuất bản phát hành Release: `dotnet publish -c Release`.
