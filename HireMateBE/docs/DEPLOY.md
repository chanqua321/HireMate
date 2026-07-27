# Deploy HireMate BE (free / gần free)

## Chạy local bằng Docker

```powershell
cd D:\EXE101-live\HireMateBE
docker compose up --build -d
```

API: http://localhost:5080/swagger  
SQL Server trong container: `localhost:1433` / `sa` / `HireMate_Str0ng!`

---

## Option deploy **miễn phí / gần free**

| Nền tảng | Free? | Ghi chú cho HireMate (.NET + SQL Server) |
|---|---|---|
| **Oracle Cloud Always Free** | Có (VM ARM) | **Khuyến nghị lâu dài**: VM free + `docker compose` (API + SQL Server). |
| **Azure** (Student / trial $200) | Có thời hạn | App Service + Azure SQL dễ nhất với SQL Server. |
| **Render** Free Web Service | Có (sleep sau idle) | Deploy **Docker**; DB SQL Server **không free** trên Render → dùng Azure SQL free trial, hoặc SQL trên VPS. |
| **Railway** | Credit trial | Docker OK; hết credit thì trả phí. |
| **Fly.io** | Allowance nhỏ | Docker OK; SQL Server nặng RAM → thường cần DB ngoài. |
| **Neon / Supabase Postgres** | Free Postgres | Cần đổi EF sang PostgreSQL (chưa làm) — không dùng được với LocalDB/SQL Server hiện tại. |

**Thực tế tốt nhất free lâu dài:** Oracle Cloud Always Free VM → cài Docker → `docker compose up`.

**Nhanh để demo:** Azure for Students / trial → App Service (container) + Azure SQL.

---

## Oracle Cloud Always Free (khuyến nghị)

> SQL Server image chỉ có **amd64**. VM free mạnh nhất là **Ampere ARM** → cần bật emulation (`qemu` / `binfmt`). RAM khuyến nghị ≥ **8–12 GB**.

### A. Tạo VM trên Oracle Console

1. Đăng ký: [https://cloud.oracle.com](https://cloud.oracle.com) (Always Free).
2. **Compute → Instances → Create instance**
3. Chọn:
   - **Image:** Canonical Ubuntu 22.04 (aarch64)
   - **Shape:** `VM.Standard.A1.Flex` (Ampere)
   - **OCPU:** 2 · **Memory:** 12 GB (hoặc 4 OCPU / 24 GB nếu còn quota)
   - **SSH key:** upload public key (`id_rsa.pub` / `id_ed25519.pub`)
   - Gán **Public IP**
4. **Networking → VCN → Security List** (subnet của VM) → Ingress:
   - TCP **22** (SSH) từ IP của bạn
   - TCP **5080** (API) từ `0.0.0.0/0` (hoặc chỉ IP bạn)
5. Copy **Public IP** của instance.

### B. SSH + cài Docker trên VM

Trên máy Windows (PowerShell), trong thư mục có private key:

```powershell
ssh -i .\path\to\private_key ubuntu@YOUR_PUBLIC_IP
```

(Trên Oracle Linux image user có thể là `opc` thay vì `ubuntu`.)

Trên VM:

```bash
# Clone hoặc scp code vào ~/HireMateBE
git clone <YOUR_REPO_URL> ~/repo
cd ~/repo/HireMateBE

chmod +x scripts/oracle-setup.sh
./scripts/oracle-setup.sh
# đăng xuất rồi SSH lại (để group docker có hiệu lực)
```

### C. Cấu hình + chạy

```bash
cd ~/repo/HireMateBE
cp .env.example .env
nano .env
# Sửa: MSSQL_SA_PASSWORD, JWT_KEY, API_PUBLIC_URL=http://YOUR_PUBLIC_IP:5080, FRONTEND_URL, CORS_*

docker compose up --build -d
docker compose ps
docker compose logs -f api
```

Kiểm tra:

- Swagger: `http://YOUR_PUBLIC_IP:5080/swagger`
- FE `.env`: `VITE_API_BASE_URL=http://YOUR_PUBLIC_IP:5080`

### D. Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| Timeout từ ngoài | Mở **5080** ở Security List + firewall VM |
| `db` không start / platform | Chạy lại `docker run --privileged --rm tonistiigi/binfmt --install amd64` |
| Out of memory | Tăng RAM shape (12 GB+), giảm service khác |
| Permission denied docker | `newgrp docker` hoặc SSH lại sau `usermod -aG docker` |

---

## Biến môi trường bắt buộc khi deploy

```text
ASPNETCORE_ENVIRONMENT=Production
PORT=8080
ConnectionStrings__DefaultConnection=Server=...;Database=HireMateDB;User Id=...;Password=...;TrustServerCertificate=True
Jwt__Key=<chuỗi >= 32 ký tự, đổi khác local>
EmailSettings__ApiPublicUrl=https://your-api.example.com
EmailSettings__FrontendUrl=https://your-fe.example.com
EmailSettings__Password=<Gmail app password>
Authentication__Google__ClientId=<web client id>
Cors__Origins__0=https://your-fe.example.com
Swagger__Enabled=true   # tắt khi public thật sự
```

### AI cloud (optional)

```text
Ai__Provider=OpenAI
Ai__BaseUrl=https://api.openai.com/v1
Ai__Model=gpt-4o-mini
Ai__ApiKey=sk-...
```

Hoặc giữ `Ai__Provider=Heuristic` / `Ollama` trên máy local.

### PayOS (khuyến nghị — dễ hơn VNPay, tiền thật qua QR ngân hàng)

1. Đăng ký [https://payos.vn](https://payos.vn) → tạo kênh thanh toán → lấy **ClientId / ApiKey / ChecksumKey**
2. Liên kết tài khoản ngân hàng nhận tiền
3. Set secrets / env:

```powershell
cd D:\EXE101-live\HireMateBE\APIs
dotnet user-secrets set "PayOS:Enabled" "true"
dotnet user-secrets set "PayOS:ClientId" "..."
dotnet user-secrets set "PayOS:ApiKey" "..."
dotnet user-secrets set "PayOS:ChecksumKey" "..."
dotnet user-secrets set "PayOS:ReturnUrl" "https://your-fe/billing-result.html?status=success"
dotnet user-secrets set "PayOS:CancelUrl" "https://your-fe/billing-result.html?status=cancel"
```

4. Webhook (API public HTTPS): `POST https://your-api/api/Billing/payos-webhook`  
   Confirm trên PayOS dashboard hoặc API `confirm-webhook`.

Checkout:

```json
{ "planCode": "premium", "promoCode": "HIREMATE10", "paymentMethod": "PayOS" }
```

→ `paymentUrl` / `qrCode` → user chuyển khoản → webhook → `IsPremium=true`.

`paymentMethod`: `Mock` | `PayOS` | `VNPay`.

### VNPay sandbox (optional)

```text
VnPay__Enabled=true
VnPay__TmnCode=...
VnPay__HashSecret=...
VnPay__ReturnUrl=https://your-api/api/Billing/vnpay-return
VnPay__IpnUrl=https://your-api/api/Billing/vnpay-ipn
VnPay__FrontendReturnUrl=https://your-fe/billing-result.html
```

Checkout:

```json
{ "planCode": "premium", "promoCode": "HIREMATE10", "paymentMethod": "VNPay" }
```

`paymentMethod`: `Mock` (mặc định, không cần VNPay) | `VNPay`.

---

## Render (Docker) — nhanh

1. Push repo GitHub (không commit secrets).
2. Render → **New Web Service** → Docker → root `HireMateBE`.
3. Set env như trên + connection string tới Azure SQL / VM SQL.
4. Free tier: service **sleep** khi không traffic ~15 phút.

---

## Checklist sau deploy

- [ ] Migrate/seed chạy lúc startup (`DbSeeder`)
- [ ] Login seed `student@hiremate.local` / `Password1`
- [ ] Google Client ID origins thêm domain FE production
- [ ] SMTP Gmail App Password trên host
- [ ] Đổi `Jwt__Key`
