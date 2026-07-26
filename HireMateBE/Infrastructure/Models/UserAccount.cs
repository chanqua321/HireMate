using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class UserAccount : IdentityUser<Guid>
{
    [MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    public bool OnboardingCompleted { get; set; } = false;

    public bool IsPremium { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastLogin { get; set; }

    public bool IsDeleted { get; set; } = false;

    public CareerProfile? CareerProfile { get; set; }
    public ICollection<InterviewSession> InterviewSessions { get; set; } = [];
    public ICollection<CareerMemoryEvent> CareerMemoryEvents { get; set; } = [];
}
