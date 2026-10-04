# BÁO CÁO TIẾN ĐỘ THỰC HIỆN CỦA THẮNG (NHÁNH ThangBranch)
**Kỹ sư thực hiện**: Thắng (Catalog, Quiz & Progress Lead)  
**Người đánh giá (Mentor)**: Senior Backend Mentor & Nguyễn Minh Tân  
**Nhánh Git kiểm tra**: `origin/ThangBranch` (Commit `49eea29`)  
**Thời gian rà soát**: 04/10/2026  

---

## 📊 1. TỔNG KẾT TỶ LỆ HOÀN THÀNH

- **Định mức theo kế hoạch 14 ngày**: 14 Ngày x 6 giờ/ngày = **84 giờ công**.
- **Khối lượng Thắng đã thực hiện**: **~17 / 84 giờ công (~20.2%)**.
- **Khối lượng Thắng CÒN THIẾU**: **~67 / 84 giờ công (~79.8% - Gần 80%)**.

---

## ✅ 2. NHỮNG PHẦN THẮNG ĐÃ LÀM ĐƯỢC (~20%)

Thắng đã bước đầu xây dựng được phần khung logic nghiệp vụ (draft business logic) bên trong 4 Service thuộc thư mục `Service/Implement/`:

1. **Khóa học (`Service/Implement/CourseService.cs`)**:
   - Viết các hàm nghiệp vụ: `CreateCourse`, `UpdateCourse`, `DeleteCourse`.
   - Viết hàm bật/tắt hiển thị khóa học: `TogglePublishAsync`.
   - Viết hàm truy vấn: `GetAllCourse`, `GetCourseByID`.
2. **Môn học (`Service/Implement/SubjectiveService.cs`)**:
   - Viết các hàm CRUD môn học theo khóa học: `CreateSubject`, `UpdateSubject`, `DeleteSubject`, `GetSubjectByCourseId`.
3. **Bài học (`Service/Implement/LessonService.cs`)**:
   - Viết các hàm CRUD bài học: `CreateLesson`, `UpdateLesson`, `DeleteLesson`, `GetLessonBySubjectId`.
4. **Tiến độ học tập (`Service/Implement/ProgressService.cs`)**:
   - Viết hàm `SaveProgress`: Đã áp dụng đúng thuật toán **Monotonic Merge `Math.Max`** cho `WatchedSeconds` và `Percent`, tự động đánh dấu hoàn thành bài học khi đạt $\ge 90\%$.
   - Viết hàm `GetCourseProgress`: Tính tỷ lệ hoàn thành cả khóa học dựa trên trung bình số bài đã học.
5. **Định nghĩa DTO (`DTOs/dto.cs`)**:
   - Đã gom các DTO tạo/sửa Course, Subject, Lesson, Progress dưới dạng `public record`.

---

## ❌ 3. NHỮNG PHẦN THẮNG CÒN THIẾU (THIẾU GẦN 80%)

### 🚨 VẤN ĐỀ LỚN NHẤT: CHƯA CÓ BẤT KỲ CONTROLLER NÀO (0% API HOẠT ĐỘNG)
- Toàn bộ code của Thắng mới chỉ là các file class Service nằm trong thư mục.
- **Thắng hoàn toàn chưa viết một Controller nào** (`CoursesController`, `SubjectsController`, `LessonsController`, `ProgressController`, `QuizzesController`, `AdminCoursesController`...).
- **Hệ quả**: Trên Swagger UI không xuất hiện bất kỳ endpoint nào của Thắng. Đội Frontend và QA **hoàn toàn không có API để gọi thử hay tích hợp**.

---

### 📋 ĐỐI CHIẾU CHI TIẾT TỪNG NGÀY THEO ROADMAP 14 NGÀY:

| Ngày | Nhiệm vụ phân công cho Thắng | Thực tế Thắng làm trên Git | Đánh giá & Phần còn thiếu |
| :---: | :--- | :--- | :--- |
| **Ngày 1** | Catalog DTOs & Nạp Seed Data 2 khóa học mẫu (`CatalogDbSeeder.cs`) | Đã viết DTO nháp trong `dto.cs` | **Thiếu 100% Seed Data**: Chưa có file seeder, database SQL chưa có dữ liệu mẫu để test. |
| **Ngày 2** | `ICourseService` & `CoursesController` (`GET /api/courses`, `GET /courses/{id}`) | Viết hàm trong `CourseService.cs` | **Thiếu Interface, Thiếu Controller**: Đang trả trực tiếp Entity `Course` ra ngoài thay vì ResponseDTO. |
| **Ngày 3** | `SubjectsController`, `LessonsController`, API `GET /api/lessons/{id}/package` | Viết hàm CRUD Lesson thô | **Thiếu API `/package`**: Không có gói trọn bộ Metadata + Video + Quiz để Mobile tải offline. |
| **Ngày 4** | Quiz Service & API bảo mật đề thi (Tuyệt đối ẩn trường `IsCorrect`) | **CHƯA LÀM GÌ** | **Thiếu 100%**: Chưa có DTO, Service, Controller cho câu hỏi trắc nghiệm. |
| **Ngày 5** | API Chấm điểm Quiz Online & Idempotency theo GUID (`POST /api/quizzes/{id}/attempts`) | **CHƯA LÀM GÌ** | **Thiếu 100%** *(Phần này Tân đã làm trước trong cỗ máy Sync Push)*. |
| **Ngày 6** | `IProgressService` & API `POST /api/progress/events` | Viết hàm `SaveProgress` thô | **Thiếu Controller**: Chưa có endpoint để Client xem online gọi cập nhật tiến độ. |
| **Ngày 7** | API xem lịch sử thi trắc nghiệm (`GET /api/quizzes/{id}/history`) | **CHƯA LÀM GÌ** | **Thiếu 100%**: Chưa có API xem lại lịch sử các lần làm quiz của học viên. |
| **Ngày 8 - 9** | Admin CRUD Catalog (Tích hợp `ContentChangeTracker` của Tân) | Viết Create/Update thông thường | **Chưa tích hợp Change Tracker**: Khi Thắng sửa bài học thì không gọi ChangeTracker của Tân để đồng bộ Offline. |
| **Ngày 10** | Admin Quiz Builder & Toggle Publish Lesson | Viết toggle Course thô | **Thiếu Quiz Builder**: Admin chưa có API tạo bộ câu hỏi và đáp án trắc nghiệm. |
| **Ngày 11** | Enrollment API (`POST /enroll`, `GET /my-courses`) & Unit Tests xUnit | **CHƯA LÀM GÌ** | **Thiếu 100%**: Chưa có ghi danh khóa học và chưa viết Unit Test kiểm thử `Math.Max`. |
| **Ngày 12** | Integration Test toàn diện với mock client | **CHƯA LÀM GÌ** | **Thiếu 100%**. |
| **Ngày 13** | Kiểm tra bảo mật (`[Authorize]`), Rate Limiting, Exception Handling | **CHƯA LÀM GÌ** | **Thiếu 100%**. |
| **Ngày 14** | Postman Collection cho FE & QA, tài liệu hướng dẫn gọi API | **CHƯA LÀM GÌ** | **Thiếu 100%**. |

---

## ⚠️ 4. CÁC LỖI VI PHẠM NGUYÊN TẮC OOP, SOLID & QUY CHUẨN [GEMINI.md](file:///d:/Web%20App/MicroLearning/GEMINI.md)

1. **Thiếu Interface (Vi phạm nguyên tắc D trong SOLID & Điều 12 GEMINI.md)**:
   - Các class `CourseService`, `ProgressService` không có Interface tương ứng (`ICourseService`, `IProgressService`).
   - Các Service này chưa hề được đăng ký vào [Program.cs](file:///d:/Web%20App/MicroLearning/Program.cs).
2. **Trả Entity trực tiếp ra ngoài (Vi phạm Điều 10 GEMINI.md)**:
   - Ví dụ: `public async Task<List<Course>> GetAllCourse()` trả thẳng Entity `Course` của database.
   - Bắt buộc phải ánh xạ (map) sang `CourseResponseDTO` để tránh lỗi vòng lặp tuần hoàn JSON (Circular Reference) và rò rỉ cấu trúc bảng.
3. **Ném ngoại lệ chung chung (Vi phạm Điều 11 GEMINI.md)**:
   - Thắng đang dùng: `throw new Exception("Course not found");`
   - Bắt buộc phải dùng: `throw new BusinessException("Không tìm thấy khóa học.");` để Middleware bắt lỗi tập trung nhận diện và trả về HTTP 400 Bad Request dạng JSON.
4. **Chưa chia tách Areas chuẩn chỉ**:
   - Thắng đang để chung toàn bộ DTO vào 1 file `DTOs/dto.cs` và các Service vào `Service/Implement/`. Cần chuyển về cấu trúc chuẩn `Areas/Catalog/` và `Areas/Quiz/` để đồng bộ với toàn bộ dự án.

---

## 💡 5. HÀNH ĐỘNG CỤ THỂ ĐỂ THẮNG KỊP TIẾN ĐỘ DỰ ÁN:
1. **Bước 1**: Tách Interface cho các Service (`ICourseService`, `ISubjectService`, `ILessonService`, `IProgressService`).
2. **Bước 2**: Viết các Controller tương ứng (`CoursesController`, `SubjectsController`, `LessonsController`, `ProgressController`) để đưa API lên Swagger UI.
3. **Bước 3**: Tạo file `Seeder/CatalogDbSeeder.cs` nạp sẵn 2 khóa học mẫu vào SQL Server để đội Frontend có dữ liệu hiển thị.
4. **Bước 4**: Xây dựng Module Quiz (`QuizService`, `QuizzesController`) theo đúng quy tắc bảo mật: **Tuyệt đối không gửi trường `IsCorrect` xuống Client**.
