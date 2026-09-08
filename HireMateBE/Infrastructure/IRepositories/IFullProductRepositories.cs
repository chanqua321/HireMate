using Infrastructure.Base;
using Infrastructure.Models;

namespace Infrastructure.IRepositories;

public interface IWaitlistRepository : IGenericRepository<WaitlistEntry> { }
public interface IContactRepository : IGenericRepository<ContactMessage> { }
public interface IContentPageRepository : IGenericRepository<ContentPage> { }
public interface IBlogPostRepository : IGenericRepository<BlogPost> { }
public interface IFaqRepository : IGenericRepository<FaqItem> { }
public interface ICvDocumentRepository : IGenericRepository<CvDocument> { }
public interface IJdMatchRepository : IGenericRepository<JdMatchResult> { }
public interface IResourceRepository : IGenericRepository<ResourceItem> { }
public interface IPlanRepository : IGenericRepository<SubscriptionPlan> { }
public interface IInvoiceRepository : IGenericRepository<Invoice> { }
public interface IPaymentRepository : IGenericRepository<Payment> { }
public interface IReferralCodeRepository : IGenericRepository<ReferralCode> { }
public interface IReferralInviteRepository : IGenericRepository<ReferralInvite> { }
public interface IBadgeRepository : IGenericRepository<Badge> { }
public interface IUserBadgeRepository : IGenericRepository<UserBadge> { }
public interface IPromoCodeRepository : IGenericRepository<PromoCode> { }
public interface ISupportTicketRepository : IGenericRepository<SupportTicket> { }
public interface IOrganizationRepository : IGenericRepository<Organization> { }
public interface IOrganizationMemberRepository : IGenericRepository<OrganizationMember> { }
public interface IRefreshTokenRepository : IGenericRepository<RefreshToken> { }
public interface ISystemSettingRepository : IGenericRepository<SystemSetting> { }

