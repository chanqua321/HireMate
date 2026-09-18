using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.AuthDto;

public class RegisterDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string FullName { get; set; } = string.Empty;
}

