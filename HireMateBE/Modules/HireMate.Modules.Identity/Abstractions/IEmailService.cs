using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace HireMate.Modules.Identity.Abstractions;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody);
}

