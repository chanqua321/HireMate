using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<HireMateContext>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<Role>>();
        var logger = scope.ServiceProvider.GetService<ILoggerFactory>()?.CreateLogger("DbSeeder");

        await EnsureDatabaseCreatedAndMigratedAsync(context, logger);

        await EnsureRoleAsync(roleManager, "User", "Default HireMate user");
        await EnsureRoleAsync(roleManager, "Admin", "System administrator");
        await EnsureRoleAsync(roleManager, "UniversityAdmin", "University portal admin");
        await EnsureRoleAsync(roleManager, "EnterpriseAdmin", "Enterprise portal admin");
        await SeedQuestionsAsync(context);
        await SeedCmsAndPlansAsync(context);
        await SeedBadgesAsync(context);
        await SeedAdminAndOrgsAsync(scope.ServiceProvider);
    }

    /// <summary>
    /// Tạo database nếu chưa có, rồi apply toàn bộ EF migrations. Retry khi SQL Server/LocalDB chưa sẵn sàng.
    /// </summary>
    private static async Task EnsureDatabaseCreatedAndMigratedAsync(HireMateContext context, ILogger? logger)
    {
        const int maxAttempts = 8;
        Exception? last = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                var creator = context.Database.GetService<IRelationalDatabaseCreator>();
                var existed = await creator.ExistsAsync();

                // MigrateAsync: tạo DB nếu chưa có + cập nhật schema theo migrations
                await context.Database.MigrateAsync();

                logger?.LogInformation(
                    existed
                        ? "Database ready (created if missing + migrations applied)."
                        : "Database was missing — auto-created and migrated.");

                return;
            }
            catch (Exception ex)
            {
                last = ex;
                logger?.LogWarning(ex,
                    "Ensure database attempt {Attempt}/{Max} failed. Retrying...",
                    attempt, maxAttempts);
                if (attempt < maxAttempts)
                    await Task.Delay(TimeSpan.FromSeconds(Math.Min(2 * attempt, 10)));
            }
        }

        throw new InvalidOperationException(
            "Cannot create/migrate HireMate database. Check ConnectionStrings:DefaultConnection and that SQL Server/LocalDB is running.",
            last);
    }

    private static async Task EnsureRoleAsync(RoleManager<Role> roleManager, string name, string description)
    {
        if (await roleManager.RoleExistsAsync(name))
            return;

        await roleManager.CreateAsync(new Role
        {
            Id = Guid.NewGuid(),
            Name = name,
            NormalizedName = name.ToUpperInvariant(),
            Description = description,
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    private static async Task SeedQuestionsAsync(HireMateContext context)
    {
        if (await context.Questions.AnyAsync())
            return;

        var it = "Công nghệ thông tin";
        var biz = "Kinh doanh";

        Question Q(string cat, string content, string hint, string? industry, string? role, string diff = "Medium") => new()
        {
            Id = Guid.NewGuid(),
            Category = cat,
            Content = content,
            Hint = hint,
            Industry = industry,
            RoleHint = role,
            Difficulty = diff,
            IsActive = true
        };

        var questions = new List<Question>
        {
            Q("Frontend", "Sự khác nhau giữa let, const và var trong JavaScript là gì?", "Phạm vi (scope), hoisting và khả năng gán lại giá trị.", it, "Frontend"),
            Q("Frontend", "Virtual DOM là gì và vì sao React sử dụng nó?", "So sánh cây DOM ảo, cơ chế reconciliation và hiệu năng.", it, "Frontend"),
            Q("Frontend", "Hãy giải thích cách hoạt động của CSS Flexbox và khi nào nên dùng Grid.", "Trục chính/trục phụ, bố cục 1 chiều vs 2 chiều.", it, "Frontend"),
            Q("Frontend", "Closure trong JavaScript là gì? Cho một ví dụ thực tế.", "Hàm ghi nhớ phạm vi nơi nó được tạo ra.", it, "Frontend", "Hard"),
            Q("Frontend", "Làm thế nào để tối ưu hiệu năng tải trang của một ứng dụng web?", "Lazy-load, code splitting, nén ảnh, caching, CDN.", it, "Frontend"),
            Q("Backend", "REST API là gì? Các nguyên tắc thiết kế REST tốt gồm những gì?", "Stateless, tài nguyên, HTTP verbs, mã trạng thái.", it, "Backend"),
            Q("Backend", "Sự khác nhau giữa SQL và NoSQL? Khi nào nên dùng loại nào?", "Lược đồ, khả năng mở rộng, tính nhất quán, quan hệ.", it, "Backend"),
            Q("Backend", "Bạn xử lý xác thực và phân quyền trong API như thế nào?", "JWT, session, OAuth2, vai trò và quyền hạn.", it, "Backend"),
            Q("Backend", "Index trong cơ sở dữ liệu hoạt động ra sao và đánh đổi của nó là gì?", "Tăng tốc đọc, chậm ghi, tốn bộ nhớ.", it, "Backend"),
            Q("Backend", "Làm thế nào để mở rộng (scale) một hệ thống có lượng truy cập lớn?", "Cân bằng tải, caching, hàng đợi, phân mảnh dữ liệu.", it, "Backend", "Hard"),
            Q("Fullstack", "Bạn phân chia trách nhiệm giữa frontend và backend trong một dự án fullstack như thế nào?", "Hợp đồng API, luồng dữ liệu đầu-cuối.", it, "Fullstack"),
            Q("Fullstack", "Làm thế nào để đảm bảo tính nhất quán dữ liệu giữa client và server?", "Validation hai phía, nguồn sự thật, đồng bộ trạng thái.", it, "Fullstack"),
            Q("DevOps", "CI/CD là gì và một pipeline tốt gồm những giai đoạn nào?", "Build, test, deploy tự động, khả năng rollback.", it, "DevOps"),
            Q("DevOps", "Docker và container hóa giúp giải quyết những vấn đề gì?", "Nhất quán môi trường, cô lập, khả năng mở rộng.", it, "DevOps"),
            Q("Kiểm thử (QA)", "Phân biệt giữa kiểm thử thủ công và kiểm thử tự động. Khi nào dùng loại nào?", "Chi phí, tốc độ, độ phủ, kiểm thử hồi quy.", it, "QA"),
            Q("Kiểm thử (QA)", "Một test case tốt gồm những thành phần nào?", "Điều kiện, các bước, dữ liệu, kết quả mong đợi.", it, "QA", "Easy"),
            Q("Data", "Quy trình làm sạch dữ liệu (data cleaning) gồm những bước nào?", "Xử lý thiếu, trùng lặp, ngoại lệ, chuẩn hóa.", it, "Data"),
            Q("Data", "Phân biệt giữa tương quan (correlation) và nhân quả (causation).", "Hai biến cùng biến thiên không đồng nghĩa nhân quả.", it, "Data"),
            Q("Kỹ sư Dữ liệu", "ETL và ELT khác nhau như thế nào? Khi nào chọn cái nào?", "Thứ tự xử lý, kho dữ liệu, khối lượng dữ liệu.", it, "Kỹ sư Dữ liệu"),
            Q("Thiết kế (UI/UX)", "Hãy mô tả quy trình thiết kế lấy người dùng làm trung tâm của bạn.", "Nghiên cứu, phác thảo, prototype, kiểm thử, lặp lại.", it, "UI/UX"),
            Q("Quản lý sản phẩm", "Bạn ưu tiên các tính năng trong một sản phẩm như thế nào?", "Tác động, công sức, RICE, giá trị người dùng.", it, "Quản lý sản phẩm"),
            Q("Marketing", "Bạn xây dựng một chiến dịch marketing từ con số 0 như thế nào?", "Mục tiêu, chân dung khách hàng, kênh, ngân sách, đo lường.", biz, "Marketing"),
            Q("Marketing", "Các chỉ số quan trọng nào dùng để đánh giá hiệu quả marketing?", "CAC, ROAS, tỷ lệ chuyển đổi, CTR, LTV.", biz, "Marketing"),
            Q("Kinh doanh", "Bạn tiếp cận và xây dựng quan hệ với một khách hàng tiềm năng mới như thế nào?", "Nghiên cứu, lắng nghe nhu cầu, tạo niềm tin.", biz, "Kinh doanh"),
            Q("Kinh doanh", "Hãy mô tả quy trình bán hàng của bạn từ tìm kiếm đến chốt đơn.", "Tìm kiếm, tư vấn, xử lý từ chối, chốt deal.", biz, "Kinh doanh"),
            Q("Nhân sự", "Bạn xây dựng một quy trình tuyển dụng hiệu quả như thế nào?", "Mô tả công việc, sàng lọc, phỏng vấn, trải nghiệm ứng viên.", biz, "Nhân sự"),
            Q("Kế toán", "Phân biệt giữa kế toán dồn tích và kế toán tiền mặt.", "Thời điểm ghi nhận doanh thu và chi phí.", biz, "Kế toán"),
            Q("Phân tích Kinh doanh", "Bạn thu thập và làm rõ yêu cầu từ các bên liên quan như thế nào?", "Phỏng vấn, workshop, tài liệu hóa, xác nhận lại.", biz, "Phân tích Kinh doanh"),
            Q("Chăm sóc khách hàng", "Bạn xử lý một khách hàng đang tức giận như thế nào?", "Lắng nghe, đồng cảm, giữ bình tĩnh, đưa giải pháp.", biz, "Chăm sóc khách hàng"),
            Q("Quản lý dự án", "Bạn lập kế hoạch và theo dõi tiến độ một dự án như thế nào?", "Phạm vi, mốc thời gian, nguồn lực, công cụ quản lý.", biz, "Quản lý dự án"),
            Q("Hành vi (HR)", "Hãy kể về một lần bạn vượt qua thử thách lớn trong công việc.", "Dùng cấu trúc STAR: Tình huống, Nhiệm vụ, Hành động, Kết quả.", null, null),
            Q("Hành vi (HR)", "Điểm mạnh và điểm yếu lớn nhất của bạn là gì?", "Trung thực, gắn với vị trí, nêu cách bạn cải thiện.", null, null, "Easy"),
            Q("Hành vi (HR)", "Vì sao bạn muốn ứng tuyển vào vị trí này?", "Liên hệ giá trị bản thân với mục tiêu công ty.", null, null),
            Q("Hành vi (HR)", "Kể về một lần bạn bất đồng với đồng nghiệp và cách bạn xử lý.", "Lắng nghe, dữ liệu, tìm tiếng nói chung.", null, null),
            Q("Hành vi (HR)", "Bạn hình dung mình ở đâu sau 5 năm nữa?", "Định hướng phát triển rõ ràng, thực tế.", null, null),
            Q("Hành vi (HR)", "Hãy kể về một thất bại và bài học bạn rút ra.", "Nhận trách nhiệm, tập trung vào sự trưởng thành.", null, null)
        };

        await context.Questions.AddRangeAsync(questions);
        await context.SaveChangesAsync();
    }

    private static async Task SeedCmsAndPlansAsync(HireMateContext context)
    {
        if (!await context.ContentPages.AnyAsync())
        {
            await context.ContentPages.AddRangeAsync(
                new ContentPage { Id = Guid.NewGuid(), Slug = "privacy", Title = "Chính sách bảo mật", Body = "Nội dung chính sách bảo mật HireMate." },
                new ContentPage { Id = Guid.NewGuid(), Slug = "terms", Title = "Điều khoản sử dụng", Body = "Nội dung điều khoản sử dụng HireMate." },
                new ContentPage { Id = Guid.NewGuid(), Slug = "about", Title = "Về chúng tôi", Body = "HireMate — AI Career Coach cho Gen Z Việt Nam." });
        }

        if (!await context.BlogPosts.AnyAsync())
        {
            await context.BlogPosts.AddAsync(new BlogPost
            {
                Id = Guid.NewGuid(),
                Slug = "star-method",
                Title = "Phương pháp STAR trong phỏng vấn",
                Summary = "Cách trả lời hành vi hiệu quả",
                Body = "Situation, Task, Action, Result...",
                Tag = "Interview"
            });
        }

        if (!await context.FaqItems.AnyAsync())
        {
            await context.FaqItems.AddRangeAsync(
                new FaqItem { Id = Guid.NewGuid(), Category = "Tài khoản", Question = "Làm sao đăng ký?", Answer = "Vào /register với email và mật khẩu.", SortOrder = 1 },
                new FaqItem { Id = Guid.NewGuid(), Category = "Phỏng vấn", Question = "Free có bao nhiêu phiên?", Answer = "3 phiên/tháng.", SortOrder = 2 },
                new FaqItem { Id = Guid.NewGuid(), Category = "Thanh toán", Question = "Premium giá bao nhiêu?", Answer = "79.000 VND/tháng.", SortOrder = 3 });
        }

        if (!await context.ResourceItems.AnyAsync())
        {
            await context.ResourceItems.AddRangeAsync(
                new ResourceItem { Id = Guid.NewGuid(), Category = "Interview", Title = "Checklist trước phỏng vấn", Summary = "Chuẩn bị 24h", Body = "Nghiên cứu công ty, luyện STAR..." },
                new ResourceItem { Id = Guid.NewGuid(), Category = "CV", Title = "Mẫu CV ATS", Summary = "Template chuẩn", Body = "Header, Summary, Experience, Skills..." });
        }

        if (!await context.SubscriptionPlans.AnyAsync())
        {
            await context.SubscriptionPlans.AddRangeAsync(
                new SubscriptionPlan { Id = Guid.NewGuid(), Code = "free", Name = "Free", PriceVnd = 0, DurationDays = 3650, Description = "3 phiên/tháng, chỉ văn bản" },
                new SubscriptionPlan { Id = Guid.NewGuid(), Code = "premium", Name = "Premium", PriceVnd = 79000, DurationDays = 30, Description = "Không giới hạn + Voice + phản hồi đầy đủ" },
                new SubscriptionPlan { Id = Guid.NewGuid(), Code = "combo", Name = "Combo 2 tháng", PriceVnd = 149000, DurationDays = 60, Description = "Premium 2 tháng" });
        }

        if (!await context.PromoCodes.AnyAsync())
        {
            await context.PromoCodes.AddAsync(new PromoCode
            {
                Id = Guid.NewGuid(),
                Code = "HIREMATE10",
                DiscountPercent = 10,
                IsActive = true,
                ExpiresAt = DateTime.UtcNow.AddMonths(6)
            });
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedBadgesAsync(HireMateContext context)
    {
        if (await context.Badges.AnyAsync()) return;
        await context.Badges.AddRangeAsync(
            new Badge { Id = Guid.NewGuid(), Code = "first_interview", Name = "Phỏng vấn đầu tiên", Description = "Hoàn thành phiên đầu tiên" },
            new Badge { Id = Guid.NewGuid(), Code = "ten_sessions", Name = "10 phiên luyện", Description = "Hoàn thành 10 phiên" },
            new Badge { Id = Guid.NewGuid(), Code = "top_performer", Name = "Top Performer", Description = "Đạt >= 85 điểm" },
            new Badge { Id = Guid.NewGuid(), Code = "streak_7", Name = "Chuỗi 7 ngày", Description = "Luyện 7 ngày liên tiếp" });
        await context.SaveChangesAsync();
    }

    private static async Task SeedAdminAndOrgsAsync(IServiceProvider sp)
    {
        var users = sp.GetRequiredService<UserManager<UserAccount>>();
        var context = sp.GetRequiredService<HireMateContext>();

        async Task<UserAccount> EnsureUser(string email, string name, string password, string role)
        {
            var u = await users.FindByEmailAsync(email);
            if (u != null) return u;
            u = new UserAccount
            {
                Id = Guid.NewGuid(),
                Email = email,
                UserName = email,
                FullName = name,
                EmailConfirmed = true,
                OnboardingCompleted = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await users.CreateAsync(u, password);
            await users.AddToRoleAsync(u, role);
            return u;
        }

        var admin = await EnsureUser("admin@hiremate.local", "HireMate Admin", "Admin123!", "Admin");
        var uniAdmin = await EnsureUser("uni@hiremate.local", "University Admin", "Admin123!", "UniversityAdmin");
        var entAdmin = await EnsureUser("enterprise@hiremate.local", "Enterprise Admin", "Admin123!", "EnterpriseAdmin");
        var student = await EnsureUser("student@hiremate.local", "Demo Student", "Password1", "User");

        if (!await context.Organizations.AnyAsync())
        {
            var uni = new Organization { Id = Guid.NewGuid(), Name = "FPT University Demo", Type = "University" };
            var ent = new Organization { Id = Guid.NewGuid(), Name = "TechCorp Demo", Type = "Enterprise" };
            await context.Organizations.AddRangeAsync(uni, ent);
            await context.OrganizationMembers.AddRangeAsync(
                new OrganizationMember { Id = Guid.NewGuid(), OrganizationId = uni.Id, UserId = uniAdmin.Id, Role = "UniversityAdmin" },
                new OrganizationMember { Id = Guid.NewGuid(), OrganizationId = uni.Id, UserId = student.Id, Role = "Member" },
                new OrganizationMember { Id = Guid.NewGuid(), OrganizationId = ent.Id, UserId = entAdmin.Id, Role = "EnterpriseAdmin" });
            await context.SaveChangesAsync();
        }

        _ = admin;
    }
}
