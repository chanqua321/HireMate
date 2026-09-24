---
title: "HireMate — Đặc tả nghiệp vụ (Business Rules)"
subtitle: "Bản chốt T1.1 — CV-first Personalized Interview"
date: "19 tháng 9, 2026"
---

# Phạm vi và bản chốt

Tài liệu này khóa **nghiệp vụ T1.1**: cổng hồ sơ **CV-first**, chọn gói **sau** analyze CV, và **Interview cá nhân hóa** dựa trên CV đã Confirm (không dùng Easy / Medium / Hard).

- **Không tạo bảng mới** nếu có thể lưu context/feedback bằng JSON trên entity hiện có (`InterviewSession`, `InterviewAnswer`, `CareerMemoryEvent`, `CvDocument`, `CareerProfile`).
- Chỉ bổ sung cột trên **UserAccount**, **CareerProfile**, **CvDocument**, và (nếu cần) JSON trên **InterviewSession** / **InterviewAnswer** — không tách bảng PersonalizedInterviewProfile.
- `OnboardingCompleted = true` nghĩa là đã **Confirm hồ sơ sau CV + đã chọn gói**.

Mã rule: **BRxx**. Mức: **Bắt buộc** | **Không chặn** | **Sau T1**.

---

# Luồng onboarding (T1.1)

```text
Register / Login
→ Upload CV hoặc CV Wizard
→ Parse & Validate CV
→ AI Analyze CV (Free: 1 lần analyze thành công)
→ Build / Review Career Profile
→ Chọn Plan (Free / Standard / Premium)
→ Confirm Onboarding
→ Interview (cá nhân hóa theo CV + vị trí + JD tùy chọn)
```

`GetStatusAsync().NextStep` theo thứ tự:

1. `upload_cv` — chưa có `CvDocument`
2. `analyze` — có CV nhưng chưa analyze thành công (`ParseSucceeded + AnalyzedAt`)
3. `select_plan` — đã analyze thành công, chưa `PlanSelectedAt`
4. `review_confirm` — đã chọn gói, chưa `OnboardingCompleted`
5. `done` — đã Confirm (vào app / Interview)

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

## BR03. Chọn gói sau analyze CV (CV-first)

Sau đăng nhập, user **được Upload / Wizard / Analyze CV trước**, không cần `PlanSelectedAt`.

Sau khi có ít nhất một CV analyze **thành công**, user **phải chọn gói** trước khi Confirm:

- **Free:** không thanh toán, ghi `CurrentPlanCode = free`, `PlanSelectedAt = now`, `IsPremium = false`.
- **Standard / Premium (Combo):** checkout (PayOS / Mock; VNPay tùy cấu hình). Khi Invoice `Paid`: cập nhật `CurrentPlanCode`, `IsPremium` theo plan, `PlanSelectedAt = now` (nếu chưa có).

User chưa có `PlanSelectedAt` thì **chưa Confirm** và **chưa vào Interview**.

- Entity: `UserAccount`, `SubscriptionPlan`, `Invoice`, `Payment`, `PromoCode`
- Mức: Bắt buộc

## BR04. Free — một lần analyze thành công (không chặn cổng CV)

- `UploadAsync` / `CreateFromWizardAsync`: **không** gọi `RequirePlanAsync`.
- `AnalyzeAsync`: **không** yêu cầu đã chọn plan. User chưa chọn plan = Free (`rank = 0`).
- Free chỉ **consume 1 lượt** khi analyze **thành công** (`ParseSucceeded = true` **và** `AnalyzedAt` khác null).
- Upload / parse / AI fail (JSON hỏng, không đọc được chữ, lỗi hệ thống) → **không** trừ lượt Free, được retry.
- Không được để Free “đăng ký xong không làm được T1” vì bị chặn chọn gói trước CV.

- Entity: `UserAccount.CurrentPlanCode`, `CvDocument`
- Mức: Bắt buộc

## BR05. Nâng cấp giữa chừng

User Free có thể nâng cấp Standard/Premium bất kỳ lúc nào (trước hoặc sau Confirm). Không bắt làm lại CV/onboarding. Chỉ được **nâng cấp lên gói cao hơn**, không mua lại cùng cấp.

- Entity: `Invoice`, `UserAccount`
- Mức: Bắt buộc

## BR06. Hạn gói

Thời hạn Standard/Premium suy từ `Invoice.PaidAt` + `SubscriptionPlan.DurationDays`. **Không** lưu `PlanExpiresAt` trên user (đã chốt T1).

- Mức: Sau T1 (vận hành billing)

---

# Nhóm C — Cổng hồ sơ (CV)

## BR07. Bắt buộc có CV để hoàn thiện hồ sơ

Hồ sơ chỉ hoàn thiện khi user có **ít nhất một** `CvDocument` analyze thành công và đã Confirm. Form goal/personal tách (nếu còn UI) chỉ là bổ sung field, không thay CV.

- Entity: `CvDocument`, `UserAccount.OnboardingCompleted`
- Mức: Bắt buộc

## BR08. Hai nhánh cùng schema

| Nhánh | Điều kiện | Ghi |
|---|---|---|
| Upload | User đã có file PDF/DOCX | `Source = Upload` |
| Wizard | User chưa có CV | `Source = Wizard` + `WizardAnswersJson` + file render (HTML/PDF) |

Cả hai tạo `CvDocument`. Không tách “wizard chỉ lưu form”.

- Mức: Bắt buộc

## BR09. Wizard — đủ field then chốt

Wizard hỏi và lưu vào `WizardAnswersJson`: họ tên, trường, chuyên ngành, năm tốt nghiệp, ngành mong muốn, vị trí mong muốn, mức kinh nghiệm, bio, kỹ năng[], kinh nghiệm/dự án[]. Sau đó sinh CV đúng template HireMate, `ExtractedText` = nội dung đã sinh.

- Entity: `CvDocument.WizardAnswersJson`
- Mức: Bắt buộc (khi chọn nhánh Wizard)

## BR10. Parse (cửa bắt buộc)

AI/parser đọc text CV. **ParseSucceeded = true** khi lấy được tối thiểu các field then chốt để Confirm: họ tên, trường, ngành mong muốn, vị trí mong muốn. Học vấn chi tiết / kỹ năng / kinh nghiệm có thể thiếu (sinh viên).

**Parse fail** (`ParseSucceeded = false`): file hỏng, không đọc được chữ, thiếu field then chốt → **không Confirm**. User upload lại hoặc chuyển wizard.

- Entity: `CvDocument.ParseSucceeded`, `ExtractedText`
- Mức: Bắt buộc

## BR11. ATS / template — chấm, không chặn file ngoài

Bốn điểm 0–100: Format, Keywords, Readability, Professionalism. `ReadinessScore` = trung bình có trọng số (công thức lúc implement).

- CV **Upload**: điểm thấp **vẫn Confirm** nếu parse đủ. Chỉ cảnh báo / gợi ý template HireMate.
- CV **Wizard**: mặc định đúng template; ATS chủ yếu chấm completeness.

- Entity: bốn cột điểm + `ReadinessScore` + `Source`
- Mức: Không chặn (Upload); Wizard coi như đúng template

## BR12. Fit T1 không phải Fit JD

`FitT1Score` = độ khớp CV/hồ sơ với **vị trí/ngành mục tiêu** trên hồ sơ (extract hoặc wizard). Không so với một JD cụ thể của một lần Interview. Fit JD / skill-gap theo JD nằm trong **Personalized Interview Profile** (BR30+) hoặc `JdMatchResult` (Match feature).

- Entity: `CvDocument.FitT1Score` vs context Interview / `JdMatchResult`
- Mức: Bắt buộc (phân tách)

## BR13. Quota parse theo bảng giá (tháng)

Mỗi gói có trần analyze **thành công** / tháng (không unlimited):

| Gói | Analyze CV OK / tháng |
|---|---|
| Free (0đ) | 1 |
| Standard (79k) | 20 |
| Premium (149k) | 70 |

Lỗi hệ thống / JSON AI hỏng **không** ghi `AnalyzedAt` + `ParseSucceeded = true` → không trừ quota. Re-analyze cùng CV đã thành công không tính thêm lượt.

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

## BR18. Login lại chưa xong onboarding

Theo `NextStep` (BR luồng trên):

- `upload_cv` / `analyze` → cổng CV  
- `select_plan` → Pricing  
- `review_confirm` → review + Confirm  
- `done` → Dashboard / Interview  

Không vào Interview khi chưa `OnboardingCompleted`.

- Mức: Bắt buộc

---

# Nhóm D — App chính (sau Confirm)

## BR19. Vào Dashboard

Chỉ khi `OnboardingCompleted = true` và có CV đã confirm. Dashboard hiện Readiness, Fit T1, gói, CTA nâng cấp (nếu Free), và điểm / lịch sử phỏng vấn nếu có.

- Mức: Bắt buộc

## BR20. Phỏng vấn AI — quyền truy cập & quota

Tạo session khi:

1. `OnboardingCompleted = true`  
2. Có CV neo (`IsConfirmed`) làm context chính  
3. Còn **monthly interview quota** theo gói  

Quota tháng (đếm session tạo thành công trong chu kỳ billing/tháng):

| Gói | Interviews / tháng |
|---|---|
| Free | 3 |
| Standard | 15 |
| Premium | 50 |

- **Không** dùng `RequireActivePlanAsync(minRank: 1)` để chặn Free Interview.
- **Voice** vẫn chỉ Standard/Premium nếu rule hiện tại yêu cầu gói cao hơn Text (giữ gate Voice riêng).
- Match JD / Email gen / Career OS trả phí: giữ gate Premium/Standard như hiện tại (không đổi trong BR này trừ khi product đổi riêng).

`build-context` **không** trừ quota. Chỉ `CreateSession` thành công mới trừ quota.

- Entity: `InterviewSession`, `InterviewAnswer`
- Mức: Bắt buộc

## BR20a. Không dùng Easy / Medium / Hard

Interview **không** có lựa chọn độ khó Easy / Medium / Hard (UI và API). Không tạo endpoint `suggest-difficulty`.

Setup chỉ cần:

- **Target Position** (bắt buộc)  
- **Optional Job Description** (dán JD nếu có)  
- **Industry** (tùy chọn / suy từ hồ sơ)  
- **cvDocumentId** (mặc định CV đã Confirm)

- Mức: Bắt buộc

## BR30. Personalized Interview Profile (context)

Trước khi tạo session, hệ thống dựng **Personalized Interview Profile** từ:

- Confirmed CV + Career Profile  
- Target Position + optional JD  
- Experience, skills, projects, achievements, education, certifications (nếu có trong CV/profile JSON)  
- Career goals / skill gaps / CV evidence  
- Previous interview history, weaknesses, feedback (Career Memory)  
- Readiness / FitT1 nếu có  

Profile phải xác định tối thiểu:

- Candidate experience level  
- Relevant / matched skills và skill gaps  
- Relevant projects & evidence có trên CV vs cần validate  
- Relevant experience  
- Role-specific requirements (từ Position + JD)  
- Behavioral / technical / problem-solving areas  
- Previous weaknesses & areas to explore deeper  

API:

```http
POST /api/Interview/build-context
```

Body ví dụ:

```json
{
  "position": "Backend Developer",
  "industry": "Technology",
  "jobDescription": "...",
  "cvDocumentId": "..."
}
```

Response = Personalized Interview Context/Profile để FE hiển thị / truyền vào `CreateSession`. **Không consume quota.**

- Lưu: JSON trên session khi Create (ví dụ `ContextJson`) hoặc tái dựng từ cùng input — không bắt buộc bảng mới.
- Mức: Bắt buộc

## BR31. Question generation — bám Profile, không generic

Question Generator dựa trên Personalized Interview Profile, **không** lấy random câu hỏi chỉ vì “Backend phổ biến”.

Nhóm câu hỏi ưu tiên:

- CV-based, Role-specific, JD-specific  
- Project / Technical / Behavioral / Problem-solving  
- Experience validation, Skill validation  

Ưu tiên nội dung **có evidence trên CV** và **khớp vị trí apply**. Ngân hàng câu hỏi tĩnh chỉ là fallback khi thiếu dữ liệu.

- Mức: Bắt buộc

## BR32. Adaptive Interview

Flow trong một session:

```text
Generate Question
→ User Answer
→ Analyze Answer
→ Detect missing information / weakness
→ Generate relevant follow-up (nếu cần)
→ Continue
```

**Không** cố định toàn bộ danh sách câu hỏi từ đầu. Follow-up phải đào sâu contribution / evidence khi câu trả lời mơ hồ hoặc lệch CV.

- Mức: Bắt buộc (MVP Interview T1.1)

## BR33. Answer analysis

Mỗi câu trả lời phân tích (điểm hoặc nhãn) theo:

Relevance, Accuracy, Completeness, Technical Knowledge, Problem Solving, Communication, STAR Structure, Evidence, **Consistency with CV**.

Nếu CV ghi skill/project/achievement mà user không giải thích được → ghi **area cần cải thiện / cần xác minh**.

- Entity: điểm/JSON trên `InterviewAnswer` hoặc payload AI log qua `CareerMemoryEvent`
- Mức: Bắt buộc

## BR34. Final feedback

Khi Complete session, feedback cá nhân hóa gồm:

Strengths, Weaknesses, Skill Gaps, Missing Evidence, Technical Improvement, Behavioral Improvement, CV-related Issues, Recommended Practice Areas, Interview Readiness.

Feedback **liên kết** CV + Target Position + JD (nếu có) + answers — không chỉ một điểm tổng.

- Entity: `InterviewSession` feedback fields / JSON summary
- Mức: Bắt buộc

## BR35. Career Memory sau Interview

Sau Interview, ghi `CareerMemoryEvent` (và/hoặc cập nhật summary JSON) gồm:

Interview history, strengths, weaknesses, skill gaps, previous Q/A highlights, feedback, readiness, improvement areas.

Lần Interview sau: `build-context` **phải** đọc memory để tránh hỏi trùng hoàn toàn và ưu tiên điểm còn yếu.

- Entity: `CareerMemoryEvent` (không thêm cột bắt buộc nếu PayloadJson đủ)
- Mức: Bắt buộc

## BR21. Match JD và email xin việc

Chỉ sau Confirm. Free: mặc định **không** (hoặc theo product riêng). Standard/Premium: có. Kết quả match lưu `JdMatchResult`, không ghi đè `FitT1Score`.

- Mức: Sau T1

## BR22. Career OS

Ghi event: `CvUploaded`, `CvGenerated`, `CvAnalyzed`, `ProfileConfirmed`, cộng event interview/match. Không bắt buộc thêm cột `CareerMemoryEvent`.

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

`UniversityAdmin` / `EnterpriseAdmin` dùng `Organization` + `OrganizationMember`. Xem tiến độ sinh viên/ứng viên. Không thay schema T1.1 lõi.

- Mức: Sau T1

## BR26. Nội dung công khai

Waitlist, contact, ticket, blog, FAQ, pages, resources và bảng giá không yêu cầu đăng nhập. Question Bank là dữ liệu quản trị, chỉ Admin được xem và chỉnh sửa; người dùng chỉ nhận câu hỏi hiện tại trong phiên phỏng vấn.

- Mức: Không bắt buộc T1

---

# Nhóm F — Dữ liệu JSON (không tách bảng)

## BR27. WizardAnswersJson

Object: `fullName`, `university`, `major`, `graduationYear`, `desiredIndustry`, `desiredPosition`, `experienceLevel`, `bio`, `skills[]`, `experiences[]`. Null nếu `Source = Upload`.

## BR28. SkillsJson / ExperiencesJson

- `SkillsJson`: mảng chuỗi.  
- `ExperiencesJson`: mảng `{ title, org, period, description }`.

## BR29. AnalysisJson

Gồm `parseSucceeded`, bốn điểm ATS, `readinessScore`, `fitT1`, `extract`, `suggestions[]`.

## BR36. Interview ContextJson / AnswerAnalysisJson

- Context lúc CreateSession: Personalized Interview Profile (BR30).  
- Mỗi answer: kết quả phân tích (BR33).  
- Session complete: feedback object (BR34).  

Không tạo bảng `PersonalizedInterviewProfile` riêng ở T1.1.

---

# Ma trận gói (T1.1)

| Tính năng | Free (0đ) | Standard (79k) | Premium (149k) |
|---|---|---|---|
| Upload / Wizard CV trước khi chọn gói | Có | Có | Có |
| AI analyze CV thành công / tháng | **1** | **20** | **70** |
| Chọn gói rồi Confirm | Có | Có | Có |
| Phỏng vấn text / tháng | **3** | **15** | **50** |
| Phỏng vấn Voice | Không | Không | Có |
| Match JD, email | Không | Có | Có |
| Easy / Medium / Hard | **Không dùng** | **Không dùng** | **Không dùng** |
| Không giới hạn | **Không** | **Không** | **Không** |

---

# Entity chốt (tham chiếu)

Cột chính vẫn trên: `UserAccount` (`CurrentPlanCode`, `PlanSelectedAt`); `CareerProfile` (`SkillsJson`, `ExperiencesJson`, `ConfirmedAt`, `ConfirmedCvDocumentId`); `CvDocument` (`Source`, `ParseSucceeded`, `ReadinessScore`, `FitT1Score`, `IsConfirmed`, `ConfirmedAt`, `WizardAnswersJson`).

Interview: dùng JSON trên session/answer + `CareerMemoryEvent.PayloadJson` cho Personalized Profile / adaptive / feedback — **không bắt buộc bảng mới**.

Chi tiết ERD: file `HireMate-ERD.md` (cập nhật khi thêm cột JSON session nếu implement cần).

---

# Nguyên tắc triển khai (nhắc product)

- Không đổi PayOS / AI model config trong phạm vi BR này.  
- Không rewrite toàn bộ ERD nếu JSON đủ.  
- Không dùng AI chỉ để “chọn độ khó”.  
- Mục tiêu: **mỗi buổi phỏng vấn riêng cho từng ứng viên**, bám CV + vị trí + JD + lịch sử; câu hỏi tiếp theo **adaptive** theo câu trả lời.
