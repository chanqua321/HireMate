# HireMate BE — Tóm tắt dự án đã làm

**Nhánh Git:** `phuc` (không push lên `master`)  
**Thư mục:** `D:\EXE101-live\HireMateBE`  
**Stack:** .NET 8, 3 lớp (APIs / BusinessLogic / Infrastructure / Common), EF Core + SQL Server LocalDB, JWT Identity, Swagger, AI Ollama local + fallback heuristic  

**Chạy API:**
```powershell
cd D:\EXE101-live\HireMateBE
dotnet run --project APIs --launch-profile http
```
Swagger: http://localhost:5080/swagger  

Database: `HireMateDB` (LocalDB), migrate + seed lúc startup.

---

## 1. Kiến trúc

| Layer | Vai trò |
|--------|---------|
| **APIs** | Controllers, Program.cs, JWT, Swagger, CORS, wwwroot uploads |
| **BusinessLogic** | Services, `ServiceResult`, AI client |
| **Infrastructure** | EF `HireMateContext`, Models, Repositories, UnitOfWork, Migrations, Seed |
| **Common** | DTOs, `Const` status codes |

Pattern: Controller → Service → UnitOfWork/Repository → SQL Server.

---

## 2. Đã hoàn thành theo nhóm chức năng

### A. Auth & tài khoản
- Đăng ký / Đăng nhập JWT (trả token ngay sau register)
- `GET /api/Auth/me`
- Quên mật khẩu / đặt lại mật khẩu (trả reset token để test Swagger, chưa gửi email thật)
- Roles: `User`, `Admin`, `UniversityAdmin`, `EnterpriseAdmin`

### B. Onboarding & Profile
- `PUT /api/Onboarding/goal` — ngành, vị trí, level
- `PUT /api/Onboarding/personal` — họ tên, trường, ngành học, năm TN
- `POST /api/Onboarding/confirm`
- `GET/PUT /api/Profile`

### C. Mock Interview (MVP core)
- Tạo session + quota Free **3 phiên/tháng** (Premium bỏ qua)
- Lấy câu hỏi từ bank đã seed
- Nộp câu trả lời, complete + chấm **STAR heuristic** (mirror FE)
- Lịch sử / chi tiết feedback
- Suggested answer (AI/heuristic)
- Voice upload stub (Premium) → transcript giả

### D. Dashboard
- `GET /api/Dashboard` — điểm TB, recent session, weekly scores, competency, remaining quota

### E. Public / Marketing API
- Waitlist, Contact, Support ticket
- Blog, FAQ, Content pages (`privacy`, `terms`, `about`)

### F. AI Application Tools
- CV upload (`wwwroot/uploads/cv`) + analyze (Format/Keywords/Readability/Professionalism)
- JD–CV Match
- Generate email ứng tuyển  
→ qua **Ollama** (`localhost:11434`) hoặc **heuristic fallback** nếu Ollama tắt

### G. Career OS
- Career Memory events
- Profile hub, Progress, Development (Career Score)
- Career Path, Learning recommendations
- Resource Hub (list/detail)

### H. Growth & Monetization
- Plans (free / premium / combo)
- Checkout **mock** + invoice + bật `IsPremium` (promo `HIREMATE10`)
- Referral code, Badges, Leaderboard, Benchmark

### I. Admin (`role=Admin`)
- Analytics, interview stats, users patch, revenue
- CMS: blog / FAQ / resources / pages
- Plans / promo codes, support tickets

### J. B2B
- University: dashboard + students (org seed FPT Demo)
- Enterprise: insights (org seed TechCorp Demo)

---

## 3. Tài khoản seed (test nhanh)

| Email | Password | Role |
|-------|----------|------|
| `admin@hiremate.local` | `Admin123!` | Admin |
| `uni@hiremate.local` | `Admin123!` | UniversityAdmin |
| `enterprise@hiremate.local` | `Admin123!` | EnterpriseAdmin |
| `student@hiremate.local` | `Password1` | User |

---

## 4. AI local

Cấu hình trong `APIs/appsettings.json` → section `Ai`.  
Chi tiết: [`docs/AI_LOCAL.md`](AI_LOCAL.md).

- Bật Ollama: `ollama serve` + `ollama pull llama3.2`
- Không có Ollama: API vẫn chạy, response có `provider=heuristic`

---

## 5. Tài liệu trong repo

| File | Nội dung |
|------|----------|
| [`docs/DOMAIN.md`](DOMAIN.md) | Use case / API full A–Z |
| [`docs/ERD.md`](ERD.md) | Sơ đồ DB |
| [`docs/AI_LOCAL.md`](AI_LOCAL.md) | Hướng dẫn Ollama |
| File này | Tóm tắt những gì đã làm |

---

## 6. Chưa làm / ngoài phạm vi BE hiện tại

- Không sửa frontend HTML/JS (teammate FE)
- Google OAuth, email thật (SMTP), VNPay sandbox thật
- STT/TTS voice thật (chỉ stub)
- OpenAI cloud (chỉ Ollama local + heuristic)
- Commit/push lên remote (chỉ khi bạn yêu cầu)

---

## 7. Gợi ý test Swagger

1. Register hoặc login admin  
2. Authorize Bearer token  
3. Onboarding → Interview → Dashboard  
4. Billing checkout `premium` → `/me` thấy `isPremium: true`  
5. Admin analytics với `admin@hiremate.local`  
6. University/Enterprise với tài khoản seed tương ứng
