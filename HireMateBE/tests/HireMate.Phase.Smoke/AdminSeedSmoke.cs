using System.Reflection;
using System.Security.Claims;
using APIs.Authorization;
using Common;
using Infrastructure.Data;
using Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

internal static class AdminSeedSmoke
{
    public static async Task RunAsync(Action<bool, string> check)
    {
        using var store = new MemoryIdentityStore();
        var options = Options.Create(new IdentityOptions
        {
            User = { RequireUniqueEmail = true },
            Password = { RequiredLength = 8, RequireDigit = true, RequireLowercase = true,
                RequireUppercase = false, RequireNonAlphanumeric = false }
        });
        using var identityServices = new ServiceCollection().BuildServiceProvider();
        using var users = new UserManager<UserAccount>(store, options,
            new PasswordHasher<UserAccount>(), [new UserValidator<UserAccount>()],
            [new PasswordValidator<UserAccount>()], new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(), identityServices, NullLogger<UserManager<UserAccount>>.Instance);
        var services = new ServiceCollection().AddSingleton(users).BuildServiceProvider();
        var method = typeof(DbSeeder).GetMethod("SeedAdminAsync", BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException("Admin seed entry point not found.");
        async Task SeedAsync() => await (Task)(method.Invoke(null, [services])
            ?? throw new InvalidOperationException("Admin seed did not return a task."));

        await SeedAsync();
        var admin = await users.FindByEmailAsync(AppRoles.AdminEmail);
        check(admin != null && admin.EmailConfirmed && await users.IsInRoleAsync(admin, AppRoles.Admin),
            "First seed creates confirmed Admin with Admin role");
        check(await users.CheckPasswordAsync(admin!, "12345"), "First seed default password authenticates");
        admin!.FullName = "Customized Admin";
        check((await users.UpdateAsync(admin)).Succeeded, "Existing Admin profile can be customized");
        var originalId = admin!.Id;
        var originalHash = admin.PasswordHash;
        var originalUpdatedAt = admin.UpdatedAt;

        await SeedAsync();
        check(admin.Id == originalId && admin.PasswordHash == originalHash
              && admin.UpdatedAt == originalUpdatedAt && admin.FullName == "Customized Admin",
            "Second seed preserves Admin identity, password hash and unrelated data");
        check(store.Users.Count(u => string.Equals(u.NormalizedEmail, "ADMIN@GMAIL.COM", StringComparison.Ordinal)) == 1,
            "Repeated seed has exactly one normalized Admin email");

        var changed = await users.ChangePasswordAsync(admin, "12345", "Changed123!");
        check(changed.Succeeded, "Admin password can be changed through Identity");
        var changedHash = admin.PasswordHash;
        for (var i = 0; i < 3; i++) await SeedAsync();
        check(admin.PasswordHash == changedHash && await users.CheckPasswordAsync(admin, "Changed123!")
              && !await users.CheckPasswordAsync(admin, "12345"),
            "Later seeds preserve a changed Admin password");
        check(await users.IsInRoleAsync(admin, AppRoles.Admin)
              && store.Users.Count(u => u.NormalizedEmail == "ADMIN@GMAIL.COM") == 1,
            "Many seeds preserve Admin role and do not duplicate Admin");

        store.RemoveRole(admin, AppRoles.Admin);
        await SeedAsync();
        check(await users.IsInRoleAsync(admin, AppRoles.Admin) && admin.PasswordHash == changedHash,
            "Missing Admin role is restored without changing password");

        var regular = new UserAccount { Id = Guid.NewGuid(), Email = "regular@example.test",
            UserName = "regular@example.test", FullName = "Regular User", EmailConfirmed = true };
        check((await users.CreateAsync(regular, "Regular123!")).Succeeded, "Normal User can be created");
        check(await users.CheckPasswordAsync(regular, "Regular123!"), "Normal User password authenticates");
        check((await users.AddToRoleAsync(regular, AppRoles.User)).Succeeded, "Normal User retains User role");
        await SeedAsync();
        check(!await users.IsInRoleAsync(regular, AppRoles.Admin), "Admin seed does not promote Normal User");

        var authServices = new ServiceCollection();
        authServices.AddLogging();
        authServices.AddHireMateAuthorization();
        using var authProvider = authServices.BuildServiceProvider();
        var authorization = authProvider.GetRequiredService<IAuthorizationService>();
        ClaimsPrincipal Principal(UserAccount user, string role) => new(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Role, role)], "test"));
        check(!(await authorization.AuthorizeAsync(Principal(regular, AppRoles.User), null, AppPolicies.AdminOnly)).Succeeded,
            "Normal User is denied by AdminOnly policy");
        check((await authorization.AuthorizeAsync(Principal(admin, AppRoles.Admin), null, AppPolicies.AdminOnly)).Succeeded,
            "Admin is allowed by AdminOnly policy");
    }

    private sealed class MemoryIdentityStore : IUserEmailStore<UserAccount>, IUserPasswordStore<UserAccount>, IUserRoleStore<UserAccount>
    {
        public List<UserAccount> Users { get; } = [];
        private readonly Dictionary<Guid, HashSet<string>> _roles = [];
        public void Dispose() { }
        public void RemoveRole(UserAccount user, string role) => _roles[user.Id].Remove(role);
        public Task<string> GetUserIdAsync(UserAccount user, CancellationToken ct) => Task.FromResult(user.Id.ToString());
        public Task<string?> GetUserNameAsync(UserAccount user, CancellationToken ct) => Task.FromResult(user.UserName);
        public Task SetUserNameAsync(UserAccount user, string? name, CancellationToken ct) { user.UserName = name; return Task.CompletedTask; }
        public Task<string?> GetNormalizedUserNameAsync(UserAccount user, CancellationToken ct) => Task.FromResult(user.NormalizedUserName);
        public Task SetNormalizedUserNameAsync(UserAccount user, string? name, CancellationToken ct) { user.NormalizedUserName = name; return Task.CompletedTask; }
        public Task<IdentityResult> CreateAsync(UserAccount user, CancellationToken ct)
        {
            if (Users.Any(u => u.NormalizedEmail == user.NormalizedEmail))
                return Task.FromResult(IdentityResult.Failed(new IdentityError { Code = "DuplicateEmail" }));
            Users.Add(user); _roles[user.Id] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            return Task.FromResult(IdentityResult.Success);
        }
        public Task<IdentityResult> UpdateAsync(UserAccount user, CancellationToken ct) => Task.FromResult(IdentityResult.Success);
        public Task<IdentityResult> DeleteAsync(UserAccount user, CancellationToken ct)
        { Users.Remove(user); _roles.Remove(user.Id); return Task.FromResult(IdentityResult.Success); }
        public Task<UserAccount?> FindByIdAsync(string id, CancellationToken ct)
            => Task.FromResult(Users.FirstOrDefault(u => u.Id.ToString() == id));
        public Task<UserAccount?> FindByNameAsync(string normalizedName, CancellationToken ct)
            => Task.FromResult(Users.FirstOrDefault(u => u.NormalizedUserName == normalizedName));
        public Task SetEmailAsync(UserAccount user, string? email, CancellationToken ct) { user.Email = email; return Task.CompletedTask; }
        public Task<string?> GetEmailAsync(UserAccount user, CancellationToken ct) => Task.FromResult(user.Email);
        public Task<bool> GetEmailConfirmedAsync(UserAccount user, CancellationToken ct) => Task.FromResult(user.EmailConfirmed);
        public Task SetEmailConfirmedAsync(UserAccount user, bool confirmed, CancellationToken ct) { user.EmailConfirmed = confirmed; return Task.CompletedTask; }
        public Task<UserAccount?> FindByEmailAsync(string normalizedEmail, CancellationToken ct)
            => Task.FromResult(Users.FirstOrDefault(u => u.NormalizedEmail == normalizedEmail));
        public Task<string?> GetNormalizedEmailAsync(UserAccount user, CancellationToken ct) => Task.FromResult(user.NormalizedEmail);
        public Task SetNormalizedEmailAsync(UserAccount user, string? normalizedEmail, CancellationToken ct)
        { user.NormalizedEmail = normalizedEmail; return Task.CompletedTask; }
        public Task SetPasswordHashAsync(UserAccount user, string? hash, CancellationToken ct) { user.PasswordHash = hash; return Task.CompletedTask; }
        public Task<string?> GetPasswordHashAsync(UserAccount user, CancellationToken ct) => Task.FromResult(user.PasswordHash);
        public Task<bool> HasPasswordAsync(UserAccount user, CancellationToken ct) => Task.FromResult(user.PasswordHash != null);
        public Task AddToRoleAsync(UserAccount user, string roleName, CancellationToken ct)
        { _roles[user.Id].Add(roleName); return Task.CompletedTask; }
        public Task RemoveFromRoleAsync(UserAccount user, string roleName, CancellationToken ct)
        { _roles[user.Id].Remove(roleName); return Task.CompletedTask; }
        public Task<IList<string>> GetRolesAsync(UserAccount user, CancellationToken ct)
            => Task.FromResult<IList<string>>(_roles[user.Id].ToList());
        public Task<bool> IsInRoleAsync(UserAccount user, string roleName, CancellationToken ct)
            => Task.FromResult(_roles[user.Id].Contains(roleName));
        public Task<IList<UserAccount>> GetUsersInRoleAsync(string roleName, CancellationToken ct)
            => Task.FromResult<IList<UserAccount>>(Users.Where(u => _roles[u.Id].Contains(roleName)).ToList());
    }
}
