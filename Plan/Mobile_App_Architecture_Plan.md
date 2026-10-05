# BẢN ĐẶC TẢ KIẾN TRÚC & KẾ HOẠCH TRIỂN KHAI FRONTEND MOBILE (REACT NATIVE + SQLITE)
## Dự án: Microlearning Video App (Cross-Platform Mobile Offline-First)

> **Tác giả:** Senior Frontend Engineer (React Web & React Native)  
> **Dựa trên:** Toàn bộ Backend API (`Report/API_HANDOVER_FRONTEND.md`), Tài liệu lộ trình (`Plan/Roadmap_Microlearning.docx`), và Web App hiện có (`client/`).  
> **Ngày lập:** 05/10/2026  
> **Trạng thái:** Sẵn sàng nghiệm thu và thực thi.

---

## 1. TỔNG QUAN HIỆN TRẠNG & MỤC TIÊU NÂNG CẤP ĐA NỀN TẢNG

### 1.1. Hiện trạng hệ sinh thái đã có
1. **Backend (.NET 8/10 Web API + SQL Server 2022 + Background Worker):**
   - Đã bàn giao trọn vẹn 35 endpoints RESTful (`/api/auth`, `/api/devices`, `/api/courses`, `/api/lessons`, `/api/quizzes`, `/api/progress`, `/api/sync/push`, `/api/sync/pull`, `/api/media/stream`, `/api/media/tts`, `/api/admin/users`).
   - Sẵn sàng các cơ chế cốt lõi:
     - **Delta Sync Pull:** Kéo vi sai qua con trỏ `afterSequence`.
     - **Outbox Batch Sync Push:** Tiếp nhận mảng thao tác trong 1 Transaction ACID duy nhất.
     - **Monotonic Merge:** `Math.Max(serverProgress, clientProgress)` chống tụt lùi tiến độ học tập.
     - **Idempotency Deduplication:** Chấm điểm an toàn theo `clientAttemptId` (GUID), không lộ đáp án đúng ở client.
     - **Tombstone Pattern:** Đồng bộ trạng thái xóa mềm để client gỡ bỏ file/nội dung rác.
     - **Range Streaming:** Chuẩn HTTP 206 hỗ trợ tua video không nghẽn băng thông.
     - **Media Integrity:** Mã băm SHA-256 xác thực toàn vẹn tệp tin tải về.
2. **Frontend Web (`client/`):**
   - Xây dựng bằng React 19 + TypeScript + Vite + Tailwind CSS.
   - Đã có luồng xác thực (Auth), Danh mục khóa học/bài học (Catalog), Trình phát Video/TTS, Trắc nghiệm (Quiz), và cơ chế lưu trữ cục bộ thử nghiệm bằng **IndexedDB**.

### 1.2. Mục tiêu chuyển đổi lên Mobile App
- **Nền tảng:** React Native (sử dụng Expo SDK mới nhất với Expo Router).
- **Ngôn ngữ:** TypeScript Strict Mode (`noImplicitAny: true`, 100% type-safe, cấm `any`).
- **Lưu trữ dữ liệu cục bộ:** Thay thế IndexedDB của web bằng **SQLite (`expo-sqlite`)** cho cơ sở dữ liệu quan hệ, kết hợp **Filesystem (`expo-file-system`)** để lưu trữ video tải về.
- **Bảo mật:** Lưu trữ JWT Token và thông tin xác thực vào **SecureStore (`expo-secure-store`)** mã hóa phần cứng (Keystore trên Android / Keychain trên iOS).

---

## 2. THIẾT KẾ KIẾN TRÚC LOCAL DATABASE (SQLITE SCHEMA)

Theo đúng nguyên tắc trong `Roadmap_Microlearning.docx`, tuyệt đối không nhét binary video dung lượng lớn vào SQLite để tránh phình database làm chậm ứng dụng. Video được lưu tại Filesystem, SQLite chỉ lưu metadata và đường dẫn vật lý.

### 2.1. Danh sách các bảng SQLite (`Microlearning_Local.db`)

```sql
-- 1. Bảng hàng đợi đồng bộ Outbox (Lưu các hành vi phát sinh khi offline)
CREATE TABLE IF NOT EXISTS SyncOutbox (
    clientOperationId TEXT PRIMARY KEY,
    operationType TEXT NOT NULL,          -- 'LESSON_PROGRESS' | 'QUIZ_ATTEMPT'
    entityType TEXT NOT NULL,             -- 'Lesson' | 'Quiz'
    entityId INTEGER NOT NULL,
    payloadJson TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    retryCount INTEGER DEFAULT 0,
    lastError TEXT,
    status TEXT DEFAULT 'PENDING'         -- 'PENDING' | 'SENDING' | 'FAILED'
);

-- 2. Bảng lưu mốc Checkpoint và Metadata hệ thống
CREATE TABLE IF NOT EXISTS SyncMeta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

-- 3. Bảng cache Danh mục Khóa học
CREATE TABLE IF NOT EXISTS LocalCourses (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    thumbnailUrl TEXT,
    version INTEGER DEFAULT 1,
    isPublished INTEGER DEFAULT 1,
    totalSubjects INTEGER DEFAULT 0,
    updatedAt TEXT NOT NULL
);

-- 4. Bảng cache Môn học (Subjects)
CREATE TABLE IF NOT EXISTS LocalSubjects (
    id INTEGER PRIMARY KEY,
    courseId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sortOrder INTEGER DEFAULT 1,
    totalLessons INTEGER DEFAULT 0,
    FOREIGN KEY (courseId) REFERENCES LocalCourses(id) ON DELETE CASCADE
);

-- 5. Bảng cache Bài học (Lessons)
CREATE TABLE IF NOT EXISTS LocalLessons (
    id INTEGER PRIMARY KEY,
    subjectId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    durationSeconds INTEGER DEFAULT 0,
    sortOrder INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    isPublished INTEGER DEFAULT 1,
    hasQuiz INTEGER DEFAULT 0,
    mediaAssetCount INTEGER DEFAULT 0,
    FOREIGN KEY (subjectId) REFERENCES LocalSubjects(id) ON DELETE CASCADE
);

-- 6. Bảng quản lý Tệp Media đã tải về (Offline Video Cache)
CREATE TABLE IF NOT EXISTS DownloadedMedia (
    mediaId INTEGER PRIMARY KEY,
    lessonId INTEGER NOT NULL,
    fileName TEXT NOT NULL,
    localPath TEXT NOT NULL,              -- Đường dẫn file trong FileSystem.documentDirectory
    fileSizeBytes INTEGER NOT NULL,
    checksum TEXT NOT NULL,               -- Mã SHA-256 từ Server để đối soát
    downloadedAt TEXT NOT NULL,
    lastPlayedAt TEXT NOT NULL,
    isPinned INTEGER DEFAULT 0,           -- 1 = Người dùng ghim giữ, không bao giờ tự xóa
    status TEXT NOT NULL,                 -- 'DOWNLOADING' | 'DOWNLOADED' | 'FAILED'
    FOREIGN KEY (lessonId) REFERENCES LocalLessons(id) ON DELETE CASCADE
);

-- 7. Bảng gói Đề thi trắc nghiệm ngoại tuyến (Quiz Package)
CREATE TABLE IF NOT EXISTS LocalQuizzes (
    quizId INTEGER PRIMARY KEY,
    lessonId INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    passScore INTEGER DEFAULT 80,
    version INTEGER DEFAULT 1,
    questionsJson TEXT NOT NULL,          -- Bộ câu hỏi đã xóa IsCorrect từ Server
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (lessonId) REFERENCES LocalLessons(id) ON DELETE CASCADE
);

-- 8. Bảng Tiến độ học tập cục bộ
CREATE TABLE IF NOT EXISTS LocalLessonProgress (
    lessonId INTEGER PRIMARY KEY,
    watchedSeconds INTEGER DEFAULT 0,
    percent REAL DEFAULT 0.0,
    isCompleted INTEGER DEFAULT 0,
    completedAt TEXT,
    lastPlayedAt TEXT NOT NULL,
    isDirty INTEGER DEFAULT 0             -- 1 = Có cập nhật mới chưa đẩy lên Server
);

-- 9. Bảng Lịch sử làm bài thi trắc nghiệm cục bộ
CREATE TABLE IF NOT EXISTS LocalQuizAttempts (
    clientAttemptId TEXT PRIMARY KEY,     -- GUID
    quizId INTEGER NOT NULL,
    lessonId INTEGER NOT NULL,
    score REAL DEFAULT 0.0,
    isPassed INTEGER DEFAULT 0,
    submittedAt TEXT NOT NULL,
    answersJson TEXT NOT NULL,
    syncStatus TEXT DEFAULT 'PENDING'     -- 'PENDING' | 'SYNCED'
);
```

---

## 3. CƠ CHẾ ĐỒNG BỘ TỰ ĐỘNG 100% (EVENT & CONNECTIVITY-DRIVEN SYNC ENGINE)

Trong ứng dụng Mobile Offline-First chuẩn mực, **học viên tuyệt đối không cần phải bấm nút đồng bộ thủ công**. Toàn bộ quá trình đồng bộ diễn ra hoàn toàn tự động, chạy ngầm và trong suốt (transparently in background) theo các điều kiện sau:

```
               [HÀNH ĐỘNG HỌC VIÊN]
          (Xem video, hoàn thành bài, nộp Quiz)
                        │
                        ▼
      ┌──────────────────────────────────┐
      │  Ghi tức thì vào SQLite Database │
      │  (LocalProgress & QuizAttempts)  │
      └─────────────────┬────────────────┘
                        │
             Đang có Mạng hay Mất mạng?
            ┌───────────┴───────────┐
       Có Mạng                  Mất Mạng
            │                       │
            ▼                       ▼
    Đẩy API tức thì          Ghi vào bảng `SyncOutbox`
   (Direct API Push)         (Status: 'PENDING')
                                    │
                                    │ (Chờ đến khi có mạng lại...)
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             4 KÍCH HOẠT TỰ ĐỘNG (TRIGGERS)             │
       ├────────────────────────────────────────────────────────┤
       │ 1. Network Reconnected: NetInfo phát hiện Wifi / 4G    │
       │ 2. App Resume: Mở lại app từ màn hình nền (Foreground) │
       │ 3. Immediate Event: Vừa hoàn thành 1 bài học / Quiz    │
       │ 4. Heartbeat Timer: Định kỳ mỗi 3-5 phút khi Online    │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │          AUTO SYNC RUNNER (Có khóa Mutex Lock)         │
       │ 1. Debounce 2 giây (Chống chập chờn mạng WiFi)         │
       │ 2. Push Batch Outbox (Tối đa 50 item) -> Xóa khi xong  │
       │ 3. Pull Delta Sync (Theo sequence checkpoint mới nhất) │
       └────────────────────────────────────────────────────────┘
```

### 3.1. 4 Kích hoạt tự động (Automatic Triggers)
1. **Kích hoạt mạng (Network Recovery Trigger):** Sử dụng `@react-native-community/netinfo`. Ngay khi `isConnected === true` và `isInternetReachable === true`, engine tự động kích hoạt.
2. **Kích hoạt vòng đời (Lifecycle Foreground Trigger):** Sử dụng `AppState.addEventListener('change', ...)`. Khi học viên mở app hoặc chuyển từ app khác quay lại, engine tự động kiểm tra hàng đợi Outbox.
3. **Kích hoạt tức thì theo sự kiện (Immediate Event Trigger):** Khi vừa kết thúc video hoặc nộp quiz, nếu máy đang có mạng thì gửi ngay; nếu mất mạng thì tự động fallback vào Outbox mà không làm gián đoạn trải nghiệm người dùng.
4. **Kích hoạt định kỳ (Heartbeat Polling):** Khi đang online và app đang mở, định kỳ mỗi 3 - 5 phút gọi nhẹ Delta Sync Pull để đón các nội dung bài học mới nhất mà giảng viên vừa cập nhật trên Web.

### 3.2. Cơ chế An toàn & Tối ưu hiệu năng
- **Khóa đơn phiên (Mutex Lock):** Ngăn chặn 2 tiến trình đồng bộ chạy song song gây trùng lặp request hoặc lãng phí băng thông.
- **Debounce 2.000ms:** Chống hiện tượng wifi chập chờn (kết nối rồi ngắt liên tục trong vài giây).
- **Exponential Backoff:** Nếu server bận hoặc gặp lỗi mạng giữa chừng, giữ nguyên dữ liệu trong SQLite, không xóa, tăng `retryCount` và hẹn giờ thử lại an toàn.
- **Tùy chọn Tiết kiệm dữ liệu di động (Wi-Fi Only Toggle):** Cho phép học viên cài đặt "Chỉ đồng bộ/tải bài khi kết nối Wi-Fi" để tránh tốn dung lượng 4G/5G.
- *Nút đồng bộ thủ công chỉ xuất hiện như một biểu tượng nhỏ trong trang Cài đặt để dự phòng cho người dùng muốn ép đồng bộ ngay lập tức.*

---

## 4. CHIẾN LƯỢC QUẢN LÝ MEDIA & CHÍNH SÁCH DỌN DẸP 7 NGÀY (7-DAY CLEANUP & LRU)

1. **Quy trình tải an toàn:**
   - Bước 1: Gọi `GET /api/lessons/{id}/package` để lấy DTO gói bài học, URL tải và mã SHA-256 Checksum.
   - Bước 2: Dùng `FileSystem.createDownloadResumable` để tải video với thanh tiến trình trực quan.
   - Bước 3: Tính toán mã băm SHA-256 của tệp cục bộ bằng `expo-crypto`.
   - Bước 4: So sánh: Nếu khớp -> Ghi vào bảng `DownloadedMedia` với trạng thái `DOWNLOADED`. Nếu sai lệch -> Xóa file hỏng và cảnh báo người dùng.
2. **Chính sách tự xóa video sau 7 ngày (7-Day Auto-Cleanup Policy):**
   - Điều kiện tự xóa: Bài học có `isCompleted = 1`, `isPinned = 0`, và `lastPlayedAt <= (Hiện tại - 7 ngày)`.
   - Hành động: Xóa file vật lý khỏi Filesystem, cập nhật trạng thái trong `DownloadedMedia` thành đã gỡ, giữ nguyên metadata và tiến độ học tập để học viên có thể tải lại bất kỳ lúc nào.
   - Kích hoạt (Triggers): Chạy `MediaCleanupService` khi ứng dụng khởi động (`App launch`), khi ứng dụng quay lại từ nền (`App resume`), hoặc khi người dùng chuẩn bị tải bài học mới.
3. **Kiểm soát dung lượng bộ nhớ (Storage Quota):**
   - Thiết lập ngưỡng dung lượng cho phép (ví dụ: 2GB - 4GB).
   - Nếu dung lượng sắp đầy, cảnh báo người dùng và gợi ý giải phóng các bài học cũ theo giải thuật LRU (Least Recently Used).

---

## 5. CẤU TRÚC THƯ MỤC SOURCE CODE MOBILE CHUẨN KỸ THUẬT

```
mobile/
|-- app/                            # Expo Router (Cấu trúc định tuyến màn hình)
|   |-- _layout.tsx                 # Root Layout bọc SafeArea, QueryClient, ErrorBoundary
|   |-- (auth)/
|   |   |-- login.tsx               # Màn hình Đăng nhập (Số điện thoại / Mật khẩu)
|   |   |-- register.tsx            # Màn hình Đăng ký tài khoản
|   |   |-- verify-otp.tsx          # Màn hình Xác thực OTP
|   |-- (tabs)/
|   |   |-- _layout.tsx             # Bottom Tab Navigation
|   |   |-- index.tsx               # Tab 1: Trang chủ / Khóa học đang học
|   |   |-- catalog.tsx             # Tab 2: Khám phá tất cả khóa học
|   |   |-- downloads.tsx           # Tab 3: Kho bài học tải ngoại tuyến & Quản lý bộ nhớ
|   |   |-- profile.tsx             # Tab 4: Hồ sơ cá nhân, Thiết bị & Trạng thái Đồng bộ
|   |-- course/
|   |   |-- [id].tsx                # Chi tiết khóa học & Danh sách môn/bài
|   |-- lesson/
|   |   |-- [id].tsx                # Màn hình học: Video Player + Audio TTS + Nút tải
|   |-- quiz/
|   |   |-- [id].tsx                # Màn hình làm bài thi trắc nghiệm (Online / Offline)
|
|-- src/
|   |-- assets/                     # Ảnh, icons, fonts vector
|   |-- components/                 # Các UI Components tái sử dụng
|   |   |-- common/                 # Button, Input, Card, Badge, Skeleton, Modal
|   |   |-- player/                 # Custom Video Player, TTS Audio Controller
|   |   |-- quiz/                   # Quiz Question Card, Countdown Timer, Score Modal
|   |   |-- sync/                   # Sync Status Banner, Sync Center Modal
|   |   |-- download/               # Download Progress Bar, Storage Quota Indicator
|   |-- db/                         # Hệ thống SQLite Cục bộ
|   |   |-- sqliteClient.ts         # Khởi tạo và kết nối DB qua expo-sqlite
|   |   |-- schema.ts               # Định nghĩa các câu lệnh DDL khởi tạo bảng
|   |   |-- repositories/           # Tách biệt truy vấn dữ liệu theo Repository Pattern
|   |       |-- outboxRepository.ts
|   |       |-- catalogRepository.ts
|   |       |-- downloadRepository.ts
|   |       |-- progressRepository.ts
|   |       |-- quizRepository.ts
|   |-- features/                   # Business logic của từng tính năng
|   |   |-- auth/                   # useAuth, AuthContext, tokenManager
|   |   |-- catalog/                # useCourses, useCourseDetail, useLesson
|   |   |-- player/                 # useVideoPlayback, useTtsSpeech
|   |   |-- quiz/                   # useQuizRunner, quizScoringHelper
|   |   |-- sync/                   # syncManager, useSyncEngine
|   |   |-- download/               # downloadManager, mediaCleanupService
|   |-- hooks/                      # Custom hooks dùng chung (useNetworkStatus, useDebounce...)
|   |-- services/                   # Kết nối mạng & API
|   |   |-- apiClient.ts            # Cấu hình Axios + Auto Refresh Token Interceptor
|   |   |-- authApi.ts              # API Login, Register, OTP, Device
|   |   |-- catalogApi.ts           # API Course, Subject, Lesson, LessonPackage
|   |   |-- quizApi.ts              # API Quizzes, Submit Attempt
|   |   |-- progressApi.ts          # API Progress Event, Summary
|   |   |-- syncApi.ts              # API Sync Push, Sync Pull
|   |-- store/                      # Zustand State Management
|   |   |-- useAuthStore.ts
|   |   |-- useSyncStore.ts
|   |   |-- useDownloadStore.ts
|   |-- types/                      # TypeScript Interfaces chuẩn xác 100%
|   |   |-- auth.types.ts
|   |   |-- catalog.types.ts
|   |   |-- quiz.types.ts
|   |   |-- sync.types.ts
|   |   |-- download.types.ts
|   |-- utils/                      # Helper: sha256, formatBytes, formatDuration, guid
```

---

## 6. LỘ TRÌNH TRIỂN KHAI TỪNG BƯỚC (STEP-BY-STEP IMPLEMENTATION ROADMAP)

- **Bước 1: Khởi tạo Project & Cấu hình Nền tảng**
  - Khởi tạo Expo App với TypeScript template và Expo Router.
  - Cấu hình theme màu Dark Academic cao cấp đồng bộ với Web.
  - Cài đặt các thư viện lõi: `expo-sqlite`, `expo-file-system`, `expo-crypto`, `expo-secure-store`, `expo-av`, `@react-native-community/netinfo`, `lucide-react-native`, `zustand`, `axios`.
- **Bước 2: Xây dựng Lõi SQLite & SecureStore**
  - Viết `sqliteClient.ts` và tạo toàn bộ 9 bảng CSDL.
  - Xây dựng `tokenManager` sử dụng `expo-secure-store`.
  - Cấu hình `apiClient.ts` với Axios interceptor tự động gắn token và xử lý refresh token.
- **Bước 3: Hoàn thiện Module Xác thực & Đăng ký Thiết bị**
  - Màn hình Đăng nhập, Đăng ký, Xác thực OTP.
  - Tự động lấy UUID thiết bị và gọi `POST /api/devices/register` khi người dùng đăng nhập thành công.
- **Bước 4: Module Danh mục Khóa học & Cache Cục bộ**
  - Màn hình Danh sách khóa học, Chi tiết môn học, Danh sách bài giảng.
  - Cơ chế Cache-first: Đọc từ SQLite hiển thị ngay lập tức, gọi API cập nhật ngầm.
- **Bước 5: Trình phát Video Học tập & Trình tải Ngoại tuyến**
  - Tích hợp Video Player hỗ trợ streaming HTTP 206 trực tuyến và phát file ngoại tuyến từ Filesystem.
  - Download Manager: Tải bài học ngoại tuyến, kiểm tra mã băm SHA-256 toàn vẹn, lưu metadata vào SQLite.
  - Dịch vụ tự dọn dẹp file cũ sau 7 ngày (7-day cleanup policy).
- **Bước 6: Module Trắc nghiệm (Quiz Engine)**
  - Giao diện làm bài thi trắc nghiệm mượt mà, hỗ trợ cả Online và Offline.
  - Lưu kết quả làm bài vào SQLite và tự sinh `clientAttemptId` (GUID) chống trùng lặp.
- **Bước 7: Động cơ Đồng bộ 2 Chiều (Offline-First Sync Engine)**
  - Outbox Manager: Ghi nhận tiến độ xem video và nộp quiz khi mất mạng.
  - Lắng nghe sự kiện khôi phục kết nối mạng (NetInfo).
  - Tự động chạy quy trình Push Batch (Outbox) và Pull Delta (Sequence Checkpoint).
- **Bước 8: Tinh chỉnh Giao diện, Kiểm thử Biên & Nghiệm thu**
  - Kiểm thử chế độ ngắt mạng hoàn toàn (Airplane Mode): Xem video đã tải, làm quiz.
  - Kiểm thử bật lại mạng: Kiểm tra dữ liệu được đồng bộ thành công lên SQL Server mà không bị nhân bản hay xung đột.
