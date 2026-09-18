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
}
