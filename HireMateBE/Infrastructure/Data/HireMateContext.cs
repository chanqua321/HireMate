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
    public DbSet<CvTemplate> CvTemplates => Set<CvTemplate>();
    public DbSet<JdMatchResult> JdMatchResults => Set<JdMatchResult>();
    public DbSet<JobDescription> JobDescriptions => Set<JobDescription>();
    public DbSet<ResourceItem> ResourceItems => Set<ResourceItem>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
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
    public DbSet<UserFeatureUsage> UserFeatureUsages => Set<UserFeatureUsage>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<UserAccount>(entity =>
        {
            entity.Property(u => u.FullName).HasMaxLength(255).IsRequired();
            entity.Property(u => u.AvatarUrl).HasMaxLength(1000);
            entity.Property(u => u.EmailOtpHash).HasMaxLength(128);
            entity.Property(u => u.CurrentPlanCode).HasMaxLength(20);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.CurrentPlanCode);
            entity.HasOne(u => u.CareerProfile)
                .WithOne(p => p.User!)
                .HasForeignKey<CareerProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Role>(e => e.Property(r => r.Status).HasMaxLength(50));
        builder.Entity<CareerProfile>(e =>
        {
            e.HasIndex(p => p.UserId).IsUnique();
            e.HasOne(p => p.ConfirmedCv)
                .WithMany()
                .HasForeignKey(p => p.ConfirmedCvDocumentId)
                .OnDelete(DeleteBehavior.NoAction);
        });
        builder.Entity<InterviewSession>(e =>
        {
            e.HasIndex(s => new { s.UserId, s.Status, s.CompletedAt });
            e.HasMany(s => s.Answers).WithOne(a => a.Session!).HasForeignKey(a => a.SessionId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<InterviewAnswer>(e => e.HasIndex(a => new { a.SessionId, a.OrderIndex }).IsUnique());
        builder.Entity<Question>(e => e.HasIndex(q => new { q.Category, q.IsActive }));
        builder.Entity<CareerMemoryEvent>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
            e.HasIndex(x => new { x.UserId, x.MemoryKey })
                .IsUnique()
                .HasFilter("[MemoryKey] IS NOT NULL")
                .HasDatabaseName("IX_CareerMemoryEvents_UserId_MemoryKey");
            e.Property(x => x.MemoryKey).HasMaxLength(160);
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.OccurrenceCount).HasDefaultValue(1);
        });
        builder.Entity<WaitlistEntry>(e => e.HasIndex(x => x.Email));
        builder.Entity<ContentPage>(e => e.HasIndex(x => x.Slug).IsUnique());
        builder.Entity<BlogPost>(e => e.HasIndex(x => x.Slug).IsUnique());
        builder.Entity<CvDocument>(e =>
        {
            e.Property(x => x.Source).HasMaxLength(20).HasDefaultValue("Upload");
            e.Property(x => x.DisplayName).HasMaxLength(120).HasDefaultValue(string.Empty);
            e.Property(x => x.ParseSucceeded).HasDefaultValue(false);
            e.Property(x => x.IsConfirmed).HasDefaultValue(false);
            e.HasIndex(x => new { x.UserId, x.UploadedAt });
            e.HasIndex(x => x.UserId)
                .IsUnique()
                .HasFilter("[IsConfirmed] = 1")
                .HasDatabaseName("IX_CvDocuments_UserId_OneConfirmed");
            e.HasOne(x => x.Template)
                .WithMany(t => t.Documents)
                .HasForeignKey(x => x.TemplateId)
                .OnDelete(DeleteBehavior.NoAction);
        });
        builder.Entity<CvTemplate>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.PreviewUrl).HasMaxLength(500);
            e.Property(x => x.TemplateType).HasMaxLength(40).HasDefaultValue("Modern");
            e.Property(x => x.LayoutKey).HasMaxLength(40).HasDefaultValue("modern-01");
            e.Property(x => x.IsSystemTemplate).HasDefaultValue(false);
            e.Property(x => x.IsActive).HasDefaultValue(true);
            e.HasIndex(x => new { x.UserId, x.IsActive });
            e.HasIndex(x => new { x.IsSystemTemplate, x.IsActive });
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<JdMatchResult>(e =>
        {
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
            e.HasIndex(x => new { x.JobDescriptionId, x.CreatedAt });
            e.HasOne(x => x.CvDocument).WithMany().HasForeignKey(x => x.CvDocumentId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.JobDescription).WithMany(j => j.Matches).HasForeignKey(x => x.JobDescriptionId)
                .OnDelete(DeleteBehavior.NoAction);
        });
        builder.Entity<JobDescription>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.IsArchived, x.UpdatedAt });
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.CompanyName).HasMaxLength(200);
            e.Property(x => x.Position).HasMaxLength(150);
            e.Property(x => x.SourceUrl).HasMaxLength(500);
        });
        builder.Entity<UserFeatureUsage>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.Feature, x.Period }).IsUnique();
            e.Property(x => x.Feature).HasMaxLength(40);
            e.Property(x => x.Period).HasMaxLength(7);
        });
        builder.Entity<SubscriptionPlan>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(p => p.PriceVnd).HasPrecision(18, 2);
        });
        builder.Entity<SystemSetting>(e => e.HasKey(x => x.Key));
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

        builder.Entity<Invoice>(e =>
        {
            e.Property(p => p.AmountVnd).HasPrecision(18, 2);
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
            e.HasIndex(x => x.InvoiceNumber);
        });
        builder.Entity<Payment>(e =>
        {
            e.Property(p => p.AmountVnd).HasPrecision(18, 2);
            e.HasIndex(x => x.InvoiceId);
            // Unique PayOS/VNPay transaction refs (nullable Mock/Free may share null — filter non-null).
            e.HasIndex(x => new { x.Provider, x.TransactionRef })
                .IsUnique()
                .HasFilter("[TransactionRef] IS NOT NULL")
                .HasDatabaseName("IX_Payments_Provider_TransactionRef");
        });
        builder.Entity<PromoCode>(e => e.Property(p => p.DiscountPercent).HasPrecision(5, 2));
    }
}

