namespace Common;

/// <summary>
/// Quy tắc truy cập hệ thống: tài khoản mới luôn là User;
/// chỉ duy nhất admin@gmail.com được gán Admin.
/// </summary>
public static class SystemAccess
{
    public const string UserRole = "User";
    public const string AdminRole = "Admin";
    public const string SoleAdminEmail = "admin@gmail.com";

    public static bool IsSoleAdminEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email) &&
        string.Equals(email.Trim(), SoleAdminEmail, StringComparison.OrdinalIgnoreCase);

    public static string RoleForEmail(string? email) =>
        IsSoleAdminEmail(email) ? AdminRole : UserRole;
}
