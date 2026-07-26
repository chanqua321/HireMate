using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.PublicDto;

public class WaitlistDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [MaxLength(255)] public string? FullName { get; set; }
    [MaxLength(200)] public string? University { get; set; }
}

public class ContactDto
{
    [Required, MaxLength(255)] public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string Subject { get; set; } = string.Empty;
    [Required, MaxLength(4000)] public string Body { get; set; } = string.Empty;
}

public class ForgotPasswordDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Token { get; set; } = string.Empty;
    [Required, MinLength(8)] public string NewPassword { get; set; } = string.Empty;
}

public class MatchRequestDto
{
    public Guid? CvDocumentId { get; set; }
    [Required] public string JdText { get; set; } = string.Empty;
}

public class EmailGenerateDto
{
    [Required] public string Type { get; set; } = "CoverLetter";
    public string? Position { get; set; }
    public string? Company { get; set; }
    public string? Tone { get; set; } = "formal";
}

public class CheckoutDto
{
    [Required] public string PlanCode { get; set; } = "premium";
    public string? PromoCode { get; set; }
    /// <summary>Mock (default) | VNPay | PayOS</summary>
    public string PaymentMethod { get; set; } = "Mock";
}

public class ApplyReferralDto
{
    [Required] public string Code { get; set; } = string.Empty;
}

public class SuggestedAnswerDto
{
    [Required] public string QuestionText { get; set; } = string.Empty;
    public string? UserAnswer { get; set; }
}

public class CreateTicketDto
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Subject { get; set; } = string.Empty;
    [Required] public string Body { get; set; } = string.Empty;
}

public class PatchUserDto
{
    public bool? Lock { get; set; }
    public bool? IsPremium { get; set; }
    public string? Role { get; set; }
}

public class PatchTicketDto
{
    [Required] public string Status { get; set; } = "Open";
}
