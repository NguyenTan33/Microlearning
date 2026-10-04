# TÀI LIỆU BÀN GIAO TOÀN BỘ API BACKEND (MICROLEARNING OFFLINE-FIRST)

> **Phiên bản:** v2.0 (Toàn diện - Đã tích hợp 100% Roadmap Backend)  
> **Ngày hoàn thiện:** 04/10/2026  
> **Nhóm phát triển Backend:** Nguyễn Minh Tân (Lead Sync & Media AI) & Thắng (Catalog & Core Business)  
> **Nhánh Backend đã kiểm thử:** `main` & `Front-End-Web`  

---

## 1. QUY CHUẨN KẾT NỐI VÀ TRUY CẬP (GENERAL SPECIFICATION)

- **Base URL:** `http://localhost:5124` (hoặc `https://localhost:7184` nếu chạy HTTPS)
- **Swagger UI Trực Quan:** `http://localhost:5124/swagger` (Đã tích hợp sẵn nút *Authorize* để dán JWT Token test trực tiếp).
- **Kiểm tra trạng thái máy chủ (Health Check):** `GET http://localhost:5124/health` $\rightarrow$ Trả về `Healthy` (HTTP 200).
- **CORS:** Đã cho phép nguồn gốc Frontend: `http://localhost:5173`, `https://localhost:5173`.
- **Header xác thực bắt buộc (đối với các API cần đăng nhập):**
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```
- **Quy chuẩn mã lỗi tập trung (Centralized Error Response):**
  Khi gặp lỗi logic nghiệp vụ hoặc validate, Server luôn trả về mã HTTP tương ứng (400, 401, 403, 404, 500) kèm format JSON chuẩn:
  ```json
  {
    "message": "Thông báo lỗi thân thiện hiển thị cho người dùng.",
    "statusCode": 400
  }
  ```

---

## 2. PHÂN HỆ 1: XÁC THỰC & QUẢN LÝ THIẾT BỊ (AUTHENTICATION & DEVICE)

### 2.1. Đăng ký tài khoản (Register)
- **Method:** `POST`
- **URL:** `/api/auth/register`
- **Body:**
  ```json
  {
    "phoneNumber": "+84703342732",
    "password": "Password123@",
    "fullName": "Nguyễn Văn A"
  }
  ```
- **Response (HTTP 201 Created):**
  ```json
  {
    "userId": "guid-user-id",
    "message": "Đăng ký thành công, vui lòng xác thực mã OTP."
  }
  ```

### 2.2. Xác thực OTP (Verify OTP)
- **Method:** `POST`
- **URL:** `/api/auth/verify-otp`
- **Body:**
  ```json
  {
    "phoneNumber": "+84703342732",
    "otpCode": "123456"
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "isSuccess": true,
    "message": "Xác thực OTP thành công."
  }
  ```

### 2.3. Đăng nhập (Login)
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Body:**
  ```json
  {
    "phoneNumber": "+84703342732",
    "password": "Password123@"
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "guid-refresh-token",
    "expiresAt": "2026-10-04T16:00:00Z"
  }
  ```

### 2.4. Đăng nhập mạng xã hội (Google / Facebook Login)
- **Method:** `POST`
- **URL:** `/api/auth/google-login` hoặc `/api/auth/facebook-login`
- **Body:**
  ```json
  {
    "idToken": "google-or-facebook-token-from-sdk"
  }
  ```

### 2.5. Làm mới Token (Refresh Token)
- **Method:** `POST`
- **URL:** `/api/auth/refresh`
- **Body:**
  ```json
  {
    "refreshToken": "guid-refresh-token"
  }
  ```

### 2.6. Đăng ký thiết bị học viên (Device Registration)
> **Ghi chú FE:** Gọi API này ngay sau khi người dùng đăng nhập thành công để gắn thiết bị vào tài khoản, phục vụ đồng bộ dữ liệu.
- **Method:** `POST`
- **URL:** `/api/devices/register`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "deviceIdentifier": "pixel-8-pro-uuid-123456",
    "deviceModel": "Pixel 8 Pro",
    "osVersion": "Android 14",
    "appVersion": "1.0.0"
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "id": 1,
    "deviceIdentifier": "pixel-8-pro-uuid-123456",
    "deviceModel": "Pixel 8 Pro",
    "osVersion": "Android 14",
    "registeredAt": "2026-10-04T15:00:00Z"
  }
  ```

---

## 3. PHÂN HỆ 2: DANH MỤC KHÓA HỌC & BÀI HỌC (CATALOG MANAGEMENT)

### 3.1. Danh sách toàn bộ khóa học
- **Method:** `GET`
- **URL:** `/api/courses`
- **Quyền:** Công khai (AllowAnonymous)
- **Response (HTTP 200 OK):**
  ```json
  [
    {
      "id": 1,
      "title": "Lập trình C# .NET 8 Cơ Bản",
      "description": "Khóa học nền tảng cho lập trình viên Backend",
      "thumbnailUrl": "/images/course1.png",
      "version": 1,
      "isPublished": true,
      "totalSubjects": 2
    }
  ]
  ```

### 3.2. Danh sách môn học thuộc một khóa học
- **Method:** `GET`
- **URL:** `/api/subjects/course/{courseId}` (Ví dụ: `/api/subjects/course/1`)
- **Quyền:** Công khai (AllowAnonymous)
- **Response (HTTP 200 OK):**
  ```json
  [
    {
      "id": 1,
      "courseId": 1,
      "title": "Phần 1: Giới thiệu C# và Web API",
      "description": "Các khái niệm cốt lõi",
      "sortOrder": 1,
      "totalLessons": 2
    }
  ]
  ```

### 3.3. Danh sách bài học thuộc môn học
- **Method:** `GET`
- **URL:** `/api/lessons/subject/{subjectId}` (Ví dụ: `/api/lessons/subject/1`)
- **Quyền:** Công khai (AllowAnonymous)
- **Response (HTTP 200 OK):**
  ```json
  [
    {
      "id": 1,
      "subjectId": 1,
      "title": "Bài 1: Kiến trúc RESTful và HTTP 206",
      "description": "Học về cách hoạt động của Range Streaming",
      "durationSeconds": 120,
      "sortOrder": 1,
      "version": 1,
      "isPublished": true,
      "hasQuiz": true,
      "mediaAssetCount": 1
    }
  ]
  ```

### 3.4. Chi tiết một bài học
- **Method:** `GET`
- **URL:** `/api/lessons/{id}` (Ví dụ: `/api/lessons/1`)
- **Quyền:** Công khai (AllowAnonymous)

### 3.5. [QUAN TRỌNG] Trọn gói dữ liệu tải học Ngoại tuyến (Lesson Package Offline)
> **Mục đích:** Đây là endpoint quan trọng nhất cho ứng dụng Mobile/Web khi người dùng bấm nút **"Tải bài học ngoại tuyến"**. Trả về đầy đủ Video Metadata (kèm Checksum SHA-256 để verify file) và bộ câu hỏi trắc nghiệm đã được ẩn an toàn đáp án đúng.
- **Method:** `GET`
- **URL:** `/api/lessons/{id}/package` (Ví dụ: `/api/lessons/1/package`)
- **Headers:** `Authorization: Bearer <token>`
- **Response (HTTP 200 OK):**
  ```json
  {
    "lessonId": 1,
    "subjectId": 1,
    "title": "Bài 1: Kiến trúc RESTful và HTTP 206",
    "description": "Học về cách hoạt động của Range Streaming",
    "durationSeconds": 120,
    "sortOrder": 1,
    "version": 1,
    "mediaAssets": [
      {
        "id": 1,
        "type": 1,
        "fileName": "test.mp4",
        "blobKey": "videos/test.mp4",
        "sizeBytes": 17979812,
        "checksum": "38a141d8684b59ffeb40dcdf65278e9b926248c7f56022551ce4e82910bab68c",
        "durationSeconds": 120,
        "status": 3
      }
    ],
    "quiz": {
      "id": 1,
      "title": "Trắc nghiệm: Dependency Injection trong .NET 8",
      "passScore": 80,
      "version": 1,
      "questions": [
        {
          "id": 1,
          "content": "Vòng đời 'Scoped' trong .NET Core có ý nghĩa gì?",
          "points": 50,
          "sortOrder": 1,
          "questionType": 1,
          "options": [
            { "id": 1, "optionText": "Được tạo mới mỗi khi inject", "sortOrder": 1 },
            { "id": 2, "optionText": "Được tạo một lần duy nhất cho mỗi HTTP Request", "sortOrder": 2 }
          ]
        }
      ]
    }
  }
  ```

---

## 4. PHÂN HỆ 3: TRẮC NGHIỆM & CHẤM ĐIỂM (QUIZ MANAGEMENT)

### 4.1. Lấy đề thi trắc nghiệm theo bài học
- **Method:** `GET`
- **URL:** `/api/quizzes/lesson/{lessonId}` (Ví dụ: `/api/quizzes/lesson/1`)
- **Quyền:** Công khai (AllowAnonymous)
- **Đặc điểm bảo mật:** Trường `IsCorrect` bị xóa bỏ hoàn toàn ở tầng DTO phía Server để chống gian lận/soi Network tab.

### 4.2. Nộp bài thi trắc nghiệm trực tuyến (Submit Quiz Attempt)
> **Ghi chú FE:** FE cần tự sinh mã `clientAttemptId` dạng GUID (uuid v4). Nếu mạng bị lag/chập chờn khiến người dùng bấm nộp nhiều lần, Server tự động nhận diện theo `clientAttemptId` và trả về kết quả cũ với cờ `isDuplicate: true` mà không lưu thêm bản ghi rác.
- **Method:** `POST`
- **URL:** `/api/quizzes/attempts`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "quizId": 1,
    "clientAttemptId": "7887bb42-82c1-46b7-8851-da23a374277e",
    "startedAt": "2026-10-04T15:10:00Z",
    "answers": [
      {
        "questionId": 1,
        "selectedOptionIds": [2]
      }
    ]
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "attemptId": 1,
    "clientAttemptId": "7887bb42-82c1-46b7-8851-da23a374277e",
    "quizId": 1,
    "score": 100.0,
    "isPassed": true,
    "isDuplicate": false,
    "submittedAt": "2026-10-04T15:15:00Z",
    "correctAnswersCount": 2,
    "totalQuestionsCount": 2
  }
  ```

### 4.3. Lịch sử làm bài trắc nghiệm của học viên
- **Method:** `GET`
- **URL:** `/api/quizzes/{quizId}/history` (Ví dụ: `/api/quizzes/1/history`)
- **Headers:** `Authorization: Bearer <token>`
- **Response (HTTP 200 OK):**
  ```json
  [
    {
      "attemptId": 1,
      "clientAttemptId": "7887bb42-82c1-46b7-8851-da23a374277e",
      "quizId": 1,
      "quizTitle": "Trắc nghiệm: Dependency Injection trong .NET 8",
      "score": 100.0,
      "isPassed": true,
      "startedAt": "2026-10-04T15:10:00Z",
      "submittedAt": "2026-10-04T15:15:00Z",
      "totalAnswers": 2
    }
  ]
  ```

---

## 5. PHÂN HỆ 4: GHI DANH & TIẾN ĐỘ HỌC TẬP (ENROLLMENT & PROGRESS)

### 5.1. Ghi danh tham gia khóa học
- **Method:** `POST`
- **URL:** `/api/enrollments/course/{courseId}` (Ví dụ: `/api/enrollments/course/1`)
- **Headers:** `Authorization: Bearer <token>`
- **Response (HTTP 200 OK):**
  ```json
  {
    "id": 1,
    "accountId": "guid-user-id",
    "courseId": 1,
    "courseTitle": "Lập trình C# .NET 8 Cơ Bản",
    "status": 1,
    "enrolledAt": "2026-10-04T15:00:00Z",
    "overallProgressPercent": 0.0
  }
  ```

### 5.2. Danh sách các khóa học đã ghi danh
- **Method:** `GET`
- **URL:** `/api/enrollments/my-courses`
- **Headers:** `Authorization: Bearer <token>`

### 5.3. Ghi nhận sự kiện xem video (Lưu tiến độ học tập)
> **Thuật toán Monotonic Merge:** Server áp dụng `Math.Max(serverProgress, clientProgress)`. Do đó dù học viên tua lui lại để xem lại bài giảng thì tiến độ cao nhất từng đạt được sẽ không bao giờ bị tụt lùi.
- **Method:** `POST`
- **URL:** `/api/progress/events`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "lessonId": 1,
    "watchedSeconds": 110,
    "totalDurationSeconds": 120
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "lessonId": 1,
    "watchedSeconds": 110,
    "percent": 91.67,
    "isCompleted": true,
    "completedAt": "2026-10-04T15:18:45Z",
    "lastPlayedAt": "2026-10-04T15:18:45Z"
  }
  ```

### 5.4. Lấy chi tiết tiến độ bài học & khóa học
- **Tiến độ bài học:** `GET /api/progress/lesson/{lessonId}`
- **Tiến độ cả khóa học:** `GET /api/progress/course/{courseId}` $\rightarrow$ Trả về `%` hoàn thành, số bài đã xong và tổng số bài học.

---

## 6. PHÂN HỆ 5: ĐỒNG BỘ 2 CHIỀU OFFLINE-FIRST (SYNC ENGINE)

Hệ thống được thiết kế theo chuẩn phân tán **Local-First & Outbox Pattern**:
- Khi mất mạng, FE lưu các hành động của người dùng (xem video, nộp quiz) vào cơ sở dữ liệu trên máy (SQLite hoặc IndexedDB).
- Khi có mạng trở lại, FE thực hiện đồng bộ 2 chiều (Pull thay đổi mới về, Push thao tác chưa gửi lên).

### 6.1. Chiều 1: Kéo thay đổi vi sai từ máy chủ (Delta Sync Pull)
> **Nguyên lý:** Client lưu giá trị `checkpointSequence` trên máy (lần đầu bằng `0`). Mỗi lần gọi Pull, Server chỉ trả về đúng các thay đổi phát sinh sau mốc này (`afterSequence`).
- **Method:** `GET`
- **URL:** `/api/sync/pull?afterSequence=0&limit=50`
- **Headers:** `Authorization: Bearer <token>`
- **Response (HTTP 200 OK):**
  ```json
  {
    "currentCheckpointSequence": 0,
    "newCheckpointSequence": 12,
    "hasMoreChanges": false,
    "changes": [
      {
        "sequence": 11,
        "entityType": "Lesson",
        "entityId": 1,
        "changeType": "Updated",
        "version": 2,
        "changedAt": "2026-10-04T15:10:00Z"
      },
      {
        "sequence": 12,
        "entityType": "Lesson",
        "entityId": 5,
        "changeType": "Deleted",
        "version": 3,
        "changedAt": "2026-10-04T15:12:00Z"
      }
    ]
  }
  ```
- **Xử lý phía FE:** Nếu gặp `changeType = "Deleted"` (Tombstone), FE tự động xóa bài học tương ứng khỏi kho lưu trữ Offline của thiết bị. Cập nhật `checkpointSequence = newCheckpointSequence`.

### 6.2. Chiều 2: Đẩy hàng đợi thao tác ngoại tuyến (Batch Sync Push)
> **Nguyên lý:** Gom toàn bộ danh sách thao tác trong bảng Outbox cục bộ gửi lên Server trong 1 request duy nhất. Toàn bộ batch được bọc trong giao dịch CSDL **ACID Transaction**.
- **Method:** `POST`
- **URL:** `/api/sync/push`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "deviceId": "pixel-8-pro-uuid-123456",
    "operations": [
      {
        "clientOperationId": "52beea5a-5264-419b-80d1-ceab1770ed2b",
        "operationType": "LessonProgress",
        "entityId": 1,
        "payloadJson": "{\"WatchedSeconds\":120,\"TotalDurationSeconds\":120,\"IsCompleted\":true}",
        "clientCreatedAt": "2026-10-04T15:18:00Z"
      },
      {
        "clientOperationId": "9b12e34a-1122-3344-5566-778899aabbcc",
        "operationType": "QuizAttempt",
        "entityId": 1,
        "payloadJson": "{\"QuizId\":1,\"Answers\":[{\"QuestionId\":1,\"SelectedOptionIds\":[2]}]}",
        "clientCreatedAt": "2026-10-04T15:19:00Z"
      }
    ]
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "acceptedOperationIds": [
      "52beea5a-5264-419b-80d1-ceab1770ed2b",
      "9b12e34a-1122-3344-5566-778899aabbcc"
    ],
    "results": [
      {
        "clientOperationId": "52beea5a-5264-419b-80d1-ceab1770ed2b",
        "success": true,
        "message": "Đồng bộ thành công."
      }
    ],
    "processedAt": "2026-10-04T15:20:00Z"
  }
  ```
- **Xử lý phía FE:** Lọc các `clientOperationId` có trong `acceptedOperationIds` và xóa chúng khỏi hàng đợi Outbox trên máy.

---

## 7. PHÂN HỆ 6: MEDIA STREAMING, TẢI VỀ & AI ENGINE

### 7.1. Tua & Phát Video trực tuyến (HTTP 206 Partial Content)
- **Method:** `GET`
- **URL:** `/api/media/{id}/stream` (Ví dụ: `/api/media/1/stream`)
- **Cách dùng:** Truyền trực tiếp URL này vào thuộc tính `src` của thẻ `<video>` hoặc React Native Video Component. Trình duyệt tự gửi Header `Range: bytes=...`, Server phản hồi HTTP 206 giúp tua ngay lập tức mà không cần chờ tải hết file.

### 7.2. Lấy thông tin tệp tải về & Mã băm Checksum SHA-256
- **Method:** `GET`
- **URL:** `/api/media/{id}/download-info` (Ví dụ: `/api/media/1/download-info`)
- **Response (HTTP 200 OK):**
  ```json
  {
    "mediaId": 1,
    "fileName": "test.mp4",
    "contentType": "video/mp4",
    "fileSizeBytes": 17979812,
    "checksum": "38a141d8684b59ffeb40dcdf65278e9b926248c7f56022551ce4e82910bab68c",
    "downloadUrl": "http://localhost:5124/api/media/1/download"
  }
  ```
- **Quy trình Verify File của FE:**
  1. Tải file từ `downloadUrl`.
  2. Dùng thư viện Crypto (`crypto.subtle` trên Web hoặc `expo-crypto` trên Mobile) tính băm SHA-256 của file tải về.
  3. So sánh: nếu `calculatedHash === checksum` $\rightarrow$ Tệp tin toàn vẹn 100%, an tâm lưu vào bộ nhớ Offline.

### 7.3. Thử nghiệm giọng đọc AI (Text-To-Speech)
> **Đặc điểm:** Tích hợp công nghệ Edge-TTS AI chất lượng cao, hỗ trợ nhiều giọng tự nhiên của Microsoft.
- **Method:** `POST`
- **URL:** `/api/media/tts/test`
- **Body:**
  ```json
  {
    "text": "Chào mừng bạn đến với khóa học Microlearning hôm nay.",
    "voiceName": "vi-VN-HoaiMyNeural"
  }
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "audioUrl": "http://localhost:5124/Audios/test_tts_bc8d7835b879433cbb9adc68b524d918.mp3",
    "fileName": "test_tts_bc8d7835b879433cbb9adc68b524d918.mp3",
    "fileSizeBytes": 29376,
    "voiceUsed": "vi-VN-HoaiMyNeural",
    "status": "Completed"
  }
  ```

### 7.4. Hàng đợi xử lý tác vụ nền (Media Job Background Worker)
- **Xếp hàng tác vụ:** `POST /api/media/jobs/enqueue` (Trả về HTTP 202 Accepted)
  ```json
  {
    "mediaAssetId": 1,
    "jobType": 1 // 1: Transcode, 2: TtsSynthesize, 3: GenerateThumbnail
  }
  ```
- **Tra cứu tiến độ job:** `GET /api/media/jobs/{id}` $\rightarrow$ Trả về trạng thái `Queued`, `Processing`, `Completed`, hoặc `Failed`.

---

## 8. HƯỚNG DẪN CODE MẪU CHO FRONTEND (TYPESCRIPT & AXIOS)

### 8.1. Cấu hình Axios Interceptor tự gắn Token và bắt lỗi
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:5124/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động đính kèm JWT Bearer Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Bắt lỗi toàn cục
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
    console.error('API Error:', errorMsg);
    return Promise.reject(error);
  }
);
```

### 8.2. Hàm kiểm tra mã băm SHA-256 sau khi tải video
```typescript
export async function verifyDownloadedFile(fileBlob: Blob, expectedChecksum: string): Promise<boolean> {
  const arrayBuffer = await fileBlob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.toLowerCase() === expectedChecksum.toLowerCase();
}
```

---

## 9. DANH MỤC TỔNG HỢP ENDPOINT VÀ MÃ TRUY CẬP

| STT | Phân hệ | Endpoint | Method | Quyền hạn |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Hạ tầng | `/health` | GET | Anonymous |
| 2 | Auth | `/api/auth/register` | POST | Anonymous |
| 3 | Auth | `/api/auth/verify-otp` | POST | Anonymous |
| 4 | Auth | `/api/auth/login` | POST | Anonymous |
| 5 | Auth | `/api/auth/google-login` | POST | Anonymous |
| 6 | Auth | `/api/auth/refresh` | POST | Anonymous |
| 7 | Thiết bị | `/api/devices/register` | POST | **Authorize** |
| 8 | Khóa học | `/api/courses` | GET | Anonymous |
| 9 | Môn học | `/api/subjects/course/{courseId}` | GET | Anonymous |
| 10 | Bài học | `/api/lessons/subject/{subjectId}` | GET | Anonymous |
| 11 | Bài học | `/api/lessons/{id}` | GET | Anonymous |
| 12 | Gói Offline | `/api/lessons/{id}/package` | GET | **Authorize** |
| 13 | Đề thi | `/api/quizzes/lesson/{lessonId}` | GET | Anonymous |
| 14 | Nộp bài thi | `/api/quizzes/attempts` | POST | **Authorize** |
| 15 | Lịch sử thi | `/api/quizzes/{quizId}/history` | GET | **Authorize** |
| 16 | Ghi danh | `/api/enrollments/course/{courseId}` | POST | **Authorize** |
| 17 | Ghi danh | `/api/enrollments/my-courses` | GET | **Authorize** |
| 18 | Tiến độ | `/api/progress/events` | POST | **Authorize** |
| 19 | Tiến độ | `/api/progress/lesson/{lessonId}` | GET | **Authorize** |
| 20 | Tiến độ | `/api/progress/course/{courseId}` | GET | **Authorize** |
| 21 | Đồng bộ | `/api/sync/pull` | GET | **Authorize** |
| 22 | Đồng bộ | `/api/sync/push` | POST | **Authorize** |
| 23 | Streaming | `/api/media/{id}/stream` | GET | Anonymous |
| 24 | Download Info| `/api/media/{id}/download-info` | GET | Anonymous |
| 25 | Download File| `/api/media/{id}/download` | GET | Anonymous |
| 26 | AI TTS Test | `/api/media/tts/test` | POST | Anonymous |
| 27 | AI Kịch bản | `/api/media/tts/narration/{scriptId}` | POST | **Authorize** |
| 28 | Media Jobs | `/api/media/jobs/enqueue` | POST | **Authorize** |
| 29 | Media Jobs | `/api/media/jobs/{id}` | GET | Anonymous |
