using System.Text.RegularExpressions;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
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
        await CleanupLegacyB2BDataAsync(context, roleManager, scope.ServiceProvider);
        await SeedQuestionsAsync(context);
        await SeedCmsAndPlansAsync(context);
        await SeedBadgesAsync(context);
        await SeedAdminAsync(scope.ServiceProvider);
    }

    /// <summary>
    /// Lần đầu: tạo database + apply migrations. Lần sau: nếu DB đã có và schema đúng thì bỏ qua.
    /// Chỉ chạy Migrate khi còn migration pending hoặc chưa kết nối được (DB chưa tồn tại).
    /// Retry khi SQL Server/LocalDB chưa sẵn sàng.
    /// LocalDB đôi khi giữ catalog HireMateDB trong khi file .mdf đã mất — EF coi là chưa có DB,
    /// gọi CREATE DATABASE rồi dính lỗi 1801. Trường hợp đó drop catalog mồ côi rồi tạo lại.
    /// </summary>
    private static async Task EnsureDatabaseCreatedAndMigratedAsync(HireMateContext context, ILogger? logger)
    {
        if (await TrySkipWhenDatabaseReadyAsync(context, logger))
            return;

        const int maxAttempts = 8;
        Exception? last = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await context.Database.MigrateAsync();
                logger?.LogInformation("Database ready (created if missing + migrations applied).");
                return;
            }
            catch (Exception ex) when (HasSqlNumber(ex, 1801) && attempt < maxAttempts)
            {
                last = ex;
                try
                {
                    if (await TryDropOrphanedDatabaseAsync(context, logger))
                        continue;
                }
                catch (Exception dropEx)
                {
                    logger?.LogWarning(dropEx, "Failed to drop orphaned HireMateDB catalog.");
                }

                logger?.LogWarning(ex,
                    "Ensure database attempt {Attempt}/{Max}: HireMateDB already exists but EF could not open it. Retrying...",
                    attempt, maxAttempts);
                await Task.Delay(TimeSpan.FromSeconds(Math.Min(2 * attempt, 10)));
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
            "Cannot create/migrate HireMate database. Check ConnectionStrings:DefaultConnection and that SQL Server/LocalDB is running. If error 1801: HireMateDB exists in the server catalog but cannot be opened (missing .mdf files or no permission).",
            last);
    }

    /// <returns>true nếu DB đã tồn tại và không còn migration pending.</returns>
    private static async Task<bool> TrySkipWhenDatabaseReadyAsync(HireMateContext context, ILogger? logger)
    {
        try
        {
            if (!await context.Database.CanConnectAsync())
                return false;

            var pending = (await context.Database.GetPendingMigrationsAsync()).ToList();
            if (pending.Count > 0)
            {
                logger?.LogInformation(
                    "Database exists. Applying {Count} pending migration(s): {Names}",
                    pending.Count,
                    string.Join(", ", pending));
                await context.Database.MigrateAsync();
                logger?.LogInformation("Pending migrations applied.");
                return true;
            }

            logger?.LogInformation("Database exists and schema is up to date. Skipping create/migrate.");
            return true;
        }
        catch (Exception ex)
        {
            logger?.LogDebug(ex, "Database readiness check failed; will run full create/migrate flow.");
            return false;
        }
    }

    private static bool HasSqlNumber(Exception ex, int number)
    {
        for (var e = ex; e != null; e = e.InnerException)
        {
            if (e is SqlException sql && sql.Errors.Cast<SqlError>().Any(err => err.Number == number))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Drop DB khi catalog SQL còn tên nhưng file vật lý không còn (LocalDB orphan). Không drop khi file vẫn tồn tại.
    /// </summary>
    private static async Task<bool> TryDropOrphanedDatabaseAsync(HireMateContext context, ILogger? logger)
    {
        var connectionString = context.Database.GetConnectionString();
        if (string.IsNullOrWhiteSpace(connectionString))
            return false;

        var builder = new SqlConnectionStringBuilder(connectionString);
        var dbName = builder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(dbName) || !Regex.IsMatch(dbName, @"^[\w$-]+$"))
            return false;

        builder.InitialCatalog = "master";
        await using var conn = new SqlConnection(builder.ConnectionString);
        await conn.OpenAsync();

        var files = new List<string>();
        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT physical_name FROM sys.master_files WHERE database_id = DB_ID(@name)";
            cmd.Parameters.AddWithValue("@name", dbName);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                files.Add(reader.GetString(0));
        }

        if (files.Count == 0)
            return false;

        var missing = files.Where(f => !File.Exists(f)).ToList();
        if (missing.Count == 0)
            return false;

        logger?.LogWarning(
            "Orphaned database {Database}: catalog exists but files are missing ({Files}). Dropping catalog entry.",
            dbName, string.Join(", ", missing));

        SqlConnection.ClearAllPools();
        await using (var drop = conn.CreateCommand())
        {
            drop.CommandText = $"DROP DATABASE [{dbName}]";
            try
            {
                await drop.ExecuteNonQueryAsync();
            }
            catch (SqlException ex) when (HasSqlNumber(ex, 5120))
            {
                // LocalDB still warns that .mdf is missing; catalog may already be gone.
                await using var check = conn.CreateCommand();
                check.CommandText = "SELECT DB_ID(@name)";
                check.Parameters.AddWithValue("@name", dbName);
                var id = await check.ExecuteScalarAsync();
                if (id is not null && id is not DBNull)
                    throw;
            }
        }

        SqlConnection.ClearAllPools();
        return true;
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
        await EnsurePlansAndSettingsAsync(context);
        if (!await context.ContentPages.AnyAsync())
        {
            await context.ContentPages.AddRangeAsync(
                new ContentPage { Id = Guid.NewGuid(), Slug = "privacy", Title = "Chính sách bảo mật", Body = "Nội dung chính sách bảo mật HireMate." },
                new ContentPage { Id = Guid.NewGuid(), Slug = "terms", Title = "Điều khoản sử dụng", Body = "Nội dung điều khoản sử dụng HireMate." },
                new ContentPage { Id = Guid.NewGuid(), Slug = "about", Title = "Về chúng tôi", Body = "HireMate - AI Career Coach cho Gen Z Việt Nam." });
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
                new FaqItem { Id = Guid.NewGuid(), Category = "Thanh toán", Question = "Các gói giá thế nào?", Answer = "Miễn phí 0đ/tháng, Tiêu chuẩn 79.000đ/tháng, Cao cấp 149.000đ/tháng. Admin có thể chỉnh trên hệ thống.", SortOrder = 3 });
        }

        if (!await context.ResourceItems.AnyAsync())
        {
            await context.ResourceItems.AddRangeAsync(
                new ResourceItem { Id = Guid.NewGuid(), Category = "Interview", Title = "Checklist trước phỏng vấn", Summary = "Chuẩn bị 24h", Body = "Nghiên cứu công ty, luyện STAR..." },
                new ResourceItem { Id = Guid.NewGuid(), Category = "CV", Title = "Mẫu CV ATS", Summary = "Template chuẩn", Body = "Header, Summary, Experience, Skills..." });
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

    private const string AdminEmail = "admin@gmail.com";

    private static async Task CleanupLegacyB2BDataAsync(
        HireMateContext context,
        RoleManager<Role> roleManager,
        IServiceProvider sp)
    {
        var users = sp.GetRequiredService<UserManager<UserAccount>>();

        if (await context.OrganizationMembers.AnyAsync())
        {
            context.OrganizationMembers.RemoveRange(await context.OrganizationMembers.ToListAsync());
            await context.SaveChangesAsync();
        }

        if (await context.Organizations.AnyAsync())
        {
            context.Organizations.RemoveRange(await context.Organizations.ToListAsync());
            await context.SaveChangesAsync();
        }

        foreach (var email in new[] { "uni@hiremate.local", "enterprise@hiremate.local", "student@hiremate.local" })
        {
            var u = await users.FindByEmailAsync(email);
            if (u != null)
                await users.DeleteAsync(u);
        }

        foreach (var legacyRole in new[] { "UniversityAdmin", "EnterpriseAdmin" })
        {
            if (!await roleManager.RoleExistsAsync(legacyRole))
                continue;

            var members = await users.GetUsersInRoleAsync(legacyRole);
            foreach (var member in members)
            {
                await users.RemoveFromRoleAsync(member, legacyRole);
                if (!await users.IsInRoleAsync(member, "User"))
                    await users.AddToRoleAsync(member, "User");
            }

            var roleEntity = await roleManager.FindByNameAsync(legacyRole);
            if (roleEntity != null)
                await roleManager.DeleteAsync(roleEntity);
        }

        var admins = await users.GetUsersInRoleAsync("Admin");
        foreach (var adminUser in admins)
        {
            if (!string.Equals(adminUser.Email, AdminEmail, StringComparison.OrdinalIgnoreCase))
            {
                await users.RemoveFromRoleAsync(adminUser, "Admin");
                if (!await users.IsInRoleAsync(adminUser, "User"))
                    await users.AddToRoleAsync(adminUser, "User");
            }
        }
    }

    private static async Task SeedAdminAsync(IServiceProvider sp)
    {
        var users = sp.GetRequiredService<UserManager<UserAccount>>();

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

            var create = await users.CreateAsync(u, password);
            if (!create.Succeeded)
            {
                create = await users.CreateAsync(u);
                if (!create.Succeeded)
                    throw new InvalidOperationException(
                        $"Failed to seed user {email}: {string.Join(", ", create.Errors.Select(e => e.Description))}");

                u.PasswordHash = users.PasswordHasher.HashPassword(u, password);
                await users.UpdateAsync(u);
            }

            await users.AddToRoleAsync(u, role);
            return u;
        }

        var admin = await users.FindByEmailAsync(AdminEmail);
        if (admin == null)
        {
            admin = await EnsureUser(AdminEmail, "Admin", "12345", "Admin");
        }
        else
        {
            admin.PasswordHash = users.PasswordHasher.HashPassword(admin, "12345");
            admin.EmailConfirmed = true;
            admin.UpdatedAt = DateTime.UtcNow;
            await users.UpdateAsync(admin);

            var roles = await users.GetRolesAsync(admin);
            await users.RemoveFromRolesAsync(admin, roles);
            await users.AddToRoleAsync(admin, "Admin");
        }

        await EnsureSystemAdminUnlockedAsync(users, admin);
    }

    private static async Task EnsureSystemAdminUnlockedAsync(UserManager<UserAccount> users, UserAccount admin)
    {
        admin.LockoutEnd = null;
        admin.AccessFailedCount = 0;
        await users.UpdateAsync(admin);
        await users.ResetAccessFailedCountAsync(admin);
        await users.SetLockoutEnabledAsync(admin, false);
    }

    private static async Task EnsurePlansAndSettingsAsync(HireMateContext context)
    {
        var desired = new (string Code, string Name, string Tagline, decimal Price, int Days, string Desc, int Order, bool Popular, int OutChars, int Budget)[]
        {
            ("free", "Miễn phí", "Cho người mới bắt đầu", 0, 30, "Hoàn thiện hồ sơ CV (1 lần phân tích). Không phỏng vấn AI / match JD.", 1, false, 900, 80_000),
            ("premium", "Tiêu chuẩn", "Cho người luyện tập đều đặn", 79_000, 30, "Phỏng vấn AI, Voice, match JD. Hạn mức ký tự AI theo tháng.", 2, true, 1400, 500_000),
            ("combo", "Cao cấp", "Cho ứng viên nghiêm túc", 149_000, 30, "Toàn bộ tính năng, hạn mức AI cao hơn.", 3, false, 2000, 1_200_000)
        };

        foreach (var d in desired)
        {
            var e = await context.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == d.Code);
            if (e == null)
            {
                await context.SubscriptionPlans.AddAsync(new SubscriptionPlan
                {
                    Id = Guid.NewGuid(),
                    Code = d.Code,
                    Name = d.Name,
                    Tagline = d.Tagline,
                    PriceVnd = d.Price,
                    DurationDays = d.Days,
                    Description = d.Desc,
                    SortOrder = d.Order,
                    IsPopular = d.Popular,
                    IsActive = true,
                    MaxAiOutputChars = d.OutChars,
                    MonthlyAiCharBudget = d.Budget
                });
            }
            else
            {
                if (string.IsNullOrWhiteSpace(e.Tagline))
                {
                    e.Tagline = d.Tagline;
                    e.SortOrder = d.Order;
                    e.IsPopular = d.Popular;
                    e.Description = d.Desc;
                    e.MaxAiOutputChars = d.OutChars;
                    e.MonthlyAiCharBudget = d.Budget;
                }

                // Một lần: gói cũ "Combo 2 tháng" / tên Premium → bảng giá 0 / 79k / 149k mỗi tháng
                if (d.Code == "free" && (e.Name == "Free" || e.DurationDays > 30))
                {
                    e.Name = d.Name;
                    e.PriceVnd = d.Price;
                    e.DurationDays = d.Days;
                    e.Description = d.Desc;
                }
                if (d.Code == "premium" && (e.Name == "Premium" || e.Name == "premium"))
                {
                    e.Name = d.Name;
                    e.PriceVnd = d.Price;
                    e.DurationDays = d.Days;
                    e.Description = d.Desc;
                    e.IsPopular = true;
                }
                if (d.Code == "combo" && (e.DurationDays != 30 || e.Name.Contains("Combo", StringComparison.OrdinalIgnoreCase)))
                {
                    e.Name = d.Name;
                    e.PriceVnd = d.Price;
                    e.DurationDays = d.Days;
                    e.Description = d.Desc;
                }
            }
        }

        await UpsertSettingAsync(context, "payments.allow_mock", "false", "Cho phép thanh toán Mock. Tắt = chỉ VNPay/PayOS (tiền thật).");
        await UpsertSettingAsync(context, "payments.default_provider", "VNPay", "Cổng mặc định khi user không chọn: VNPay | PayOS");
        await UpsertSettingAsync(context, "ai.max_output_chars", "1400", "Trần ký tự câu trả lời AI toàn cục (plan có thể thấp hơn).");
        await UpsertSettingAsync(context, "ai.cv_analyze_max_output_chars", "1800", "Trần JSON phân tích CV (đủ extract + điểm, không văn dài).");
        await UpsertSettingAsync(context, "ai.interview_max_output_chars", "1000", "Trần feedback một câu phỏng vấn.");

        await context.SaveChangesAsync();
    }

    private static async Task UpsertSettingAsync(HireMateContext context, string key, string value, string description)
    {
        var e = await context.SystemSettings.FindAsync(key);
        if (e == null)
        {
            await context.SystemSettings.AddAsync(new SystemSetting
            {
                Key = key,
                Value = value,
                Description = description,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else if (string.IsNullOrWhiteSpace(e.Description))
        {
            e.Description = description;
        }
    }
}

