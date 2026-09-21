/**
 * Career Field → Target Position catalog (shared across Profile / Interview / Onboarding).
 * Extensible: add industries or roles without hard-coding only IT.
 */
export const CUSTOM_ROLE_OPTION = 'Khác (tự nhập)';

export const INDUSTRY_ROLES: Record<string, string[]> = {
  'Công nghệ thông tin': [
    'Backend Developer',
    'Frontend Developer',
    'Fullstack Developer',
    'Mobile Developer',
    'DevOps Engineer',
    'Software Engineer',
    'Data Analyst',
    'Data Engineer',
    'AI/ML Engineer',
    'Cybersecurity Engineer',
    'QA Engineer',
    'Business Analyst',
    'Database Developer/Administrator',
    'Quản lý sản phẩm (Product Manager)',
  ],
  'Kinh doanh & Marketing': [
    'Marketing Intern',
    'Digital Marketing',
    'Content Marketing',
    'Performance Marketing',
    'Social Media',
    'Brand Marketing',
    'SEO',
    'CRM Marketing',
    'Nhân viên Kinh doanh (B2B Sales)',
    'Quản lý Tài khoản (Account Manager)',
    'Chuyên viên PR & Truyền thông',
  ],
  'Tài chính - Ngân hàng (Fintech)': [
    'Financial Analyst',
    'Accountant',
    'Auditor',
    'Banking Officer',
    'Chuyên viên Phân tích Tài chính',
    'Kế toán tổng hợp',
    'Kiểm toán viên nội bộ',
    'Chuyên viên Đầu tư',
    'Quản lý sản phẩm (Product Manager)',
  ],
  'Tài chính & Kế toán': [
    'Accountant',
    'Financial Analyst',
    'Auditor',
    'Chuyên viên Phân tích Tài chính',
    'Kế toán tổng hợp',
    'Kiểm toán viên nội bộ',
    'Chuyên viên Đầu tư',
  ],
  'Thương mại điện tử (E-Commerce)': [
    'Chuyên viên Vận hành E-Commerce',
    'Digital Marketing',
    'Fullstack Developer',
    'Quản lý sản phẩm (Product Manager)',
  ],
  'Thiết kế & Sáng tạo': [
    'Thiết kế UI/UX',
    'Thiết kế Đồ họa (Graphic Designer)',
    'Biên tập nội dung (Content Writer)',
    'Giám đốc Sáng tạo (Creative Director)',
  ],
  'Nhân sự & Hành chính': [
    'Chuyên viên Tuyển dụng (TA)',
    'Chuyên viên Đào tạo (L&D)',
    'Quản lý Nhân sự (HR Manager)',
    'Chuyên viên Lương thưởng (C&B)',
  ],
  'Dịch vụ Khách hàng & Khác': [
    'Chuyên viên Tư vấn Khách hàng',
    'Quản lý Hoạt động (Operations)',
    'Chăm sóc khách hàng',
    'Quản lý dự án',
  ],
};

/** Alias / legacy field labels → catalog keys (do not mutate stored value automatically). */
const FIELD_ALIASES: Record<string, string> = {
  'Marketing & Truyền thông': 'Kinh doanh & Marketing',
  'Quản trị Nhân sự & Tuyển dụng': 'Nhân sự & Hành chính',
  'Thiết kế Đồ họa / UI-UX': 'Thiết kế & Sáng tạo',
  'Logistics & Chuỗi cung ứng': 'Dịch vụ Khách hàng & Khác',
  'Giáo dục & Đào tạo': 'Dịch vụ Khách hàng & Khác',
  'Y tế & Chăm sóc sức khỏe': 'Dịch vụ Khách hàng & Khác',
  'Khách sạn & Du lịch': 'Dịch vụ Khách hàng & Khác',
  'Bất động sản & Xây dựng': 'Dịch vụ Khách hàng & Khác',
  'Kỹ thuật & Cơ khí': 'Công nghệ thông tin',
};

export const CAREER_FIELD_OPTIONS = Object.keys(INDUSTRY_ROLES);

export function resolveCatalogField(field?: string): string | null {
  if (!field?.trim()) return null;
  const raw = field.trim();
  if (INDUSTRY_ROLES[raw]) return raw;
  if (FIELD_ALIASES[raw] && INDUSTRY_ROLES[FIELD_ALIASES[raw]]) return FIELD_ALIASES[raw];
  const lower = raw.toLowerCase();
  for (const key of CAREER_FIELD_OPTIONS) {
    if (key.toLowerCase() === lower) return key;
  }
  for (const [alias, target] of Object.entries(FIELD_ALIASES)) {
    if (alias.toLowerCase() === lower) return target;
  }
  return null;
}

export function getRolesForField(field?: string): string[] {
  const key = resolveCatalogField(field);
  if (key) return [...INDUSTRY_ROLES[key]];
  return [];
}

export function isRoleSuggestedForField(role?: string, field?: string): boolean {
  if (!role?.trim()) return true;
  const roles = getRolesForField(field);
  if (roles.length === 0) return true;
  const lower = role.trim().toLowerCase();
  return roles.some((r) => r.toLowerCase() === lower);
}

/** Soft template preference by field — does NOT change layout, only sort order. */
export function sortTemplatesForField<
  T extends { name?: string | null; description?: string | null; isSystemTemplate?: boolean },
>(templates: T[], field?: string): T[] {
  const catalog = resolveCatalogField(field) || '';
  const preferTech = catalog === 'Công nghệ thông tin';
  const preferMarketing = catalog === 'Kinh doanh & Marketing' || /marketing/i.test(field || '');
  const preferFinance = /tài chính|kế toán|fintech/i.test(catalog);

  const score = (t: T): number => {
    const blob = `${t.name || ''} ${t.description || ''}`.toLowerCase();
    let s = t.isSystemTemplate ? 10 : 5;
    if (preferTech && /(modern 01|professional|tech|engineer|dev)/i.test(blob)) s += 3;
    if (preferMarketing && /(modern 02|marketing|creative|content)/i.test(blob)) s += 3;
    if (preferFinance && /(finance|accounting|modern 01)/i.test(blob)) s += 2;
    return s;
  };

  return [...templates].sort((a, b) => score(b) - score(a));
}
