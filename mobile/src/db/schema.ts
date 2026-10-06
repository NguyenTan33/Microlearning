// Định nghĩa DDL toàn bộ 9 bảng SQLite cho Microlearning Mobile App

export const CREATE_TABLES_SQL = `
-- 1. Bảng hàng đợi đồng bộ ngoại tuyến (Outbox Pattern)
CREATE TABLE IF NOT EXISTS SyncOutbox (
    clientOperationId TEXT PRIMARY KEY,
    operationType TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId INTEGER NOT NULL,
    payloadJson TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    retryCount INTEGER DEFAULT 0,
    lastError TEXT,
    status TEXT DEFAULT 'PENDING'
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON SyncOutbox(status);

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
CREATE INDEX IF NOT EXISTS idx_subjects_course ON LocalSubjects(courseId);

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
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON LocalLessons(subjectId);

-- 6. Bảng quản lý Tệp Video/Audio tải về máy (Offline Media Vault)
CREATE TABLE IF NOT EXISTS DownloadedMedia (
    mediaId INTEGER PRIMARY KEY,
    lessonId INTEGER NOT NULL,
    fileName TEXT NOT NULL,
    localPath TEXT NOT NULL,
    fileSizeBytes INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    downloadedAt TEXT NOT NULL,
    lastPlayedAt TEXT NOT NULL,
    isPinned INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    FOREIGN KEY (lessonId) REFERENCES LocalLessons(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_download_lesson ON DownloadedMedia(lessonId);

-- 7. Bảng gói Đề thi trắc nghiệm ngoại tuyến (Quiz Package)
CREATE TABLE IF NOT EXISTS LocalQuizzes (
    quizId INTEGER PRIMARY KEY,
    lessonId INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    passScore INTEGER DEFAULT 80,
    version INTEGER DEFAULT 1,
    questionsJson TEXT NOT NULL,
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
    isDirty INTEGER DEFAULT 0
);

-- 9. Bảng Lịch sử làm bài thi trắc nghiệm cục bộ
CREATE TABLE IF NOT EXISTS LocalQuizAttempts (
    clientAttemptId TEXT PRIMARY KEY,
    quizId INTEGER NOT NULL,
    lessonId INTEGER NOT NULL,
    score REAL DEFAULT 0.0,
    isPassed INTEGER DEFAULT 0,
    submittedAt TEXT NOT NULL,
    answersJson TEXT NOT NULL,
    syncStatus TEXT DEFAULT 'PENDING'
);
`;
