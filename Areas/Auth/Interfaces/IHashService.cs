namespace Microlearning.Areas.Auth.Services.Interfaces
{
    public interface IHashService
    {
        string Hash(string value, string secret);

        bool Verify(string value, string hash, string secret);
    }
}