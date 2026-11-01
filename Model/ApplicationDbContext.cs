using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore;

using Microlearning.Model.Entities;



namespace Microlearning.Model

{

    public class ApplicationDbContext : IdentityDbContext<Account>

    {

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)

            : base(options)

        {

        }



        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        public DbSet<OtpVerification> OtpVerifications => Set<OtpVerification>();

        public DbSet<Course> Courses => Set<Course>();

        public DbSet<Enrollment> Enrollments => Set<Enrollment>();

        public DbSet<Subject> Subjects => Set<Subject>();

        public DbSet<Lesson> Lessons => Set<Lesson>();

        public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();

        public DbSet<NarrationScript> NarrationScripts => Set<NarrationScript>();

        public DbSet<MediaJob> MediaJobs => Set<MediaJob>();

        public DbSet<Quiz> Quizzes => Set<Quiz>();

        public DbSet<Question> Questions => Set<Question>();

        public DbSet<QuizOption> QuizOptions => Set<QuizOption>();

        public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();

        public DbSet<QuizAnswer> QuizAnswers => Set<QuizAnswer>();

        public DbSet<QuizAnswerOption> QuizAnswerOptions => Set<QuizAnswerOption>();

        public DbSet<LessonProgress> LessonProgresses => Set<LessonProgress>();

        public DbSet<Device> Devices => Set<Device>();

        public DbSet<ContentChange> ContentChanges => Set<ContentChange>();

        public DbSet<SyncOperation> SyncOperations => Set<SyncOperation>();

        public DbSet<LessonAttachment> LessonAttachments => Set<LessonAttachment>();

        public DbSet<UserCourseAccess> UserCourseAccesses => Set<UserCourseAccess>();

        public DbSet<UserStreak> UserStreaks => Set<UserStreak>();

        public DbSet<UserQuizMistake> UserQuizMistakes => Set<UserQuizMistake>();

        public DbSet<UserFavoriteSubject> UserFavoriteSubjects => Set<UserFavoriteSubject>();

        public DbSet<UserMediaBookmark> UserMediaBookmarks => Set<UserMediaBookmark>();



        protected override void OnModelCreating(ModelBuilder builder)

        {

            base.OnModelCreating(builder);



            builder.Entity<Account>(entity =>

            {

                entity.Property(e => e.FullName).HasMaxLength(150);

            });



            builder.Entity<RefreshToken>(entity =>

            {

                entity.ToTable("RefreshTokens");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.AccountId).IsRequired().HasMaxLength(450);

                entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(256);

                entity.HasIndex(e => e.TokenHash);

                entity.HasOne(e => e.Account)

                      .WithMany(a => a.RefreshTokens)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<OtpVerification>(entity =>

            {

                entity.ToTable("OtpVerifications");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);

                entity.Property(e => e.Purpose).IsRequired().HasMaxLength(50);

                entity.Property(e => e.OtpHash).IsRequired().HasMaxLength(256);

                entity.HasIndex(e => new { e.PhoneNumber, e.Purpose });

            });



            builder.Entity<Course>(entity =>

            {

                entity.ToTable("Courses");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);

                entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);
                entity.Property(e => e.AuthorName).HasMaxLength(150);
                entity.Property(e => e.CreatedByAccountId).HasMaxLength(450);

            });



            builder.Entity<Enrollment>(entity =>

            {

                entity.ToTable("Enrollments");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.AccountId).IsRequired().HasMaxLength(450);

                entity.HasIndex(e => new { e.AccountId, e.CourseId }).IsUnique();



                entity.HasOne(e => e.Account)

                      .WithMany(a => a.Enrollments)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.Course)

                      .WithMany(c => c.Enrollments)

                      .HasForeignKey(e => e.CourseId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<Subject>(entity =>

            {

                entity.ToTable("Subjects");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);

                entity.Property(e => e.Description).HasMaxLength(1000);



                entity.HasOne(e => e.Course)

                      .WithMany(c => c.Subjects)

                      .HasForeignKey(e => e.CourseId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<Lesson>(entity =>

            {

                entity.ToTable("Lessons");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);

                entity.Property(e => e.SlideUrl).HasMaxLength(1000);

                entity.Property(e => e.SlideType).HasMaxLength(50);



                entity.HasOne(e => e.Subject)

                      .WithMany(s => s.Lessons)

                      .HasForeignKey(e => e.SubjectId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<MediaAsset>(entity =>

            {

                entity.ToTable("MediaAssets");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.BlobKey).IsRequired().HasMaxLength(500);

                entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);

                entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);

                entity.Property(e => e.Checksum).HasMaxLength(64);



                entity.HasOne(e => e.Lesson)

                      .WithMany(l => l.MediaAssets)

                      .HasForeignKey(e => e.LessonId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<NarrationScript>(entity =>

            {

                entity.ToTable("NarrationScripts");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.VoiceName).IsRequired().HasMaxLength(100);

                entity.Property(e => e.Language).IsRequired().HasMaxLength(20);

                entity.HasIndex(e => e.MediaAssetId).IsUnique();



                entity.HasOne(e => e.MediaAsset)

                      .WithOne(m => m.NarrationScript)

                      .HasForeignKey<NarrationScript>(e => e.MediaAssetId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<MediaJob>(entity =>

            {

                entity.ToTable("MediaJobs");

                entity.HasKey(e => e.Id);



                entity.HasOne(e => e.MediaAsset)

                      .WithMany(m => m.MediaJobs)

                      .HasForeignKey(e => e.MediaAssetId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<Quiz>(entity =>

            {

                entity.ToTable("Quizzes");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);

                entity.HasIndex(e => e.LessonId);



                entity.HasOne(e => e.Lesson)

                      .WithMany(l => l.Quizzes)

                      .HasForeignKey(e => e.LessonId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<Question>(entity =>

            {

                entity.ToTable("Questions");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Content).IsRequired();



                entity.HasOne(e => e.Quiz)

                      .WithMany(q => q.Questions)

                      .HasForeignKey(e => e.QuizId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<QuizOption>(entity =>

            {

                entity.ToTable("QuizOptions");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.OptionText).IsRequired();



                entity.HasOne(e => e.Question)

                      .WithMany(q => q.QuizOptions)

                      .HasForeignKey(e => e.QuestionId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<QuizAttempt>(entity =>

            {

                entity.ToTable("QuizAttempts");

                entity.HasKey(e => e.Id);

                entity.HasIndex(e => e.ClientAttemptId).IsUnique();

                entity.Property(e => e.AccountId).IsRequired().HasMaxLength(450);

                entity.Property(e => e.Score).HasPrecision(5, 2);



                entity.HasOne(e => e.Account)

                      .WithMany(a => a.QuizAttempts)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.Quiz)

                      .WithMany(q => q.QuizAttempts)

                      .HasForeignKey(e => e.QuizId)

                      .OnDelete(DeleteBehavior.Restrict);

            });



            builder.Entity<QuizAnswer>(entity =>

            {

                entity.ToTable("QuizAnswers");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.EarnedScore).HasPrecision(5, 2);



                entity.HasOne(e => e.QuizAttempt)

                      .WithMany(a => a.QuizAnswers)

                      .HasForeignKey(e => e.QuizAttemptId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.Question)

                      .WithMany(q => q.QuizAnswers)

                      .HasForeignKey(e => e.QuestionId)

                      .OnDelete(DeleteBehavior.Restrict);

            });



            builder.Entity<QuizAnswerOption>(entity =>

            {

                entity.ToTable("QuizAnswerOptions");

                entity.HasKey(e => e.Id);



                entity.HasOne(e => e.QuizAnswer)

                      .WithMany(a => a.SelectedOptions)

                      .HasForeignKey(e => e.QuizAnswerId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.QuizOption)

                      .WithMany(o => o.QuizAnswerOptions)

                      .HasForeignKey(e => e.QuizOptionId)

                      .OnDelete(DeleteBehavior.Restrict);

            });



            builder.Entity<LessonProgress>(entity =>

            {

                entity.ToTable("LessonProgresses");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.AccountId).IsRequired().HasMaxLength(450);

                entity.Property(e => e.Percent).HasPrecision(5, 2);

                entity.HasIndex(e => new { e.AccountId, e.LessonId }).IsUnique();



                entity.HasOne(e => e.Account)

                      .WithMany(a => a.LessonProgresses)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.Lesson)

                      .WithMany(l => l.LessonProgresses)

                      .HasForeignKey(e => e.LessonId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<Device>(entity =>

            {

                entity.ToTable("Devices");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.AccountId).IsRequired().HasMaxLength(450);

                entity.Property(e => e.DeviceId).IsRequired().HasMaxLength(100);

                entity.Property(e => e.DeviceModel).HasMaxLength(100);

                entity.Property(e => e.OsVersion).HasMaxLength(50);

                entity.HasIndex(e => new { e.AccountId, e.DeviceId }).IsUnique();



                entity.HasOne(e => e.Account)

                      .WithMany(a => a.Devices)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<ContentChange>(entity =>

            {

                entity.ToTable("ContentChanges");

                entity.HasKey(e => e.Sequence);

                entity.Property(e => e.EntityType).IsRequired().HasMaxLength(50);

                entity.HasIndex(e => e.ChangedAt);

            });



            builder.Entity<SyncOperation>(entity =>

            {

                entity.ToTable("SyncOperations");

                entity.HasKey(e => e.ClientOperationId);

                entity.Property(e => e.AccountId).IsRequired().HasMaxLength(450);

                entity.Property(e => e.DeviceId).IsRequired().HasMaxLength(100);

                entity.Property(e => e.OperationType).IsRequired().HasMaxLength(50);



                entity.HasOne(e => e.Account)

                      .WithMany(a => a.SyncOperations)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<LessonAttachment>(entity =>

            {

                entity.ToTable("LessonAttachments");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);

                entity.Property(e => e.OriginalFileName).IsRequired().HasMaxLength(255);

                entity.Property(e => e.FileType).IsRequired().HasMaxLength(50);

                entity.Property(e => e.FileUrl).IsRequired().HasMaxLength(500);

                entity.Property(e => e.Sha256Checksum).HasMaxLength(64);

                entity.HasIndex(e => e.LessonId);



                entity.HasOne(e => e.Lesson)

                      .WithMany(l => l.Attachments)

                      .HasForeignKey(e => e.LessonId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<UserCourseAccess>(entity =>

            {

                entity.ToTable("UserCourseAccesses");

                entity.HasKey(e => new { e.AccountId, e.CourseId });



                entity.HasOne(e => e.Account)

                      .WithMany(a => a.CourseAccesses)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.Course)

                      .WithMany(c => c.UserCourseAccesses)

                      .HasForeignKey(e => e.CourseId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<UserStreak>(entity =>

            {

                entity.ToTable("UserStreaks");

                entity.HasKey(e => e.AccountId);



                entity.HasOne(e => e.Account)

                      .WithOne(a => a.Streak)

                      .HasForeignKey<UserStreak>(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<UserQuizMistake>(entity =>

            {

                entity.ToTable("UserQuizMistakes");

                entity.HasKey(e => e.Id);

                entity.HasIndex(e => new { e.AccountId, e.IsResolved });



                entity.HasOne(e => e.Account)

                      .WithMany(a => a.QuizMistakes)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.Question)

                      .WithMany()

                      .HasForeignKey(e => e.QuestionId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.Quiz)

                      .WithMany()

                      .HasForeignKey(e => e.QuizId)

                      .OnDelete(DeleteBehavior.NoAction);



                entity.HasOne(e => e.Lesson)

                      .WithMany(l => l.QuizMistakes)

                      .HasForeignKey(e => e.LessonId)

                      .OnDelete(DeleteBehavior.NoAction);

            });



            builder.Entity<UserFavoriteSubject>(entity =>

            {

                entity.ToTable("UserFavoriteSubjects");

                entity.HasKey(e => new { e.AccountId, e.SubjectId });



                entity.HasOne(e => e.Account)

                      .WithMany(a => a.FavoriteSubjects)

                      .HasForeignKey(e => e.AccountId)

                      .OnDelete(DeleteBehavior.Cascade);



                entity.HasOne(e => e.Subject)

                      .WithMany(s => s.UserFavoriteSubjects)

                      .HasForeignKey(e => e.SubjectId)

                      .OnDelete(DeleteBehavior.Cascade);

            });



            builder.Entity<UserMediaBookmark>(entity =>

            {

                entity.ToTable("UserMediaBookmarks");

                entity.HasKey(e => e.Id);

                entity.Property(e => e.Id).HasMaxLength(128);

                entity.Property(e => e.AccountId).IsRequired().HasMaxLength(450);

                entity.Property(e => e.Title).IsRequired().HasMaxLength(250);

                entity.Property(e => e.CourseTitle).HasMaxLength(250);

                entity.Property(e => e.LessonTitle).HasMaxLength(250);

                entity.Property(e => e.FormattedTime).HasMaxLength(20);

                entity.Property(e => e.Note).HasMaxLength(1000);



                entity.HasIndex(e => e.AccountId);

                entity.HasIndex(e => e.LessonId);

            });

        }

    }

}

