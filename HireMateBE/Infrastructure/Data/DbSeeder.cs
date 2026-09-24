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
    public static async Task SeedAsync(IServiceProvider services, bool isDevelopment)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<HireMateContext>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<Role>>();
        var logger = scope.ServiceProvider.GetService<ILoggerFactory>()?.CreateLogger("DbSeeder");

        await EnsureDatabaseCreatedAndMigratedAsync(context, logger, isDevelopment);

        await EnsureRoleAsync(roleManager, "User", "Default HireMate user");
        await EnsureRoleAsync(roleManager, "Admin", "System administrator");
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
    private static async Task EnsureDatabaseCreatedAndMigratedAsync(HireMateContext context, ILogger? logger, bool isDevelopment)
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
                    if (isDevelopment && await TryDropOrphanedDatabaseAsync(context, logger))
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
        if (!OperatingSystem.IsWindows()
            || !builder.DataSource.Contains("(localdb)", StringComparison.OrdinalIgnoreCase))
            return false;
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
        var it = "Công nghệ thông tin";
        var biz = "Kinh doanh"; // legacy seed metadata; the new bank uses the current field catalog.
        var marketing = "Kinh doanh & Marketing";

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

        // Legacy starter questions belong only to a fresh database. Existing deployments may
        // have admin edits, so never recreate an edited starter question on every startup.
        var questions = await context.Questions.AnyAsync() ? new List<Question>() : new List<Question>
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

        // Bank questions are prompts only. Answers and evidence come from the candidate's session.
        void Pair(string? industry, string? role, string category, string vi, string en, string difficulty = "Medium")
        {
            questions.Add(new Question { Id = Guid.NewGuid(), Industry = industry, RoleHint = role,
                Category = category, Content = vi, Language = "vi", Difficulty = difficulty, IsActive = true });
            questions.Add(new Question { Id = Guid.NewGuid(), Industry = industry, RoleHint = role,
                Category = category, Content = en, Language = "en", Difficulty = difficulty, IsActive = true });
        }

        // General questions never presume a project, employer, qualification or prior experience.
        Pair(null, null, "General", "Bạn hãy giới thiệu ngắn gọn về bản thân và lý do chọn vị trí này.",
            "Please introduce yourself briefly and explain why you chose this role.", "Easy");
        Pair(null, null, "General", "Bạn muốn phát triển kỹ năng nào nhất trong năm đầu làm việc?",
            "Which skill would you most like to develop in your first year at work?", "Easy");
        Pair(null, null, "Behavioral", "Hãy kể về một lần bạn nhận phản hồi và thay đổi cách làm của mình.",
            "Tell me about a time you received feedback and changed your approach.");
        Pair(null, null, "Behavioral", "Hãy kể về một lần bạn phối hợp với người khác để hoàn thành một mục tiêu.",
            "Tell me about a time you worked with others to achieve a goal.");
        Pair(null, null, "Behavioral", "Hãy kể về một lần bạn phải ưu tiên công việc khi thời gian có hạn.",
            "Tell me about a time you had to prioritize work under a tight deadline.");
        Pair(null, null, "Situational", "Nếu được giao một nhiệm vụ chưa quen, bạn sẽ làm rõ yêu cầu và bắt đầu như thế nào?",
            "If you were given an unfamiliar task, how would you clarify the requirements and get started?", "Easy");

        Pair(it, null, "Situational", "Khi một yêu cầu kỹ thuật chưa rõ, bạn sẽ làm việc với người liên quan để xác nhận tiêu chí hoàn thành như thế nào?",
            "When a technical requirement is unclear, how would you confirm the acceptance criteria with stakeholders?");
        Pair(it, null, "RoleSpecific", "Bạn sẽ kiểm tra chất lượng và rủi ro của phần việc trước khi bàn giao cho nhóm như thế nào?",
            "How would you assess the quality and risks of your work before handing it over to the team?");
        Pair(marketing, null, "Technical", "Bạn xác định chân dung khách hàng mục tiêu bằng những nguồn dữ liệu nào?",
            "Which data sources would you use to define a target audience?");
        Pair(marketing, null, "Situational", "Một chiến dịch đạt lượng tiếp cận nhưng không đạt mục tiêu kinh doanh; bạn sẽ phân tích và đề xuất gì?",
            "A campaign reaches its audience but misses the business goal. How would you analyze it and respond?");

        Pair(it, "Backend Developer", "Technical", "HTTP GET, POST, PUT và DELETE khác nhau về mục đích và tính idempotent như thế nào?",
            "How do HTTP GET, POST, PUT and DELETE differ in purpose and idempotency?", "Easy");
        Pair(it, "Backend Developer", "Technical", "Khi nào bạn cần transaction trong cơ sở dữ liệu, và sẽ xử lý lỗi giữa chừng ra sao?",
            "When is a database transaction needed, and how would you handle a failure partway through?");
        Pair(it, "Backend Developer", "RoleSpecific", "Bạn sẽ kiểm tra và giảm độ trễ của một API đang phản hồi chậm theo những bước nào?",
            "How would you investigate and reduce latency in a slow API?");
        Pair(it, "Backend Developer", "Technical", "Dependency Injection giúp gì cho việc thiết kế và kiểm thử backend?",
            "How does dependency injection help with backend design and testing?");
        Pair(it, "Backend Developer", "Situational", "Nếu nhiều request cùng cập nhật một bản ghi, bạn sẽ ngăn mất dữ liệu như thế nào?",
            "How would you prevent lost updates when several requests modify the same record?", "Hard");
        Pair(it, "Frontend Developer", "Technical", "React state và props khác nhau thế nào, và khi nào bạn nâng state lên component cha?",
            "How do React state and props differ, and when would you lift state up?");
        Pair(it, "Frontend Developer", "RoleSpecific", "Bạn sẽ tìm nguyên nhân và cải thiện chỉ số tải trang chậm như thế nào?",
            "How would you diagnose and improve a slow page-load metric?");
        Pair(it, "Frontend Developer", "Situational", "Nếu một form hoạt động bằng chuột nhưng khó dùng với bàn phím, bạn sẽ sửa gì trước?",
            "If a form works with a mouse but is hard to use with a keyboard, what would you fix first?");
        Pair(it, "Frontend Developer", "Technical", "Bạn quản lý trạng thái tải, lỗi và dữ liệu rỗng khi gọi API ở frontend như thế nào?",
            "How do you handle loading, error and empty states for a frontend API call?");
        Pair(it, "Fullstack Developer", "RoleSpecific", "Bạn sẽ thiết kế hợp đồng API giữa giao diện và backend để tránh hai bên hiểu khác nhau như thế nào?",
            "How would you define an API contract so the frontend and backend stay aligned?");
        Pair(it, "Fullstack Developer", "Situational", "Một tính năng chạy đúng cục bộ nhưng lỗi sau triển khai; bạn sẽ khoanh vùng vấn đề ra sao?",
            "A feature works locally but fails after deployment. How would you narrow down the cause?");
        Pair(it, "Fullstack Developer", "Technical", "Bạn sẽ kiểm tra validation ở client và server khác nhau như thế nào?",
            "How would you divide validation between the client and server?");
        Pair(it, "Mobile Developer", "Technical", "Bạn quản lý vòng đời màn hình và trạng thái khi ứng dụng mobile chuyển nền như thế nào?",
            "How would you handle screen lifecycle and state when a mobile app goes into the background?");
        Pair(it, "Mobile Developer", "Situational", "Ứng dụng phải hoạt động khi mạng chập chờn; bạn sẽ thiết kế lưu tạm và đồng bộ dữ liệu ra sao?",
            "How would you design offline storage and synchronization for an app with unreliable connectivity?");
        Pair(it, "Mobile Developer", "RoleSpecific", "Bạn sẽ đo và giảm thời gian mở ứng dụng trên thiết bị cấu hình thấp như thế nào?",
            "How would you measure and reduce app startup time on a low-end device?");
        Pair(it, "DevOps Engineer", "Technical", "Bạn sẽ thiết kế các bước build, test và triển khai trong một pipeline CI/CD như thế nào?",
            "How would you structure build, test and deployment stages in a CI/CD pipeline?");
        Pair(it, "DevOps Engineer", "Situational", "Một bản triển khai làm tỷ lệ lỗi tăng; bạn sẽ phát hiện và rollback an toàn ra sao?",
            "A deployment increases the error rate. How would you detect it and roll back safely?");
        Pair(it, "DevOps Engineer", "Technical", "Bạn quản lý secrets giữa môi trường phát triển và production như thế nào?",
            "How would you manage secrets across development and production environments?");
        Pair(it, "Software Engineer", "Technical", "Bạn sẽ tách một yêu cầu lớn thành các phần có thể kiểm thử và bàn giao như thế nào?",
            "How would you split a large requirement into testable, deliverable parts?");
        Pair(it, "Software Engineer", "Situational", "Nếu một lỗi chỉ xảy ra thỉnh thoảng trên production, bạn sẽ thu thập dữ liệu và tái hiện ra sao?",
            "If a bug occurs intermittently in production, how would you gather evidence and reproduce it?", "Hard");
        Pair(it, "Software Engineer", "RoleSpecific", "Bạn cân nhắc điều gì trước khi thêm dependency mới vào một sản phẩm?",
            "What would you consider before adding a new dependency to a product?");
        Pair(it, "QA Engineer", "Technical", "Bạn phân biệt test case chức năng, kiểm thử hồi quy và kiểm thử thăm dò như thế nào?",
            "How do functional, regression and exploratory testing differ?");
        Pair(it, "QA Engineer", "Situational", "Nếu yêu cầu sản phẩm chưa rõ, bạn sẽ làm gì trước khi viết test case?",
            "What would you do before writing test cases when a product requirement is unclear?");
        Pair(it, "QA Engineer", "RoleSpecific", "Bạn sẽ ưu tiên kiểm thử những luồng nào khi thời gian trước release rất ngắn?",
            "Which flows would you prioritize testing when there is little time before release?");
        Pair(it, "Cybersecurity Engineer", "Technical", "Bạn phân biệt authentication và authorization như thế nào trong một ứng dụng web?",
            "How do authentication and authorization differ in a web application?", "Easy");
        Pair(it, "Cybersecurity Engineer", "Situational", "Nếu phát hiện token bị lộ trong log, bạn sẽ xử lý sự cố theo những bước nào?",
            "If a token leaked into logs, how would you respond to the incident?", "Hard");
        Pair(it, "Cybersecurity Engineer", "RoleSpecific", "Bạn sẽ đánh giá và ưu tiên khắc phục các lỗ hổng tìm được từ một lần quét như thế nào?",
            "How would you assess and prioritize vulnerabilities found in a scan?");
        Pair(it, "Data Analyst", "Technical", "Bạn sẽ kiểm tra chất lượng dữ liệu trước khi lập dashboard như thế nào?",
            "How would you check data quality before building a dashboard?");
        Pair(it, "Data Analyst", "RoleSpecific", "Khi một chỉ số tăng bất thường, bạn sẽ phân biệt thay đổi thật với lỗi tracking ra sao?",
            "When a metric rises unexpectedly, how would you distinguish a real change from a tracking error?");
        Pair(it, "Data Analyst", "Situational", "Hai phòng ban định nghĩa cùng một KPI khác nhau; bạn sẽ thống nhất cách đo như thế nào?",
            "Two teams define the same KPI differently. How would you agree on one measurement?");
        Pair(it, "Data Engineer", "Technical", "ETL và ELT khác nhau như thế nào, và yếu tố nào quyết định lựa chọn của bạn?",
            "How do ETL and ELT differ, and what would drive your choice?");
        Pair(it, "Data Engineer", "Situational", "Một pipeline dữ liệu chạy lại tạo bản ghi trùng; bạn sẽ thiết kế tính idempotent như thế nào?",
            "A data pipeline creates duplicates when rerun. How would you make it idempotent?", "Hard");
        Pair(it, "Data Engineer", "RoleSpecific", "Bạn sẽ theo dõi độ trễ và chất lượng của dữ liệu đi qua pipeline ra sao?",
            "How would you monitor data freshness and quality through a pipeline?");
        Pair(it, "AI/ML Engineer", "Technical", "Bạn tách tập train, validation và test như thế nào để tránh rò rỉ dữ liệu?",
            "How would you split train, validation and test data to avoid leakage?");
        Pair(it, "AI/ML Engineer", "RoleSpecific", "Nếu accuracy cao nhưng mô hình kém hiệu quả trên dữ liệu mới, bạn sẽ điều tra gì?",
            "If accuracy is high but the model performs poorly on new data, what would you investigate?");
        Pair(it, "AI/ML Engineer", "Situational", "Bạn sẽ chọn baseline và metric nào trước khi thử mô hình phức tạp hơn?",
            "How would you choose a baseline and metrics before trying a more complex model?");
        Pair(it, "Business Analyst", "RoleSpecific", "Bạn sẽ phát hiện và xử lý các yêu cầu mâu thuẫn giữa hai stakeholder như thế nào?",
            "How would you identify and resolve conflicting requirements from two stakeholders?");
        Pair(it, "Business Analyst", "Technical", "Một user story có acceptance criteria tốt cần làm rõ những gì?",
            "What should good acceptance criteria make clear in a user story?");
        Pair(it, "Business Analyst", "Situational", "Nếu người dùng mô tả giải pháp thay vì vấn đề, bạn sẽ khai thác nhu cầu thật ra sao?",
            "If a user describes a solution rather than a problem, how would you uncover the underlying need?");
        Pair(it, "Database Developer/Administrator", "Technical", "Bạn sẽ đọc execution plan để tìm nguyên nhân một truy vấn SQL chậm như thế nào?",
            "How would you read an execution plan to diagnose a slow SQL query?");
        Pair(it, "Database Developer/Administrator", "Situational", "Một migration dữ liệu lớn có nguy cơ khóa bảng; bạn sẽ lên kế hoạch triển khai an toàn ra sao?",
            "A large data migration may lock tables. How would you plan a safe rollout?", "Hard");
        Pair(it, "Database Developer/Administrator", "RoleSpecific", "Bạn sẽ thiết kế backup và diễn tập khôi phục để kiểm tra RPO/RTO như thế nào?",
            "How would you design backups and recovery drills to validate RPO and RTO?", "Hard");
        Pair(it, "Quản lý sản phẩm (Product Manager)", "RoleSpecific", "Bạn ưu tiên tính năng khi dữ liệu người dùng và yêu cầu kinh doanh mâu thuẫn như thế nào?",
            "How would you prioritize features when user evidence and business requests conflict?");
        Pair(it, "Quản lý sản phẩm (Product Manager)", "Situational", "Sau khi phát hành, chỉ số sử dụng thấp hơn kỳ vọng; bạn sẽ tìm nguyên nhân gì trước?",
            "After launch, adoption is below expectations. What would you investigate first?");
        Pair(it, "Quản lý sản phẩm (Product Manager)", "Technical", "Bạn xác định một metric thành công cho tính năng mới như thế nào?",
            "How would you define a success metric for a new feature?");

        Pair(marketing, "Marketing Intern", "RoleSpecific", "Nếu được giao hỗ trợ một chiến dịch mới, bạn sẽ hỏi những thông tin nào trước khi bắt đầu?",
            "If asked to support a new campaign, what would you clarify before starting?", "Easy");
        Pair(marketing, "Marketing Intern", "Technical", "CTR và conversion rate đo hai điều gì khác nhau?",
            "What different things do CTR and conversion rate measure?", "Easy");
        Pair(marketing, "Marketing Intern", "Situational", "Một bài đăng có nhiều lượt xem nhưng ít tương tác; bạn sẽ kiểm tra gì trước?",
            "A post has many views but little engagement. What would you check first?");
        Pair(marketing, "Digital Marketing", "Technical", "Bạn chọn KPI cho từng giai đoạn của marketing funnel như thế nào?",
            "How would you choose KPIs for each stage of a marketing funnel?");
        Pair(marketing, "Digital Marketing", "RoleSpecific", "Bạn sẽ phân bổ ngân sách giữa kênh tìm kiếm và mạng xã hội dựa trên dữ liệu nào?",
            "What data would you use to split budget between search and social channels?");
        Pair(marketing, "Digital Marketing", "Situational", "Lượng truy cập tăng nhưng đơn hàng không tăng; bạn sẽ kiểm tra funnel theo thứ tự nào?",
            "Traffic rises but orders do not. In what order would you inspect the funnel?");
        Pair(marketing, "Content Marketing", "Technical", "Bạn xây dựng content pillar và lịch nội dung từ chân dung khách hàng như thế nào?",
            "How would you build content pillars and a calendar from audience research?");
        Pair(marketing, "Content Marketing", "RoleSpecific", "Bạn đo hiệu quả một bài viết khi mục tiêu là nhận biết thương hiệu thay vì bán hàng ra sao?",
            "How would you assess an article intended for brand awareness rather than direct sales?");
        Pair(marketing, "Content Marketing", "Situational", "Nội dung đúng brief nhưng người đọc rời trang sớm; bạn sẽ thử cải thiện điều gì?",
            "The content meets the brief but readers leave early. What would you try to improve?");
        Pair(marketing, "Performance Marketing", "Technical", "ROAS và CAC khác nhau thế nào, và khi nào một chỉ số có thể gây hiểu nhầm?",
            "How do ROAS and CAC differ, and when can either metric be misleading?");
        Pair(marketing, "Performance Marketing", "RoleSpecific", "Bạn sẽ thiết kế A/B test quảng cáo để tránh kết luận quá sớm như thế nào?",
            "How would you design an ad A/B test without drawing conclusions too early?");
        Pair(marketing, "Performance Marketing", "Situational", "CPC tăng còn conversion rate giảm; bạn sẽ kiểm tra nguyên nhân nào trước?",
            "CPC rises while conversion rate falls. What would you investigate first?");
        Pair(marketing, "Social Media", "Technical", "Bạn chọn nội dung và khung giờ đăng cho từng nền tảng mạng xã hội dựa trên dữ liệu nào?",
            "What data would guide content and posting times across social platforms?");
        Pair(marketing, "Social Media", "Situational", "Một bài đăng nhận nhiều phản hồi tiêu cực; bạn sẽ phối hợp phản hồi và theo dõi ra sao?",
            "A post receives negative comments. How would you coordinate a response and monitor it?");
        Pair(marketing, "Social Media", "RoleSpecific", "Bạn phân biệt reach, engagement và kết quả kinh doanh khi báo cáo chiến dịch như thế nào?",
            "How would you distinguish reach, engagement and business outcomes in a campaign report?");
        Pair(marketing, "Brand Marketing", "Technical", "Bạn xác định định vị thương hiệu khác biệt từ nghiên cứu khách hàng và đối thủ như thế nào?",
            "How would you derive a differentiated brand position from customer and competitor research?");
        Pair(marketing, "Brand Marketing", "Situational", "Hai kênh truyền thông dùng thông điệp thương hiệu không nhất quán; bạn sẽ xử lý ra sao?",
            "Two channels use inconsistent brand messages. How would you address it?");
        Pair(marketing, "Brand Marketing", "RoleSpecific", "Bạn đo sự thay đổi nhận biết thương hiệu sau một chiến dịch như thế nào?",
            "How would you measure a change in brand awareness after a campaign?");
        Pair(marketing, "SEO", "Technical", "Bạn phân biệt search intent của hai từ khóa có lượng tìm kiếm tương tự như thế nào?",
            "How would you distinguish search intent for two keywords with similar search volume?");
        Pair(marketing, "SEO", "RoleSpecific", "Khi organic traffic giảm, bạn sẽ kiểm tra tracking, thứ hạng và trang đích theo thứ tự nào?",
            "When organic traffic drops, how would you check tracking, rankings and landing pages?");
        Pair(marketing, "SEO", "Situational", "Một trang xếp hạng tốt nhưng ít chuyển đổi; bạn sẽ đề xuất thử nghiệm gì?",
            "A page ranks well but converts poorly. What experiment would you propose?");
        Pair(marketing, "CRM Marketing", "Technical", "Bạn phân khúc khách hàng cho chiến dịch email mà không gửi quá nhiều thông điệp như thế nào?",
            "How would you segment customers for email campaigns without over-messaging them?");
        Pair(marketing, "CRM Marketing", "RoleSpecific", "Bạn đánh giá hiệu quả luồng email chăm sóc khách hàng bằng các chỉ số nào?",
            "Which metrics would you use to evaluate a customer nurture email sequence?");
        Pair(marketing, "CRM Marketing", "Situational", "Tỷ lệ mở email cao nhưng click thấp; bạn sẽ kiểm tra những phần nào?",
            "Open rate is high but clicks are low. What would you inspect?");
        Pair(marketing, "Nhân viên Kinh doanh (B2B Sales)", "RoleSpecific", "Bạn xác định một khách hàng B2B tiềm năng có phù hợp sản phẩm hay không như thế nào?",
            "How would you qualify whether a B2B prospect fits the product?");
        Pair(marketing, "Nhân viên Kinh doanh (B2B Sales)", "Situational", "Khách hàng nói giá quá cao; bạn sẽ tìm hiểu và phản hồi thế nào?",
            "A prospect says the price is too high. How would you explore and respond to the objection?");
        Pair(marketing, "Nhân viên Kinh doanh (B2B Sales)", "Technical", "Bạn theo dõi các giai đoạn pipeline bán hàng bằng chỉ số nào?",
            "Which metrics would you use to monitor the stages of a sales pipeline?");
        Pair(marketing, "Quản lý Tài khoản (Account Manager)", "RoleSpecific", "Bạn xây dựng kế hoạch giữ chân và mở rộng một tài khoản khách hàng như thế nào?",
            "How would you plan to retain and grow a customer account?");
        Pair(marketing, "Quản lý Tài khoản (Account Manager)", "Situational", "Một khách hàng quan trọng giảm mức sử dụng; bạn sẽ tìm nguyên nhân và hành động ra sao?",
            "A key account reduces usage. How would you identify the cause and respond?");
        Pair(marketing, "Quản lý Tài khoản (Account Manager)", "Technical", "Bạn phân biệt churn risk và cơ hội upsell qua những tín hiệu nào?",
            "What signals distinguish churn risk from an upsell opportunity?");
        Pair(marketing, "Chuyên viên PR & Truyền thông", "RoleSpecific", "Bạn xác định thông điệp và người phát ngôn cho một thông cáo báo chí như thế nào?",
            "How would you define the message and spokesperson for a press release?");
        Pair(marketing, "Chuyên viên PR & Truyền thông", "Situational", "Thông tin sai lệch về thương hiệu lan nhanh; bạn sẽ xác minh và phản hồi theo bước nào?",
            "False information about the brand spreads quickly. How would you verify and respond?");
        Pair(marketing, "Chuyên viên PR & Truyền thông", "Technical", "Bạn đánh giá chất lượng earned media khác gì với việc chỉ đếm số bài đăng?",
            "How would you assess earned media quality beyond counting mentions?");

        var fintech = "Tài chính - Ngân hàng (Fintech)";
        var finance = "Tài chính & Kế toán";
        var ecommerce = "Thương mại điện tử (E-Commerce)";
        Pair(fintech, null, "Situational", "Nếu phát hiện giao dịch có dấu hiệu bất thường, bạn sẽ xác minh và báo cáo như thế nào?",
            "If a transaction looks unusual, how would you verify and escalate it?");
        Pair(fintech, "Financial Analyst", "Technical", "Bạn sẽ kiểm tra các giả định chính trong một mô hình dự báo tài chính như thế nào?",
            "How would you validate the key assumptions in a financial forecast?");
        Pair(fintech, "Accountant", "Technical", "Bạn đối chiếu số liệu giữa sổ cái và báo cáo giao dịch như thế nào?",
            "How would you reconcile figures between the ledger and transaction reports?");
        Pair(fintech, "Auditor", "RoleSpecific", "Bạn chọn mẫu giao dịch để kiểm tra rủi ro sai sót trọng yếu ra sao?",
            "How would you sample transactions to test for material misstatement risk?");
        Pair(fintech, "Banking Officer", "Situational", "Khách hàng yêu cầu một nghiệp vụ vượt quyền phê duyệt của bạn; bạn xử lý ra sao?",
            "A customer requests an action beyond your approval authority. How would you respond?");
        Pair(fintech, "Chuyên viên Phân tích Tài chính", "RoleSpecific", "Bạn sẽ giải thích chênh lệch giữa dự báo và thực tế cho người không chuyên tài chính như thế nào?",
            "How would you explain a forecast-to-actual variance to a non-finance stakeholder?");
        Pair(fintech, "Kế toán tổng hợp", "Technical", "Bạn kiểm tra các bút toán điều chỉnh cuối kỳ theo thứ tự nào?",
            "In what order would you review period-end adjustment entries?");
        Pair(fintech, "Kiểm toán viên nội bộ", "RoleSpecific", "Bạn đánh giá hiệu quả của một kiểm soát nội bộ như thế nào?",
            "How would you evaluate whether an internal control is effective?");
        Pair(fintech, "Chuyên viên Đầu tư", "Situational", "Một cơ hội đầu tư có lợi nhuận kỳ vọng cao nhưng dữ liệu còn thiếu; bạn sẽ quyết định bước tiếp theo ra sao?",
            "An investment has attractive expected returns but incomplete data. What would you do next?");
        Pair(fintech, "Quản lý sản phẩm (Product Manager)", "RoleSpecific", "Bạn cân bằng trải nghiệm người dùng với yêu cầu tuân thủ trong một sản phẩm tài chính như thế nào?",
            "How would you balance user experience with compliance requirements in a financial product?");
        Pair(finance, null, "Technical", "Bạn phân biệt doanh thu được ghi nhận với dòng tiền nhận được như thế nào?",
            "How do recognized revenue and cash received differ?");
        Pair(finance, "Accountant", "RoleSpecific", "Bạn sẽ phát hiện và sửa một khoản chi phí hạch toán sai kỳ như thế nào?",
            "How would you detect and correct an expense recorded in the wrong period?");
        Pair(finance, "Financial Analyst", "Technical", "Bạn so sánh lợi nhuận, dòng tiền và biên lợi nhuận khi đánh giá doanh nghiệp như thế nào?",
            "How would you compare profit, cash flow and margins when assessing a business?");
        Pair(finance, "Auditor", "Situational", "Nếu tài liệu kiểm toán được cung cấp muộn và chưa đầy đủ, bạn sẽ xử lý rủi ro ra sao?",
            "If audit evidence arrives late and incomplete, how would you handle the risk?");
        Pair(finance, "Chuyên viên Phân tích Tài chính", "RoleSpecific", "Bạn sẽ trình bày kịch bản cơ sở, tốt và xấu trong một dự báo như thế nào?",
            "How would you present base, upside and downside scenarios in a forecast?");
        Pair(finance, "Kế toán tổng hợp", "RoleSpecific", "Bạn tổ chức checklist khóa sổ cuối tháng để giảm sai sót như thế nào?",
            "How would you organize a month-end close checklist to reduce errors?");
        Pair(finance, "Kiểm toán viên nội bộ", "Situational", "Bạn phát hiện điểm yếu kiểm soát nhưng bộ phận liên quan không đồng ý; bạn sẽ làm gì?",
            "You find a control weakness but the team disagrees. What would you do?");
        Pair(finance, "Chuyên viên Đầu tư", "Technical", "Bạn sẽ đánh giá rủi ro thanh khoản của một khoản đầu tư như thế nào?",
            "How would you assess the liquidity risk of an investment?");
        Pair(ecommerce, null, "Technical", "Bạn chọn chỉ số nào để theo dõi từ lượt xem sản phẩm đến đơn hàng thành công?",
            "Which metrics would you track from product view to completed order?");
        Pair(ecommerce, "Chuyên viên Vận hành E-Commerce", "Situational", "Một sản phẩm bán chạy bất ngờ sắp hết tồn kho; bạn sẽ phối hợp xử lý ra sao?",
            "A popular product is close to stockout. How would you coordinate a response?");
        Pair(ecommerce, "Digital Marketing", "RoleSpecific", "Bạn tối ưu trang sản phẩm và quảng cáo cùng lúc để cải thiện conversion rate như thế nào?",
            "How would you improve product pages and ads together to raise conversion rate?");
        Pair(ecommerce, "Fullstack Developer", "Technical", "Bạn sẽ ngăn đặt hàng trùng khi người dùng bấm thanh toán nhiều lần như thế nào?",
            "How would you prevent duplicate orders when a customer submits payment more than once?");
        Pair(ecommerce, "Quản lý sản phẩm (Product Manager)", "Situational", "Tỷ lệ bỏ giỏ hàng tăng; bạn sẽ xác định nguyên nhân và ưu tiên thử nghiệm nào?",
            "Cart abandonment rises. How would you diagnose it and prioritize experiments?");

        var design = "Thiết kế & Sáng tạo";
        var hr = "Nhân sự & Hành chính";
        var service = "Dịch vụ Khách hàng & Khác";
        Pair(design, null, "Situational", "Nếu brief thiết kế thiếu thông tin người dùng mục tiêu, bạn sẽ làm rõ với các bên ra sao?",
            "If a design brief lacks target-user detail, how would you clarify it with stakeholders?");
        Pair(design, "Thiết kế UI/UX", "RoleSpecific", "Bạn sẽ kiểm tra một prototype với người dùng và chuyển kết quả thành thay đổi thiết kế như thế nào?",
            "How would you test a prototype with users and turn the findings into design changes?");
        Pair(design, "Thiết kế UI/UX", "Technical", "Bạn kiểm tra accessibility của một form trước khi bàn giao cho developer như thế nào?",
            "How would you check a form's accessibility before handing it to developers?");
        Pair(design, "Thiết kế Đồ họa (Graphic Designer)", "Technical", "Bạn chọn định dạng và kích thước tài sản thiết kế cho web, in ấn và mạng xã hội ra sao?",
            "How would you choose asset formats and sizes for web, print and social media?");
        Pair(design, "Biên tập nội dung (Content Writer)", "RoleSpecific", "Bạn điều chỉnh giọng văn theo đối tượng đọc mà vẫn giữ đúng thông điệp thương hiệu như thế nào?",
            "How would you adapt tone for the audience while keeping the brand message consistent?");
        Pair(design, "Giám đốc Sáng tạo (Creative Director)", "Situational", "Hai phương án sáng tạo đều được ưa thích nhưng ngân sách chỉ đủ một; bạn sẽ chọn thế nào?",
            "Two creative directions are popular but budget allows only one. How would you choose?");
        Pair(hr, null, "Situational", "Khi nhận thông tin nhân sự nhạy cảm, bạn bảo vệ quyền riêng tư và xác định người cần biết ra sao?",
            "When handling sensitive employee information, how would you protect privacy and decide who needs access?");
        Pair(hr, "Chuyên viên Tuyển dụng (TA)", "RoleSpecific", "Bạn xây dựng tiêu chí sàng lọc công bằng từ một JD chưa rõ ràng như thế nào?",
            "How would you create fair screening criteria from an unclear job description?");
        Pair(hr, "Chuyên viên Tuyển dụng (TA)", "Situational", "Ứng viên phản hồi trải nghiệm phỏng vấn không tốt; bạn sẽ tìm hiểu và cải thiện quy trình ra sao?",
            "A candidate reports a poor interview experience. How would you investigate and improve the process?");
        Pair(hr, "Chuyên viên Đào tạo (L&D)", "Technical", "Bạn xác định nhu cầu đào tạo và đo hiệu quả sau khóa học như thế nào?",
            "How would you identify training needs and measure outcomes afterward?");
        Pair(hr, "Quản lý Nhân sự (HR Manager)", "Situational", "Một nhóm có tỷ lệ nghỉ việc tăng; bạn sẽ kiểm tra dữ liệu và trao đổi với quản lý ra sao?",
            "A team has rising attrition. How would you review data and discuss it with managers?");
        Pair(hr, "Chuyên viên Lương thưởng (C&B)", "Technical", "Bạn kiểm tra tính chính xác của dữ liệu đầu vào trước kỳ tính lương như thế nào?",
            "How would you validate input data before a payroll run?");
        Pair(service, null, "Situational", "Khách hàng phản ánh một vấn đề bạn chưa thể giải quyết ngay; bạn sẽ cập nhật và chuyển tiếp ra sao?",
            "A customer reports an issue you cannot solve immediately. How would you update and escalate it?");
        Pair(service, "Chuyên viên Tư vấn Khách hàng", "RoleSpecific", "Bạn xác định nhu cầu thực của khách hàng trước khi đề xuất giải pháp như thế nào?",
            "How would you uncover a customer's actual needs before proposing a solution?");
        Pair(service, "Quản lý Hoạt động (Operations)", "Technical", "Bạn xác định điểm nghẽn trong một quy trình vận hành bằng dữ liệu nào?",
            "What data would you use to find a bottleneck in an operational process?");
        Pair(service, "Chăm sóc khách hàng", "Situational", "Một khách hàng phàn nàn nhiều lần về cùng vấn đề; bạn sẽ xử lý và ngăn tái diễn ra sao?",
            "A customer repeatedly reports the same issue. How would you resolve it and prevent recurrence?");
        Pair(service, "Quản lý dự án", "RoleSpecific", "Khi tiến độ có nguy cơ trễ, bạn sẽ cập nhật kế hoạch và thông báo stakeholder như thế nào?",
            "When delivery is at risk, how would you revise the plan and inform stakeholders?");

        static string Key(string? language, string? industry, string? role, string? category, string? content) =>
            string.Join('\u001f', (language ?? "vi").Trim(), (industry ?? "").Trim(),
                (role ?? "").Trim(), (category ?? "").Trim(), (content ?? "").Trim());

        // Add new built-in questions to existing deployments without touching admin-managed rows.
        var existing = await context.Questions.AsNoTracking()
            .Select(q => new { q.Language, q.Industry, q.RoleHint, q.Category, q.Content })
            .ToListAsync();
        var keys = existing.Select(q => Key(q.Language, q.Industry, q.RoleHint, q.Category, q.Content))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missing = questions.Where(q => keys.Add(Key(q.Language, q.Industry, q.RoleHint, q.Category, q.Content)))
            .ToList();
        if (missing.Count == 0) return;
        await context.Questions.AddRangeAsync(missing);
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

    private static async Task SeedAdminAsync(IServiceProvider sp)
    {
        var users = sp.GetRequiredService<UserManager<UserAccount>>();
        var admin = await users.FindByEmailAsync(AdminEmail);
        if (admin == null)
        {
            var candidate = new UserAccount
            {
                Id = Guid.NewGuid(),
                Email = AdminEmail,
                UserName = AdminEmail,
                FullName = "Admin",
                EmailConfirmed = true,
                OnboardingCompleted = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            // The deployment/demo password intentionally differs from the normal registration policy.
            // Hash it only for a new account; never replace an existing Admin password.
            var seedPassword = Environment.GetEnvironmentVariable("SeedAdmin__Password");
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production"
                && (string.IsNullOrWhiteSpace(seedPassword) || seedPassword.Length < 16))
                throw new InvalidOperationException("Production requires a unique SeedAdmin__Password of at least 16 characters.");
            candidate.PasswordHash = users.PasswordHasher.HashPassword(candidate, seedPassword ?? "12345");
            try
            {
                var created = await users.CreateAsync(candidate);
                if (!created.Succeeded)
                    admin = await users.FindByEmailAsync(AdminEmail)
                        ?? throw new InvalidOperationException("Failed to seed the default Admin account.");
                else
                    admin = candidate;
            }
            catch (DbUpdateException)
            {
                // Another startup may have created the same normalized email concurrently.
                admin = await users.FindByEmailAsync(AdminEmail);
                if (admin == null) throw;
            }
        }

        if (!await users.IsInRoleAsync(admin, "Admin"))
        {
            var added = await users.AddToRoleAsync(admin, "Admin");
            if (!added.Succeeded)
                throw new InvalidOperationException("Failed to assign the Admin role to the default account.");
        }
    }

    private static async Task EnsurePlansAndSettingsAsync(HireMateContext context)
    {
        var desired = new (string Code, string Name, string Tagline, decimal Price, int Days, string Desc, int Order, bool Popular, int OutChars, int Budget)[]
        {
            ("free", "Miễn phí", "Cho người mới bắt đầu", 0, 30, "3 lượt phỏng vấn/tháng · Phân tích CV ATS 1 lần/tháng · Feedback STAR tóm tắt. Voice chỉ dành cho gói trả phí.", 1, false, 900, 80_000),
            ("premium", "Tiêu chuẩn", "Cho người luyện tập đều đặn", 79_000, 30, "15 lượt phỏng vấn/tháng · Voice Interview (15 phút/phiên) · Phân tích CV ATS 20 lần/tháng · Feedback STAR chi tiết.", 2, true, 1400, 500_000),
            ("combo", "Cao cấp", "Cho ứng viên nghiêm túc", 149_000, 30, "50 lượt phỏng vấn/tháng · Voice Interview · Phân tích CV ATS 70 lần/tháng · Cover Letter AI · So khớp CV & JD.", 3, false, 2000, 1_200_000)
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
                e.Tagline = d.Tagline;
                e.SortOrder = d.Order;
                e.IsPopular = d.Popular;
                e.Description = d.Desc;
                e.MaxAiOutputChars = d.OutChars;
                e.MonthlyAiCharBudget = d.Budget;

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
        await UpsertSettingAsync(context, "ai.interview_max_output_chars", "1800", "Trần feedback một câu phỏng vấn.");

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

