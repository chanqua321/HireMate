using System.Text;
using System.Text.RegularExpressions;

namespace HireMate.Modules.Onboarding.Cv;

public static class CvDisplayNameHelper
{
    public const int MaxLength = 120;

    private static readonly Regex DangerousChars = new(
        @"[\u0000-\u001F\u007F<>:""/\\|?*\r\n]",
        RegexOptions.Compiled);

    /// <summary>Resolve display label: prefer DisplayName, else FileName without extension, else default.</summary>
    public static string Resolve(string? displayName, string? fileName)
    {
        if (!string.IsNullOrWhiteSpace(displayName))
            return displayName.Trim();

        if (!string.IsNullOrWhiteSpace(fileName))
        {
            var withoutExt = Path.GetFileNameWithoutExtension(fileName.Trim());
            if (!string.IsNullOrWhiteSpace(withoutExt))
                return withoutExt.Length > MaxLength ? withoutExt[..MaxLength] : withoutExt;
        }

        return "CV chưa đặt tên";
    }

    /// <summary>
    /// Validate + normalize user input. Returns null and error message on failure.
    /// Does not mutate FileName.
    /// </summary>
    public static bool TryNormalize(string? input, out string normalized, out string? error)
    {
        normalized = string.Empty;
        error = null;

        if (input is null)
        {
            error = "Tên CV không được để trống";
            return false;
        }

        var trimmed = input.Trim();
        if (trimmed.Length == 0)
        {
            error = "Tên CV không được để trống hoặc chỉ gồm khoảng trắng";
            return false;
        }

        if (trimmed.Length > MaxLength)
        {
            error = $"Tên CV tối đa {MaxLength} ký tự";
            return false;
        }

        if (DangerousChars.IsMatch(trimmed))
        {
            error = "Tên CV chứa ký tự không hợp lệ";
            return false;
        }

        normalized = trimmed;
        return true;
    }

    /// <summary>Fallback when user leaves DisplayName empty on upload/wizard.</summary>
    public static string FallbackFromFileOrRole(string? fileName, string? desiredPosition = null)
    {
        if (!string.IsNullOrWhiteSpace(desiredPosition))
        {
            var role = desiredPosition.Trim();
            var label = role.StartsWith("CV ", StringComparison.OrdinalIgnoreCase) ? role : $"CV {role}";
            return label.Length > MaxLength ? label[..MaxLength] : label;
        }

        return Resolve(null, fileName);
    }

    public static string SanitizeForStorage(string name)
    {
        var sb = new StringBuilder(name.Length);
        foreach (var c in name)
        {
            if (c is < ' ' or '\u007F') continue;
            sb.Append(c);
        }
        var s = sb.ToString().Trim();
        return s.Length == 0 ? "CV chưa đặt tên" : (s.Length > MaxLength ? s[..MaxLength] : s);
    }
}
