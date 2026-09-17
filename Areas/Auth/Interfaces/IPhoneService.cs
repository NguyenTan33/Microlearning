namespace Microlearning.Areas.Auth.Interfaces
{
    public interface IPhoneService
    {
        string Normalize(string phoneNumber);
        bool IsValid(string phoneNumber);
    }
}

