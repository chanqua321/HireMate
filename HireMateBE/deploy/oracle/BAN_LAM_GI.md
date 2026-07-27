# Chỉ làm 3 bước này (5–15 phút)

## Bước 1 — Đăng ký Oracle (bạn làm)
1. Mở https://cloud.oracle.com
2. Sign up Always Free
3. Chọn Home Region gần VN nếu có: **Singapore (ap-singapore-1)** hoặc **Tokyo (ap-tokyo-1)**
4. Xác minh email / thẻ (Oracle có thể yêu cầu thẻ nhưng Always Free không trừ tiền nếu dùng đúng free shape)

## Bước 2 — Chạy script tạo VM (bạn paste 1 lần)
1. Vào Oracle Console → góc trên phải mở **Cloud Shell** (>_)
2. Upload file `HireMateBE/deploy/oracle/oci-bootstrap.sh`
   (Cloud Shell menu ☰ → Upload)
3. Chạy:
   ```bash
   bash oci-bootstrap.sh
   ```
4. Đợi tới khi hiện: `PUBLIC_IP=x.x.x.x`
5. **Copy PUBLIC_IP gửi lại cho mình**

## Bước 3 — Mình / script deploy code
Trên máy bạn (PowerShell), hoặc bảo mình chạy:

```powershell
cd D:\EXE101-live\HireMateBE\deploy\oracle
.\Deploy-HireMateBe.ps1 -PublicIp "x.x.x.x"
```

Xong sẽ có:
- API: `http://x.x.x.x:5080`
- Swagger: `http://x.x.x.x:5080/swagger`

## Nếu lỗi Out of capacity
Ampere free hay hết chỗ → chạy lại `bash oci-bootstrap.sh` sau vài giờ, hoặc thử region khác (cần account mới vì Home Region khó đổi).
