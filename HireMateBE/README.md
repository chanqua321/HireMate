# HireMate Backend (HireMateBE)

API backend cho **HireMate** — nền tảng AI Career Coach (CV-first onboarding, phỏng vấn AI, billing, career OS).

- **Stack:** .NET 8, ASP.NET Core Web API, EF Core, SQL Server, JWT Identity  
- **Kiến trúc:** Modular monolith (tách module theo domain, dễ bảo trì / mở rộng sau này)  
- **Port mặc định:** `http://localhost:7080` — Swagger: `/swagger`

---

## Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Cấu trúc solution](#cấu-trúc-solution)
3. [Chạy lần đầu (Quick start)](#chạy-lần-đầu-quick-start)
4. [Database — tự tạo & không tạo lại](#database--tự-tạo--không-tạo-lại)
5. [Cấu hình](#cấu-hình)
6. [Tài khoản & phân quyền](#tài-khoản--phân-quyền)
7. [Test API với Swagger](#test-api-với-swagger)
8. [Danh sách API theo module](#danh-sách-api-theo-module)
9. [Luồng nghiệp vụ chính](#luồng-nghiệp-vụ-chính)
10. [Migration thủ công (tùy chọn)](#migration-thủ-công-tùy-chọn)
11. [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
12. [Git & triển khai](#git--triển-khai)
13. [Tài liệu thêm](#tài-liệu-thêm)

---

## Yêu cầu hệ thống

| Thành phần | Phiên bản / ghi chú |
|------------|---------------------|
| [.NET SDK](https://dotnet.microsoft.com/download) | **8.0+** |
| SQL Server | **LocalDB** (dev) hoặc SQL Server / Azure SQL (prod) |
| IDE (khuyến nghị) | Visual Studio 2022 / Rider / VS Code + C# Dev Kit |
| Git | Clone repo, làm việc trên nhánh `phuc` |

Kiểm tra môi trường:

```powershell
dotnet --version
sqllocaldb info
```

---

## Cấu trúc solution

```
HireMateBE/
├── APIs/                    # Web API host, controllers, Program.cs, Swagger
├── BuildingBlocks/          # Shared primitives (ServiceResult, …)
├── Common/                  # DTOs, constants, helpers
├── Infrastructure/          # EF Core, entities, repositories, migrations, DbSeeder
├── Modules/
│   ├── HireMate.Modules.Identity/     # Auth, email, JWT
│   ├── HireMate.Modules.Onboarding/   # CV, profile, dashboard
│   ├── HireMate.Modules.Interview/    # Phỏng vấn AI
│   ├── HireMate.Modules.Billing/      # Gói, VNPay, PayOS
│   ├── HireMate.Modules.Career/       # Match JD, career OS, email gen
│   ├── HireMate.Modules.Growth/       # Referral, gamification
│   ├── HireMate.Modules.Content/      # Blog, FAQ, contact, waitlist
│   ├── HireMate.Modules.Admin/        # CMS admin
│   ├── HireMate.Modules.Ai/           # AI client, quota
│   └── HireMate.Modules.Platform/     # System settings
└── docs/                    # ERD, business rules
```

**Luồng request:** `Controller (APIs)` → `Module Service` → `Infrastructure (UoW/Repository)` → SQL Server.

---

## Chạy lần đầu (Quick start)

### 1. Clone & mở solution

```powershell
git clone https://github.com/chanqua321/HireMate.git
cd HireMate/HireMateBE
dotnet restore HireMateBE.sln
```

### 2. Cấu hình connection string

Chỉnh file **`APIs/appsettings.json`** (hoặc `appsettings.Development.json`) — mục `ConnectionStrings:DefaultConnection`.

Mặc định dev dùng LocalDB:

```json
"DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=HireMateDB;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

> Secret (JWT, payment, email, AI key) **chỉ cấu hình local** — không commit lên Git.

### 3. Build & chạy API

```powershell
dotnet build HireMateBE.sln
dotnet run --project APIs/APIs.csproj
```

Mở trình duyệt: **http://localhost:7080/swagger**

### 4. Không cần tạo DB thủ công lần đầu

Khi API khởi động, `DbSeeder` sẽ:

1. Tạo database `HireMateDB` (nếu chưa có)
2. Apply EF migrations
3. Seed roles, admin, câu hỏi phỏng vấn, gói giá, FAQ, …

**Lần chạy sau:** nếu DB đã tồn tại và schema đã cập nhật → **bỏ qua** bước tạo/migrate, chỉ chạy seed idempotent (bổ sung dữ liệu thiếu).

Log mong đợi lần 2+:

```text
Database exists and schema is up to date. Skipping create/migrate.
```

---

## Database — tự tạo & không tạo lại

| Tình huống | Hành vi |
|------------|---------|
| Chưa có DB | `MigrateAsync()` → tạo DB + bảng |
| DB có, schema đúng | **Skip** create/migrate |
| DB có, còn migration mới | Chỉ apply migration pending |
| LocalDB orphan (lỗi SQL 1801) | Tự retry / drop catalog mồ côi rồi tạo lại |

**Không cần** chạy `dotnet ef database update` mỗi lần dev — trừ khi bạn vừa thêm migration mới và muốn apply thủ công trước khi start API.

Reset DB hoàn toàn (cẩn thận — mất dữ liệu):

```powershell
dotnet ef database drop --force --project Infrastructure --startup-project APIs
# Lần chạy API tiếp theo sẽ tạo lại DB
```

---

## Cấu hình

File chính: `APIs/appsettings.json` (+ `appsettings.Development.json` / `appsettings.Production.json`).

| Section | Mục đích |
|---------|----------|
| `ConnectionStrings:DefaultConnection` | SQL Server |
| `Jwt` | Issuer, Audience, Key, thời hạn access/refresh token |
| `Authentication:Google` | Google Sign-In (ClientId, Audiences) |
| `EmailSettings` | SMTP, URL FE/BE, `RequireEmailConfirmation` (demo: `false`) |
| `Ai` | Provider (Gemini/OpenAI), ApiKey, Model |
| `VnPay` / `PayOS` | Thanh toán (secret chỉ trên BE) |
| `Cors:Origins` | FE được phép gọi API |
| `Swagger:Enabled` | Bật/tắt Swagger UI |

Biến môi trường (cloud): `PORT`, `DATABASE_URL`, `ConnectionStrings__DefaultConnection`.

**User Secrets** (dev): project `APIs` có `UserSecretsId` — có thể override key nhạy cảm:

```powershell
dotnet user-secrets set "Ai:ApiKey" "YOUR_KEY" --project APIs
```

---

## Tài khoản & phân quyền

Hệ thống chỉ có **2 role**:

| Role | Mô tả |
|------|--------|
| `User` | Người dùng mặc định khi đăng ký |
| `Admin` | Quản trị CMS / ticket / user |

**Admin hệ thống (seed tự động):**

| Email | Mật khẩu |
|-------|----------|
| `admin@gmail.com` | `12345` |

- Không thể khóa admin hệ thống qua API  
- Không gán role `Admin` cho email khác qua API  
- Token JWT được **rehydrate role từ DB** mỗi request (đổi role/lock trên DB có hiệu lực ngay)

Policy:

- Mặc định mọi endpoint cần **JWT + role hợp lệ**  
- `[AllowAnonymous]` — public (login, contact, blog, …)  
- `[Authorize(Policy = AppPolicies.AdminOnly)]` — chỉ Admin  

---

## Test API với Swagger

### Đăng nhập Admin

1. `POST /api/Auth/login`

```json
{
  "email": "admin@gmail.com",
  "password": "12345"
}
```

2. Copy `data.token` từ response  
3. Swagger → **Authorize** → nhập: `Bearer <token>`

### Một số endpoint mẫu

| Method | Path | Ghi chú |
|--------|------|---------|
| POST | `/api/Auth/register` | Đăng ký user mới |
| GET | `/api/Auth/me` | Thông tin user + gói + quota AI |
| POST | `/api/Contact` | Public — `"Đã nhận tin nhắn"` |
| POST | `/api/Admin/tickets` | Admin tạo ticket |
| POST | `/api/Admin/blog` | Admin upsert blog |
| GET | `/api/Blog` | Public đọc blog |

### Lỗi 401 sau khi drop DB

Token cũ trỏ `userId` không còn → **đăng nhập lại** để lấy token mới.

---

## Danh sách API theo module

| Module | Controller | Route gốc |
|--------|------------|-----------|
| Identity | `AuthController` | `/api/Auth` |
| Onboarding | `OnboardingController`, `CvController`, `ProfileController`, `DashboardController` | `/api/Onboarding`, `/api/Cv`, … |
| Interview | `InterviewController` | `/api/Interview` |
| Billing | `BillingController`, `PaymentController` | `/api/Billing`, `/api/Payment` |
| Career | `CareerController`, `MatchController`, `EmailController`, `ResourcesController` | `/api/Career`, `/api/Match`, … |
| Growth | `ReferralController`, `GamificationController`, `BenchmarkController` | `/api/Referral`, … |
| Content | `BlogController`, `FaqController`, `ContactController`, `WaitlistController`, `ContentController` | `/api/Blog`, `/api/Contact`, … |
| Admin | `AdminController` | `/api/Admin` |

Chi tiết nghiệp vụ: xem `docs/HireMate-Nghiep-Vu-BR.md`.

---

## Luồng nghiệp vụ chính

```text
Đăng ký / Login
    → Chọn gói (Free / Premium / Combo)
        → Upload hoặc wizard tạo CV
            → Phân tích CV (AI)
                → Review & Confirm onboarding
                    → Dashboard / Phỏng vấn / Match JD / Career OS
```

**Gate quan trọng:**

- Chưa chọn gói → chưa phân tích CV / confirm hồ sơ  
- Chưa `OnboardingCompleted` → chưa phỏng vấn / dashboard  
- Gói hết hạn → `AiQuotaService` chặn tính năng trả phí  

---

## Migration thủ công (tùy chọn)

Cài EF tools (một lần):

```powershell
dotnet tool install --global dotnet-ef
```

Thêm migration mới:

```powershell
dotnet ef migrations add TenMigration `
  --project Infrastructure `
  --startup-project APIs
```

Apply thủ công (không bắt buộc nếu đã start API):

```powershell
dotnet ef database update `
  --project Infrastructure `
  --startup-project APIs
```

---

## Xử lý lỗi thường gặp

### Build fail — file bị lock

API/Visual Studio đang chạy → dừng process rồi build lại:

```powershell
dotnet build HireMateBE.sln
```

### SQL LocalDB không chạy

```powershell
sqllocaldb start mssqllocaldb
sqllocaldb info mssqllocaldb
```

### Lỗi 1801 — database đã tồn tại

Thường do catalog LocalDB orphan. DbSeeder tự xử lý; nếu vẫn lỗi:

```powershell
dotnet ef database drop --force --project Infrastructure --startup-project APIs
dotnet run --project APIs/APIs.csproj
```

### Message tiếng Việt bị lỗi font (mojibake)

Source code lưu UTF-8 trực tiếp trong từng file `.cs` — không dùng script vá chuỗi.

Nếu Swagger/Postman hiển thị sai:

- Đảm bảo response `Content-Type: application/json; charset=utf-8`  
- Restart API sau khi pull code mới  

### Admin bị khóa khi test

Restart API — seed sẽ unlock `admin@gmail.com` và tắt lockout cho admin hệ thống.

---

## Git & triển khai

**Nhánh làm việc:** `phuc` (không push thẳng `main` trừ khi merge có chủ đích).

```powershell
git checkout phuc
git pull origin phuc
# ... chỉnh sửa ...
git add HireMateBE/
git commit -m "Mô tả thay đổi"
git push origin phuc
```

**Production:** set connection string RDS/SQL Azure, JWT key mạnh, tắt `ExposeDevTokens`, bật xác nhận email nếu cần, cấu hình VNPay/PayOS thật.

---

## Tài liệu thêm

| File | Nội dung |
|------|----------|
| `docs/HireMate-Nghiep-Vu-BR.md` | Business rules T1 |
| `docs/HireMate-ERD.md` | Sơ đồ entity |
| `docs/HireMate-Nghiep-Vu-BR.docx` | Bản Word BR |

---

## License & liên hệ

Dự án EXE101 — HireMate Team.  
Repo: [github.com/chanqua321/HireMate](https://github.com/chanqua321/HireMate)
