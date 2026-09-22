namespace HireMate.Modules.Onboarding.Cv;

/// <summary>
/// Extensible Career Field → Position catalog (mirrors FE careerFieldCatalog).
/// Used for validation/tests — does not mutate stored CV/profile data.
/// </summary>
public static class CareerFieldCatalog
{
    public const string CustomRoleOption = "Khác (tự nhập)";

    public static readonly IReadOnlyDictionary<string, string[]> IndustryRoles =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["Công nghệ thông tin"] =
            [
                "Backend Developer", "Frontend Developer", "Fullstack Developer", "Mobile Developer",
                "DevOps Engineer", "Software Engineer", "Data Analyst", "Data Engineer", "AI/ML Engineer",
                "Cybersecurity Engineer", "QA Engineer", "Business Analyst", "Database Developer/Administrator",
                "Quản lý sản phẩm (Product Manager)"
            ],
            ["Kinh doanh & Marketing"] =
            [
                "Marketing Intern", "Digital Marketing", "Content Marketing", "Performance Marketing",
                "Social Media", "Brand Marketing", "SEO", "CRM Marketing",
                "Nhân viên Kinh doanh (B2B Sales)", "Quản lý Tài khoản (Account Manager)",
                "Chuyên viên PR & Truyền thông"
            ],
            ["Tài chính - Ngân hàng (Fintech)"] =
            [
                "Financial Analyst", "Accountant", "Auditor", "Banking Officer",
                "Chuyên viên Phân tích Tài chính", "Kế toán tổng hợp", "Kiểm toán viên nội bộ",
                "Chuyên viên Đầu tư", "Quản lý sản phẩm (Product Manager)"
            ],
            ["Tài chính & Kế toán"] =
            [
                "Accountant", "Financial Analyst", "Auditor", "Chuyên viên Phân tích Tài chính",
                "Kế toán tổng hợp", "Kiểm toán viên nội bộ", "Chuyên viên Đầu tư"
            ],
            ["Thương mại điện tử (E-Commerce)"] =
            [
                "Chuyên viên Vận hành E-Commerce", "Digital Marketing", "Fullstack Developer",
                "Quản lý sản phẩm (Product Manager)"
            ],
            ["Thiết kế & Sáng tạo"] =
            [
                "Thiết kế UI/UX", "Thiết kế Đồ họa (Graphic Designer)",
                "Biên tập nội dung (Content Writer)", "Giám đốc Sáng tạo (Creative Director)"
            ],
            ["Nhân sự & Hành chính"] =
            [
                "Chuyên viên Tuyển dụng (TA)", "Chuyên viên Đào tạo (L&D)",
                "Quản lý Nhân sự (HR Manager)", "Chuyên viên Lương thưởng (C&B)"
            ],
            ["Dịch vụ Khách hàng & Khác"] =
            [
                "Chuyên viên Tư vấn Khách hàng", "Quản lý Hoạt động (Operations)",
                "Chăm sóc khách hàng", "Quản lý dự án"
            ],
        };

    public static IReadOnlyList<string> GetRoles(string? field)
    {
        if (string.IsNullOrWhiteSpace(field)) return [];
        return IndustryRoles.TryGetValue(field.Trim(), out var roles) ? roles : [];
    }

    public static bool IsSuggestedRole(string? role, string? field)
    {
        if (string.IsNullOrWhiteSpace(role)) return true;
        var roles = GetRoles(field);
        if (roles.Count == 0) return true;
        return roles.Any(r => string.Equals(r, role.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public static bool ItDefaultContainsMarketing(string? field)
    {
        var roles = GetRoles(field);
        return string.Equals(field?.Trim(), "Công nghệ thông tin", StringComparison.OrdinalIgnoreCase)
               && roles.Any(r => r.Contains("Marketing", StringComparison.OrdinalIgnoreCase));
    }
}
