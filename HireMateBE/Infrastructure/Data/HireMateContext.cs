using Infrastructure.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public class HireMateContext : IdentityDbContext<UserAccount, Role, Guid>
{
    public HireMateContext(DbContextOptions<HireMateContext> options) : base(options) { }

    public DbSet<CareerProfile> CareerProfiles => Set<CareerProfile>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<InterviewSession> InterviewSessions => Set<InterviewSession>();
    public DbSet<InterviewAnswer> InterviewAnswers => Set<InterviewAnswer>();
    public DbSet<CareerMemoryEvent> CareerMemoryEvents => Set<CareerMemoryEvent>();
    public DbSet<WaitlistEntry> WaitlistEntries => Set<WaitlistEntry>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<ContentPage> ContentPages => Set<ContentPage>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<FaqItem> FaqItems => Set<FaqItem>();
    public DbSet<CvDocument> CvDocuments => Set<CvDocument>();
    public DbSet<JdMatchResult> JdMatchResults => Set<JdMatchResult>();
    public DbSet<ResourceItem> ResourceItems => Set<ResourceItem>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ReferralCode> ReferralCodes => Set<ReferralCode>();
    public DbSet<ReferralInvite> ReferralInvites => Set<ReferralInvite>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<PromoCode> PromoCodes => Set<PromoCode>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<OrganizationMember> OrganizationMembers => Set<OrganizationMember>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<UserAccount>(entity =>
        {
            entity.Property(u => u.FullName).HasMaxLength(255).IsRequired();
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasOne(u => u.CareerProfile)
                .WithOne(p => p.User!)
                .HasForeignKey<CareerProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Role>(e => e.Property(r => r.Status).HasMaxLength(50));
        builder.Entity<CareerProfile>(e => e.HasIndex(p => p.UserId).IsUnique());
        builder.Entity<InterviewSession>(e =>
        {
            e.HasIndex(s => new { s.UserId, s.Status, s.CompletedAt });
            e.HasMany(s => s.Answers).WithOne(a => a.Session!).HasForeignKey(a => a.SessionId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<InterviewAnswer>(e => e.HasIndex(a => new { a.SessionId, a.OrderIndex }).IsUnique());
        builder.Entity<Question>(e => e.HasIndex(q => new { q.Category, q.IsActive }));
        builder.Entity<CareerMemoryEvent>(e => e.HasIndex(x => new { x.UserId, x.CreatedAt }));
        builder.Entity<WaitlistEntry>(e => e.HasIndex(x => x.Email));
        builder.Entity<ContentPage>(e => e.HasIndex(x => x.Slug).IsUnique());
        builder.Entity<BlogPost>(e => e.HasIndex(x => x.Slug).IsUnique());
        builder.Entity<CvDocument>(e => e.HasIndex(x => x.UserId));
        builder.Entity<JdMatchResult>(e => e.HasIndex(x => x.UserId));
        builder.Entity<SubscriptionPlan>(e => e.HasIndex(x => x.Code).IsUnique());
        builder.Entity<ReferralCode>(e => e.HasIndex(x => x.Code).IsUnique());
        builder.Entity<Badge>(e => e.HasIndex(x => x.Code).IsUnique());
        builder.Entity<PromoCode>(e => e.HasIndex(x => x.Code).IsUnique());
        builder.Entity<OrganizationMember>(e => e.HasIndex(x => new { x.OrganizationId, x.UserId }).IsUnique());
        builder.Entity<UserBadge>(e => e.HasIndex(x => new { x.UserId, x.BadgeId }).IsUnique());
        builder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(x => x.Token).IsUnique();
            e.HasIndex(x => new { x.UserId, x.RevokedAt });
        });

        builder.Entity<SubscriptionPlan>(e => e.Property(p => p.PriceVnd).HasPrecision(18, 2));
        builder.Entity<Invoice>(e => e.Property(p => p.AmountVnd).HasPrecision(18, 2));
        builder.Entity<Payment>(e => e.Property(p => p.AmountVnd).HasPrecision(18, 2));
        builder.Entity<PromoCode>(e => e.Property(p => p.DiscountPercent).HasPrecision(5, 2));
    }
}
