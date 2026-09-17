namespace Microlearning.Exceptions
{
    public class BusinessException : Exception
    {
        public BusinessException(string message) : base(message)
        {

        }

    }

    public class LogException : Exception
    {
        public LogException(string message) : base(message)
        {

        }
    }

}
