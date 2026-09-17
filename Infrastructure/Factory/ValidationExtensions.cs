using fnb_pos_inventory_system.Infrastructure.Factory;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace fnb_pos_inventory_system.Infrastructure.Factory
{
    public static class ValidationExtensions
    {
        // Phương thức mở rộng giúp Program.cs đăng ký toàn bộ hệ thống bằng 1 dòng
        public static IServiceCollection AddAppValidation(this IServiceCollection services)
        {
            // 1. Đăng ký chính Nhà máy vào hệ thống DI
            services.AddScoped<IValidationFactory, ValidationFactory>();

            // 2. Lấy danh sách toàn bộ code/class trong dự án đang chạy
            var assembly = Assembly.GetExecutingAssembly();

            // 3. Quét tất cả các class kế thừa IValidationRule<T>
            var ruleTypes = assembly.GetTypes()
                .Where(t => !t.IsAbstract && !t.IsInterface) // Bỏ qua abstract class và interface
                .SelectMany(
                    t => t.GetInterfaces(),
                    (implementationType, interfaceType) => new { implementationType, interfaceType }
                )
                .Where(x => x.interfaceType.IsGenericType &&
                            x.interfaceType.GetGenericTypeDefinition() == typeof(IValidationRule<>));

            // 4. Tự động thêm từng Rule tìm được vào danh sách DI của .NET
            foreach (var rule in ruleTypes)
            {
                services.AddScoped(rule.interfaceType, rule.implementationType);
            }

            return services;
        }
    }
}