namespace Common;

public static class PlanTier
{
    /// <summary>
    /// free = 0, premium/Tiêu chuẩn = 1, combo/Cao cấp = 2.
    /// Gói admin tùy chỉnh (vd. test) giữ rank 1; so sánh nâng/hạ thêm dựa trên giá ở Checkout.
    /// </summary>
    public static int Rank(string? planCode)
    {
        var code = (planCode ?? "free").Trim().ToLowerInvariant();
        return code switch
        {
            "free" or "" => 0,
            "combo" or "pro" or "cao-cap" => 2,
            "premium" or "basic" or "tieu-chuan" or "payostest" or "test20k" or "test" => 1,
            _ => 1
        };
    }

    /// <summary>Chuẩn hóa alias → mã seed; giữ nguyên mã admin tùy chỉnh.</summary>
    public static string Normalize(string? planCode)
    {
        var code = (planCode ?? "free").Trim().ToLowerInvariant();
        return code switch
        {
            "free" or "" => "free",
            "combo" or "pro" or "cao-cap" => "combo",
            "premium" or "basic" or "tieu-chuan" => "premium",
            "payostest" or "test20k" => "premium",
            _ => code
        };
    }

    public static string DisplayName(string? planCode)
    {
        var code = (planCode ?? "free").Trim().ToLowerInvariant();
        return code switch
        {
            "free" or "" => "Miễn phí",
            "combo" or "pro" or "cao-cap" => "Cao cấp",
            "premium" or "basic" or "tieu-chuan" or "payostest" or "test20k" => "Tiêu chuẩn",
            _ => string.IsNullOrWhiteSpace(planCode) ? "Miễn phí" : planCode.Trim()
        };
    }

    public static bool IsFree(string? planCode) => Rank(planCode) == 0;

    /// <summary>Voice Interview: paid entitlement only (premium / combo and aliases).</summary>
    public static bool IsVoiceAllowed(string? planCode) => Rank(planCode) >= 1;

    /// <summary>Maximum Voice Interview session duration.</summary>
    public const int VoiceMaxMinutes = 15;
    public static readonly TimeSpan VoiceMaxDuration = TimeSpan.FromMinutes(VoiceMaxMinutes);

    /// <summary>
    /// Quota theo bảng giá:
    /// Free 0đ: 3 PV + 1 CV analyze / tháng; JD Match 0; CV/Email gen 0;
    /// Tiêu chuẩn 79k: 15 PV + 20 CV + 15 JD + 10 CV/Email / tháng;
    /// Cao cấp 149k: 50 PV + 70 CV + 50 JD + 30 CV/Email / tháng.
    /// </summary>
    public static int MonthlyInterviewSessions(string? planCode) => Rank(planCode) switch
    {
        0 => 3,
        2 => 50,
        _ => 15
    };

    public static int QuestionsPerSession(string? planCode) => Rank(planCode) switch
    {
        0 => 5,
        2 => 10,
        _ => 7
    };

    /// <summary>Số lần phân tích CV thành công / tháng. Mọi gói đều có trần (không unlimited).</summary>
    public static int MonthlyCvAnalyzeLimit(string? planCode) => Rank(planCode) switch
    {
        0 => 1,
        2 => 70,
        _ => 20
    };

    public static int MonthlyJdMatchLimit(string? planCode) => Rank(planCode) switch
    {
        0 => 0,
        2 => 50,
        _ => 15
    };

    /// <summary>Quota chung cho Email AI + CV text assist generation / tháng.</summary>
    public static int MonthlyCvEmailGenerationLimit(string? planCode) => Rank(planCode) switch
    {
        0 => 0,
        2 => 30,
        _ => 10
    };
}
