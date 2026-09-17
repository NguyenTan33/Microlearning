using Microlearning.Infrastructure.Validation;
using Microsoft.Extensions.DependencyInjection;
using Microlearning.Infrastructure.Factory;

namespace Microlearning.Infrastructure.Factory
{

    public class ValidationFactory : IValidationFactory
    {
        // Biến lưu trữ cơ chế Service Provider của .NET
        private readonly IServiceProvider _serviceProvider;

        // Inject IServiceProvider để có thể rút các Rule đã đăng ký trong DI
        public ValidationFactory(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public async Task ValidateAsync<TRequest>(TRequest request, CancellationToken cancellationToken = default)
        {
            // 1. Quét tìm tất cả các class đã đăng ký implement interface IValidationRule<TRequest>
            var rules = _serviceProvider.GetServices<IValidationRule<TRequest>>();

            // 2. Chạy lần lượt từng Rule theo thứ tự đăng ký
            foreach (var rule in rules)
            {
                // Thực thi việc kiểm tra của từng Rule
                await rule.ValidateAsync(request, cancellationToken);
            }
        }
    }
}