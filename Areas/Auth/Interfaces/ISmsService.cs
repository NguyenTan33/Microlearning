namespace Microlearning.Areas.Auth.Interfaces
{
    public interface ISmsService
    {
        Task SendOtpAsync(string phoneNumber, string otp);
    }
}