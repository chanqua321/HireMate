import { Question, IndustryRoles } from '../types';
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

export const QUESTION_BANK: Question[] = [
  {
    cat: 'Frontend',
    q: 'Sự khác nhau giữa let, const và var trong JavaScript là gì?',
    hint: 'Phạm vi (scope), hoisting và khả năng gán lại giá trị.',
  },
  {
    cat: 'Frontend',
    q: 'Virtual DOM là gì và vì sao React sử dụng nó?',
    hint: 'So sánh cây DOM ảo, cơ chế reconciliation và hiệu năng.',
  },
  {
    cat: 'Frontend',
    q: 'Hãy giải thích cách hoạt động của CSS Flexbox và khi nào nên dùng Grid.',
    hint: 'Trục chính/trục phụ, bố cục 1 chiều vs 2 chiều.',
  },
  {
    cat: 'Frontend',
    q: 'Closure trong JavaScript là gì? Cho một ví dụ thực tế.',
    hint: 'Hàm ghi nhớ phạm vi nơi nó được tạo ra.',
  },
  {
    cat: 'Frontend',
    q: 'Làm thế nào để tối ưu hiệu năng tải trang của một ứng dụng web?',
    hint: 'Lazy-load, code splitting, nén ảnh, caching, CDN.',
  },
  {
    cat: 'Frontend',
    q: 'Phân biệt giữa Server-Side Rendering và Client-Side Rendering.',
    hint: 'SEO, thời gian hiển thị đầu tiên, tải tương tác.',
  },

  {
    cat: 'Backend',
    q: 'REST API là gì? Các nguyên tắc thiết kế REST tốt gồm những gì?',
    hint: 'Stateless, tài nguyên, HTTP verbs, mã trạng thái.',
  },
  {
    cat: 'Backend',
    q: 'Sự khác nhau giữa SQL và NoSQL? Khi nào nên dùng loại nào?',
    hint: 'Lược đồ, khả năng mở rộng, tính nhất quán, quan hệ.',
  },
  {
    cat: 'Backend',
    q: 'Bạn xử lý xác thực và phân quyền trong API như thế nào?',
    hint: 'JWT, session, OAuth2, vai trò và quyền hạn.',
  },
  {
    cat: 'Backend',
    q: 'Index trong cơ sở dữ liệu hoạt động ra sao và đánh đổi của nó là gì?',
    hint: 'Tăng tốc đọc, chậm ghi, tốn bộ nhớ.',
  },
  {
    cat: 'Backend',
    q: 'Làm thế nào để mở rộng (scale) một hệ thống có lượng truy cập lớn?',
    hint: 'Cân bằng tải, caching, hàng đợi, phân mảnh dữ liệu.',
  },
  {
    cat: 'Backend',
    q: 'Giải thích sự khác biệt giữa xử lý đồng bộ và bất đồng bộ.',
    hint: 'Blocking vs non-blocking, callback, promise, hiệu năng.',
  },

  {
    cat: 'Data',
    q: 'Quy trình làm sạch dữ liệu (data cleaning) gồm những bước nào?',
    hint: 'Xử lý thiếu, trùng lặp, ngoại lệ, chuẩn hóa.',
  },
  {
    cat: 'Data',
    q: 'Phân biệt giữa tương quan (correlation) và nhân quả (causation).',
    hint: 'Hai biến cùng biến thiên không đồng nghĩa cái này gây ra cái kia.',
  },
  {
    cat: 'Data',
    q: 'Bạn sẽ trình bày một insight phức tạp cho người không chuyên ra sao?',
    hint: 'Trực quan hóa, kể chuyện bằng dữ liệu, tập trung tác động.',
  },
  {
    cat: 'Data',
    q: 'Overfitting là gì và làm thế nào để hạn chế nó?',
    hint: 'Regularization, cross-validation, thêm dữ liệu.',
  },

  {
    cat: 'Hành vi (HR)',
    q: 'Hãy kể về một lần bạn vượt qua thử thách lớn trong công việc.',
    hint: 'Dùng cấu trúc STAR: Tình huống, Nhiệm vụ, Hành động, Kết quả.',
  },
  {
    cat: 'Hành vi (HR)',
    q: 'Điểm mạnh và điểm yếu lớn nhất của bạn là gì?',
    hint: 'Trung thực, gắn với vị trí, nêu cách bạn cải thiện.',
  },
  {
    cat: 'Hành vi (HR)',
    q: 'Vì sao bạn muốn ứng tuyển vào vị trí này?',
    hint: 'Liên hệ giá trị bản thân với mục tiêu công ty.',
  },
  {
    cat: 'Hành vi (HR)',
    q: 'Kể về một lần bạn bất đồng với đồng nghiệp và cách bạn xử lý.',
    hint: 'Lắng nghe, dữ liệu, tìm tiếng nói chung.',
  },
  {
    cat: 'Hành vi (HR)',
    q: 'Bạn hình dung mình ở đâu sau 5 năm nữa?',
    hint: 'Định hướng phát triển rõ ràng, thực tế.',
  },
  {
    cat: 'Hành vi (HR)',
    q: 'Hãy kể về một thất bại và bài học bạn rút ra.',
    hint: 'Nhận trách nhiệm, tập trung vào sự trưởng thành.',
  },

  {
    cat: 'Quản lý sản phẩm',
    q: 'Bạn ưu tiên các tính năng trong một sản phẩm như thế nào?',
    hint: 'Tác động, công sức, RICE, giá trị người dùng.',
  },
  {
    cat: 'Quản lý sản phẩm',
    q: 'Làm sao để đo lường thành công của một tính năng mới?',
    hint: 'Chỉ số bắc cầu (north star), retention, chuyển đổi.',
  },
  {
    cat: 'Quản lý sản phẩm',
    q: 'Mô tả cách bạn làm việc với đội kỹ thuật và thiết kế.',
    hint: 'Giao tiếp, đồng cảm, mục tiêu chung, lộ trình.',
  },

  {
    cat: 'Thiết kế (UI/UX)',
    q: 'Hãy mô tả quy trình thiết kế lấy người dùng làm trung tâm của bạn.',
    hint: 'Nghiên cứu, phác thảo, prototype, kiểm thử, lặp lại.',
  },
  {
    cat: 'Thiết kế (UI/UX)',
    q: 'Làm thế nào để cân bằng giữa thẩm mỹ và khả năng sử dụng?',
    hint: 'Ưu tiên rõ ràng, phân cấp thị giác, kiểm thử usability.',
  },
  {
    cat: 'Thiết kế (UI/UX)',
    q: 'Bạn xử lý phản hồi trái chiều về thiết kế của mình ra sao?',
    hint: 'Dựa trên dữ liệu, mục tiêu người dùng, không cái tôi.',
  },

  {
    cat: 'Marketing',
    q: 'Bạn xây dựng một chiến dịch marketing từ con số 0 như thế nào?',
    hint: 'Mục tiêu, chân dung khách hàng, kênh, ngân sách, đo lường.',
  },
  {
    cat: 'Marketing',
    q: 'Các chỉ số quan trọng nào dùng để đánh giá hiệu quả marketing?',
    hint: 'CAC, ROAS, tỷ lệ chuyển đổi, CTR, LTV.',
  },
  {
    cat: 'Marketing',
    q: 'Bạn phân khúc và xây dựng chân dung khách hàng mục tiêu như thế nào?',
    hint: 'Nhân khẩu học, hành vi, nhu cầu, kênh tiếp cận.',
  },
];
