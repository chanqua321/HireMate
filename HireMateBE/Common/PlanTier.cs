namespace Common;

public static class PlanTier
{
    /// <summary>free = 0, premium (Tiêu chuẩn) = 1, combo (Cao cấp) = 2</summary>
    public static int Rank(string? planCode)
    {
        var code = (planCode ?? "free").Trim().ToLowerInvariant();
        return code switch
        {
            "combo" or "pro" or "cao-cap" => 2,
            "premium" or "basic" or "tieu-chuan" => 1,
            _ => 0
        };
    }

    public static string Normalize(string? planCode)
    {
        var code = (planCode ?? "free").Trim().ToLowerInvariant();
        return code switch
        {
            "combo" or "pro" => "combo",
            "premium" or "basic" => "premium",
            _ => "free"
        };
    }

    public static string DisplayName(string? planCode) => Normalize(planCode) switch
    {
        "combo" => "Cao cấp",
        "premium" => "Tiêu chuẩn",
        _ => "Miễn phí"
    };
}
