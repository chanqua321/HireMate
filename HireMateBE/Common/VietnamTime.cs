namespace Common;

/// <summary>Business dates in Vietnam; persisted timestamps and token expiry remain UTC.</summary>
public static class VietnamTime
{
    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Ho_Chi_Minh");

    public static DateTime Now => FromUtc(DateTime.UtcNow);

    public static DateTime FromUtc(DateTime value) => TimeZoneInfo.ConvertTimeFromUtc(
        DateTime.SpecifyKind(value, DateTimeKind.Utc), Zone);

    public static DateTime ToUtc(DateTime vietnamLocal)
    {
        var unspecified = DateTime.SpecifyKind(vietnamLocal, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(unspecified, Zone);
    }
}
