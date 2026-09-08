---
title: "HireMate — Đặc tả nghiệp vụ (Business Rules)"
subtitle: "Bản chốt T1 — CV-first"
date: "7 tháng 9, 2026"
---

# Phạm vi và bản chốt

Tài liệu này khóa **nghiệp vụ T1** và gate sau T1, khớp bộ entity đã chốt:

- **Không tạo bảng mới.**
- Chỉ bổ sung cột trên **UserAccount**, **CareerProfile**, **CvDocument**.
- `OnboardingCompleted = true` nghĩa là đã **Confirm hồ sơ sau CV**, không còn nghĩa “xong form goal + personal”.

Mã rule: **BRxx**. Mức: **Bắt buộc** | **Không chặn** | **Sau T1**.

---

# Nhóm A — Tài khoản

## BR01. Đăng ký và đăng nhập

Hệ thống cho phép tạo tài khoản bằng email/mật khẩu hoặc Google. User phải xác nhận email (trừ Google đã xác nhận) trước khi vào cổng hồ sơ. Refresh token / logout / quên mật khẩu giữ như hệ thống hiện tại.

- Entity: `UserAccount`, `RefreshToken`, `Role`
- Mức: Bắt buộc

## BR02. Phiên làm việc

Mọi API cổng hồ sơ và app chính yêu cầu JWT hợp lệ. Token hết hạn thì refresh; refresh hết hạn thì đăng nhập lại.

- Entity: `RefreshToken`
- Mức: Bắt buộc

---

# Nhóm B — Gói dịch vụ

## BR03. Chọn gói trước cổng CV

Sau đăng nhập, user **phải chọn gói** trước khi nộp/tạo CV:

- **Free:** không thanh toán, ghi `CurrentPlanCode = free`, `PlanSelectedAt = now`, `IsPremium = false`.
- **Premium / Combo:** checkout (VNPay / PayOS / Mock). Khi Invoice `Paid`: `CurrentPlanCode` theo plan, `IsPremium = true`, `PlanSelectedAt = now` (nếu chưa có).

User chưa có `PlanSelectedAt` thì **chưa** vào cổng hồ sơ.

- Entity: `UserAccount`, `SubscriptionPlan`, `Invoice`, `Payment`, `PromoCode`
- Mức: Bắt buộc

## BR04. Free không bị chặn hoàn thiện hồ sơ

Gói Free **được** upload CV, wizard, **một lần** AI parse thành công để hoàn thiện hồ sơ, review và Confirm. Không được để Free “đăng ký xong không làm được T1” vì hết quota AI.

- Entity: `UserAccount.CurrentPlanCode`, `CvDocument`
- Mức: Bắt buộc

## BR05. Nâng cấp giữa chừng

User Free có thể nâng cấp Premium/Combo bất kỳ lúc nào (trước hoặc sau Confirm). Không bắt làm lại CV/onboarding. Chỉ được **nâng cấp lên gói cao hơn**, không mua lại cùng cấp.

- Entity: `Invoice`, `UserAccount`
- Mức: Bắt buộc

## BR06. Hạn gói

Thời hạn Premium/Combo suy từ `Invoice.PaidAt` + `SubscriptionPlan.DurationDays`. **Không** lưu `PlanExpiresAt` trên user (đã chốt T1).

- Mức: Sau T1 (vận hành billing)

---

# Nhóm C — Cổng hồ sơ (CV)

## BR07. Bắt buộc có CV để hoàn thiện hồ sơ

Hồ sơ chỉ hoàn thiện khi user có **ít nhất một** `CvDocument` và đã Confirm. Không còn onboarding form tách (goal → personal) như cổng vào.

- Entity: `CvDocument`, `UserAccount.OnboardingCompleted`
- Mức: Bắt buộc

## BR08. Hai nhánh cùng schema

| Nhánh | Điều kiện | Ghi |
|---|---|---|
| Upload | User đã có file PDF/DOCX | `Source = Upload` |
| Wizard | User chưa có CV | `Source = Wizard` + `WizardAnswersJson` + file render (HTML/PDF) |

Cả hai tạo `CvDocument`. Không tách “wizard chỉ lưu form”.

- Mức: Bắt buộc

## BR09. Wizard — đủ 10 câu

Wizard hỏi và lưu vào `WizardAnswersJson`: họ tên, trường, chuyên ngành, năm tốt nghiệp, ngành mong muốn, vị trí mong muốn, mức kinh nghiệm, bio, kỹ năng[], kinh nghiệm/dự án[]. Sau đó sinh CV đúng template HireMate, `ExtractedText` = nội dung đã sinh.

- Entity: `CvDocument.WizardAnswersJson`
- Mức: Bắt buộc (khi chọn nhánh B)

## BR10. Parse (cửa bắt buộc)

AI/parser đọc text CV. **ParseSucceeded = true** khi lấy được tối thiểu các field then chốt để Confirm: họ tên, trường, ngành mong muốn, vị trí mong muốn. Học vấn chi tiết / kỹ năng / kinh nghiệm có thể thiếu (sinh viên).

**Parse fail** (`ParseSucceeded = false`): file hỏng, không đọc được chữ, thiếu field then chốt → **không Confirm**. User upload lại hoặc chuyển wizard.

- Entity: `CvDocument.ParseSucceeded`, `ExtractedText`
- Mức: Bắt buộc

## BR11. ATS / template — chấm, không chặn file ngoài

Bốn điểm 0–100: Format, Keywords, Readability, Professionalism. `ReadinessScore` = trung bình có trọng số (công thức lúc implement).

- CV **Upload**: điểm thấp **vẫn Confirm** nếu parse đủ. Chỉ cảnh báo / gợi ý template HireMate.
- CV **Wizard**: mặc định đúng template; ATS chủ yếu chấm completeness.

Không dùng “sai template” để cấm vào app với file ngoài.

- Entity: bốn cột điểm + `ReadinessScore` + `Source`
- Mức: Không chặn (Upload); Wizard coi như đúng template

## BR12. Fit T1 không phải Fit JD

`FitT1Score` = độ khớp CV/hồ sơ với **vị trí/ngành mục tiêu** (extract hoặc wizard). Không so với một JD cụ thể. Fit JD lưu `JdMatchResult` **sau T1**.

- Entity: `CvDocument.FitT1Score` vs `JdMatchResult`
- Mức: Bắt buộc (phân tách)

## BR13. Quota parse Free

Free: **một** lần analyze **thành công** (`AnalyzedAt` khác null **và** `ParseSucceeded = true`). Lỗi hệ thống / JSON AI hỏng **không** ghi hai field đó → không trừ quota, được retry.

Premium/Combo: phân tích lại / nhiều CV không giới hạn bởi quota T1 này.

- Mức: Bắt buộc

## BR14. Review trước Confirm

AI điền nháp `CareerProfile` + `FullName`. User được sửa: họ tên, trường, chuyên ngành, năm TN, ngành/vị trí, mức kinh nghiệm, bio, hobbies, skills, experiences. AI **không lock** field.

- Entity: `CareerProfile`, `UserAccount.FullName`
- Mức: Bắt buộc

## BR15. Điều kiện Confirm

Confirm thành công khi **đủ tất cả**:

1. `PlanSelectedAt` khác null  
2. Có `CvDocument`  
3. CV đó `ParseSucceeded = true`  
4. `FullName`, `University`, `DesiredIndustry`, `DesiredPosition` không rỗng  

Khi Confirm:

- `OnboardingCompleted = true`
- `CareerProfile.ConfirmedAt = now`
- `CareerProfile.ConfirmedCvDocumentId = cvId`
- CV đó `IsConfirmed = true`, `ConfirmedAt = now`
- Các CV khác của user: `IsConfirmed = false`
- Ghi `CareerMemoryEvent` `ProfileConfirmed`

- Mức: Bắt buộc

## BR16. Một CV neo hồ sơ

Tại một thời điểm, user có **tối đa một** CV `IsConfirmed = true`. Confirm CV khác sẽ chuyển neo.

- Mức: Bắt buộc

## BR17. Không ghi đè sau Confirm

Khi `CareerProfile.ConfirmedAt` khác null, lần analyze sau **chỉ** cập nhật điểm/ATS/`AnalysisJson` trên `CvDocument`. Không ghi đè field hồ sơ trừ khi user bấm “Áp dụng lại từ CV” hoặc `PUT Profile`.

- Mức: Bắt buộc

## BR18. Login lại chưa xong T1

Nếu chưa `PlanSelectedAt` → màn chọn gói. Nếu đã chọn gói nhưng chưa `OnboardingCompleted` → cổng CV. Không vào Dashboard/app chính.

- Mức: Bắt buộc

---

# Nhóm D — App chính (sau T1)

## BR19. Vào Dashboard

Chỉ khi `OnboardingCompleted = true` và có CV đã confirm. Dashboard hiện Readiness, Fit T1, gói, CTA nâng cấp (nếu Free), và điểm phỏng vấn nếu có.

- Mức: Bắt buộc

## BR20. Phỏng vấn AI

Tạo session chỉ khi đã Confirm **và** `IsPremium = true` (Premium/Combo). Free không tạo session. Mode Voice chỉ Premium/Combo. Câu hỏi bám `DesiredIndustry` / `DesiredPosition` đã confirm.

- Entity: `InterviewSession`, `InterviewAnswer`, `Question`
- Mức: Sau T1 / Bắt buộc khi dùng tính năng

## BR21. Match JD và email xin việc

Chỉ sau Confirm. Gói Free: không (hoặc 1 lần/tháng — mặc định T1: **không**, chỉ Premium/Combo). Kết quả match lưu `JdMatchResult`, không ghi `FitT1Score`.

- Mức: Sau T1

## BR22. Career OS

Ghi event: `CvUploaded`, `CvGenerated`, `CvAnalyzed`, `ProfileConfirmed`, cộng event interview/match hiện có. Không thêm cột `CareerMemoryEvent`.

- Mức: Sau T1

## BR23. Growth

Referral, badge, leaderboard, benchmark chỉ sau khi đã vào app (`OnboardingCompleted`).

- Entity: `ReferralCode`, `ReferralInvite`, `Badge`, `UserBadge`
- Mức: Sau T1

---

# Nhóm E — Admin, B2B, công khai

## BR24. Admin không đi cổng CV

Admin CMS, user, revenue, ticket **không** bắt `OnboardingCompleted` theo luồng ứng viên.

- Mức: Bắt buộc (ngoại lệ vai trò)

## BR25. B2B

`UniversityAdmin` / `EnterpriseAdmin` dùng `Organization` + `OrganizationMember`. Xem tiến độ sinh viên/ứng viên (hồ sơ, CV, luyện phỏng vấn). Không thay schema T1.

- Mức: Sau T1

## BR26. Nội dung công khai

Waitlist, contact, ticket, blog, FAQ, pages, resources, bảng giá, question-bank (xem) không login. Không thay T1.

- Mức: Không bắt buộc T1

---

# Nhóm F — Dữ liệu JSON (không tách bảng)

## BR27. WizardAnswersJson

Object: `fullName`, `university`, `major`, `graduationYear`, `desiredIndustry`, `desiredPosition`, `experienceLevel`, `bio`, `skills[]`, `experiences[]`. Null nếu `Source = Upload`.

## BR28. SkillsJson / ExperiencesJson

- `SkillsJson`: mảng chuỗi, tối đa theo `nvarchar(2000)`.
- `ExperiencesJson`: mảng `{ title, org, period, description }`.

## BR29. AnalysisJson

Gồm `parseSucceeded`, bốn điểm ATS, `readinessScore`, `fitT1`, `extract` (cùng shape hồ sơ), `suggestions[]`. Raw AI; cột typed trên `CvDocument` là nguồn query.

---

# Ma trận gói (nhắc lại)

| Tính năng | Free | Premium | Combo |
|---|---|---|---|
| Chọn gói, CV, wizard | Có | Có | Có |
| AI parse hoàn thiện hồ sơ | 1 lần thành công | Nhiều | Nhiều |
| Confirm hồ sơ | Có | Có | Có |
| Phỏng vấn text/voice | Không | Có | Có |
| Match JD, email | Không (T1) | Có | Có |

---

# Entity chốt (tham chiếu)

Chỉ 3 bảng thêm cột: `UserAccount` (`CurrentPlanCode`, `PlanSelectedAt`); `CareerProfile` (`SkillsJson`, `ExperiencesJson`, `ConfirmedAt`, `ConfirmedCvDocumentId`); `CvDocument` (`Source`, `ParseSucceeded`, `ReadinessScore`, `FitT1Score`, `IsConfirmed`, `ConfirmedAt`, `WizardAnswersJson`).

Chi tiết ERD: file `HireMate-ERD.md`.
