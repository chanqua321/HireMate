# Question Bank & Voice — dữ liệu kiểm thử thủ công

Tạo các câu sau tại `/admin/questions` bằng tài khoản Admin. Mỗi câu có `Category=General` hoặc `Technical`, `Difficulty=Medium`, `IsActive=true`; chọn ngành Công nghệ thông tin và vị trí Backend Developer cho hai câu Backend. Không dùng dữ liệu này làm bản ghi seed production.

| Language | Question Text |
| --- | --- |
| vi | Bạn hãy giới thiệu ngắn gọn về bản thân và định hướng nghề nghiệp của bạn. |
| en | Tell me about yourself and your career goals. |
| vi | Bạn đã sử dụng ASP.NET Core trong dự án nào? Hãy mô tả vai trò của bạn trong dự án đó. |
| en | Which project did you use ASP.NET Core in, and what was your role in that project? |

Kiểm tra bằng hai tài khoản: Admin mở danh sách, thêm, sửa, tắt/bật câu hỏi; User thường gọi `/api/Admin/questions` và các thao tác ghi phải bị chặn bởi chính sách AdminOnly. Sau đó tạo hai phiên dùng cùng CV Backend, lần lượt chọn `vi` và `en`; chỉ câu đúng ngôn ngữ mới được chọn. Tắt một câu rồi tạo phiên mới để xác nhận câu tắt không được chọn. API `/api/Interview/sessions/{id}/questions` chỉ trả câu hỏi chưa trả lời tiếp theo.

Với Voice, kiểm tra trên thiết bị có giọng đọc `vi-VN` và `en-US`. Thu âm câu trả lời tiếng Việt/Anh rồi đối chiếu transcript STT. Thử CV tiếng Anh + phỏng vấn tiếng Việt và CV tiếng Việt + phỏng vấn tiếng Anh. Nếu thiếu giọng English trên trình duyệt, giao diện phải báo lỗi; không phát bằng giọng Việt. Thử mạng lỗi để xác nhận không đổi chéo ngôn ngữ.
