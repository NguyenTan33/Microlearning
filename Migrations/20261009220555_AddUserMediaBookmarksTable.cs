using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Microlearning.Migrations
{
    /// <inheritdoc />
    public partial class AddUserMediaBookmarksTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserMediaBookmarks",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    AccountId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    LessonId = table.Column<int>(type: "int", nullable: false),
                    MediaId = table.Column<int>(type: "int", nullable: true),
                    CourseId = table.Column<int>(type: "int", nullable: false),
                    CourseTitle = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    LessonTitle = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Timestamp = table.Column<double>(type: "float", nullable: false),
                    FormattedTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserMediaBookmarks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserMediaBookmarks_AspNetUsers_AccountId",
                        column: x => x.AccountId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserMediaBookmarks_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserMediaBookmarks_AccountId",
                table: "UserMediaBookmarks",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_UserMediaBookmarks_LessonId",
                table: "UserMediaBookmarks",
                column: "LessonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserMediaBookmarks");
        }
    }
}
