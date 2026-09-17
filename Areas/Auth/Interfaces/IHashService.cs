namespace Microlearning.Areas.Auth.Interfaces
{
    public interface IHashService
    {
        string Hash(string value, string secret);

        bool Verify(string value, string hash, string secret);
    }
}