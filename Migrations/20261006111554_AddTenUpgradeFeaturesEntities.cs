using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Microlearning.Migrations
{
    /// <inheritdoc />
    public partial class AddTenUpgradeFeaturesEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsEligibleForCompletion",
                table: "LessonProgresses",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "SkippedRatio",
                table: "LessonProgresses",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "WatchedCoveragePercent",
                table: "LessonProgresses",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "AccessPasswordHash",
                table: "Courses",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPrivate",
                table: "Courses",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PasswordVersion",
                table: "Courses",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "LessonAttachments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LessonId = table.Column<int>(type: "int", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    FileType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256Checksum = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonAttachments_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserCourseAccesses",
                columns: table => new
                {
                    AccountId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CourseId = table.Column<int>(type: "int", nullable: false),
                    UnlockedPasswordVersion = table.Column<int>(type: "int", nullable: false),
                    UnlockedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserCourseAccesses", x => new { x.AccountId, x.CourseId });
                    table.ForeignKey(
                        name: "FK_UserCourseAccesses_AspNetUsers_AccountId",
                        column: x => x.AccountId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserCourseAccesses_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserFavoriteSubjects",
                columns: table => new
                {
                    AccountId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFavoriteSubjects", x => new { x.AccountId, x.SubjectId });
                    table.ForeignKey(
                        name: "FK_UserFavoriteSubjects_AspNetUsers_AccountId",
                        column: x => x.AccountId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserFavoriteSubjects_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserQuizMistakes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AccountId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    QuestionId = table.Column<int>(type: "int", nullable: false),
                    QuizId = table.Column<int>(type: "int", nullable: false),
                    LessonId = table.Column<int>(type: "int", nullable: false),
                    SelectedOptionId = table.Column<int>(type: "int", nullable: false),
                    FailedCount = table.Column<int>(type: "int", nullable: false),
                    IsResolved = table.Column<bool>(type: "bit", nullable: false),
                    LastFailedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserQuizMistakes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserQuizMistakes_AspNetUsers_AccountId",
                        column: x => x.AccountId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserQuizMistakes_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserQuizMistakes_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserQuizMistakes_Quizzes_QuizId",
                        column: x => x.QuizId,
                        principalTable: "Quizzes",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserStreaks",
                columns: table => new
                {
                    AccountId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CurrentStreak = table.Column<int>(type: "int", nullable: false),
                    LongestStreak = table.Column<int>(type: "int", nullable: false),
                    LastActiveDate = table.Column<DateOnly>(type: "date", nullable: true),
                    HasMasterCrown = table.Column<bool>(type: "bit", nullable: false),
                    CrownAwardedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserStreaks", x => x.AccountId);
                    table.ForeignKey(
                        name: "FK_UserStreaks_AspNetUsers_AccountId",
                        column: x => x.AccountId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LessonAttachments_LessonId",
                table: "LessonAttachments",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_UserCourseAccesses_CourseId",
                table: "UserCourseAccesses",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteSubjects_SubjectId",
                table: "UserFavoriteSubjects",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_UserQuizMistakes_AccountId_IsResolved",
                table: "UserQuizMistakes",
                columns: new[] { "AccountId", "IsResolved" });

            migrationBuilder.CreateIndex(
                name: "IX_UserQuizMistakes_LessonId",
                table: "UserQuizMistakes",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_UserQuizMistakes_QuestionId",
                table: "UserQuizMistakes",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserQuizMistakes_QuizId",
                table: "UserQuizMistakes",
                column: "QuizId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LessonAttachments");

            migrationBuilder.DropTable(
                name: "UserCourseAccesses");

            migrationBuilder.DropTable(
                name: "UserFavoriteSubjects");

            migrationBuilder.DropTable(
                name: "UserQuizMistakes");

            migrationBuilder.DropTable(
                name: "UserStreaks");

            migrationBuilder.DropColumn(
                name: "IsEligibleForCompletion",
                table: "LessonProgresses");

            migrationBuilder.DropColumn(
                name: "SkippedRatio",
                table: "LessonProgresses");

            migrationBuilder.DropColumn(
                name: "WatchedCoveragePercent",
                table: "LessonProgresses");

            migrationBuilder.DropColumn(
                name: "AccessPasswordHash",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "IsPrivate",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "PasswordVersion",
                table: "Courses");
        }
    }
}
