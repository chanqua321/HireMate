import { IndustryRoles } from '../types';
import {
  INDUSTRY_ROLES as CATALOG_INDUSTRY_ROLES,
  CAREER_FIELD_OPTIONS,
  resolveCatalogField,
  getRolesForField,
} from './careerFieldCatalog';

/** Single source of truth: careerFieldCatalog.ts */
export const INDUSTRY_ROLES: IndustryRoles = CATALOG_INDUSTRY_ROLES as IndustryRoles;

export { CAREER_FIELD_OPTIONS, resolveCatalogField, getRolesForField };

export const ROLE_MAPPINGS: Record<string, string> = {
  'Frontend Developer': 'Frontend Developer',
  'Backend Developer': 'Backend Developer',
  'Fullstack Developer': 'Fullstack Developer',
  'AI / ML Engineer': 'AI/ML Engineer',
  'AI/ML Engineer': 'AI/ML Engineer',
  'Data Analyst': 'Data Analyst',
  'Product Manager': 'Quản lý sản phẩm (Product Manager)',
  'PM': 'Quản lý sản phẩm (Product Manager)',
  'Quản lý sản phẩm': 'Quản lý sản phẩm (Product Manager)',
  'UI/UX Designer': 'Thiết kế UI/UX',
  'DevOps Engineer': 'DevOps Engineer',
  'Lập trình viên Frontend': 'Lập trình viên Frontend',
  'Lập trình viên Backend': 'Lập trình viên Backend',
  'Lập trình viên Fullstack': 'Lập trình viên Fullstack',
};

export const normalizeIndustry = (industry?: string): string => {
  if (!industry || !industry.trim()) return 'Công nghệ thông tin';
  const resolved = resolveCatalogField(industry);
  if (resolved) return resolved;

  const ind = industry.trim();
  const lower = ind.toLowerCase();
  if (lower.includes('fintech') || lower.includes('ngân hàng') || lower.includes('tài chính - ngân hàng')) {
    return 'Tài chính - Ngân hàng (Fintech)';
  }
  if (lower.includes('thương mại') || lower.includes('e-commerce') || lower.includes('ecommerce')) {
    return 'Thương mại điện tử (E-Commerce)';
  }
  if (lower.includes('thiết kế') || lower.includes('sáng tạo') || lower.includes('ui-ux')) {
    return 'Thiết kế & Sáng tạo';
  }
  if (lower.includes('marketing') || lower.includes('truyền thông') || lower.includes('kinh doanh')) {
    return 'Kinh doanh & Marketing';
  }
  if (lower.includes('tài chính') || lower.includes('kế toán')) {
    return 'Tài chính & Kế toán';
  }
  if (lower.includes('nhân sự') || lower.includes('tuyển dụng')) {
    return 'Nhân sự & Hành chính';
  }
  if (lower.includes('công nghệ') || lower.includes('it') || lower.includes('phần mềm')) {
    return 'Công nghệ thông tin';
  }

  for (const key of Object.keys(INDUSTRY_ROLES)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return key;
    }
  }

  return 'Công nghệ thông tin';
};

export const normalizeRole = (role?: string, industry?: string): string => {
  if (!role || !role.trim()) {
    const normInd = normalizeIndustry(industry);
    const list = getRolesForField(normInd);
    return list[0] || 'Backend Developer';
  }
  const r = role.trim();
  if (ROLE_MAPPINGS[r]) return ROLE_MAPPINGS[r];

  const lower = r.toLowerCase();
  if (lower.includes('product') || lower.includes('quản lý sản phẩm') || lower === 'pm' || lower.includes('product manager')) {
    return 'Quản lý sản phẩm (Product Manager)';
  }
  if (lower.includes('backend') || lower.includes('back-end')) return 'Backend Developer';
  if (lower.includes('frontend') || lower.includes('front-end')) return 'Frontend Developer';
  if (lower.includes('fullstack') || lower.includes('full-stack')) return 'Fullstack Developer';
  if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('ml')) return 'AI/ML Engineer';
  if (lower.includes('devops')) return 'DevOps Engineer';
  if (lower.includes('cyber') || lower.includes('bảo mật')) return 'Cybersecurity Engineer';
  if (lower.includes('qa') || lower.includes('kiểm thử')) return 'QA Engineer';
  if (lower.includes('data engineer')) return 'Data Engineer';
  if (lower.includes('data') || lower.includes('dữ liệu')) return 'Data Analyst';
  if (lower.includes('ui/ux') || lower.includes('thiết kế') || lower.includes('design')) return 'Thiết kế UI/UX';
  if (lower.includes('marketing intern')) return 'Marketing Intern';
  if (lower.includes('digital marketing')) return 'Digital Marketing';

  const normInd = normalizeIndustry(industry);
  const currentList = getRolesForField(normInd);
  const foundInCurrent = currentList.find((item) => item.toLowerCase() === lower);
  if (foundInCurrent) return foundInCurrent;

  for (const ind of Object.keys(INDUSTRY_ROLES)) {
    const match = INDUSTRY_ROLES[ind].find((item) => item.toLowerCase() === lower);
    if (match) return match;
  }

  // Preserve custom / legacy positions — do not force-rewrite.
  return r;
};
