# Hướng dẫn Kiến trúc Feature-Based (Production-Ready)

## 1. Tổng quan Kiến trúc
Dự án HireMateFE đã được tái cấu trúc chuyển đổi từ cấu trúc "Page-based" cũ sang "Feature-based". Cấu trúc mới mang tính module hóa cao, giúp quản lý state, logic, components và styles tách biệt theo từng Domain/Tính năng nghiệp vụ, dễ bảo trì, dễ mở rộng và ngăn chặn "css bleeding".

## 2. Cấu trúc thư mục lõi

```text
src/
├── app/                  # Các thành phần lõi của ứng dụng (Context, Router, Store)
├── features/             # (Quan trọng nhất) Chứa toàn bộ các Domain modules
│   ├── auth/             # Vd: Tính năng đăng nhập, đăng ký
│   ├── billing/          # Vd: Tính năng thanh toán
│   ├── dashboard/        # Vd: Tính năng bảng điều khiển chính
│   ├── home/             # Vd: Landing page
│   ├── interview/        # Vd: Tính năng luyện phỏng vấn AI
│   └── onboarding/       # Vd: Tính năng thiết lập hồ sơ người mới
├── shared/               # Chứa các thành phần dùng chung toàn dự án
│   ├── api/              # API Client (Axios instance, interceptors)
│   ├── components/       # Các UI Component độc lập, có thể tái sử dụng (Button, Modal, etc.)
│   ├── config/           # Cấu hình dự án (Constants, env)
│   ├── data/             # Dữ liệu tĩnh, mock data (questionBank, etc.)
│   ├── hooks/            # Custom Hooks dùng chung (useConfetti, useOutsideClick, etc.)
│   ├── layouts/          # Layout Components (MainLayout, AuthLayout, etc.)
│   ├── styles/           # CSS Global (index.css) - Chỉ chứa config chung, variables
│   ├── types/            # Typescript types dùng chung
│   └── utils/            # Helper functions (formatDate, calculateScore, etc.)
└── App.tsx               # Root component
```

## 3. Quy chuẩn Feature Module

Mỗi tính năng trong `src/features/[feature_name]/` phải tuân theo cấu trúc sau:

```text
src/features/[feature_name]/
├── api/                  # Khai báo các API service gọi tới Backend cho module này
│   └── [feature].service.ts
├── components/           # Các component con của tính năng
│   ├── ComponentA/
│   │   ├── css/
│   │   │   └── ComponentA.css  # CSS bị cô lập chỉ dùng cho ComponentA
│   │   └── ComponentA.tsx      # Code UI của ComponentA
│   └── ComponentB/
├── types/                # Các Interfaces/Types định nghĩa payload (bắt buộc)
│   └── index.ts
└── index.ts              # Export các thành phần public của feature này ra ngoài
```

## 4. Nguyên tắc Phát triển (Coding Standards)

1. **Giao tiếp API (Payload Interfaces)**
   - **Bắt buộc:** Tất cả API services (`[feature].service.ts`) và Custom Hooks phải nhận/trả về kiểu dữ liệu được định nghĩa bằng `interface` trong thư mục `types/` của tính năng đó.
   - Không được dùng `any` hoặc truyền biến tự do trong các payload call API.

2. **Cách ly Styles (CSS Isolation)**
   - Tuyệt đối không khai báo CSS trực tiếp ở thư mục dùng chung (như `src/styles/`) nếu style đó chỉ thuộc về một Component cụ thể.
   - Style chung cho toàn layout (container, font-family, scroll-effects, colors variables) được đặt ở `src/shared/styles/index.css`.
   - Mỗi một Component sẽ có một thư mục `css` con. Hãy viết class theo chuẩn BEM hoặc sử dụng class có tiền tố để tránh "bleeding" (ảnh hưởng chéo). Ví dụ: `.interview-setup-wrap { ... }`.

3. **Chia nhỏ Component (Component Decomposition)**
   - Không viết các Component quá lớn (trên 300 dòng). Hãy bóc tách thành các Component nhỏ hơn.
   - Vd: Thay vì viết một file `Dashboard.tsx` chứa cả biểu đồ và bảng, hãy tách `DashboardCharts.tsx` ra riêng trong cùng thư mục `components/`.

4. **Tính đóng gói (Encapsulation)**
   - Các module (`features`) không được import trực tiếp file nội bộ của module khác.
   - Việc giao tiếp/sử dụng chéo giữa các module bắt buộc phải thông qua file `index.ts` (Public API) của module đó.
   - Vd hợp lệ: `import { InterviewSetup } from '../../features/interview';`
   - Vd KHÔNG hợp lệ: `import { InterviewSetup } from '../../features/interview/components/InterviewSetup/InterviewSetup';`

5. **Shared Layer**
   - Chỉ những thành phần thực sự được dùng ở từ 2 Feature Modules trở lên mới được phép đặt vào `src/shared/`.
   - Bất cứ thứ gì chỉ dùng 1 lần đều thuộc về `features`.

## 5. Routing

- Tất cả quá trình config Router đều đặt tại `src/app/router/AppRouter.tsx`.
- `AppRouter` sẽ import các Pages/Container Components trực tiếp từ `features` (thông qua public index).

Chúc nhóm phát triển dự án hiệu quả và đúng chuẩn!
