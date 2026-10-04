using Microlearning.Model.Entities;
using Microsoft.AspNetCore.Identity;

namespace Microlearning.Areas.Auth.Seeders
{
    public static class IdentityDbSeeder
    {
        public static async Task SeedRolesAndAdminAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<Account>>();

            // 1. Seed Roles: Admin, Teacher, Student, User
            var roles = new[] { "Admin", "Teacher", "Student", "User" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole(role));
                }
            }

            // 2. Seed Default Admin Account nếu chưa có
            var adminPhone = "+84999999999";
            var existingAdmin = await userManager.FindByNameAsync(adminPhone);
            if (existingAdmin == null)
            {
                var adminUser = new Account
                {
                    UserName = adminPhone,
                    PhoneNumber = adminPhone,
                    FullName = "Quản trị viên Hệ thống",
                    PhoneNumberConfirmed = true,
                    LockoutEnabled = true
                };

                var createAdminResult = await userManager.CreateAsync(adminUser, "Admin@123456");
                if (createAdminResult.Succeeded)
                {
                    await userManager.AddToRolesAsync(adminUser, new[] { "Admin", "Teacher", "Student", "User" });
                }
            }

            // 3. Seed Default Teacher Account nếu chưa có
            var teacherPhone = "+84888888888";
            var existingTeacher = await userManager.FindByNameAsync(teacherPhone);
            if (existingTeacher == null)
            {
                var teacherUser = new Account
                {
                    UserName = teacherPhone,
                    PhoneNumber = teacherPhone,
                    FullName = "Giáo viên Giảng dạy",
                    PhoneNumberConfirmed = true,
                    LockoutEnabled = true
                };

                var createTeacherResult = await userManager.CreateAsync(teacherUser, "Teacher@123456");
                if (createTeacherResult.Succeeded)
                {
                    await userManager.AddToRolesAsync(teacherUser, new[] { "Teacher", "Student", "User" });
                }
            }
        }
    }
}
