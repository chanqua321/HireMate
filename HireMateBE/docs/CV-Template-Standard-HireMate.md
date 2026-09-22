# CV Tiêu chuẩn HireMate - template audit

Nguồn đo là PDF A4 hai trang do người dùng cung cấp. Tài liệu chỉ ghi nhận cấu trúc và thông số trình bày; không dùng nội dung cá nhân trong PDF làm dữ liệu mặc định.

## Thông số xác định được

- Khổ trang: A4, 594.96 x 841.92 pt; 2 trang; không xoay.
- Font nhúng: Roboto và Roboto 700.
- Cỡ chữ: tên 18.01 pt bold; vị trí và heading 12.01 pt; nội dung 9.75 pt.
- Màu chữ chính: RGB PDF `(0.1843, 0.3176, 0.451)`, xấp xỉ `#2F5173`.
- Lề nội dung: trái khoảng 18 pt; phải khoảng 14.2-15 pt; trên khoảng 12 pt.
- Ảnh hồ sơ: khoảng 89.29 x 118.55 pt, nằm trên trái; khối thông tin bắt đầu tại x khoảng 126.6 pt.
- Header: ảnh trái, tên/vị trí/contact phải; khoảng cách ảnh - nội dung khoảng 19.3 pt.
- Heading: chữ hoa, bold, màu xanh; separator đen khoảng 0.75 pt chạy gần hết chiều rộng nội dung.
- Entry: cột ngày khoảng 108.6 pt (xấp xỉ 19%); cột nội dung xấp xỉ 81%.
- Bullet quan sát được: dấu chấm tròn nhỏ; mỗi entry có separator xám nhạt.
- Thứ tự section quan sát được: mục tiêu nghề nghiệp, học vấn, kinh nghiệm làm việc, hoạt động, chứng chỉ, kỹ năng, sở thích, người giới thiệu, dự án.
- Page flow: section hoạt động tiếp tục sang trang 2; heading section không lặp lại; các entry riêng giữ cùng nhau khi còn đủ chỗ.

## Thông số không thể xác định chắc chắn

- Quy tắc kerning và hinting nội bộ của trình render nguồn.
- Line-height CSS gốc và spacing token trước khi PDF được tạo; renderer dùng giá trị đo gần đúng từ khoảng cách baseline.
- Cách crop/focus ảnh gốc ngoài khung hiển thị.
- Quy tắc widow/orphan chính xác của trình tạo PDF nguồn.
- Font fallback khi thiết bị không có Roboto. Renderer dùng Arial làm fallback cho web; PDF dùng font có sẵn trong QuestPDF runtime.

## Renderer architecture

`CvWizardAnswers/CareerProfile data -> CvTemplateDocumentMapper -> CvTemplateDocument + CvLayoutDefinition -> HireMateCvHtml | HireMateCvPdf`

`CvTemplateDocumentMapper` là mapping duy nhất, lọc item rỗng và không thêm nội dung. `CvLayoutDefinition` giữ `LayoutKey`/TemplateId cũ nhưng bổ sung page, header và entry metrics. HTML preview và PDF nhận cùng normalized document và cùng definition.

Các section optional. Renderer chỉ tạo heading khi section có dữ liệu. Avatar PDF hiện hỗ trợ data URI; URL ảnh từ xa không được tải ngầm trong quá trình render.
