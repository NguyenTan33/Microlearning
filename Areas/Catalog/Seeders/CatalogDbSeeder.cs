using Microlearning.Model;
using Microlearning.Model.Entities;
using Microlearning.Model.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Catalog.Seeders
{
    public static class CatalogDbSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Nếu đã có đề thi thì kiểm tra xem cần nạp khóa học hay không
            if (await dbContext.Courses.AnyAsync())
            {
                if (!await dbContext.Quizzes.AnyAsync())
                {
                    var firstLesson = await dbContext.Lessons.FirstOrDefaultAsync();
                    if (firstLesson != null)
                    {
                        var quizSample = new Model.Entities.Quiz
                        {
                            LessonId = firstLesson.Id,
                            Title = "Trắc nghiệm: Dependency Injection trong .NET 8",
                            PassScore = 80,
                            Version = 1,
                            CreatedAt = DateTime.UtcNow
                        };

                        var qSample1 = new Question
                        {
                            Content = "Vòng đời 'Scoped' trong .NET Core có ý nghĩa gì?",
                            Explanation = "Scoped service được tạo một lần duy nhất cho mỗi HTTP Request và được giải phóng khi request kết thúc.",
                            Points = 50,
                            SortOrder = 1,
                            QuestionType = QuestionType.SingleChoice
                        };
                        qSample1.QuizOptions.Add(new QuizOption { OptionText = "Được tạo mới mỗi khi được inject vào constructor.", IsCorrect = false, SortOrder = 1 });
                        qSample1.QuizOptions.Add(new QuizOption { OptionText = "Được tạo một lần duy nhất cho mỗi HTTP Request.", IsCorrect = true, SortOrder = 2 });
                        qSample1.QuizOptions.Add(new QuizOption { OptionText = "Được tạo một lần duy nhất cho toàn bộ vòng đời của ứng dụng.", IsCorrect = false, SortOrder = 3 });

                        var qSample2 = new Question
                        {
                            Content = "Lợi ích lớn nhất của việc dùng Interface cho Service là gì?",
                            Explanation = "Giúp lỏng liên kết (Loose Coupling), dễ bảo trì và dễ viết Unit Test giả lập (Mocking).",
                            Points = 50,
                            SortOrder = 2,
                            QuestionType = QuestionType.SingleChoice
                        };
                        qSample2.QuizOptions.Add(new QuizOption { OptionText = "Giảm liên kết phụ thuộc, dễ dàng thay thế và viết Unit Test.", IsCorrect = true, SortOrder = 1 });
                        qSample2.QuizOptions.Add(new QuizOption { OptionText = "Giúp ứng dụng chạy nhanh hơn gấp 2 lần.", IsCorrect = false, SortOrder = 2 });
                        qSample2.QuizOptions.Add(new QuizOption { OptionText = "Bắt buộc trong cú pháp của C#.", IsCorrect = false, SortOrder = 3 });

                        quizSample.Questions.Add(qSample1);
                        quizSample.Questions.Add(qSample2);

                        dbContext.Quizzes.Add(quizSample);
                        await dbContext.SaveChangesAsync();
                    }
                }
                return;
            }

            // ==================== KHÓA HỌC 1 ====================
            var course1 = new Course
            {
                Title = "Lập trình C# & .NET 8 Hiện đại",
                Description = "Khóa học nền tảng toàn diện về C# 12, ASP.NET Core Web API, Entity Framework Core 8 và nguyên tắc SOLID trong các dự án thực tế.",
                ThumbnailUrl = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600",
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var subject1 = new Subject
            {
                Title = "Cơ bản về .NET 8 & Clean Architecture",
                Description = "Tìm hiểu vòng đời ứng dụng .NET, Dependency Injection và tổ chức mã nguồn sạch.",
                SortOrder = 1,
                CreatedAt = DateTime.UtcNow
            };

            var lesson1 = new Lesson
            {
                Title = "Giới thiệu ASP.NET Core & Dependency Injection",
                Description = "Nắm vững cách hoạt động của IoC Container, Scoped, Singleton, Transient trong .NET 8.",
                DurationSeconds = 240,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            lesson1.MediaAssets.Add(new MediaAsset
            {
                MediaType = MediaType.Video,
                FileName = "dotnet8_di_intro.mp4",
                BlobKey = "videos/dotnet8_di_intro.mp4",
                ContentType = "video/mp4",
                SizeBytes = 15728640, // ~15 MB
                DurationSeconds = 240,
                Checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                Status = MediaAssetStatus.Ready,
                CreatedAt = DateTime.UtcNow
            });

            var quiz1 = new Model.Entities.Quiz
            {
                Title = "Trắc nghiệm: Dependency Injection trong .NET 8",
                PassScore = 80,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var q1 = new Question
            {
                Content = "Vòng đời 'Scoped' trong .NET Core có ý nghĩa gì?",
                Explanation = "Scoped service được tạo một lần duy nhất cho mỗi HTTP Request và được giải phóng khi request kết thúc.",
                Points = 50,
                SortOrder = 1,
                QuestionType = QuestionType.SingleChoice
            };
            q1.QuizOptions.Add(new QuizOption { OptionText = "Được tạo mới mỗi khi được inject vào constructor.", IsCorrect = false, SortOrder = 1 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Được tạo một lần duy nhất cho mỗi HTTP Request.", IsCorrect = true, SortOrder = 2 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Được tạo một lần duy nhất cho toàn bộ vòng đời của ứng dụng.", IsCorrect = false, SortOrder = 3 });

            var q2 = new Question
            {
                Content = "Lợi ích lớn nhất của việc dùng Interface cho Service là gì?",
                Explanation = "Giúp lỏng liên kết (Loose Coupling), dễ bảo trì và dễ viết Unit Test giả lập (Mocking).",
                Points = 50,
                SortOrder = 2,
                QuestionType = QuestionType.SingleChoice
            };
            q2.QuizOptions.Add(new QuizOption { OptionText = "Giảm liên kết phụ thuộc, dễ dàng thay thế và viết Unit Test.", IsCorrect = true, SortOrder = 1 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Giúp ứng dụng chạy nhanh hơn gấp 2 lần.", IsCorrect = false, SortOrder = 2 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Bắt buộc trong cú pháp của C#.", IsCorrect = false, SortOrder = 3 });

            quiz1.Questions.Add(q1);
            quiz1.Questions.Add(q2);
            lesson1.Quiz = quiz1;

            var lesson2 = new Lesson
            {
                Title = "Nguyên lý SOLID & Thin Controllers",
                Description = "Tách biệt rõ ràng tầng Controller, Service và Repository để code dễ bảo trì.",
                DurationSeconds = 280,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            subject1.Lessons.Add(lesson1);
            subject1.Lessons.Add(lesson2);
            course1.Subjects.Add(subject1);

            // ==================== KHÓA HỌC 2 ====================
            var course2 = new Course
            {
                Title = "Kiến trúc Offline-First Mobile & Web App",
                Description = "Chuyên đề chuyên sâu về Idempotency, Monotonic Merge, Outbox Pattern và Sequence Delta Sync trong các hệ thống phân tán và ứng dụng không coi mất mạng là lỗi.",
                ThumbnailUrl = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600",
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var subject2 = new Subject
            {
                Title = "Thuật toán Đồng bộ & Giải quyết Xung đột",
                Description = "Cách giải quyết xung đột dữ liệu giữa nhiều thiết bị và hàng đợi ngoại tuyến.",
                SortOrder = 1,
                CreatedAt = DateTime.UtcNow
            };

            var lesson3 = new Lesson
            {
                Title = "Monotonic Merge chống tụt lùi tiến độ",
                Description = "Ứng dụng hàm Math.Max để đảm bảo tiến độ học tập trên máy tính và điện thoại luôn nhất quán.",
                DurationSeconds = 210,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var lesson4 = new Lesson
            {
                Title = "Idempotency Key & Chống nộp bài trùng lặp",
                Description = "Sử dụng ClientAttemptId dạng GUID để bảo vệ server khỏi duplicate requests khi mạng lag.",
                DurationSeconds = 250,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            subject2.Lessons.Add(lesson3);
            subject2.Lessons.Add(lesson4);
            course2.Subjects.Add(subject2);

            dbContext.Courses.Add(course1);
            dbContext.Courses.Add(course2);

            await dbContext.SaveChangesAsync();
        }
    }
}
