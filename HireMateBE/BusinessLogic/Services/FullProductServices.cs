using BusinessLogic.Ai;
using BusinessLogic.Base;
using BusinessLogic.IServices;
using Common;
using Common.DTOs.PublicDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BusinessLogic.Services;


public class PublicContentService(IUnitOfWork uow) : IPublicContentService
{
    public async Task<IServiceResult> JoinWaitlistAsync(WaitlistDto dto)
    {
        var exists = await uow.WaitlistRepository.GetQueryable().AnyAsync(x => x.Email == dto.Email);
        if (exists)
            return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Bạn đã có trong danh sách chờ");

        await uow.WaitlistRepository.CreateAsync(new WaitlistEntry
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            FullName = dto.FullName,
            University = dto.University
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã tham gia danh sách chờ");
    }

    public async Task<IServiceResult> ContactAsync(ContactDto dto)
    {
        await uow.ContactRepository.CreateAsync(new ContactMessage
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            Subject = dto.Subject,
            Body = dto.Body
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã nhận tin nhắn");
    }

    public async Task<IServiceResult> GetPageAsync(string slug)
    {
        var page = await uow.ContentPageRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);
        return page == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy trang")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, page);
    }

    public async Task<IServiceResult> GetBlogListAsync()
    {
        var list = await uow.BlogPostRepository.GetQueryable().AsNoTracking()
            .Where(b => b.IsPublished).OrderByDescending(b => b.PublishedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> GetBlogAsync(string slug)
    {
        var post = await uow.BlogPostRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(b => b.Slug == slug && b.IsPublished);
        return post == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy bài viết")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, post);
    }

    public async Task<IServiceResult> GetFaqAsync()
    {
        var list = await uow.FaqRepository.GetQueryable().AsNoTracking()
            .Where(f => f.IsPublished).OrderBy(f => f.SortOrder).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> CreateTicketAsync(CreateTicketDto dto)
    {
        await uow.SupportTicketRepository.CreateAsync(new SupportTicket
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            Subject = dto.Subject,
            Body = dto.Body,
            Status = "Open"
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã tạo ticket hỗ trợ");
    }
}

public class CvService(IUnitOfWork uow, IAiClient ai) : ICvService
{
    public async Task<IServiceResult> UploadAsync(Guid userId, IFormFile file, string webRoot)
    {
        if (file.Length == 0)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "File trống");

        var dir = Path.Combine(webRoot, "uploads", "cv", userId.ToString());
        Directory.CreateDirectory(dir);
        var stored = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
        var path = Path.Combine(dir, stored);
        await using (var stream = File.Create(path))
            await file.CopyToAsync(stream);

        string? text = null;
        if (file.ContentType.Contains("text") || file.FileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
        {
            await using var rs = file.OpenReadStream();
            using var reader = new StreamReader(rs);
            text = await reader.ReadToEndAsync();
        }
        else
            text = $"[Binary CV: {file.FileName}, {file.Length} bytes]";

        var doc = new CvDocument
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FileName = file.FileName,
            StoragePath = path,
            ContentType = file.ContentType,
            FileSize = file.Length,
            ExtractedText = text
        };
        await uow.CvDocumentRepository.CreateAsync(doc);
        await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = "CvUploaded",
            RefId = doc.Id,
            PayloadJson = JsonSerializer.Serialize(new { doc.FileName })
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, Const.SUCCESS_CREATE_MSG, new { doc.Id, doc.FileName, doc.UploadedAt });
    }

    public async Task<IServiceResult> ListAsync(Guid userId)
    {
        var list = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId).OrderByDescending(c => c.UploadedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list.Select(Map));
    }

    public async Task<IServiceResult> GetAsync(Guid userId, Guid id)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        return doc == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, Map(doc));
    }

    public async Task<IServiceResult> AnalyzeAsync(Guid userId, Guid id)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        var aiResult = await ai.CompleteAsync(
            "You are a CV ATS analyzer. Return JSON only.",
            $"Analyze this CV text:\n{doc.ExtractedText}");

        try
        {
            using var parsed = JsonDocument.Parse(aiResult.Content);
            var root = parsed.RootElement;
            if (!TryReadScore(root, "format", out var format)
                || !TryReadScore(root, "keywords", out var keywords)
                || !TryReadScore(root, "readability", out var readability)
                || !TryReadScore(root, "professionalism", out var professionalism))
            {
                return new ServiceResult(Const.FAIL_UPDATE_CODE,
                    "AI không trả về đủ điểm CV hợp lệ. Vui lòng thử lại.");
            }

            doc.FormatScore = format;
            doc.KeywordsScore = keywords;
            doc.ReadabilityScore = readability;
            doc.ProfessionalismScore = professionalism;
            doc.AnalysisJson = aiResult.Content;
        }
        catch
        {
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Không phân tích được kết quả AI cho CV. Vui lòng thử lại.");
        }

        doc.AiProvider = aiResult.Provider;
        doc.AnalyzedAt = DateTime.UtcNow;
        await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = "CvAnalyzed",
            RefId = doc.Id,
            PayloadJson = JsonSerializer.Serialize(new { doc.FormatScore, doc.KeywordsScore })
        });
        await uow.SaveChangesAsync();

        static bool TryReadScore(JsonElement root, string key, out int score)
        {
            score = 0;
            if (!root.TryGetProperty(key, out var el)) return false;
            if (!el.TryGetInt32(out score)) return false;
            if (score is < 0 or > 100) return false;
            return true;
        }
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã phân tích CV", Map(doc));
    }

    private static object Map(CvDocument d) => new
    {
        d.Id, d.FileName, d.ContentType, d.FileSize, d.UploadedAt, d.AnalyzedAt,
        d.FormatScore, d.KeywordsScore, d.ReadabilityScore, d.ProfessionalismScore,
        analysis = d.AnalysisJson, provider = d.AiProvider
    };
}

public class MatchService(IUnitOfWork uow, IAiClient ai) : IMatchService
{
    public async Task<IServiceResult> MatchAsync(Guid userId, MatchRequestDto dto)
    {
        string cvText = "";
        if (dto.CvDocumentId.HasValue)
        {
            var cv = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CvDocumentId && c.UserId == userId);
            cvText = cv?.ExtractedText ?? "";
        }

        var aiResult = await ai.CompleteAsync(
            "You are a JD-CV matcher. Return JSON only with overall,skills,experience,education,projects,keywords,gaps,suggestions.",
            $"JD:\n{dto.JdText}\n\nCV:\n{cvText}");

        var overall = 74;
        try
        {
            using var parsed = JsonDocument.Parse(aiResult.Content);
            if (parsed.RootElement.TryGetProperty("overall", out var o))
                overall = o.GetInt32();
        }
        catch { /* heuristic json */ }

        var row = new JdMatchResult
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CvDocumentId = dto.CvDocumentId,
            JdText = dto.JdText,
            OverallScore = overall,
            ResultJson = aiResult.Content,
            AiProvider = aiResult.Provider
        };
        await uow.JdMatchRepository.CreateAsync(row);
        await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = "JdMatched",
            RefId = row.Id,
            PayloadJson = JsonSerializer.Serialize(new { overall })
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, Const.SUCCESS_CREATE_MSG, row);
    }

    public async Task<IServiceResult> GetAsync(Guid userId, Guid id)
    {
        var row = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        return row == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, row);
    }
}

public class EmailGenService(IAiClient ai) : IEmailGenService
{
    public async Task<IServiceResult> GenerateAsync(Guid userId, EmailGenerateDto dto)
    {
        var aiResult = await ai.CompleteAsync(
            "You write Vietnamese job application emails.",
            $"Type={dto.Type}; Position={dto.Position}; Company={dto.Company}; Tone={dto.Tone}. Write the email body.");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            email = aiResult.Content,
            provider = aiResult.Provider,
            usedFallback = aiResult.UsedFallback
        });
    }
}

public class CareerOsService(IUnitOfWork uow, UserManager<UserAccount> users, IAiClient ai) : ICareerOsService
{
    public async Task<IServiceResult> GetMemoryAsync(Guid userId)
    {
        var events = await uow.CareerMemoryEventRepository.GetQueryable().AsNoTracking()
            .Where(e => e.UserId == userId).OrderByDescending(e => e.CreatedAt).Take(100).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, events);
    }

    public async Task<IServiceResult> GetProfileHubAsync(Guid userId)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed").OrderByDescending(s => s.CompletedAt).Take(5).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            fullName = user?.FullName,
            profile,
            sessionsCount = sessions.Count,
            averageScore = sessions.Count == 0 ? (double?)null : sessions.Average(s => s.OverallScore ?? 0),
            recent = sessions
        });
    }

    public async Task<IServiceResult> GetProgressAsync(Guid userId)
    {
        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed")
            .OrderBy(s => s.CompletedAt).ToListAsync();
        var monthly = sessions.GroupBy(s => s.CompletedAt!.Value.ToString("yyyy-MM"))
            .Select(g => new { month = g.Key, avg = g.Average(x => x.OverallScore ?? 0), count = g.Count() });
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new { monthly, milestones = BuildMilestones(sessions.Count) });
    }

    public async Task<IServiceResult> GetDevelopmentAsync(Guid userId)
    {
        var interviews = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed").ToListAsync();
        var cvs = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId && c.AnalyzedAt != null).ToListAsync();
        var matches = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .Where(m => m.UserId == userId).ToListAsync();

        double interviewScore = interviews.Count == 0 ? 0 : interviews.Average(i => i.OverallScore ?? 0);
        double cvScore = cvs.Count == 0 ? 0 : cvs.Average(c =>
            ((c.FormatScore ?? 0) + (c.KeywordsScore ?? 0) + (c.ReadabilityScore ?? 0) + (c.ProfessionalismScore ?? 0)) / 4.0);
        double matchScore = matches.Count == 0 ? 0 : matches.Average(m => m.OverallScore);
        var careerScore = Math.Round((interviewScore * 0.5) + (cvScore * 0.25) + (matchScore * 0.25), 1);

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            careerScore,
            interviewScore,
            cvScore,
            matchScore,
            readiness = careerScore >= 75 ? "Sẵn sàng" : careerScore >= 55 ? "Gần đạt" : "Đang xây dựng"
        });
    }

    public async Task<IServiceResult> GetPathAsync(Guid userId)
    {
        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        var aiResult = await ai.CompleteAsync(
            "Return JSON career path stages for Vietnamese fresher.",
            $"Position={profile?.DesiredPosition}; Industry={profile?.DesiredIndustry}; Level={profile?.ExperienceLevel}. career path lá»™ trÃ¬nh");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            path = aiResult.Content,
            provider = aiResult.Provider,
            usedFallback = aiResult.UsedFallback
        });
    }

    public async Task<IServiceResult> GetLearningAsync(Guid userId)
    {
        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        var aiResult = await ai.CompleteAsync(
            "Return JSON learning recommendations.",
            $"Recommend learning for {profile?.DesiredPosition}. há»c táº­p");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            learning = aiResult.Content,
            provider = aiResult.Provider,
            usedFallback = aiResult.UsedFallback
        });
    }

    public async Task<IServiceResult> GetResourcesAsync(string? category)
    {
        var q = uow.ResourceRepository.GetQueryable().AsNoTracking().Where(r => r.IsPublished);
        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(r => r.Category == category);
        var list = await q.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> GetResourceAsync(Guid id)
    {
        var item = await uow.ResourceRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && r.IsPublished);
        return item == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, item);
    }

    private static object BuildMilestones(int count) => new[]
    {
        new { code = "first_interview", unlocked = count >= 1 },
        new { code = "five_sessions", unlocked = count >= 5 },
        new { code = "ten_sessions", unlocked = count >= 10 }
    };
}

public class BillingService(
    IUnitOfWork uow,
    UserManager<UserAccount> users,
    Microsoft.Extensions.Options.IOptions<BusinessLogic.Payments.VnPayOptions> vnPayOptions,
    Microsoft.Extensions.Options.IOptions<BusinessLogic.Payments.PayOsOptions> payOsOptions,
    BusinessLogic.Payments.PayOsClient payOsClient) : IBillingService
{
    private readonly BusinessLogic.Payments.VnPayOptions _vnPay = vnPayOptions.Value;
    private readonly BusinessLogic.Payments.PayOsOptions _payOs = payOsOptions.Value;
    private readonly BusinessLogic.Payments.PayOsClient _payOsClient = payOsClient;

    public async Task<IServiceResult> GetPlansAsync()
    {
        var plans = await uow.PlanRepository.GetQueryable().AsNoTracking().Where(p => p.IsActive).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, plans);
    }

    public async Task<IServiceResult> CheckoutAsync(Guid userId, CheckoutDto dto, string? clientIp)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var plan = await uow.PlanRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.Code == dto.PlanCode && p.IsActive);
        if (plan == null) return new ServiceResult(Const.FAIL_CREATE_CODE, "Không tìm thấy gói");

        var currentCode = await ResolveCurrentPlanCodeAsync(userId, user.IsPremium);
        var currentRank = PlanTier.Rank(currentCode);
        var targetRank = PlanTier.Rank(plan.Code);
        if (targetRank <= currentRank)
        {
            var currentName = PlanTier.DisplayName(currentCode);
            var targetName = PlanTier.DisplayName(plan.Code);
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                targetRank == currentRank
                    ? $"Bạn đang dùng gói {currentName}. Không thể mua lại cùng cấp — hãy nâng cấp lên gói cao hơn nếu cần."
                    : $"Bạn đang dùng gói {currentName} (cao hơn {targetName}). Chỉ được nâng cấp lên gói cao hơn.");
        }

        decimal amount = plan.PriceVnd;
        if (!string.IsNullOrWhiteSpace(dto.PromoCode))
        {
            var promo = await uow.PromoCodeRepository.GetQueryable()
                .FirstOrDefaultAsync(p => p.Code == dto.PromoCode && p.IsActive
                    && (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow));
            if (promo != null)
                amount = Math.Round(amount * (1 - promo.DiscountPercent / 100m), 0);
        }

        var method = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Mock" : dto.PaymentMethod.Trim();

        if (method.Equals("PayOS", StringComparison.OrdinalIgnoreCase))
            return await CheckoutPayOsAsync(user, userId, plan, amount);

        if (method.Equals("VNPay", StringComparison.OrdinalIgnoreCase))
            return await CheckoutVnPayAsync(user, userId, plan, amount, clientIp);

        return await CheckoutMockAsync(user, userId, plan, amount);
    }

    private async Task<IServiceResult> CheckoutPayOsAsync(UserAccount user, Guid userId, SubscriptionPlan plan, decimal amount)
    {
        if (!_payOs.Enabled)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "PayOS chưa được cấu hình. Thiết lập PayOS:Enabled + ClientId + ApiKey + ChecksumKey, hoặc dùng PaymentMethod=Mock.");

        var orderCode = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 900_000_000_000L + Random.Shared.Next(1, 999);
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = plan.Id,
            InvoiceNumber = $"HM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            AmountVnd = amount,
            Status = "Pending",
            PaymentMethod = "PayOS"
        };
        await uow.InvoiceRepository.CreateAsync(invoice);
        await uow.PaymentRepository.CreateAsync(new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            AmountVnd = amount,
            Provider = "PayOS",
            Status = "Pending",
            TransactionRef = orderCode.ToString()
        });
        await uow.SaveChangesAsync();

        var created = await _payOsClient.CreatePaymentLinkAsync(orderCode, (int)amount, "HireMate");
        if (!created.Ok || string.IsNullOrWhiteSpace(created.CheckoutUrl))
            return new ServiceResult(Const.FAIL_CREATE_CODE, created.Error ?? "Tạo thanh toán PayOS thất bại");

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Chuyển hướng tới PayOS", new
        {
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.AmountVnd,
            invoice.Status,
            paymentMethod = "PayOS",
            paymentUrl = created.CheckoutUrl,
            qrCode = created.QrCode,
            orderCode,
            paymentLinkId = created.PaymentLinkId,
            isPremium = user.IsPremium,
            plan = plan.Code
        });
    }

    private async Task<IServiceResult> CheckoutVnPayAsync(UserAccount user, Guid userId, SubscriptionPlan plan, decimal amount, string? clientIp)
    {
        if (!_vnPay.Enabled || string.IsNullOrWhiteSpace(_vnPay.TmnCode) || string.IsNullOrWhiteSpace(_vnPay.HashSecret))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "VNPay chưa được cấu hình. Thiết lập VnPay:Enabled + TmnCode + HashSecret, hoặc dùng PaymentMethod=Mock.");

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = plan.Id,
            InvoiceNumber = $"HM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            AmountVnd = amount,
            Status = "Pending",
            PaymentMethod = "VNPay"
        };
        var txnRef = invoice.Id.ToString("N")[..12];
        await uow.InvoiceRepository.CreateAsync(invoice);
        await uow.PaymentRepository.CreateAsync(new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            AmountVnd = amount,
            Provider = "VNPay",
            Status = "Pending",
            TransactionRef = txnRef
        });
        await uow.SaveChangesAsync();

        var paymentUrl = BusinessLogic.Payments.VnPayHelper.BuildPaymentUrl(
            _vnPay, txnRef, (long)amount, $"HireMate {plan.Code} {invoice.InvoiceNumber}", clientIp ?? "127.0.0.1", DateTime.UtcNow);

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Chuyển hướng tới VNPay", new
        {
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.AmountVnd,
            invoice.Status,
            paymentMethod = "VNPay",
            paymentUrl,
            isPremium = user.IsPremium,
            plan = plan.Code
        });
    }

    private async Task<IServiceResult> CheckoutMockAsync(UserAccount user, Guid userId, SubscriptionPlan plan, decimal amount)
    {
        var mockInvoice = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = plan.Id,
            InvoiceNumber = $"HM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            AmountVnd = amount,
            Status = "Paid",
            PaymentMethod = "Mock",
            PaidAt = DateTime.UtcNow
        };
        await uow.InvoiceRepository.CreateAsync(mockInvoice);
        await uow.PaymentRepository.CreateAsync(new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = mockInvoice.Id,
            AmountVnd = amount,
            Provider = "Mock",
            Status = "Success",
            TransactionRef = Guid.NewGuid().ToString("N")[..12]
        });

        user.IsPremium = plan.Code is not "free";
        user.UpdatedAt = DateTime.UtcNow;
        await users.UpdateAsync(user);
        await uow.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Thanh toán thành công", new
        {
            mockInvoice.Id,
            mockInvoice.InvoiceNumber,
            mockInvoice.AmountVnd,
            mockInvoice.Status,
            paymentMethod = "Mock",
            isPremium = user.IsPremium,
            plan = plan.Code,
            planName = plan.Name
        });
    }

    public async Task<IServiceResult> HandlePayOsWebhookAsync(string jsonBody)
    {
        if (!_payOs.Enabled)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "PayOS đang tắt");

        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(jsonBody) ? "{}" : jsonBody);
        var root = doc.RootElement;
        var signature = root.TryGetProperty("signature", out var sig) ? sig.GetString() ?? "" : "";
        if (!root.TryGetProperty("data", out var data) || data.ValueKind == JsonValueKind.Null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Webhook PayOS không hợp lệ");

        if (!BusinessLogic.Payments.PayOsHelper.VerifyWebhookSignature(data, signature, _payOs.ChecksumKey))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Chữ ký PayOS không hợp lệ");

        var orderCode = data.TryGetProperty("orderCode", out var oc)
            ? (oc.ValueKind == JsonValueKind.Number ? oc.GetInt64().ToString() : oc.GetString())
            : null;
        var code = data.TryGetProperty("code", out var dc) ? dc.GetString() : root.TryGetProperty("code", out var rc) ? rc.GetString() : null;

        var payment = await uow.PaymentRepository.GetQueryable()
            .Include(p => p.Invoice)
            .FirstOrDefaultAsync(p => p.TransactionRef == orderCode && p.Provider == "PayOS");

        if (payment?.Invoice == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy đơn hàng");

        if (payment.Status == "Success" && payment.Invoice.Status == "Paid")
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đơn hàng đã được thanh toán", new { success = true });

        if (code == "00" || (root.TryGetProperty("success", out var ok) && ok.ValueKind == JsonValueKind.True))
        {
            payment.Status = "Success";
            payment.Invoice.Status = "Paid";
            payment.Invoice.PaidAt = DateTime.UtcNow;
            var user = await users.FindByIdAsync(payment.Invoice.UserId.ToString());
            if (user != null)
            {
                user.IsPremium = true;
                user.UpdatedAt = DateTime.UtcNow;
                await users.UpdateAsync(user);
            }
            await uow.SaveChangesAsync();
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Thanh toán thành công", new { success = true });
        }

        payment.Status = "Failed";
        payment.Invoice.Status = "Failed";
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.FAIL_UPDATE_CODE, "Thanh toán thất bại", new { success = false });
    }

    public async Task<IServiceResult> HandleVnPayReturnAsync(IDictionary<string, string> query)
        => await FinalizeVnPayAsync(query, isIpn: false);

    public async Task<IServiceResult> HandleVnPayIpnAsync(IDictionary<string, string> query)
        => await FinalizeVnPayAsync(query, isIpn: true);

    private async Task<IServiceResult> FinalizeVnPayAsync(IDictionary<string, string> query, bool isIpn)
    {
        if (!_vnPay.Enabled)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "VNPay đang tắt");

        if (!BusinessLogic.Payments.VnPayHelper.ValidateSignature(query, _vnPay.HashSecret))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Chữ ký VNPay không hợp lệ", new { RspCode = "97", Message = "Chữ ký không hợp lệ" });

        query.TryGetValue("vnp_TxnRef", out var txnRef);
        query.TryGetValue("vnp_ResponseCode", out var responseCode);

        var payment = await uow.PaymentRepository.GetQueryable()
            .Include(p => p.Invoice)
            .FirstOrDefaultAsync(p => p.TransactionRef == txnRef && p.Provider == "VNPay");

        if (payment?.Invoice == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy thanh toán", new { RspCode = "01", Message = "Không tìm thấy đơn hàng" });

        if (payment.Status == "Success" && payment.Invoice.Status == "Paid")
        {
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đơn hàng đã được thanh toán", new
            {
                RspCode = "00",
                Message = "Confirm Success",
                redirectUrl = $"{_vnPay.FrontendReturnUrl}?status=success&invoiceId={payment.InvoiceId}",
                isPremium = true
            });
        }

        if (responseCode == "00")
        {
            payment.Status = "Success";
            payment.Invoice.Status = "Paid";
            payment.Invoice.PaidAt = DateTime.UtcNow;

            var user = await users.FindByIdAsync(payment.Invoice.UserId.ToString());
            if (user != null)
            {
                user.IsPremium = true;
                user.UpdatedAt = DateTime.UtcNow;
                await users.UpdateAsync(user);
            }
            await uow.SaveChangesAsync();

            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Thanh toán thành công", new
            {
                RspCode = "00",
                Message = "Confirm Success",
                redirectUrl = $"{_vnPay.FrontendReturnUrl}?status=success&invoiceId={payment.InvoiceId}",
                isPremium = true,
                isIpn
            });
        }

        payment.Status = "Failed";
        payment.Invoice.Status = "Failed";
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.FAIL_UPDATE_CODE, "Thanh toán thất bại", new
        {
            RspCode = "00",
            Message = "Confirm Success",
            redirectUrl = $"{_vnPay.FrontendReturnUrl}?status=failed&invoiceId={payment.InvoiceId}",
            isIpn
        });
    }

    public async Task<IServiceResult> GetInvoicesAsync(Guid userId)
    {
        var list = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .Where(i => i.UserId == userId).OrderByDescending(i => i.CreatedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> GetInvoiceAsync(Guid userId, Guid id)
    {
        var inv = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        return inv == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy hóa đơn")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, inv);
    }

    private async Task<string> ResolveCurrentPlanCodeAsync(Guid userId, bool isPremium)
    {
        var paid = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .Where(i => i.UserId == userId && i.Status == "Paid")
            .OrderByDescending(i => i.PaidAt ?? i.CreatedAt)
            .Select(i => i.Plan != null ? i.Plan.Code : null)
            .FirstOrDefaultAsync();

        if (!string.IsNullOrWhiteSpace(paid))
            return PlanTier.Normalize(paid);
        return isPremium ? "premium" : "free";
    }
}

public class GrowthService(IUnitOfWork uow, UserManager<UserAccount> users) : IGrowthService
{
    public async Task<IServiceResult> GetReferralAsync(Guid userId)
    {
        var code = await uow.ReferralCodeRepository.GetQueryable().FirstOrDefaultAsync(r => r.UserId == userId);
        if (code == null)
        {
            code = new ReferralCode
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Code = $"HM{userId.ToString("N")[..8].ToUpperInvariant()}"
            };
            await uow.ReferralCodeRepository.CreateAsync(code);
            await uow.SaveChangesAsync();
        }
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            code.Code,
            code.InviteCount,
            shareUrl = $"https://hiremate.app/r/{code.Code}"
        });
    }

    public async Task<IServiceResult> ApplyReferralAsync(Guid userId, ApplyReferralDto dto)
    {
        var refCode = await uow.ReferralCodeRepository.GetQueryable()
            .FirstOrDefaultAsync(r => r.Code == dto.Code);
        if (refCode == null || refCode.UserId == userId)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mã giới thiệu không hợp lệ");

        var already = await uow.ReferralInviteRepository.GetQueryable()
            .AnyAsync(i => i.InviteeUserId == userId);
        if (already)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mã giới thiệu đã được áp dụng");

        await uow.ReferralInviteRepository.CreateAsync(new ReferralInvite
        {
            Id = Guid.NewGuid(),
            ReferrerUserId = refCode.UserId,
            InviteeUserId = userId,
            Code = dto.Code
        });
        refCode.InviteCount++;
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Áp dụng mã giới thiệu thành công");
    }

    public async Task<IServiceResult> GetBadgesAsync(Guid userId)
    {
        var all = await uow.BadgeRepository.GetQueryable().AsNoTracking().ToListAsync();
        var earned = await uow.UserBadgeRepository.GetQueryable().AsNoTracking()
            .Where(ub => ub.UserId == userId).ToListAsync();
        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .CountAsync(s => s.UserId == userId && s.Status == "Completed");

        await EnsureBadge(userId, "first_interview", sessions >= 1);
        await EnsureBadge(userId, "ten_sessions", sessions >= 10);
        var topList = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed" && s.OverallScore != null)
            .Select(s => s.OverallScore!.Value).ToListAsync();
        var top = topList.Count == 0 ? 0 : topList.Max();
        await EnsureBadge(userId, "top_performer", top >= 85);

        earned = await uow.UserBadgeRepository.GetQueryable().AsNoTracking()
            .Where(ub => ub.UserId == userId).ToListAsync();

        var data = all.Select(b => new
        {
            b.Code, b.Name, b.Description,
            earned = earned.Any(e => e.BadgeId == b.Id),
            earnedAt = earned.FirstOrDefault(e => e.BadgeId == b.Id)?.EarnedAt
        });
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    private async Task EnsureBadge(Guid userId, string code, bool condition)
    {
        if (!condition) return;
        var badge = await uow.BadgeRepository.GetQueryable().FirstOrDefaultAsync(b => b.Code == code);
        if (badge == null) return;
        var has = await uow.UserBadgeRepository.GetQueryable().AnyAsync(ub => ub.UserId == userId && ub.BadgeId == badge.Id);
        if (has) return;
        await uow.UserBadgeRepository.CreateAsync(new UserBadge { Id = Guid.NewGuid(), UserId = userId, BadgeId = badge.Id });
        await uow.SaveChangesAsync();
    }

    public async Task<IServiceResult> GetLeaderboardAsync()
    {
        var scores = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.Status == "Completed" && s.OverallScore != null)
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Avg = g.Average(x => x.OverallScore ?? 0), Count = g.Count() })
            .OrderByDescending(x => x.Avg).Take(20).ToListAsync();

        var result = new List<object>();
        foreach (var s in scores)
        {
            var u = await users.FindByIdAsync(s.UserId.ToString());
            result.Add(new { fullName = u?.FullName ?? "User", averageScore = Math.Round(s.Avg, 1), sessions = s.Count });
        }
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, result);
    }

    public async Task<IServiceResult> GetBenchmarkAsync(Guid userId)
    {
        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        var my = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed").ToListAsync();
        var myAvg = my.Count == 0 ? 0 : my.Average(s => s.OverallScore ?? 0);

        var peerQuery = uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.Status == "Completed");
        if (!string.IsNullOrEmpty(profile?.DesiredIndustry))
            peerQuery = peerQuery.Where(s => s.Industry == profile.DesiredIndustry);

        var peerScores = await peerQuery.Select(s => s.OverallScore ?? 0).ToListAsync();
        var peerAvg = peerScores.Count == 0 ? 0 : peerScores.Average();
        var betterThan = peerScores.Count == 0 ? 0 :
            Math.Round(100.0 * peerScores.Count(p => myAvg >= p) / peerScores.Count, 1);

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            myAverage = Math.Round(myAvg, 1),
            peerAverage = Math.Round(peerAvg, 1),
            percentile = betterThan,
            industry = profile?.DesiredIndustry,
            star = new
            {
                s = my.Count == 0 ? 0 : my.Average(x => x.ScoreS ?? 0),
                t = my.Count == 0 ? 0 : my.Average(x => x.ScoreT ?? 0),
                a = my.Count == 0 ? 0 : my.Average(x => x.ScoreA ?? 0),
                r = my.Count == 0 ? 0 : my.Average(x => x.ScoreR ?? 0)
            }
        });
    }
}

