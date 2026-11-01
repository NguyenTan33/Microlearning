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

            // 1. Dọn dẹp toàn bộ các khóa học mockup mẫu để vận hành hệ thống dữ liệu thật
            var dummyCourses = await dbContext.Courses
                .Include(c => c.Subjects)
                    .ThenInclude(s => s.Lessons)
                        .ThenInclude(l => l.Quizzes)
                .Include(c => c.Subjects)
                    .ThenInclude(s => s.Lessons)
                        .ThenInclude(l => l.MediaAssets)
                .Where(c => c.Title.Contains("Excel") ||
                            c.Title.Contains("Word") ||
                            c.Title.Contains("React") ||
                            c.Title.Contains("SQL Server") ||
                            c.Title.Contains(".NET 8") ||
                            c.Title.Contains("Offline-First"))
                .ToListAsync();

            if (dummyCourses.Count > 0)
            {
                dbContext.Courses.RemoveRange(dummyCourses);
                await dbContext.SaveChangesAsync();
            }

            // 7. Tự động kiểm tra và bổ sung Đề thi trắc nghiệm (Quiz) cho tất cả các bài học còn thiếu
            var lessonsWithoutQuiz = await dbContext.Lessons
                .Include(l => l.Quizzes)
                .Where(l => !l.Quizzes.Any())
                .ToListAsync();

            foreach (var lesson in lessonsWithoutQuiz)
            {
                var quiz = new Model.Entities.Quiz
                {
                    LessonId = lesson.Id,
                    Title = $"Đánh giá: {lesson.Title}",
                    PassScore = 80,
                    Version = 1,
                    CreatedAt = DateTime.UtcNow
                };

                var q1 = new Question
                {
                    Content = $"Nội dung trọng tâm thực hành của bài học '{lesson.Title}' là gì?",
                    Explanation = $"Nắm vững bản chất kỹ thuật và thao tác thực hành chuẩn xác theo bài giảng '{lesson.Title}'.",
                    Points = 50,
                    SortOrder = 1,
                    QuestionType = QuestionType.SingleChoice
                };
                q1.QuizOptions.Add(new QuizOption { OptionText = "Thao tác đúng quy trình chuẩn hóa và kiểm tra kết quả thực tế.", IsCorrect = true, SortOrder = 1 });
                q1.QuizOptions.Add(new QuizOption { OptionText = "Bỏ qua các bước kiểm tra dữ liệu và chạy thử nghiệm ngẫu nhiên.", IsCorrect = false, SortOrder = 2 });
                q1.QuizOptions.Add(new QuizOption { OptionText = "Chỉ áp dụng trên môi trường lý thuyết không có kiểm tra.", IsCorrect = false, SortOrder = 3 });

                var q2 = new Question
                {
                    Content = $"Thực hành tối ưu hóa phương pháp giải quyết trong bài học này mang lại lợi ích gì?",
                    Explanation = "Tối ưu hóa hiệu năng, giảm thiểu lỗi sai sót và tự động hóa quy trình xử lý dữ liệu/mã nguồn.",
                    Points = 50,
                    SortOrder = 2,
                    QuestionType = QuestionType.SingleChoice
                };
                q2.QuizOptions.Add(new QuizOption { OptionText = "Nâng cao độ chính xác, hiệu năng và chuẩn hóa quy trình chuyên nghiệp.", IsCorrect = true, SortOrder = 1 });
                q2.QuizOptions.Add(new QuizOption { OptionText = "Không tạo ra khác biệt nào so với thao tác thủ công thông thường.", IsCorrect = false, SortOrder = 2 });
                q2.QuizOptions.Add(new QuizOption { OptionText = "Làm chậm tiến độ công việc và tăng nguy cơ phát sinh lỗi.", IsCorrect = false, SortOrder = 3 });

                quiz.Questions.Add(q1);
                quiz.Questions.Add(q2);
                dbContext.Quizzes.Add(quiz);
            }

            if (lessonsWithoutQuiz.Any())
            {
                await dbContext.SaveChangesAsync();
            }
        }

        private static MediaAsset CreateStandardVideoAsset(string title)
        {
            return new MediaAsset
            {
                MediaType = MediaType.Video,
                FileName = "test.mp4",
                BlobKey = "videos/test.mp4",
                ContentType = "video/mp4",
                SizeBytes = 17979812,
                DurationSeconds = 180,
                Checksum = "38a141d8684b59ffeb40dcdf65278e9b926248c7f56022551ce4e82910bab68c",
                Status = MediaAssetStatus.Ready,
                CreatedAt = DateTime.UtcNow
            };
        }

        // ==========================================
        // KHÓA HỌC 1: MICROSOFT EXCEL CHUYÊN SÂU
        // ==========================================
        private static Course CreateExcelCourse()
        {
            var course = new Course
            {
                Title = "Thành Thạo Microsoft Excel Từ Cơ Bản Đến Chuyên Sâu",
                Description = "Lộ trình thực chiến kỹ năng bảng tính: các hàm xử lý dữ liệu (VLOOKUP, XLOOKUP, INDEX-MATCH), định dạng có điều kiện, bảng Pivot Table và tự động hóa báo cáo phân tích.",
                ThumbnailUrl = "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600",
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            // Học phần 1
            var subj1 = new Subject
            {
                Title = "Hàm Xử Lý & Tính Toán Dữ Liệu Nâng Cao",
                Description = "Làm chủ các hàm điều kiện, tìm kiếm tham chiếu dữ liệu phức tạp trong thực tế công việc.",
                SortOrder = 1,
                CreatedAt = DateTime.UtcNow
            };

            var lesson1 = new Lesson
            {
                Title = "Tuyệt chiêu hàm dò tìm VLOOKUP và XLOOKUP thực tế",
                Description = "Hiểu rõ cơ chế tìm kiếm chính xác và gần đúng, khắc phục lỗi #N/A phổ biến khi dò tìm bảng phụ.",
                DurationSeconds = 180,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson1.MediaAssets.Add(CreateStandardVideoAsset("Excel VLOOKUP"));

            var quiz1 = new Model.Entities.Quiz
            {
                Title = "Đánh giá: Ứng dụng hàm VLOOKUP & XLOOKUP",
                PassScore = 80,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            var q1 = new Question
            {
                Content = "Trong hàm =VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup]), đối số [range_lookup] cần đặt là gì để tìm kiếm giá trị chính xác tuyệt đối?",
                Explanation = "Đặt range_lookup là 0 (hoặc FALSE) để Excel dò tìm giá trị chính xác 100%.",
                Points = 50,
                SortOrder = 1,
                QuestionType = QuestionType.SingleChoice
            };
            q1.QuizOptions.Add(new QuizOption { OptionText = "0 hoặc FALSE", IsCorrect = true, SortOrder = 1 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "1 hoặc TRUE", IsCorrect = false, SortOrder = 2 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Bỏ trống không điền", IsCorrect = false, SortOrder = 3 });

            var q2 = new Question
            {
                Content = "Ưu điểm vượt trội lớn nhất của hàm XLOOKUP so với VLOOKUP truyền thống là gì?",
                Explanation = "XLOOKUP có thể dò tìm từ phải sang trái, không cần đếm số thứ tự cột và mặc định dò tìm chính xác.",
                Points = 50,
                SortOrder = 2,
                QuestionType = QuestionType.SingleChoice
            };
            q2.QuizOptions.Add(new QuizOption { OptionText = "Có thể dò tìm hai chiều (trái sang phải hoặc phải sang trái) linh hoạt.", IsCorrect = true, SortOrder = 1 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Chỉ hoạt động được khi dữ liệu đã sắp xếp thứ tự A-Z.", IsCorrect = false, SortOrder = 2 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Tự động đổi màu ô dữ liệu mà không cần định dạng.", IsCorrect = false, SortOrder = 3 });

            quiz1.Questions.Add(q1);
            quiz1.Questions.Add(q2);
            lesson1.Quiz = quiz1;

            var lesson2 = new Lesson
            {
                Title = "Kỹ thuật kết hợp INDEX & MATCH xử lý bảng tính phức tạp",
                Description = "Giải pháp thay thế linh hoạt vượt giới hạn của VLOOKUP khi làm việc với cơ sở dữ liệu lớn.",
                DurationSeconds = 210,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson2.MediaAssets.Add(CreateStandardVideoAsset("Excel INDEX MATCH"));

            var lesson3 = new Lesson
            {
                Title = "Ứng dụng hàm điều kiện IF, IFS, SUMIFS và COUNTIFS",
                Description = "Tổng hợp và đếm dữ liệu theo nhiều tiêu chí lọc cùng lúc cho báo cáo bán hàng.",
                DurationSeconds = 190,
                SortOrder = 3,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson3.MediaAssets.Add(CreateStandardVideoAsset("Excel SUMIFS"));

            subj1.Lessons.Add(lesson1);
            subj1.Lessons.Add(lesson2);
            subj1.Lessons.Add(lesson3);

            // Học phần 2
            var subj2 = new Subject
            {
                Title = "Phân Tích Dữ Liệu & Báo Cáo Pivot Table",
                Description = "Biến hàng nghìn dòng dữ liệu thô thành báo cáo tổng hợp trực quan chỉ với vài thao tác kéo thả.",
                SortOrder = 2,
                CreatedAt = DateTime.UtcNow
            };

            var lesson4 = new Lesson
            {
                Title = "Khai phá sức mạnh Pivot Table & Slicer lọc đa chiều",
                Description = "Tạo báo cáo doanh số, cơ cấu tỷ trọng và tích hợp bộ lọc thời gian trực quan Slicer.",
                DurationSeconds = 240,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson4.MediaAssets.Add(CreateStandardVideoAsset("Excel Pivot Table"));

            var lesson5 = new Lesson
            {
                Title = "Thiết kế biểu đồ động Dashboard chuyên nghiệp",
                Description = "Kết hợp Conditional Formatting, Sparklines và biểu đồ phân tích xu hướng kinh doanh.",
                DurationSeconds = 220,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson5.MediaAssets.Add(CreateStandardVideoAsset("Excel Dashboard"));

            subj2.Lessons.Add(lesson4);
            subj2.Lessons.Add(lesson5);

            course.Subjects.Add(subj1);
            course.Subjects.Add(subj2);
            return course;
        }

        // ==========================================
        // KHÓA HỌC 2: MICROSOFT WORD CHUYÊN NGHIỆP
        // ==========================================
        private static Course CreateWordCourse()
        {
            var course = new Course
            {
                Title = "Kỹ Năng Microsoft Word Soạn Thảo Văn Bản Chuyên Nghiệp",
                Description = "Chuẩn hóa văn bản hành chính, quản lý hệ thống Style phân cấp, đánh số trang tự động theo chương mục, mục lục tự động và kỹ thuật trộn thư Mail Merge gửi hợp đồng hàng loạt.",
                ThumbnailUrl = "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600",
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var subj1 = new Subject
            {
                Title = "Quy Chuẩn Thể Thức & Hệ Thống Styles Phân Cấp",
                Description = "Thiết lập văn bản quy chuẩn hành chính và tự động hóa mục lục tài liệu lớn.",
                SortOrder = 1,
                CreatedAt = DateTime.UtcNow
            };

            var lesson1 = new Lesson
            {
                Title = "Thiết lập lề trang, dãn dòng và font chữ chuẩn Nghị định",
                Description = "Quy định căn lề A4 chuẩn, khoảng cách đoạn Before/After và Line Spacing theo thể thức văn bản hành chính.",
                DurationSeconds = 160,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson1.MediaAssets.Add(CreateStandardVideoAsset("Word Formatting"));

            var quiz1 = new Model.Entities.Quiz
            {
                Title = "Đánh giá: Quy chuẩn thể thức soạn thảo văn bản Word",
                PassScore = 80,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            var q1 = new Question
            {
                Content = "Theo quy định thể thức văn bản hành chính, khoảng cách căn lề chuẩn khổ giấy A4 là:",
                Explanation = "Lề trên: 20-25mm, Lề dưới: 20-25mm, Lề trái: 30-35mm (đóng gáy), Lề phải: 15-20mm.",
                Points = 50,
                SortOrder = 1,
                QuestionType = QuestionType.SingleChoice
            };
            q1.QuizOptions.Add(new QuizOption { OptionText = "Trên 20-25mm, Dưới 20-25mm, Trái 30-35mm, Phải 15-20mm", IsCorrect = true, SortOrder = 1 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Bốn cạnh đều căn đều 20mm", IsCorrect = false, SortOrder = 2 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Lề trái 15mm, Lề phải 30mm", IsCorrect = false, SortOrder = 3 });

            var q2 = new Question
            {
                Content = "Để tạo Mục lục tự động (Table of Contents) chính xác trong Word, bạn bắt buộc phải làm bước nào trước?",
                Explanation = "Các tiêu đề chương mục phải được gán hệ thống Heading Styles (Heading 1, Heading 2, Heading 3).",
                Points = 50,
                SortOrder = 2,
                QuestionType = QuestionType.SingleChoice
            };
            q2.QuizOptions.Add(new QuizOption { OptionText = "Gán các cấp độ Heading Styles tương ứng cho từng tiêu đề mục.", IsCorrect = true, SortOrder = 1 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Tô màu vàng cho tất cả các tiêu đề.", IsCorrect = false, SortOrder = 2 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Đánh số trang thủ công bằng bàn phím.", IsCorrect = false, SortOrder = 3 });

            quiz1.Questions.Add(q1);
            quiz1.Questions.Add(q2);
            lesson1.Quiz = quiz1;

            var lesson2 = new Lesson
            {
                Title = "Tự động hóa định dạng với hệ thống Styles & Mục lục tự động",
                Description = "Xây dựng Heading 1, 2, 3 gắn liền với Navigation Pane và chèn Table of Contents cập nhật 1 chạm.",
                DurationSeconds = 195,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson2.MediaAssets.Add(CreateStandardVideoAsset("Word Heading Styles"));

            subj1.Lessons.Add(lesson1);
            subj1.Lessons.Add(lesson2);

            var subj2 = new Subject
            {
                Title = "Ngắt Trang Section Break & Trộn Thư Mail Merge",
                Description = "Kỹ thuật phân chia vùng tài liệu độc lập và tạo thư mời, hợp đồng tự động.",
                SortOrder = 2,
                CreatedAt = DateTime.UtcNow
            };

            var lesson3 = new Lesson
            {
                Title = "Đánh số trang linh hoạt phân chia Section Breaks",
                Description = "Kỹ thuật ngắt liên kết Link to Previous để trang bìa, mục lục và nội dung chính có cách đánh số trang khác nhau.",
                DurationSeconds = 175,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson3.MediaAssets.Add(CreateStandardVideoAsset("Word Section Breaks"));

            var lesson4 = new Lesson
            {
                Title = "Ứng dụng trộn thư Mail Merge gửi hợp đồng hàng loạt",
                Description = "Kết nối danh sách Excel vào biểu mẫu Word để tự động in và gửi hàng trăm tài liệu cá nhân hóa.",
                DurationSeconds = 230,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson4.MediaAssets.Add(CreateStandardVideoAsset("Word Mail Merge"));

            subj2.Lessons.Add(lesson3);
            subj2.Lessons.Add(lesson4);

            course.Subjects.Add(subj1);
            course.Subjects.Add(subj2);
            return course;
        }

        // ==========================================
        // KHÓA HỌC 3: LẬP TRÌNH WEB IT (REACT & TYPESCRIPT)
        // ==========================================
        private static Course CreateReactCourse()
        {
            var course = new Course
            {
                Title = "Lập Trình Web Hiện Đại Với React 18, TypeScript & Tailwind CSS",
                Description = "Chuyên đề thực chiến về Functional Components, Custom Hooks, quản lý Server State với TanStack Query, tối ưu hiệu năng re-render và xây dựng kiến trúc Frontend chuẩn doanh nghiệp.",
                ThumbnailUrl = "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600",
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var subj1 = new Subject
            {
                Title = "Nền Tảng React Hooks & TypeScript Strict Mode",
                Description = "Xây dựng mã nguồn sạch, type-safe và tách biệt UI với Business Logic.",
                SortOrder = 1,
                CreatedAt = DateTime.UtcNow
            };

            var lesson1 = new Lesson
            {
                Title = "Tư duy React Component, Hooks & Tách Biệt Nghiệp Vụ",
                Description = "Áp dụng Custom Hooks để đóng gói logic tương tác API và giữ Dumb Components thuần túy trình bày.",
                DurationSeconds = 220,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson1.MediaAssets.Add(CreateStandardVideoAsset("React Hooks Clean Code"));

            var quiz1 = new Model.Entities.Quiz
            {
                Title = "Đánh giá: React Hooks & TypeScript Best Practices",
                PassScore = 80,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            var q1 = new Question
            {
                Content = "Lợi ích quan trọng nhất của việc viết Custom Hook để bọc logic nghiệp vụ là gì?",
                Explanation = "Giúp tách biệt logic khỏi giao diện (Separation of Concerns), dễ tái sử dụng và viết Unit Test.",
                Points = 50,
                SortOrder = 1,
                QuestionType = QuestionType.SingleChoice
            };
            q1.QuizOptions.Add(new QuizOption { OptionText = "Tách biệt rõ ràng Business Logic và UI, tăng tính tái sử dụng và dễ kiểm thử.", IsCorrect = true, SortOrder = 1 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Làm cho component chạy nhanh gấp 10 lần mà không tốn RAM.", IsCorrect = false, SortOrder = 2 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Bắt buộc trong quy định của React compiler.", IsCorrect = false, SortOrder = 3 });

            var q2 = new Question
            {
                Content = "Hook useMemo trong React được sử dụng với mục đích chính là gì?",
                Explanation = "useMemo ghi nhớ (memoize) kết quả tính toán tốn kém tài nguyên để tránh tính lại ở mỗi lần render.",
                Points = 50,
                SortOrder = 2,
                QuestionType = QuestionType.SingleChoice
            };
            q2.QuizOptions.Add(new QuizOption { OptionText = "Ghi nhớ kết quả của một phép tính toán nặng để tránh thực thi lại khi re-render không cần thiết.", IsCorrect = true, SortOrder = 1 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Gọi API bất đồng bộ mỗi khi mount component.", IsCorrect = false, SortOrder = 2 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Thay thế hoàn toàn cho biến trạng thái useState.", IsCorrect = false, SortOrder = 3 });

            quiz1.Questions.Add(q1);
            quiz1.Questions.Add(q2);
            lesson1.Quiz = quiz1;

            var lesson2 = new Lesson
            {
                Title = "Tối ưu hiệu năng re-render với useMemo, useCallback & React.memo",
                Description = "Đo lường chi phí render và ngăn chặn các re-render con cháu không cần thiết trong bảng dữ liệu lớn.",
                DurationSeconds = 250,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson2.MediaAssets.Add(CreateStandardVideoAsset("React Performance Optimization"));

            subj1.Lessons.Add(lesson1);
            subj1.Lessons.Add(lesson2);

            var subj2 = new Subject
            {
                Title = "Server State & Kiến Trúc Offline-First",
                Description = "Lưu trữ dữ liệu cục bộ với IndexedDB và đồng bộ 2 chiều qua hàng đợi Outbox.",
                SortOrder = 2,
                CreatedAt = DateTime.UtcNow
            };

            var lesson3 = new Lesson
            {
                Title = "Quản lý dữ liệu máy chủ và Caching với TanStack Query",
                Description = "Tận dụng cơ chế stale-while-revalidate, retry tự động và mutation optimistic updates.",
                DurationSeconds = 210,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson3.MediaAssets.Add(CreateStandardVideoAsset("React Query Caching"));

            var lesson4 = new Lesson
            {
                Title = "Thiết kế bộ nhớ cục bộ IndexedDB cho ứng dụng Offline-First",
                Description = "Tạo các Object Stores lưu trữ Video Blob, Outbox queue và Metadata với Web Crypto SHA-256.",
                DurationSeconds = 270,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson4.MediaAssets.Add(CreateStandardVideoAsset("IndexedDB Storage"));

            subj2.Lessons.Add(lesson3);
            subj2.Lessons.Add(lesson4);

            course.Subjects.Add(subj1);
            course.Subjects.Add(subj2);
            return course;
        }

        // ==========================================
        // KHÓA HỌC 4: QUẢN TRỊ CSDL SQL SERVER IT
        // ==========================================
        private static Course CreateSqlCourse()
        {
            var course = new Course
            {
                Title = "Quản Trị Cơ Sở Dữ Liệu SQL Server & T-SQL Chuyên Sâu",
                Description = "Nắm vững kỹ thuật viết truy vấn JOIN hiệu năng cao, thiết kế chỉ mục Clustered/Non-Clustered Indexes, đọc Execution Plan và quản lý giao dịch ACID tránh Deadlock.",
                ThumbnailUrl = "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600",
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var subj1 = new Subject
            {
                Title = "Tối Ưu Hóa Truy Vấn & Đánh Chỉ Mục Indexing",
                Description = "Cách biến câu lệnh SQL chạy vài phút xuống còn vài mili-giây trên cơ sở dữ liệu triệu bản ghi.",
                SortOrder = 1,
                CreatedAt = DateTime.UtcNow
            };

            var lesson1 = new Lesson
            {
                Title = "Kỹ thuật viết truy vấn JOIN, GROUP BY và Window Functions",
                Description = "Sử dụng ROW_NUMBER(), DENSE_RANK() và CTE để phân trang dữ liệu và giải quyết bài toán trùng lặp.",
                DurationSeconds = 230,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson1.MediaAssets.Add(CreateStandardVideoAsset("SQL High Performance Queries"));

            var quiz1 = new Model.Entities.Quiz
            {
                Title = "Đánh giá: T-SQL Indexing & Execution Plans",
                PassScore = 80,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            var q1 = new Question
            {
                Content = "Một bảng (Table) trong SQL Server có thể có tối đa bao nhiêu Clustered Index?",
                Explanation = "Mỗi bảng chỉ có thể có duy nhất 1 Clustered Index vì dữ liệu vật lý trên ổ đĩa chỉ có thể sắp xếp theo 1 trật tự.",
                Points = 50,
                SortOrder = 1,
                QuestionType = QuestionType.SingleChoice
            };
            q1.QuizOptions.Add(new QuizOption { OptionText = "Chỉ duy nhất 1 Clustered Index.", IsCorrect = true, SortOrder = 1 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Tối đa 249 Clustered Indexes.", IsCorrect = false, SortOrder = 2 });
            q1.QuizOptions.Add(new QuizOption { OptionText = "Không giới hạn số lượng.", IsCorrect = false, SortOrder = 3 });

            var q2 = new Question
            {
                Content = "Hiện tượng Index Scan so với Index Seek có ý nghĩa gì về mặt hiệu năng?",
                Explanation = "Index Seek tìm thẳng tới bản ghi thông qua cấu trúc cây B-Tree (rất nhanh), trong khi Index Scan phải duyệt toàn bộ cây chỉ mục.",
                Points = 50,
                SortOrder = 2,
                QuestionType = QuestionType.SingleChoice
            };
            q2.QuizOptions.Add(new QuizOption { OptionText = "Index Seek tối ưu hơn vì nhảy trực tiếp tới node dữ liệu, trong khi Index Scan phải quét tuần tự.", IsCorrect = true, SortOrder = 1 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Index Scan luôn nhanh hơn Index Seek.", IsCorrect = false, SortOrder = 2 });
            q2.QuizOptions.Add(new QuizOption { OptionText = "Cả hai có tốc độ hoàn toàn tương đương nhau.", IsCorrect = false, SortOrder = 3 });

            quiz1.Questions.Add(q1);
            quiz1.Questions.Add(q2);
            lesson1.Quiz = quiz1;

            var lesson2 = new Lesson
            {
                Title = "Thiết kế Clustered & Non-Clustered Index chống nghẽn I/O",
                Description = "Đọc Execution Plan, phát hiện Table Scan, RID Lookup và tối ưu Covering Index.",
                DurationSeconds = 260,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson2.MediaAssets.Add(CreateStandardVideoAsset("SQL Server Indexing"));

            subj1.Lessons.Add(lesson1);
            subj1.Lessons.Add(lesson2);

            var subj2 = new Subject
            {
                Title = "Giao Dịch ACID & Cơ Chế Khóa Concurrency",
                Description = "Đảm bảo tính nhất quán dữ liệu trong môi trường nhiều giao dịch đồng thời.",
                SortOrder = 2,
                CreatedAt = DateTime.UtcNow
            };

            var lesson3 = new Lesson
            {
                Title = "Quản lý Transaction, Isolation Levels và phòng tránh Deadlock",
                Description = "Phân tích 4 cấp độ cô lập giao dịch Read Uncommitted, Read Committed, Repeatable Read và Serializable.",
                DurationSeconds = 240,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson3.MediaAssets.Add(CreateStandardVideoAsset("SQL Transactions Deadlock"));

            subj2.Lessons.Add(lesson3);

            course.Subjects.Add(subj1);
            course.Subjects.Add(subj2);
            return course;
        }

        // ==========================================
        // KHÓA HỌC 5: LẬP TRÌNH C# .NET 8 BACKEND IT
        // ==========================================
        private static Course CreateDotNetCourse()
        {
            var course = new Course
            {
                Title = "Lập trình C# & .NET 8 Hiện Đại",
                Description = "Khóa học nền tảng toàn diện về C# 12, ASP.NET Core Web API, Entity Framework Core 8, Dependency Injection và nguyên tắc SOLID trong các dự án thực tế.",
                ThumbnailUrl = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600",
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var subj1 = new Subject
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
            lesson1.MediaAssets.Add(CreateStandardVideoAsset("NET8 DI"));

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
            lesson2.MediaAssets.Add(CreateStandardVideoAsset("NET8 SOLID"));

            subj1.Lessons.Add(lesson1);
            subj1.Lessons.Add(lesson2);
            course.Subjects.Add(subj1);
            return course;
        }

        // ==========================================
        // KHÓA HỌC 6: KIẾN TRÚC OFFLINE-FIRST IT
        // ==========================================
        private static Course CreateOfflineFirstCourse()
        {
            var course = new Course
            {
                Title = "Kiến trúc Offline-First Mobile & Web App",
                Description = "Chuyên đề chuyên sâu về Idempotency, Monotonic Merge, Outbox Pattern và Sequence Delta Sync trong các hệ thống phân tán và ứng dụng không coi mất mạng là lỗi.",
                ThumbnailUrl = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600",
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };

            var subj1 = new Subject
            {
                Title = "Thuật toán Đồng bộ & Giải quyết Xung đột",
                Description = "Cách giải quyết xung đột dữ liệu giữa nhiều thiết bị và hàng đợi ngoại tuyến.",
                SortOrder = 1,
                CreatedAt = DateTime.UtcNow
            };

            var lesson1 = new Lesson
            {
                Title = "Monotonic Merge chống tụt lùi tiến độ",
                Description = "Ứng dụng hàm Math.Max để đảm bảo tiến độ học tập trên máy tính và điện thoại luôn nhất quán.",
                DurationSeconds = 210,
                SortOrder = 1,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson1.MediaAssets.Add(CreateStandardVideoAsset("Monotonic Merge"));

            var lesson2 = new Lesson
            {
                Title = "Idempotency Key & Chống nộp bài trùng lặp",
                Description = "Sử dụng ClientAttemptId dạng GUID để bảo vệ server khỏi duplicate requests khi mạng lag.",
                DurationSeconds = 250,
                SortOrder = 2,
                IsPublished = true,
                Version = 1,
                CreatedAt = DateTime.UtcNow
            };
            lesson2.MediaAssets.Add(CreateStandardVideoAsset("Idempotency"));

            subj1.Lessons.Add(lesson1);
            subj1.Lessons.Add(lesson2);
            course.Subjects.Add(subj1);
            return course;
        }
    }
}
