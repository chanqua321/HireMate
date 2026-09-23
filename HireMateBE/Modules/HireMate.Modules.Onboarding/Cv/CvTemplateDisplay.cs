namespace HireMate.Modules.Onboarding.Cv;

public static class CvTemplateDisplay
{
    public const string StandardName = "CV Tiêu chuẩn HireMate";
    public const string StandardDescription = "Bố cục chuyên nghiệp, dễ đọc, phù hợp sinh viên và ứng viên mới tốt nghiệp.";

    public static string Name(bool isSystemTemplate, string? layoutKey, string storedName) =>
        isSystemTemplate
            ? layoutKey?.ToLowerInvariant() switch
            {
                "modern-02" => "CV Hiện đại",
                _ => StandardName
            }
            : storedName;

    public static string Description(string? layoutKey, string? storedDescription) =>
        !string.IsNullOrWhiteSpace(storedDescription)
            ? storedDescription
            : layoutKey?.Equals("modern-02", StringComparison.OrdinalIgnoreCase) == true
                ? "Bố cục hiện đại, phù hợp hồ sơ sáng tạo và đa kỹ năng."
                : StandardDescription;
}
