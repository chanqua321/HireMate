# Email thật (Gmail SMTP)

## Cấu hình

- `appsettings.json`: host/port/from (không chứa password)
- Password App Password lưu bằng **user-secrets** (máy local), không commit git

```powershell
cd HireMateBE\APIs
dotnet user-secrets set "EmailSettings:Password" "YOUR_APP_PASSWORD"
```

From: `pphuc6464@gmail.com`

## Luồng

1. **Register** → gửi mail xác nhận → **chưa login được** đến khi confirm  
2. Click link trong mail → `GET /api/Auth/confirm-email`  
3. **Login**  
4. **Forgot password** → mail có link + token (Dev response còn `resetToken`)  
5. **Reset password** qua Swagger hoặc FE  

## Resend

`POST /api/Auth/resend-confirm-email` `{ "email": "..." }`
