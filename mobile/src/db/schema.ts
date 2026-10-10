export const CREATE_TABLES_DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

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

CREATE TABLE IF NOT EXISTS SyncMeta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS LocalSubjects (
    id INTEGER PRIMARY KEY,
    courseId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sortOrder INTEGER DEFAULT 1,
    totalLessons INTEGER DEFAULT 0,
    FOREIGN KEY (courseId) REFERENCES LocalCourses(id) ON DELETE CASCADE
);

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
    videoRemoteUrl TEXT,
    audioTtsUrl TEXT,
    FOREIGN KEY (subjectId) REFERENCES LocalSubjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DownloadedMedia (
    mediaId INTEGER PRIMARY KEY AUTOINCREMENT,
    lessonId INTEGER NOT NULL UNIQUE,
    fileName TEXT NOT NULL,
    localPath TEXT NOT NULL,
    fileSizeBytes INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    downloadedAt TEXT NOT NULL,
    lastPlayedAt TEXT NOT NULL,
    isPinned INTEGER DEFAULT 0,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS LocalQuizzes (
    quizId INTEGER PRIMARY KEY,
    lessonId INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    passScore REAL DEFAULT 80.0,
    version INTEGER DEFAULT 1,
    questionsJson TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (lessonId) REFERENCES LocalLessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS LocalLessonProgress (
    lessonId INTEGER PRIMARY KEY,
    watchedSeconds INTEGER DEFAULT 0,
    percent REAL DEFAULT 0.0,
    isCompleted INTEGER DEFAULT 0,
    completedAt TEXT,
    lastPlayedAt TEXT NOT NULL,
    isDirty INTEGER DEFAULT 0
);

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

CREATE TABLE IF NOT EXISTS LocalMediaBookmarks (
    id TEXT PRIMARY KEY,
    lessonId INTEGER NOT NULL,
    mediaId INTEGER,
    courseId INTEGER NOT NULL,
    courseTitle TEXT,
    lessonTitle TEXT,
    timestamp REAL NOT NULL,
    formattedTime TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT,
    createdAt TEXT NOT NULL,
    syncStatus TEXT DEFAULT 'SYNCED'
);
`;
