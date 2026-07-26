using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace BusinessLogic.IServices;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody);
}
