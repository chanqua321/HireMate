# BÁO CÁO KHOẢNG TRỐNG API BACKEND (BACKEND API GAP REPORT)
**Dự án:** HireMate — Nền tảng luyện phỏng vấn thông minh cùng AI  
**Ngày lập:** 16/09/2026  
**Đối tượng nhận:** Backend Development Team  
**Mục đích:** Báo cáo các API Backend còn thiếu cần bổ sung để hệ thống Quản trị (Admin Portal) hoạt động 100% dữ liệu thực tế từ cơ sở dữ liệu (thay vì phụ thuộc dữ liệu giới hạn hoặc tạm thời).

---

## TỔNG HỢP CÁC ENDPOINT CẦN BỔ SUNG

| STT | Endpoint Đề Xuất | Method | Mức Độ Ưu Tiên | Phân Hệ / Module |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `/api/Admin/promos` | `GET` | **Cao (P1)** | Quản lý Mã khuyến mãi |
| 2 | `/api/Admin/invoices` | `GET` | **Cao (P1)** | Quản lý Tài chính & Doanh thu |
| 3 | `/api/Admin/interviews/sessions` | `GET` | **Trung bình (P2)** | Quản lý & Audit Phỏng vấn AI |
| 4 | `/api/Admin/badges` | `POST / PUT / DELETE` | **Trung bình (P2)** | Gamification & Badges |
| 5 | Bổ sung trường trong `/api/Admin/interviews` | `GET` | **Thấp (P3)** | Thống kê phỏng vấn |

---

## CHI TIẾT KỸ THUẬT TỪNG YÊU CẦU

### 1. `GET /api/Admin/promos` — Danh sách toàn bộ mã khuyến mãi
- **Hiện trạng hiện tại:**  
  Backend đã có `POST /api/Admin/promos` (`UpsertPromoAsync` trong `AdminB2BServices.cs`), bảng `PromoCodes` trong CSDL đã có đầy đủ dữ liệu. Tuy nhiên, Backend **chưa cung cấp** phương thức `GET` để Admin truy vấn danh sách các mã đang có.
- **Đề xuất thực hiện:**
  - Controller: `AdminController.cs`
  - Thêm action:
    ```csharp
    [HttpGet("promos")]
    public async Task<IActionResult> GetPromos() => this.FromService(await svc.GetPromosAsync());
    ```
  - Dữ liệu trả về mong đợi:
    ```json
    [
      {
        "id": "uuid",
        "code": "HIREMATE30",
        "discountPercent": 30.0,
        "maxUses": 100,
        "usedCount": 67,
        "expiresAt": "2026-12-31T23:59:59Z",
        "isActive": true
      }
    ]
    ```

---

### 2. `GET /api/Admin/invoices` & Doanh thu theo tháng
- **Hiện trạng hiện tại:**  
  - Backend đã có `GET /api/Admin/revenue` (trả về các chỉ số gộp: MRR, totalRevenue, arpu, conversionRate, premiumUsers).
  - Backend có `GET /api/Billing/invoices`, nhưng endpoint này chỉ lấy hóa đơn của chính User đang gọi API (`TryGetUserId`), Admin không thể xem hóa đơn toàn sàn của mọi ứng viên để đối soát tài chính.
- **Đề xuất thực hiện:**
  - Thêm `GET /api/Admin/invoices` (hỗ trợ phân trang `page`, `pageSize`, `status`):
    ```csharp
    [HttpGet("invoices")]
    public async Task<IActionResult> GetSystemInvoices([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    ```
  - Thêm `GET /api/Admin/revenue/monthly` (trả về doanh thu nhóm theo từng tháng):
    ```json
    [
      { "month": "Tháng 8", "revenue": 45000000, "subscriptions": 150, "newUsers": 320, "arpu": 300000 }
    ]
    ```

---

### 3. `GET /api/Admin/interviews/sessions` — Lịch sử phỏng vấn toàn sàn
- **Hiện trạng hiện tại:**  
  Backend có `GET /api/Admin/interviews` trả về số liệu tổng thể (`total`, `avgStar`, `avgS`, `avgT`, `avgA`, `avgR`, `popularPositions`). Nhưng trang Admin cần một bảng danh sách các phiên phỏng vấn mới nhất diễn ra trên toàn hệ thống để Admin audit chất lượng AI. Hiện tại FE tạm thời gọi `GET /api/Interview/sessions` (vốn chỉ trả về phiên của tài khoản đang đăng nhập).
- **Đề xuất thực hiện:**
  - Controller: `AdminController.cs`
  - Thêm action:
    ```csharp
    [HttpGet("interviews/sessions")]
    public async Task<IActionResult> GetRecentSessions([FromQuery] int take = 20)
    ```
  - Dữ liệu trả về gồm: `sessionId`, `candidateName`, `candidateEmail`, `industry`, `position`, `overallScore`, `scoreS`, `scoreT`, `scoreA`, `scoreR`, `startedAt`, `completedAt`, `status`.

---

### 4. `POST / PUT / DELETE /api/Admin/badges` — Quản trị danh mục Huy hiệu Gamification
- **Hiện trạng hiện tại:**  
  Backend đã có `GET /api/Gamification/badges` và `GET /api/Gamification/leaderboard`. Tuy nhiên Admin chưa có API để:
  - Tạo huy hiệu mới (`POST /api/Admin/badges`)
  - Chỉnh sửa thông tin huy hiệu (`PUT /api/Admin/badges/{id}`)
  - Kích hoạt / Hủy kích hoạt huy hiệu (`PATCH /api/Admin/badges/{id}/status`)
- **Đề xuất thực hiện:**  
  Cung cấp CRUD cho thực thể `Badge` để Admin chủ động tạo các chiến dịch khuyến khích người dùng luyện tập.

---

### 5. Bổ sung trường thời lượng trung bình trong `GET /api/Admin/interviews`
- **Hiện trạng hiện tại:**  
  `AdminInterviewStats` hiện gồm: `total`, `avgStar`, `avgS`, `avgT`, `avgA`, `avgR`, `popularPositions`.
- **Đề xuất:**  
  Bổ sung trường `avgDurationMinutes` (thời lượng trung bình của một phiên phỏng vấn đã hoàn thành) tính theo `CompletedAt - StartedAt`.

---

*Báo cáo được khởi tạo tự động phục vụ quá trình hoàn thiện và chuẩn hóa hệ thống HireMate.*
