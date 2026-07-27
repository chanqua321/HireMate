using BusinessLogic.IServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace BusinessLogic.Services;

public class EmailService(IConfiguration configuration, ILogger<EmailService> logger) : IEmailService
{
    private readonly IConfiguration _configuration = configuration;
    private readonly ILogger<EmailService> _logger = logger;

    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var enabled = !string.Equals(_configuration["EmailSettings:Enabled"], "false", StringComparison.OrdinalIgnoreCase);
        if (!enabled)
        {
            _logger.LogWarning("Email disabled. To={To} Subject={Subject}", toEmail, subject);
            return;
        }

        var host = _configuration["EmailSettings:SmtpHost"] ?? "smtp.gmail.com";
        var port = int.TryParse(_configuration["EmailSettings:SmtpPort"], out var p) ? p : 587;
        var fromEmail = _configuration["EmailSettings:FromEmail"]
            ?? throw new InvalidOperationException("EmailSettings:FromEmail missing");
        var fromName = _configuration["EmailSettings:FromName"] ?? "HireMate";
        var username = _configuration["EmailSettings:Username"] ?? fromEmail;
        var password = _configuration["EmailSettings:Password"];

        if (string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("EmailSettings:Password is empty. Skipping SMTP email sending to {To}. Subject={Subject}", toEmail, subject);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = !string.Equals(_configuration["EmailSettings:EnableSsl"], "false", StringComparison.OrdinalIgnoreCase),
            Credentials = new NetworkCredential(username, password)
        };

        try
        {
            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {To} subject={Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed sending SMTP email to {To} (check EmailSettings in appsettings.json)", toEmail);
            // Don't throw exception so registration/auth flows still succeed even when SMTP is offline or not configured
        }
    }
}
