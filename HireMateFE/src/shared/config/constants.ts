import { Profile, InterviewConfig } from '../types';

export const STORAGE_KEYS = {
  PROFILE: 'hm_profile',
  INTERVIEW_CONFIG: 'hm_interview_config',
  HISTORY: 'hm_history',
  LAST_RESULT: 'hm_last_result',
  THEME: 'hm_theme',
} as const;

export const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '880378565694-upeoqhh7hnn1souk68uargs9q7fnjoji.apps.googleusercontent.com';

export const SOLE_ADMIN_EMAIL = 'admin@gmail.com';

export const isSoleAdminEmail = (email?: string | null) =>
  (email || '').trim().toLowerCase() === SOLE_ADMIN_EMAIL;

export const DEFAULT_PROFILE: Profile = {
  name: '',
  role: '',
  field: '',
  bio: '',
  exp: '',
  hobbies: [],
};

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  field: '',
  role: '',
  difficulty: 'Trung bình',
  mode: 'Text',
};

const DUMMY_FIELDS = new Set(['công nghệ thông tin']);
const DUMMY_EXP = new Set([
  '1-3 năm',
  '1 - 3 năm',
  '1 - 3 năm (mid-level)',
  '1 - 2 năm kinh nghiệm',
]);
const DUMMY_SCHOOLS = new Set([
  'đại học bách khoa tp.hcm',
  'đại học bách khoa tp.hcm - kỹ thuật phần mềm',
  'đại học bách khoa',
]);
const DUMMY_BIOS = [
  'kỹ sư phần mềm đam mê công nghệ, luôn chủ động học hỏi và hướng tới môi trường chuyên nghiệp.',
  'tôi là một kỹ sư phần mềm có đam mê với phát triển sản phẩm thực tế.',
  'hồ sơ được phân tích bởi hiremate ai',
];
const DUMMY_SKILLS = new Set([
  'react',
  'typescript',
  'javascript',
  'git',
  'rest api',
  'tailwindcss',
]);
const DUMMY_ROLES = new Set([
  'lập trình viên frontend',
  'lập trình viên',
  'frontend developer',
  'lập trình viên backend',
]);

const norm = (value?: string | null) => (value || '').trim().toLowerCase();

const isDummySkillList = (skills?: string[]) => {
  if (!skills || skills.length === 0) return false;
  return skills.every((skill) => DUMMY_SKILLS.has(norm(skill)));
};

/** Bỏ giá trị mẫu từng bị ghi cứng — giữ tên thật (Google/đăng ký). */
export const sanitizeAutoFilledProfile = (profile: Profile): Profile => {
  const next = { ...profile };
  const dummyRole = DUMMY_ROLES.has(norm(next.role));
  const dummyField = DUMMY_FIELDS.has(norm(next.field));
  const dummyExp = DUMMY_EXP.has(norm(next.exp));
  const dummySchool =
    DUMMY_SCHOOLS.has(norm(next.education)) || DUMMY_SCHOOLS.has(norm(next.university));
  const dummyBio = DUMMY_BIOS.some(
    (bio) => norm(next.bio) === bio || (norm(next.bio) && norm(next.bio).includes(bio))
  );
  const dummySkills = isDummySkillList(next.skills) || isDummySkillList(next.hobbies);
  const dummyYear = next.graduationYear === 2026;
  const hits = [dummyRole, dummyField, dummyExp, dummySchool, dummyBio, dummySkills, dummyYear].filter(Boolean).length;
  if (hits < 2) return next;

  if (dummyRole) next.role = '';
  if (dummyField) next.field = '';
  if (dummyExp) next.exp = '';
  if (dummySchool) {
    next.education = '';
    next.university = '';
  }
  if (dummyBio) next.bio = '';
  if (dummySkills) {
    next.skills = [];
    next.hobbies = [];
  }
  if (dummyYear && !next.education) next.graduationYear = undefined;
  return next;
};
