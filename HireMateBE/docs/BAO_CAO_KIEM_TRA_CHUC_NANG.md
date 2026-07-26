# Báo cáo kiểm tra chức năng HireMate BE

**Thời điểm:** 2026-07-26  
**Môi trường:** http://localhost:5080  
**Kết quả:** **37 PASS / 1 FAIL giả (script) → chức năng thực tế OK**

## Tổng kết

| Nhóm | Kết quả |
|------|---------|
| Public (Waitlist, Contact, FAQ, Blog, Pages, Resources, Plans) | PASS |
| Auth Register / Login / Me | PASS |
| Auth Forgot + Reset password | PASS (khi gửi JSON đúng) |
| Onboarding + Profile | PASS |
| Interview + STAR + History + Suggested answer | PASS |
| Dashboard | PASS |
| CV upload/analyze, JD Match, Email AI | PASS |
| Career (memory/profile/progress/development/path/learning) | PASS |
| Billing checkout + invoices | PASS |
| Referral, Badges, Leaderboard, Benchmark | PASS |
| Admin analytics/users/revenue | PASS |
| University / Enterprise B2B | PASS |
| User không vào được Admin (403) | PASS |

## Chi tiết mẫu (lần chạy)

- Interview STAR score ví dụ: **76** (S=85)
- Checkout Premium + promo `HIREMATE10`: **71.100 VND**, `isPremium=true`
- AI endpoints: `provider=heuristic` (Ollama local không chạy — fallback đúng thiết kế)
- Admin analytics: registrations tăng theo user test
- University: 1 student trong org FPT Demo
- Enterprise: TechCorp Demo insights OK

## FAIL duy nhất trong script batch

- **AuthForgotReset** báo 400 trong script tự động vì token Identity có ký tự đặc biệt bị escape sai khi nối chuỗi JSON tay.
- **Verify lại thủ công:** forgot → reset → login mật khẩu mới → **PASS**.

## Cách bạn tự check nhanh trên Swagger

1. Mở http://localhost:5080/swagger  
2. `POST /api/Auth/register` hoặc login seed  
3. Authorize Bearer token  
4. Onboarding → Interview sessions → complete → Dashboard  
5. Billing checkout `premium`  
6. Login `admin@hiremate.local` / `Admin123!` → Admin analytics  

## File kết quả thô

- `docs/FUNCTIONAL_CHECK_RESULT.csv`
- `docs/FUNCTIONAL_CHECK_RESULT.json`

## Kết luận

**Chức năng BE A–Z đã chạy được end-to-end trên Swagger/API.**  
Chưa cần lo production harden cho đến khi FE gắn API; ưu tiên hiện tại là giữ API chạy và FE integrate.
