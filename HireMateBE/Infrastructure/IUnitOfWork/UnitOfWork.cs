using Infrastructure.Data;
using Infrastructure.IRepositories;
using Infrastructure.Repositories;

namespace Infrastructure.IUnitOfWork;

public interface IUnitOfWork : IDisposable
{
    IUserAccountRepository UserAccountRepository { get; }
    ICareerProfileRepository CareerProfileRepository { get; }
    IQuestionRepository QuestionRepository { get; }
    IInterviewSessionRepository InterviewSessionRepository { get; }
    IInterviewAnswerRepository InterviewAnswerRepository { get; }
    ICareerMemoryEventRepository CareerMemoryEventRepository { get; }
    IWaitlistRepository WaitlistRepository { get; }
    IContactRepository ContactRepository { get; }
    IContentPageRepository ContentPageRepository { get; }
    IBlogPostRepository BlogPostRepository { get; }
    IFaqRepository FaqRepository { get; }
    ICvDocumentRepository CvDocumentRepository { get; }
    IJdMatchRepository JdMatchRepository { get; }
    IResourceRepository ResourceRepository { get; }
    IPlanRepository PlanRepository { get; }
    IInvoiceRepository InvoiceRepository { get; }
    IPaymentRepository PaymentRepository { get; }
    IReferralCodeRepository ReferralCodeRepository { get; }
    IReferralInviteRepository ReferralInviteRepository { get; }
    IBadgeRepository BadgeRepository { get; }
    IUserBadgeRepository UserBadgeRepository { get; }
    IPromoCodeRepository PromoCodeRepository { get; }
    ISupportTicketRepository SupportTicketRepository { get; }
    IOrganizationRepository OrganizationRepository { get; }
    IOrganizationMemberRepository OrganizationMemberRepository { get; }
    IRefreshTokenRepository RefreshTokenRepository { get; }
    ISystemSettingRepository SystemSettingRepository { get; }
    Task<int> SaveChangesAsync();
}

public class UnitOfWork(HireMateContext context) : IUnitOfWork
{
    private readonly HireMateContext _context = context;

    private IUserAccountRepository? _userAccountRepository;
    private ICareerProfileRepository? _careerProfileRepository;
    private IQuestionRepository? _questionRepository;
    private IInterviewSessionRepository? _interviewSessionRepository;
    private IInterviewAnswerRepository? _interviewAnswerRepository;
    private ICareerMemoryEventRepository? _careerMemoryEventRepository;
    private IWaitlistRepository? _waitlist;
    private IContactRepository? _contact;
    private IContentPageRepository? _content;
    private IBlogPostRepository? _blog;
    private IFaqRepository? _faq;
    private ICvDocumentRepository? _cv;
    private IJdMatchRepository? _jd;
    private IResourceRepository? _resource;
    private IPlanRepository? _plan;
    private IInvoiceRepository? _invoice;
    private IPaymentRepository? _payment;
    private IReferralCodeRepository? _refCode;
    private IReferralInviteRepository? _refInvite;
    private IBadgeRepository? _badge;
    private IUserBadgeRepository? _userBadge;
    private IPromoCodeRepository? _promo;
    private ISupportTicketRepository? _ticket;
    private IOrganizationRepository? _org;
    private IOrganizationMemberRepository? _orgMember;
    private IRefreshTokenRepository? _refreshToken;
    private ISystemSettingRepository? _settings;

    public IUserAccountRepository UserAccountRepository => _userAccountRepository ??= new UserAccountRepository(_context);
    public ICareerProfileRepository CareerProfileRepository => _careerProfileRepository ??= new CareerProfileRepository(_context);
    public IQuestionRepository QuestionRepository => _questionRepository ??= new QuestionRepository(_context);
    public IInterviewSessionRepository InterviewSessionRepository => _interviewSessionRepository ??= new InterviewSessionRepository(_context);
    public IInterviewAnswerRepository InterviewAnswerRepository => _interviewAnswerRepository ??= new InterviewAnswerRepository(_context);
    public ICareerMemoryEventRepository CareerMemoryEventRepository => _careerMemoryEventRepository ??= new CareerMemoryEventRepository(_context);
    public IWaitlistRepository WaitlistRepository => _waitlist ??= new WaitlistRepository(_context);
    public IContactRepository ContactRepository => _contact ??= new ContactRepository(_context);
    public IContentPageRepository ContentPageRepository => _content ??= new ContentPageRepository(_context);
    public IBlogPostRepository BlogPostRepository => _blog ??= new BlogPostRepository(_context);
    public IFaqRepository FaqRepository => _faq ??= new FaqRepository(_context);
    public ICvDocumentRepository CvDocumentRepository => _cv ??= new CvDocumentRepository(_context);
    public IJdMatchRepository JdMatchRepository => _jd ??= new JdMatchRepository(_context);
    public IResourceRepository ResourceRepository => _resource ??= new ResourceRepository(_context);
    public IPlanRepository PlanRepository => _plan ??= new PlanRepository(_context);
    public IInvoiceRepository InvoiceRepository => _invoice ??= new InvoiceRepository(_context);
    public IPaymentRepository PaymentRepository => _payment ??= new PaymentRepository(_context);
    public IReferralCodeRepository ReferralCodeRepository => _refCode ??= new ReferralCodeRepository(_context);
    public IReferralInviteRepository ReferralInviteRepository => _refInvite ??= new ReferralInviteRepository(_context);
    public IBadgeRepository BadgeRepository => _badge ??= new BadgeRepository(_context);
    public IUserBadgeRepository UserBadgeRepository => _userBadge ??= new UserBadgeRepository(_context);
    public IPromoCodeRepository PromoCodeRepository => _promo ??= new PromoCodeRepository(_context);
    public ISupportTicketRepository SupportTicketRepository => _ticket ??= new SupportTicketRepository(_context);
    public IOrganizationRepository OrganizationRepository => _org ??= new OrganizationRepository(_context);
    public IOrganizationMemberRepository OrganizationMemberRepository => _orgMember ??= new OrganizationMemberRepository(_context);
    public IRefreshTokenRepository RefreshTokenRepository => _refreshToken ??= new RefreshTokenRepository(_context);
    public ISystemSettingRepository SystemSettingRepository => _settings ??= new SystemSettingRepository(_context);

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}

