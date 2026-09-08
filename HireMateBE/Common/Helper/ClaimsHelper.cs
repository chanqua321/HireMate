using System.Security.Claims;

namespace Common.Helper;

public static class ClaimsHelper
{
    public static bool TryGetUserId(this ClaimsPrincipal user, out Guid userId)
    {
        userId = Guid.Empty;
        var claim = user.FindFirst("userId")?.Value
                    ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out userId);
    }

    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        if (!user.TryGetUserId(out var id))
            throw new UnauthorizedAccessException("Token không hợp lệ");
        return id;
    }

    public static string GetEmail(this ClaimsPrincipal user)
        => user.FindFirst("email")?.Value
           ?? user.FindFirst(ClaimTypes.Email)?.Value
           ?? string.Empty;

    public static IReadOnlyList<string> GetRoles(this ClaimsPrincipal user)
        => user.FindAll("role").Select(c => c.Value).ToList();
}

