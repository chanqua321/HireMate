namespace Common;

/// <summary>Chỉ 2 role: User (mặc định) và Admin (duy nhất admin@gmail.com).</summary>
public static class AppRoles
{
    public const string User = "User";
    public const string Admin = "Admin";

    public const string AdminEmail = "admin@gmail.com";

    public static readonly string[] All = [User, Admin];

    public const string Authenticated = "User,Admin";
    public const string AdminOnly = Admin;

    public static bool IsKnown(string? role)
        => !string.IsNullOrWhiteSpace(role) && All.Contains(role.Trim(), StringComparer.Ordinal);

    public static bool IsSystemAdminEmail(string? email)
        => string.Equals(email?.Trim(), AdminEmail, StringComparison.OrdinalIgnoreCase);
}

public static class AppPolicies
{
    public const string Authenticated = "HireMate.Authenticated";
    public const string AdminOnly = "HireMate.AdminOnly";
}

