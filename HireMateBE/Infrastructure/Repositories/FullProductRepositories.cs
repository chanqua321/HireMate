using Infrastructure.Base;
using Infrastructure.Data;
using Infrastructure.IRepositories;
using Infrastructure.Models;

namespace Infrastructure.Repositories;

public class WaitlistRepository(HireMateContext c) : GenericRepository<WaitlistEntry>(c), IWaitlistRepository { }
public class ContactRepository(HireMateContext c) : GenericRepository<ContactMessage>(c), IContactRepository { }
public class ContentPageRepository(HireMateContext c) : GenericRepository<ContentPage>(c), IContentPageRepository { }
public class BlogPostRepository(HireMateContext c) : GenericRepository<BlogPost>(c), IBlogPostRepository { }
public class FaqRepository(HireMateContext c) : GenericRepository<FaqItem>(c), IFaqRepository { }
public class CvDocumentRepository(HireMateContext c) : GenericRepository<CvDocument>(c), ICvDocumentRepository { }
public class JdMatchRepository(HireMateContext c) : GenericRepository<JdMatchResult>(c), IJdMatchRepository { }
public class ResourceRepository(HireMateContext c) : GenericRepository<ResourceItem>(c), IResourceRepository { }
public class PlanRepository(HireMateContext c) : GenericRepository<SubscriptionPlan>(c), IPlanRepository { }
public class InvoiceRepository(HireMateContext c) : GenericRepository<Invoice>(c), IInvoiceRepository { }
public class PaymentRepository(HireMateContext c) : GenericRepository<Payment>(c), IPaymentRepository { }
public class ReferralCodeRepository(HireMateContext c) : GenericRepository<ReferralCode>(c), IReferralCodeRepository { }
public class ReferralInviteRepository(HireMateContext c) : GenericRepository<ReferralInvite>(c), IReferralInviteRepository { }
public class BadgeRepository(HireMateContext c) : GenericRepository<Badge>(c), IBadgeRepository { }
public class UserBadgeRepository(HireMateContext c) : GenericRepository<UserBadge>(c), IUserBadgeRepository { }
public class PromoCodeRepository(HireMateContext c) : GenericRepository<PromoCode>(c), IPromoCodeRepository { }
public class SupportTicketRepository(HireMateContext c) : GenericRepository<SupportTicket>(c), ISupportTicketRepository { }
public class OrganizationRepository(HireMateContext c) : GenericRepository<Organization>(c), IOrganizationRepository { }
public class OrganizationMemberRepository(HireMateContext c) : GenericRepository<OrganizationMember>(c), IOrganizationMemberRepository { }
public class RefreshTokenRepository(HireMateContext c) : GenericRepository<RefreshToken>(c), IRefreshTokenRepository { }
