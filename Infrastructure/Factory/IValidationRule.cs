namespace Microlearning.Infrastructure.Factory
{
    public interface IValidationRule<in TRequest>
    {
        // Hàm thực thi việc kiểm tra dữ liệu bất đồng bộ
        Task ValidateAsync(TRequest request, CancellationToken cancellationToken = default);
    }
}
