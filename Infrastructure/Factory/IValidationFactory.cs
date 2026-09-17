namespace fnb_pos_inventory_system.Infrastructure.Factory
{
    // Giao diện của Nhà máy lọc dữ liệu
    public interface IValidationFactory
    {
        // Hàm dùng chung để nhận bất kỳ DTO nào và chạy kiểm tra
        Task ValidateAsync<TRequest>(TRequest request, CancellationToken cancellationToken = default);
    }
}