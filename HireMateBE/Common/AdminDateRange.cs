namespace Common;

/// <summary>Admin filters use Vietnam calendar dates. Returned bounds are UTC, half-open.</summary>
public static class AdminDateRange
{
    public const int MaxDays = 366;
    public const string TimeZoneId = "Asia/Ho_Chi_Minh";

    public static bool TryResolve(string? range, DateTime? from, DateTime? to, string? granularity, DateTime utcNow,
        out AdminRange resolved, out string? error)
    {
        resolved = default!;
        error = null;
        var today = VietnamTime.FromUtc(utcNow).Date;
        var key = string.IsNullOrWhiteSpace(range) ? "last30days" : range.Trim().ToLowerInvariant();
        DateTime fromDate;
        DateTime toDate;
        switch (key)
        {
            case "today":
                fromDate = today;
                toDate = today;
                break;
            case "last7days":
                fromDate = today.AddDays(-6);
                toDate = today;
                break;
            case "last30days":
                fromDate = today.AddDays(-29);
                toDate = today;
                break;
            case "thisweek":
                fromDate = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
                toDate = fromDate.AddDays(6);
                break;
            case "thismonth":
                fromDate = new DateTime(today.Year, today.Month, 1);
                toDate = fromDate.AddMonths(1).AddDays(-1);
                break;
            case "thisyear":
                fromDate = new DateTime(today.Year, 1, 1);
                toDate = new DateTime(today.Year, 12, 31);
                break;
            case "custom":
                if (from == null || to == null)
                {
                    error = "Khoảng tùy chọn cần from và to.";
                    return false;
                }
                fromDate = from.Value.Date;
                toDate = to.Value.Date;
                break;
            default:
                error = "Bộ lọc ngày không hợp lệ.";
                return false;
        }

        if (fromDate > toDate)
        {
            error = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
            return false;
        }

        var days = (toDate - fromDate).Days + 1;
        if (days > MaxDays)
        {
            error = $"Khoảng thống kê tối đa {MaxDays} ngày.";
            return false;
        }

        var grain = string.IsNullOrWhiteSpace(granularity) ? DefaultGrain(key, days) : granularity.Trim().ToLowerInvariant();
        if (grain is not ("day" or "week" or "month"))
        {
            error = "granularity phải là day, week hoặc month.";
            return false;
        }

        var startUtc = VietnamTime.ToUtc(fromDate);
        var endUtc = VietnamTime.ToUtc(toDate.AddDays(1));
        resolved = new AdminRange(key, grain, fromDate, toDate, startUtc, endUtc);
        return true;
    }

    public static decimal? ChangePercent(decimal current, decimal previous)
    {
        if (previous == 0) return null;
        return Math.Round((current - previous) / previous * 100m, 1);
    }

    public static double? ChangePercent(int current, int previous)
    {
        if (previous == 0) return null;
        return Math.Round(100.0 * (current - previous) / previous, 1);
    }

    public static IReadOnlyList<DateTime> Buckets(AdminRange range)
    {
        var list = new List<DateTime>();
        var cursor = BucketStart(range.FromDate, range.Granularity);
        var last = range.ToDate;
        while (cursor <= last && list.Count < MaxDays + 2)
        {
            list.Add(cursor);
            cursor = range.Granularity switch
            {
                "week" => cursor.AddDays(7),
                "month" => cursor.AddMonths(1),
                _ => cursor.AddDays(1)
            };
        }
        return list;
    }

    public static DateTime BucketStart(DateTime vietnamDate, string granularity)
    {
        var date = vietnamDate.Date;
        if (granularity == "month") return new DateTime(date.Year, date.Month, 1);
        if (granularity == "week") return date.AddDays(-(((int)date.DayOfWeek + 6) % 7));
        return date;
    }

    public static DateTime BucketOf(DateTime utcInstant, string granularity)
        => BucketStart(VietnamTime.FromUtc(utcInstant), granularity);

    private static string DefaultGrain(string key, int days)
    {
        if (key == "thisyear") return "month";
        if (days <= 31) return "day";
        if (days <= 120) return "week";
        return "month";
    }
}

public sealed record AdminRange(string Key, string Granularity, DateTime FromDate, DateTime ToDate, DateTime StartUtc, DateTime EndUtc);
