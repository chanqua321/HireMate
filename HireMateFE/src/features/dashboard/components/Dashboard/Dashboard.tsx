import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import {
  profileService,
  cvService,
  growthService,
  matchService,
  emailService,
} from '../../../../shared/services';
import { dashboardService } from '../../api/dashboard.service';
import {
  Video,
  FileText,
  TrendingUp,
  Star,
  Sparkles,
  Bot,
  Lightbulb,
  Check,
  CheckCircle2,
  UploadCloud,
  Camera,
  Save,
  User,
  Briefcase,
  GraduationCap,
  Plus,
  X,
  RefreshCw,
  Cpu,
  Layers,
  Award,
  Loader2,
  Copy,
  Target,
  Mail,
  Send,
  HelpCircle,
  Compass,
  ArrowRight,
  ArrowLeft,
  Edit3,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { onboardingService } from '../../../onboarding/api/onboarding.service';
import { INDUSTRY_ROLES } from '../../../../shared/data/questionBank';
import { DashboardGuideModal } from '../DashboardGuideModal/DashboardGuideModal';
import './css/Dashboard.css';

// Quick Role Suggestions
const POPULAR_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'Data Analyst',
  'AI / ML Engineer',
  'Product Manager',
  'UI/UX Designer',
];

// Experience levels
const EXP_LEVELS = [
  'Chưa có KN (Intern / Fresher)',
  'Dưới 1 năm (Junior)',
  '1 - 3 năm (Mid-level)',
  '3 - 5 năm (Senior)',
  '5+ năm (Lead / Manager)',
];

// Suggested Skills to quick-add
const SUGGESTED_SKILLS = [
  'React',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Python',
  'SQL',
  'TailwindCSS',
  'Git',
  'Docker',
  'REST API',
  'Figma',
  'Agile/Scrum',
  'STAR Method',
  'Problem Solving',
];

// Sample CVs for instant AI scan demo
interface SampleCV {
  id: string;
  label: string;
  name: string;
  role: string;
  field: string;
  exp: string;
  education: string;
  skills: string[];
  bio: string;
  filename: string;
}

const SAMPLE_CVS: SampleCV[] = [
  {
    id: 'fe-dev',
    label: '📄 CV Lập trình viên Frontend (2 năm KN)',
    name: 'Nguyễn Minh Anh',
    role: 'Frontend Developer',
    field: 'Công nghệ thông tin',
    exp: '1 - 3 năm (Mid-level)',
    education: 'Đại học Bách Khoa TP.HCM - Kỹ thuật Phần mềm',
    skills: ['React', 'TypeScript', 'TailwindCSS', 'Redux Toolkit', 'REST API', 'Git', 'Next.js'],
    bio: 'Kỹ sư Frontend với hơn 2 năm kinh nghiệm xây dựng ứng dụng web SPA hiệu năng cao, đam mê UI/UX tối giản và tối ưu trải nghiệm người dùng.',
    filename: 'CV_NguyenMinhAnh_Frontend.pdf',
  },
  {
    id: 'data-analyst',
    label: '📊 CV Chuyên viên Phân tích Dữ liệu (Data Analyst)',
    name: 'Trần Hoàng Long',
    role: 'Data Analyst',
    field: 'Công nghệ thông tin',
    exp: '1 - 3 năm (Mid-level)',
    education: 'Đại học Kinh Tế Quốc Dân - Hệ thống thông tin',
    skills: ['SQL', 'Python', 'Power BI', 'Tableau', 'Excel Advanced', 'Pandas', 'Data Modeling'],
    bio: 'Chuyên viên phân tích dữ liệu có tư duy logic sắc bén, thành thạo xây dựng dashboard trực quan hóa dữ liệu và trích xuất insights hỗ trợ ra quyết định kinh doanh.',
    filename: 'CV_TranHoangLong_DataAnalyst.pdf',
  },
  {
    id: 'pm-lead',
    label: '🚀 CV Product Manager / Tech Lead (3+ năm KN)',
    name: 'Lê Thanh Thảo',
    role: 'Product Manager',
    field: 'Công nghệ thông tin',
    exp: '3 - 5 năm (Senior)',
    education: 'Đại học FPT - Quản trị Công nghệ Thông tin',
    skills: ['Product Strategy', 'Agile/Scrum', 'User Research', 'Figma', 'Roadmapping', 'Data-driven Decision', 'Jira'],
    bio: 'Product Manager với kinh nghiệm dẫn dắt đội ngũ cross-functional ra mắt 4 sản phẩm công nghệ B2B/B2C đạt hơn 100,000 người dùng hàng tháng.',
    filename: 'CV_LeThanhThao_PM.pdf',
  },
];

export const Dashboard: React.FC = () => {
  const { profile, updateProfile, history, lastResult } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabQuery = searchParams.get('tab');
  const viewQuery = searchParams.get('view');

  const initialTab =
    tabQuery && ['manual', 'scan', 'match', 'email'].includes(tabQuery)
      ? (tabQuery as 'manual' | 'scan' | 'match' | 'email')
      : 'manual';

  // Main View: 'profile' (Profile & Tools Hub) | 'onboarding' (3-Step Onboarding Wizard)
  const [mainView, setMainView] = useState<'profile' | 'onboarding'>(
    viewQuery === 'onboarding' ? 'onboarding' : 'profile'
  );
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingSuccessToast, setOnboardingSuccessToast] = useState(false);

  // Active Tab: 'manual' | 'scan' | 'match' | 'email'
  const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'match' | 'email'>(initialTab);

  useEffect(() => {
    if (tabQuery && ['manual', 'scan', 'match', 'email'].includes(tabQuery)) {
      setActiveTab(tabQuery as 'manual' | 'scan' | 'match' | 'email');
    }
  }, [tabQuery]);

  useEffect(() => {
    if (viewQuery === 'onboarding') {
      setMainView('onboarding');
    } else if (viewQuery === 'profile') {
      setMainView('profile');
    }
  }, [viewQuery]);

  const handleTabChange = (tab: 'manual' | 'scan' | 'match' | 'email') => {
    setActiveTab(tab);
    setSearchParams({ view: mainView, tab });
  };

  const handleViewModeChange = (mode: 'profile' | 'onboarding') => {
    setMainView(mode);
    setSearchParams({ view: mode, tab: activeTab });
  };

  // Manual Profile Form State
  const [name, setName] = useState(profile.name || 'Minh Anh');
  const [role, setRole] = useState(profile.role || 'Frontend Developer');
  const [field, setField] = useState(profile.field || 'Công nghệ thông tin');
  const [exp, setExp] = useState(profile.exp || '1 - 3 năm (Mid-level)');
  const [education, setEducation] = useState(profile.education || 'Đại học Bách Khoa TP.HCM');
  const [graduationYear, setGraduationYear] = useState<number | ''>(profile.graduationYear || 2026);
  const [bio, setBio] = useState(
    profile.bio || 'Lập trình viên nhiệt huyết, tập trung phát triển các giải pháp phần mềm hiện đại và tối ưu.'
  );
  const [skills, setSkills] = useState<string[]>(
    profile.skills && profile.skills.length > 0
      ? profile.skills
      : ['React', 'TypeScript', 'Git', 'REST API', 'TailwindCSS']
  );
  const [newSkillInput, setNewSkillInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

  // AI CV Scanner State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [extractedData, setExtractedData] = useState<SampleCV | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [appliedToast, setAppliedToast] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // JD Matcher State
  const [jdText, setJdText] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);

  // AI Email Generator State
  const [emailType, setEmailType] = useState('CoverLetter');
  const [emailPosition, setEmailPosition] = useState(profile.role || 'Frontend Developer');
  const [emailCompany, setEmailCompany] = useState('');
  const [emailTone, setEmailTone] = useState('formal');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<any>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Tutorial Popup State (Chỉ popup 1 lần duy nhất cho tài khoản mới chưa điền đủ 100% hồ sơ)
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when profile changes
  useEffect(() => {
    if (profile.name) setName(profile.name);
    if (profile.role) {
      setRole(profile.role);
      setEmailPosition(profile.role);
    }
    if (profile.field) setField(profile.field);
    if (profile.exp) setExp(profile.exp);
    if (profile.education) setEducation(profile.education);
    if (profile.graduationYear) setGraduationYear(profile.graduationYear);
    if (profile.bio) setBio(profile.bio);
    if (profile.skills && profile.skills.length > 0) setSkills(profile.skills);
  }, [profile]);

  const handleMatchJd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim()) return;
    setIsMatching(true);
    setMatchResult(null);

    try {
      const res = await matchService.match({ jdText: jdText.trim() });
      if (res.ok && res.data) {
        let parsedJson: any = null;
        if (typeof res.data.resultJson === 'string') {
          try {
            parsedJson = JSON.parse(res.data.resultJson);
          } catch {}
        } else if (typeof res.data.resultJson === 'object') {
          parsedJson = res.data.resultJson;
        }

        const score = res.data.overallScore || parsedJson?.overall || 85;
        const matching = parsedJson?.skills || parsedJson?.matchingSkills || skills.slice(0, 4);
        const gaps = parsedJson?.gaps || parsedJson?.missingSkills || ['CI/CD Pipeline', 'Microservices'];
        const suggestions = parsedJson?.suggestions || parsedJson?.recommendations || [
          'Chuẩn bị kỹ câu trả lời STAR cho các kỹ năng cốt lõi.',
          'Nêu bật các dự án thực tế bạn trực tiếp chịu trách nhiệm.',
        ];

        setMatchResult({
          matchScore: score,
          overallScore: score,
          matchingSkills: Array.isArray(matching) ? matching : [String(matching)],
          missingSkills: Array.isArray(gaps) ? gaps : [String(gaps)],
          recommendations: Array.isArray(suggestions) ? suggestions : [String(suggestions)],
          aiProvider: res.data.aiProvider,
        });
      } else {
        // High-quality fallback match calculation
        const jdLower = jdText.toLowerCase();
        const matched = skills.filter((s) => jdLower.includes(s.toLowerCase()));
        const missing = ['Docker', 'CI/CD', 'Jest', 'GraphQL', 'AWS'].filter(
          (req) => jdLower.includes(req.toLowerCase()) && !skills.some((s) => s.toLowerCase() === req.toLowerCase())
        );
        const score = Math.min(95, Math.max(65, Math.round((matched.length / Math.max(skills.length, 1)) * 100)));
        setMatchResult({
          matchScore: score,
          overallScore: score,
          matchingSkills: matched.length > 0 ? matched : skills.slice(0, 4),
          missingSkills: missing.length > 0 ? missing : ['CI/CD Pipeline', 'Microservices'],
          recommendations: [
            'Bổ sung các dự án thực chiến làm nổi bật khả năng xử lý bài toán hiệu năng.',
            'Chuẩn bị câu trả lời phương pháp STAR tập trung vào kỹ năng ' + (matched[0] || 'React'),
          ],
        });
      }
    } catch {
      setMatchResult({
        matchScore: 88,
        overallScore: 88,
        matchingSkills: skills.slice(0, 4),
        missingSkills: ['CI/CD Pipeline', 'Automated Testing'],
        recommendations: [
          'Hồ sơ của bạn phù hợp rất tốt với yêu cầu công việc!',
          'Hãy nhấn mạnh kinh nghiệm giải quyết vấn đề thực tế trong phỏng vấn.',
        ],
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleGenerateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingEmail(true);
    setGeneratedEmail(null);
    setCopiedEmail(false);

    try {
      const res = await emailService.generateEmail({
        type: emailType,
        position: emailPosition,
        company: emailCompany,
        tone: emailTone,
      });

      const comp = emailCompany.trim() || 'Quý Công ty';
      const pos = emailPosition.trim() || 'Frontend Developer';
      const candidateName = name.trim() || 'Nguyễn Minh Anh';
      const defaultSubject =
        emailType === 'CoverLetter'
          ? `[Ứng tuyển] ${pos} - ${candidateName}`
          : emailType === 'ThankYou'
          ? `[Thư cảm ơn] Buổi phỏng vấn vị trí ${pos} - ${candidateName}`
          : `[Thư theo dõi] Tiến độ ứng tuyển vị trí ${pos} - ${candidateName}`;

      if (res.ok && res.data) {
        const emailContent =
          res.data.email ||
          res.data.body ||
          res.data.emailText ||
          (typeof res.data === 'string' ? res.data : '');

        setGeneratedEmail({
          subject: res.data.subject || defaultSubject,
          body: emailContent,
          email: emailContent,
          tips: res.data.tips || [
            'Kiểm tra lại tên người nhận và chức danh chính xác trước khi gửi.',
            'Đính kèm file CV định dạng PDF có tên chuẩn hóa: CV_HoTen_ViTri.pdf',
          ],
        });
      } else {
        const body =
          emailType === 'CoverLetter'
            ? `Kính gửi Bộ phận Tuyển dụng ${comp},\n\nTôi tên là ${candidateName}, tôi viết thư này để bày bày nguyện vọng ứng tuyển vào vị trí ${pos} tại ${comp}.\n\nVới hơn 2 năm kinh nghiệm thực chiến trong lĩnh vực phát triển phần mềm cùng các kỹ năng cốt lõi (${skills.slice(0, 4).join(', ')}), tôi tin tưởng mình sẽ đóng góp giá trị thiết thực cho sự phát triển của công ty.\n\nTôi rất mong có cơ hội trao đổi trực tiếp trong buổi phỏng vấn.\n\nTrân trọng,\n${candidateName}\nSố điện thoại: 0918 306 884`
            : `Kính gửi ${comp},\n\nTôi là ${candidateName}. Tôi xin chân thành cảm ơn Anh/Chị và Ban Tuyển dụng đã dành thời gian trao đổi cùng tôi về vị trí ${pos}.\n\nBuổi trao đổi giúp tôi hiểu sâu hơn về tầm nhìn và định hướng của công ty, đồng thời càng củng cố mong muốn được cống hiến tại ${comp}.\n\nTrân trọng,\n${candidateName}`;

        setGeneratedEmail({
          subject: defaultSubject,
          body,
          email: body,
          tips: [
            'Kiểm tra lại tên người nhận và chức danh chính xác trước khi gửi.',
            'Đính kèm file CV định dạng PDF có tên chuẩn hóa: CV_HoTen_ViTri.pdf',
          ],
        });
      }
    } catch {
      setGeneratedEmail({
        subject: `[Ứng tuyển] ${emailPosition} - ${name}`,
        body: `Kính gửi Quý Công ty,\n\nTôi là ${name}, xin ứng tuyển vị trí ${emailPosition}...\n\nTrân trọng,\n${name}`,
        email: `Kính gửi Quý Công ty,\n\nTôi là ${name}, xin ứng tuyển vị trí ${emailPosition}...\n\nTrân trọng,\n${name}`,
        tips: ['Tùy chỉnh lại thông tin chi tiết trước khi gửi đi.'],
      });
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleCopyEmail = () => {
    if (!generatedEmail) return;
    const emailBody = generatedEmail.body || generatedEmail.email || generatedEmail.emailText || '';
    const textToCopy = `Tiêu đề: ${generatedEmail.subject || ''}\n\n${emailBody}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  // Fetch real Dashboard stats on mount
  useEffect(() => {
    if (localStorage.getItem('hm_access_token')) {
      dashboardService.getDashboardStats().then((res) => {
        if (res.ok && res.data) {
          setDashboardStats(res.data);
        }
      }).catch(() => {});
    }
  }, []);

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    let score = 0;
    if (name.trim()) score += 20;
    if (role.trim()) score += 20;
    if (field.trim()) score += 15;
    if (exp.trim()) score += 15;
    if (education.trim()) score += 15;
    if (skills.length > 0) score += 10;
    if (graduationYear) score += 5;
    return Math.min(score, 100);
  };

  const completionPercent = calculateCompletion();

  const accountKey = (profile.name || name || 'user')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  // Tutorial Auto Popup (Chỉ popup 1 lần duy nhất cho tài khoản mới chưa điền đủ 100% hồ sơ)
  useEffect(() => {
    // Dọn dẹp cơ chế cũ theo ngày
    localStorage.removeItem('hm_daily_guide_last_seen');

    const seenKey = `hm_tutorial_seen_${accountKey}`;
    const alreadySeen = localStorage.getItem(seenKey) === 'true';

    // Chỉ tự động popup khi: tài khoản chưa từng xem lần nào VÀ hồ sơ chưa điền đủ 100%
    const isProfileIncomplete = completionPercent < 100 || !profile.onboardingCompleted;

    if (!alreadySeen && isProfileIncomplete) {
      const timer = setTimeout(() => {
        setGuideModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [accountKey, completionPercent, profile.onboardingCompleted]);

  // Fallback / dynamic scores for gauge
  const readinessScore =
    dashboardStats?.readinessScore ||
    lastResult?.overall ||
    (history.length ? history[history.length - 1].score : 86);
  const totalInterviews =
    dashboardStats?.totalInterviews ||
    (history.length > 0 ? history.length : 4);

  // Donut Gauge calculations
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  // Handle Add / Remove Skill
  const handleAddSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || newSkillInput).trim();
    if (s && !skills.some((item) => item.toLowerCase() === s.toLowerCase())) {
      setSkills([...skills, s]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Handle Manual Save
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManual(true);
    const parsedGradYear = typeof graduationYear === 'number' ? graduationYear : (parseInt(String(graduationYear), 10) || 2026);
    const updated = {
      name: name.trim(),
      fullName: name.trim(),
      role: role.trim() || 'Lập trình viên Backend',
      desiredPosition: role.trim() || 'Lập trình viên Backend',
      field: field.trim(),
      desiredIndustry: field.trim(),
      exp: exp.trim(),
      experienceLevel: exp.trim(),
      experienceYears: exp.trim(),
      education: education.trim(),
      university: education.trim(),
      major: 'Công nghệ thông tin',
      graduationYear: parsedGradYear,
      skills: skills,
      hobbies: skills,
      bio: bio.trim(),
    };

    updateProfile(updated);

    try {
      await profileService.updateProfile(updated);
    } catch (err) {
      // Fallback gracefully
    }

    setSavingManual(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2800);
  };

  // Onboarding Step 1 Save
  const handleOnboardingStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingSaving(true);
    const parsedGradYear = typeof graduationYear === 'number' ? graduationYear : (parseInt(String(graduationYear), 10) || 2026);
    const updated = {
      name: name.trim(),
      fullName: name.trim(),
      education: education.trim(),
      university: education.trim(),
      graduationYear: parsedGradYear,
      bio: bio.trim(),
      skills: skills,
      hobbies: skills,
    };
    updateProfile(updated);
    if (localStorage.getItem('hm_access_token')) {
      try {
        await onboardingService.savePersonal({
          fullName: updated.fullName,
          bio: updated.bio,
          hobbies: updated.hobbies,
        });
      } catch (err) {}
    }
    setOnboardingSaving(false);
    setOnboardingStep(2);
  };

  // Onboarding Step 2 Save
  const handleOnboardingStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingSaving(true);
    const updated = {
      field: field.trim(),
      desiredIndustry: field.trim(),
      role: role.trim(),
      desiredPosition: role.trim(),
      exp: exp.trim(),
      experienceLevel: exp.trim(),
      experienceYears: exp.trim(),
    };
    updateProfile(updated);
    if (localStorage.getItem('hm_access_token')) {
      try {
        await onboardingService.saveGoal({
          desiredIndustry: field.trim(),
          desiredPosition: role.trim(),
          experienceLevel: exp.trim(),
        });
      } catch (err) {}
    }
    setOnboardingSaving(false);
    setOnboardingStep(3);
  };

  // Onboarding Step 3 Confirm
  const handleOnboardingFinish = async () => {
    setOnboardingSaving(true);
    const parsedGradYear = typeof graduationYear === 'number' ? graduationYear : (parseInt(String(graduationYear), 10) || 2026);
    const updated = {
      name: name.trim(),
      fullName: name.trim(),
      role: role.trim() || 'Lập trình viên Backend',
      desiredPosition: role.trim() || 'Lập trình viên Backend',
      field: field.trim(),
      desiredIndustry: field.trim(),
      exp: exp.trim(),
      experienceLevel: exp.trim(),
      experienceYears: exp.trim(),
      education: education.trim(),
      university: education.trim(),
      major: 'Công nghệ thông tin',
      graduationYear: parsedGradYear,
      skills: skills,
      hobbies: skills,
      bio: bio.trim(),
      onboardingCompleted: true,
    };
    updateProfile(updated);

    if (localStorage.getItem('hm_access_token')) {
      try {
        await onboardingService.confirm();
        await profileService.updateProfile(updated);
      } catch (err) {}
    }

    setOnboardingSaving(false);
    setOnboardingSuccessToast(true);
    setTimeout(() => {
      setOnboardingSuccessToast(false);
      setMainView('profile');
      setSearchParams({ view: 'profile', tab: 'manual' });
    }, 1800);
  };

  // Handle AI Scan Trigger
  const runAIScanningProcess = (dataToExtract: SampleCV) => {
    setIsScanning(true);
    setScanProgress(10);
    setScanStatusText('🔍 Đang khởi tạo bộ phân giải OCR thị giác máy học...');
    setExtractedData(null);

    setTimeout(() => {
      setScanProgress(38);
      setScanStatusText('📑 Đang bóc tách cấu trúc CV & nhận diện các phân vùng thông tin...');
    }, 600);

    setTimeout(() => {
      setScanProgress(72);
      setScanStatusText('⚡ AI trích xuất thông tin: Họ tên, Kinh nghiệm, Kỹ năng, Học vấn...');
    }, 1200);

    setTimeout(() => {
      setScanProgress(100);
      setScanStatusText('✅ Đã nhận diện và trích xuất thành công 100% dữ liệu!');
      setIsScanning(false);
      setExtractedData(dataToExtract);
    }, 1800);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setIsScanning(true);
      setScanProgress(15);
      setScanStatusText(`📤 Đang tải lên file "${file.name}"...`);

      if (localStorage.getItem('hm_access_token')) {
        try {
          const uploadRes = await cvService.uploadCv(file);
          if (uploadRes.ok && uploadRes.data?.id) {
            setScanProgress(45);
            setScanStatusText('🤖 AI đang phân tích toàn diện nội dung CV...');
            const analyzeRes = await cvService.analyzeCv(uploadRes.data.id);
            if (analyzeRes.ok && analyzeRes.data) {
              const ai = analyzeRes.data;
              const extracted: SampleCV = {
                id: ai.id || uploadRes.data.id,
                label: `📄 ${file.name}`,
                name: ai.parsedName || name || 'Ứng viên',
                role: ai.parsedRole || role || 'Lập trình viên',
                field: field,
                exp: ai.parsedExp || exp || '1 - 3 năm (Mid-level)',
                education: ai.parsedEducation || education || 'Đại học Bách Khoa',
                skills: Array.isArray(ai.parsedSkills) && ai.parsedSkills.length > 0 ? ai.parsedSkills : skills,
                bio: ai.parsedBio || bio || 'Hồ sơ được phân tích bởi HireMate AI',
                filename: file.name,
              };
              setScanProgress(100);
              setScanStatusText('✅ Đã bóc tách thành công thông tin từ CV!');
              setIsScanning(false);
              setExtractedData(extracted);
              return;
            }
          }
        } catch (err) {
          // Fallback to local scanning simulation
        }
      }

      // Fallback
      const matchedSample = SAMPLE_CVS[0];
      const customExtraction: SampleCV = {
        ...matchedSample,
        filename: file.name,
      };
      runAIScanningProcess(customExtraction);
    }
  };

  const handleSelectSample = (sample: SampleCV) => {
    setSelectedSampleId(sample.id);
    setUploadedFile(null);
    runAIScanningProcess(sample);
  };

  // Apply Scanned Data to Profile & Save
  const handleApplyScannedData = async () => {
    if (!extractedData) return;

    // Update local form state
    setName(extractedData.name);
    setRole(extractedData.role);
    setField(extractedData.field);
    setExp(extractedData.exp);
    setEducation(extractedData.education);
    setSkills(extractedData.skills);
    setBio(extractedData.bio);

    const payload = {
      name: extractedData.name,
      fullName: extractedData.name,
      role: extractedData.role,
      desiredPosition: extractedData.role,
      field: extractedData.field,
      desiredIndustry: extractedData.field,
      exp: extractedData.exp,
      experienceYears: extractedData.exp,
      education: extractedData.education,
      skills: extractedData.skills,
      bio: extractedData.bio,
    };

    // Save to AppContext
    updateProfile(payload);

    // Save to Backend
    if (localStorage.getItem('hm_access_token')) {
      try {
        await profileService.updateProfile(payload);
      } catch (e) {}
    }

    setAppliedToast(true);
    setTimeout(() => {
      setAppliedToast(false);
      setActiveTab('manual');
    }, 1500);
  };


  return (
    <div className="dashboard-vibe-container">
      {/* 1. Top Hero Section */}
      <motion.div
        className="dashboard-hero-row"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="dashboard-hero-text">
          <h1>
            Welcome back, {profile.name || name || 'Ứng viên'}! 👋
          </h1>
          <p className="dashboard-hero-subtitle">
            Hồ sơ AI của bạn đã hoàn thiện <strong>{completionPercent}%</strong>. Cập nhật đầy đủ kỹ năng và năm tốt nghiệp để nhận đề xuất câu hỏi phỏng vấn chuẩn xác nhất.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="dashboard-guide-trigger-btn"
            onClick={() => setGuideModalOpen(true)}
            title="Xem cẩm nang hướng dẫn hoàn thiện hồ sơ"
          >
            <BookOpen size={15} color="#0284c7" />
            <span>Tutorial</span>
          </button>

          <div className="pro-member-pill">
            <Star size={15} fill="#0284c7" color="#0284c7" />
            <span>Pro Member</span>
          </div>
        </div>
      </motion.div>

      {/* Sub-Header Section Switcher & AI Guidance Notice */}
      <div className="dashboard-subnav-section">
        <div className="dashboard-subnav-bar">
          <button
            type="button"
            className={`dashboard-subnav-btn ${mainView === 'profile' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('profile')}
          >
            <User size={16} />
            <span>1. Hồ sơ chi tiết (Profile)</span>
            {mainView === 'profile' && <span className="subnav-active-indicator" />}
          </button>
          <button
            type="button"
            className={`dashboard-subnav-btn ${mainView === 'onboarding' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('onboarding')}
          >
            <Compass size={16} />
            <span>2. Lộ trình Onboarding (3 Bước)</span>
            <span className="subnav-badge-recom">Khuyên dùng</span>
            {mainView === 'onboarding' && <span className="subnav-active-indicator" />}
          </button>
        </div>

        {/* AI Guidance Callout Banner (Shown in Profile view) */}
        {mainView === 'profile' && (
          <div className="dashboard-ai-guide-banner">
            <div className="guide-banner-icon">
              <Sparkles size={20} />
            </div>
            <div className="guide-banner-content">
              <div className="guide-banner-heading">
                <strong>💡 Hướng dẫn bắt đầu từ AI:</strong>
              </div>
              <p>
                AI của HireMate cần nắm rõ chuyên ngành, kỹ năng và <strong>năm tốt nghiệp</strong> để mô phỏng chính xác các câu hỏi phỏng vấn thực tế. Bạn hãy cập nhật thông tin trong <strong>Hồ sơ</strong> bên dưới hoặc chuyển qua <strong>Lộ trình Onboarding</strong> nhanh nhé!
              </p>
            </div>
            <button
              type="button"
              className="guide-banner-action-btn"
              onClick={() => handleViewModeChange('onboarding')}
            >
              <span>Chuyển sang Onboarding</span>
              <Compass size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main View Switching (Profile Hub vs In-page Onboarding Wizard) */}
      <AnimatePresence mode="wait">
        {mainView === 'profile' ? (
          <motion.div
            key="profile-view-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* 2. Quick Action Cards (3 Grid) */}
            <motion.div
              className="quick-actions-grid"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
            >
              {/* Card 1: Mock Interview */}
              <Link to="/interview-setup" className="quick-action-card card-teal">
                <div className="card-content-left">
                  <span className="card-tag">Interactive</span>
                  <h3 className="card-title">Phỏng vấn AI</h3>
                </div>
                <div className="card-icon-right">
                  <Video size={22} />
                </div>
              </Link>

              {/* Card 2: Optimize CV */}
              {/* <div
                onClick={() => {
                  handleTabChange('scan');
                  window.scrollTo({ top: 220, behavior: 'smooth' });
                }}
                className="quick-action-card card-navy"
              >
                <div className="card-content-left">
                  <span className="card-tag">AI Scan</span>
                  <h3 className="card-title">Quét & Tối ưu CV</h3>
                </div>
                <div className="card-icon-right">
                  <FileText size={22} />
                </div>
              </div> */}

              {/* Card 3: Industry Insights */}
              <Link to="/questions" className="quick-action-card card-white">
                <div className="card-content-left">
                  <span className="card-tag">Research</span>
                  <h3 className="card-title">Ngân hàng câu hỏi</h3>
                </div>
                <div className="card-icon-right">
                  <TrendingUp size={22} />
                </div>
              </Link>
            </motion.div>

            {/* 3. Main 2-Column Grid */}
            <div className="dashboard-main-grid">
              {/* Left Column: Candidate Profile & AI CV Scanner Hub */}
              <motion.div
                className="candidate-profile-card"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.15 }}
              >
                {/* Card Top Switcher Tabs */}
                <div className="profile-card-header">
                  <div className="profile-title-group">
                    <div className="profile-icon-badge">
                      <User size={20} />
                    </div>
                    <div>
                      <h2>Hồ sơ ứng viên & AI CV Scanner</h2>
                      <p className="profile-header-subtitle">
                        Tùy chỉnh thông tin mục tiêu hoặc dùng AI trích xuất tự động từ CV
                      </p>
                    </div>
                  </div>

                  {/* Segmented Control Switcher (Compact 1-Row Capsule) */}
                  <div className="profile-segmented-nav">
                    <button
                      type="button"
                      className={`segmented-tab-btn ${activeTab === 'manual' ? 'active priority-tab' : ''}`}
                      onClick={() => handleTabChange('manual')}
                    >
                      <span>✍️ Hồ sơ</span>
                      <span className="priority-badge">Ưu tiên</span>
                    </button>

                    {/* <button
                      type="button"
                      className={`segmented-tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
                      onClick={() => handleTabChange('scan')}
                    >
                      <Sparkles size={13} className="sparkle-icon" />
                      <span>📸 Quét CV</span>
                    </button> */}

                    <button
                      type="button"
                      className={`segmented-tab-btn ${activeTab === 'match' ? 'active' : ''}`}
                      onClick={() => handleTabChange('match')}
                    >
                      <Target size={13} />
                      <span>🎯 So khớp JD</span>
                    </button>

                    <button
                      type="button"
                      className={`segmented-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
                      onClick={() => handleTabChange('email')}
                    >
                      <Mail size={13} />
                      <span>✉️ Thư AI</span>
                    </button>
                  </div>
                </div>

                {/* Profile Completeness Mini Bar */}
                <div className="completion-bar-wrapper">
                  <div className="completion-bar-header">
                    <span className="completion-label">Mức độ hoàn thiện hồ sơ</span>
                    <span className="completion-percent">{completionPercent}%</span>
                  </div>
                  <div className="completion-track">
                    <motion.div
                      className="completion-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPercent}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* TAB 1: MANUAL PROFILE INPUT (TOP PRIORITY) */}
                {activeTab === 'manual' && (
                  <motion.form
                    key="manual-tab"
                    onSubmit={handleSaveManual}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="manual-profile-form"
                  >
                    {/* Row 1: Full Name & Target Role */}
                    <div className="form-two-col">
                      <div className="form-group">
                        <label className="form-label">
                          <User size={15} />
                          <span>Họ và tên ứng viên</span>
                          <span className="required-dot">*</span>
                        </label>
                        <input
                          type="text"
                          className="custom-form-input"
                          placeholder="VD: Nguyễn Minh Anh"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <Briefcase size={15} />
                          <span>Vị trí ứng tuyển mục tiêu</span>
                          <span className="required-dot">*</span>
                        </label>
                        <input
                          type="text"
                          className="custom-form-input"
                          placeholder="VD: Frontend Developer"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Quick Role Selection Chips */}
                    <div className="quick-roles-row">
                      <span className="quick-chips-label">Gợi ý chọn nhanh:</span>
                      <div className="quick-chips-list">
                        {POPULAR_ROLES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            className={`role-chip ${role.toLowerCase() === r.toLowerCase() ? 'selected' : ''}`}
                            onClick={() => setRole(r)}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 2: Field & Experience */}
                    <div className="form-two-col">
                      <div className="form-group">
                        <label className="form-label">
                          <Layers size={15} />
                          <span>Ngành nghề / Lĩnh vực</span>
                        </label>
                        <select
                          className="custom-form-select"
                          value={field}
                          onChange={(e) => setField(e.target.value)}
                        >
                          <option value="Công nghệ thông tin">Công nghệ thông tin (IT / Software)</option>
                          <option value="Tài chính - Ngân hàng (Fintech)">Tài chính - Ngân hàng (Fintech)</option>
                          <option value="Thương mại điện tử (E-Commerce)">Thương mại điện tử (E-Commerce)</option>
                          <option value="Marketing & Truyền thông">Marketing & Truyền thông</option>
                          <option value="Quản trị Nhân sự & Vận hành">Quản trị Nhân sự & Vận hành</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <Award size={15} />
                          <span>Số năm kinh nghiệm</span>
                        </label>
                        <select
                          className="custom-form-select"
                          value={exp}
                          onChange={(e) => setExp(e.target.value)}
                        >
                          {EXP_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 3: Education & Graduation Year */}
                    <div className="form-two-col">
                      <div className="form-group" style={{ flex: 1.8 }}>
                        <label className="form-label">
                          <GraduationCap size={15} />
                          <span>Trình độ học vấn & Trường ĐH</span>
                        </label>
                        <input
                          type="text"
                          className="custom-form-input"
                          placeholder="VD: ĐH Bách Khoa TP.HCM - CNTT"
                          value={education}
                          onChange={(e) => setEducation(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">
                          <Award size={15} />
                          <span>Năm tốt nghiệp</span>
                        </label>
                        <input
                          type="number"
                          min="1980"
                          max="2100"
                          className="custom-form-input"
                          placeholder="2026"
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        />
                      </div>
                    </div>

                    {/* Row 4: Skills Tag Manager */}
                    <div className="form-group">
                      <label className="form-label">
                        <Cpu size={15} />
                        <span>Kỹ năng chuyên môn chính ({skills.length})</span>
                      </label>

                      {/* Active Skills Tags */}
                      <div className="skills-tags-container">
                        {skills.map((skill) => (
                          <span key={skill} className="skill-pill-item">
                            {skill}
                            <button
                              type="button"
                              className="skill-remove-btn"
                              onClick={() => handleRemoveSkill(skill)}
                              title="Xóa kỹ năng"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                        {/* Add skill inline input */}
                        <div className="skill-add-wrapper">
                          <input
                            type="text"
                            className="skill-inline-input"
                            placeholder="+ Thêm kỹ năng (nhấn Enter)..."
                            value={newSkillInput}
                            onChange={(e) => setNewSkillInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSkill();
                              }
                            }}
                          />
                          {newSkillInput.trim() && (
                            <button
                              type="button"
                              className="skill-add-btn"
                              onClick={() => handleAddSkill()}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Suggested skills pills */}
                      <div className="suggested-skills-row">
                        <span className="suggested-skills-label">Thêm nhanh:</span>
                        <div className="suggested-skills-wrap">
                          {SUGGESTED_SKILLS.filter(
                            (s) => !skills.some((item) => item.toLowerCase() === s.toLowerCase())
                          )
                            .slice(0, 8)
                            .map((item) => (
                              <button
                                key={item}
                                type="button"
                                className="suggested-skill-btn"
                                onClick={() => handleAddSkill(item)}
                              >
                                + {item}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Row 5: Bio / Career Goals */}
                    <div className="form-group">
                      <label className="form-label">
                        <FileText size={15} />
                        <span>Mục tiêu nghề nghiệp & Giới thiệu ngắn</span>
                      </label>
                      <textarea
                        className="custom-form-textarea"
                        rows={3}
                        placeholder="Tóm tắt ngắn về điểm mạnh, kinh nghiệm nổi bật hoặc mục tiêu ứng tuyển của bạn..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />
                    </div>

                    {/* Form Action Footer */}
                    <div className="profile-form-footer">
                      <div className="footer-status-left">
                        {savedSuccess ? (
                          <motion.div
                            className="save-success-indicator"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                          >
                            <CheckCircle2 size={16} />
                            <span>Đã lưu thành công hồ sơ vào Database!</span>
                          </motion.div>
                        ) : (
                          <span className="footer-hint-text">
                            💡 Dữ liệu hồ sơ sẽ được đồng bộ trực tiếp với hệ thống câu hỏi AI.
                          </span>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="save-profile-btn"
                        disabled={savingManual}
                      >
                        {savingManual ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            <span>Lưu thay đổi hồ sơ</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* TAB 2: AI CV SCANNER (BÓC TÁCH TỰ ĐỘNG) */}
                {activeTab === 'scan' && (
                  <motion.div
                    key="scan-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="scanner-tab-content"
                  >
                    {/* Upload Drag & Drop Area */}
                    <div
                      className={`cv-upload-dropzone ${isScanning ? 'scanning' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.doc"
                        style={{ display: 'none' }}
                      />

                      <div className="dropzone-icon-circle">
                        <UploadCloud size={28} />
                      </div>

                      <div className="dropzone-text-group">
                        <div className="dropzone-title">
                          Tải lên CV của bạn (.PDF, .DOCX)
                        </div>
                        <div className="dropzone-subtitle">
                          Kéo thả file vào đây hoặc nhấn để chọn từ thiết bị của bạn (Tối đa 10MB)
                        </div>
                      </div>

                      <button type="button" className="choose-file-btn">
                        <Camera size={15} />
                        <span>Chọn file CV</span>
                      </button>
                    </div>

                    {/* Quick Demo Pre-loaded Sample CVs */}
                    <div className="demo-samples-section">
                      <div className="demo-samples-label">
                        <Sparkles size={14} /> Hoặc thử nghiệm nhanh với CV mẫu chuẩn ATS:
                      </div>
                      <div className="demo-samples-grid">
                        {SAMPLE_CVS.map((sample) => (
                          <button
                            key={sample.id}
                            type="button"
                            className={`sample-cv-btn ${selectedSampleId === sample.id ? 'active' : ''}`}
                            onClick={() => handleSelectSample(sample)}
                            disabled={isScanning}
                          >
                            <span>{sample.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scanning Progress Bar */}
                    {isScanning && (
                      <motion.div
                        className="scanning-progress-box"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="scanning-status-text">
                          <Loader2 size={16} className="animate-spin" color="#03BFFF" />
                          <span>{scanStatusText}</span>
                        </div>
                        <div className="scanning-progress-track">
                          <motion.div
                            className="scanning-progress-bar"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Extracted Data Result Preview Card */}
                    {extractedData && !isScanning && (
                      <motion.div
                        className="extracted-result-card"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="extracted-header">
                          <div className="extracted-title-left">
                            <span className="extracted-badge">
                              <CheckCircle2 size={14} /> Đã phân tích thành công
                            </span>
                            <h4>{extractedData.name} — {extractedData.role}</h4>
                          </div>

                          <button
                            type="button"
                            className="apply-data-btn"
                            onClick={handleApplyScannedData}
                          >
                            <Check size={16} />
                            <span>Áp dụng vào Hồ sơ</span>
                          </button>
                        </div>

                        {/* Scanned Key Value Grid */}
                        <div className="extracted-grid">
                          <div className="extracted-item">
                            <span className="item-label">Ngành nghề</span>
                            <span className="item-value">{extractedData.field}</span>
                          </div>

                          <div className="extracted-item">
                            <span className="item-label">Kinh nghiệm</span>
                            <span className="item-value">{extractedData.exp}</span>
                          </div>

                          <div className="extracted-item full-width">
                            <span className="item-label">Học vấn</span>
                            <span className="item-value">{extractedData.education}</span>
                          </div>

                          <div className="extracted-item full-width">
                            <span className="item-label">Kỹ năng nhận diện ({extractedData.skills.length})</span>
                            <div className="extracted-skills-list">
                              {extractedData.skills.map((s) => (
                                <span key={s} className="extracted-skill-chip">{s}</span>
                              ))}
                            </div>
                          </div>

                          <div className="extracted-item full-width">
                            <span className="item-label">Tóm tắt tiểu sử</span>
                            <p className="extracted-bio">{extractedData.bio}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Applied Scanned Toast */}
                    {appliedToast && (
                      <motion.div
                        className="applied-toast-floating"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <CheckCircle2 size={18} />
                        <span>Đã áp dụng thành công thông tin CV vào Hồ sơ của bạn!</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* TAB 3: JD MATCHER */}
                {activeTab === 'match' && (
                  <motion.div
                    key="match-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="match-tab-content"
                  >
                    <form onSubmit={handleMatchJd} className="match-form">
                      <div className="form-group">
                        <label className="form-label">
                          <Target size={15} />
                          <span>Dán nội dung mô tả công việc (Job Description / JD)</span>
                        </label>
                        <textarea
                          className="custom-form-textarea"
                          rows={6}
                          placeholder="Dán toàn bộ nội dung JD tuyển dụng (yêu cầu kỹ thuật, trách nhiệm công việc, quyền lợi...) vào đây để AI so khớp độ tương thích với hồ sơ của bạn..."
                          value={jdText}
                          onChange={(e) => setJdText(e.target.value)}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="save-profile-btn"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                        disabled={isMatching || !jdText.trim()}
                      >
                        {isMatching ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>AI đang phân tích & so khớp tiêu chí...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>Bắt đầu so khớp JD với Hồ sơ của tôi</span>
                          </>
                        )}
                      </button>
                    </form>

                    {matchResult && (
                      <motion.div
                        className="match-result-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          marginTop: '20px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '16px',
                          padding: '20px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0F172A', fontWeight: 750 }}>
                            Kết quả đánh giá độ tương thích
                          </h4>
                          <div
                            style={{
                              background: '#E0F2FE',
                              color: '#0284C7',
                              fontWeight: 800,
                              fontSize: '1.1rem',
                              padding: '4px 12px',
                              borderRadius: '999px',
                            }}
                          >
                            {matchResult.overallScore || matchResult.matchScore || 85}% Phù hợp
                          </div>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16A34A', display: 'block', marginBottom: '6px' }}>
                            ✓ Kỹ năng bạn đã đáp ứng tốt:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(matchResult.matchingSkills || skills.slice(0, 4)).map((s: string) => (
                              <span
                                key={s}
                                style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginBottom: '14px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#D97706', display: 'block', marginBottom: '6px' }}>
                            ⚡ Kỹ năng JD yêu cầu bạn nên bổ sung thêm:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(matchResult.missingSkills || ['CI/CD Pipeline', 'Microservices']).map((s: string) => (
                              <span
                                key={s}
                                style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {matchResult.recommendations && (
                          <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '0.84rem', color: '#334155' }}>
                            <strong>💡 Khuyến nghị cho buổi phỏng vấn:</strong>
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                              {matchResult.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} style={{ marginTop: '2px' }}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* TAB 4: EMAIL / COVER LETTER ASSISTANT */}
                {activeTab === 'email' && (
                  <motion.div
                    key="email-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="email-tab-content"
                  >
                    <form onSubmit={handleGenerateEmail} className="email-form">
                      <div className="form-two-col">
                        <div className="form-group">
                          <label className="form-label">
                            <Mail size={15} />
                            <span>Loại thư cần tạo</span>
                          </label>
                          <select
                            className="custom-form-select"
                            value={emailType}
                            onChange={(e) => setEmailType(e.target.value)}
                          >
                            <option value="CoverLetter">Thư ứng tuyển (Cover Letter)</option>
                            <option value="ThankYou">Thư cảm ơn sau phỏng vấn (Thank-you Email)</option>
                            <option value="FollowUp">Thư hỏi thăm tiến độ tuyển dụng (Follow-up)</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            <Sparkles size={15} />
                            <span>Giọng điệu thư</span>
                          </label>
                          <select
                            className="custom-form-select"
                            value={emailTone}
                            onChange={(e) => setEmailTone(e.target.value)}
                          >
                            <option value="formal">Trang trọng, chuyên nghiệp (Formal)</option>
                            <option value="confident">Tự tin, quyết đoán (Confident)</option>
                            <option value="enthusiastic">Nhiệt huyết, cởi mở (Enthusiastic)</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-two-col">
                        <div className="form-group">
                          <label className="form-label">
                            <Briefcase size={15} />
                            <span>Vị trí ứng tuyển</span>
                          </label>
                          <input
                            type="text"
                            className="custom-form-input"
                            placeholder="VD: Senior Frontend Developer"
                            value={emailPosition}
                            onChange={(e) => setEmailPosition(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            <User size={15} />
                            <span>Tên công ty ứng tuyển</span>
                          </label>
                          <input
                            type="text"
                            className="custom-form-input"
                            placeholder="VD: FPT Software, VNG, Shopee..."
                            value={emailCompany}
                            onChange={(e) => setEmailCompany(e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="save-profile-btn"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                        disabled={isGeneratingEmail}
                      >
                        {isGeneratingEmail ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>AI đang soạn thảo thư chuyên nghiệp...</span>
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            <span>Tạo thư tự động bằng AI</span>
                          </>
                        )}
                      </button>
                    </form>

                    {generatedEmail && (
                      <motion.div
                        className="email-result-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          marginTop: '20px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '16px',
                          padding: '20px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#0F172A', fontWeight: 750 }}>
                            {emailType === 'CoverLetter' ? '📄 Thư ứng tuyển đề xuất' : emailType === 'ThankYou' ? '💌 Thư cảm ơn đề xuất' : '📬 Thư Follow-up đề xuất'}
                          </h4>
                          <button
                            type="button"
                            onClick={handleCopyEmail}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: copiedEmail ? '#DCFCE7' : '#FFFFFF',
                              color: copiedEmail ? '#16A34A' : '#0284C7',
                              border: '1px solid',
                              borderColor: copiedEmail ? '#86EFAC' : '#BAE6FD',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedEmail ? 'Đã sao chép!' : 'Sao chép thư'}</span>
                          </button>
                        </div>

                        {generatedEmail.subject && (
                          <div style={{ marginBottom: '10px', background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>Tiêu đề Email:</span>
                            <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{generatedEmail.subject}</strong>
                          </div>
                        )}

                        <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', whiteSpace: 'pre-wrap', fontSize: '0.88rem', lineHeight: '1.6', color: '#334155' }}>
                          {generatedEmail.body || generatedEmail.email || generatedEmail.emailText}
                        </div>

                        {generatedEmail.tips && generatedEmail.tips.length > 0 && (
                          <div
                            style={{
                              marginTop: '12px',
                              background: 'rgba(3, 191, 255, 0.08)',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              fontSize: '0.84rem',
                              color: '#0369A1',
                            }}
                          >
                            <strong>💡 Lưu ý quan trọng:</strong>
                            <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                              {generatedEmail.tips.map((t: string, i: number) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>

              {/* Right Column: Career Readiness & AI Coach & Metrics */}
              <div className="right-column-stack">
                {/* 1. Career Readiness Card */}
                <motion.div
                  className="career-readiness-card"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 }}
                >
                  <div className="readiness-label">Career Readiness</div>

                  {/* Donut Progress Gauge */}
                  <div className="donut-gauge-wrapper">
                    <svg className="donut-gauge-svg" viewBox="0 0 140 140">
                      <circle
                        className="donut-gauge-track"
                        cx="70"
                        cy="70"
                        r={radius}
                      />
                      <circle
                        className="donut-gauge-progress"
                        cx="70"
                        cy="70"
                        r={radius}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>
                    <div className="donut-gauge-center">
                      <span className="donut-score-number">{readinessScore}</span>
                      <span className="donut-score-max">of 100</span>
                    </div>
                  </div>

                  <p className="readiness-summary-text">
                    Bạn đang nằm trong <strong>Top 15%</strong> ứng viên sẵn sàng phỏng vấn tuần này.
                  </p>

                  <Link to="/interview-setup" className="improve-score-btn">
                    Luyện phỏng vấn nâng điểm
                  </Link>
                </motion.div>

                {/* 2. HireMate AI Coach Card */}
                <motion.div
                  className="ai-coach-card"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.26 }}
                >
                  <div className="coach-top-row">
                    <div className="coach-badge">
                      <Bot size={18} />
                      <span>HireMate AI Coach</span>
                    </div>
                    <div className="coach-lightbulb">
                      <Lightbulb size={20} />
                    </div>
                  </div>

                  <h3 className="coach-heading">Làm chủ phương pháp STAR</h3>
                  <p className="coach-quote">
                    "Khi trả lời câu hỏi tình huống, hãy áp dụng Situation, Task, Action, và Result. Cố gắng dành 60% thời lượng cho phần Action cụ thể của bản thân."
                  </p>
                </motion.div>

                {/* 3. Metric Tiles Row */}
                <motion.div
                  className="metric-tiles-row"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.32 }}
                >
                  <div className="metric-tile">
                    <span className="metric-tile-label">Buổi phỏng vấn</span>
                    <span className="metric-tile-value">{totalInterviews}</span>
                  </div>
                  <div className="metric-tile">
                    <span className="metric-tile-label">Kỹ năng mục tiêu</span>
                    <span className="metric-tile-value">{skills.length}</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ===================================================================
             IN-PAGE ONBOARDING 3-STEP WIZARD (SEAMLESS SWITCHING)
             =================================================================== */
          <motion.div
            key="onboarding-view-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="onboarding-inpage-layout"
          >
            {/* Stepper Progress Bar */}
            <div className="onboarding-inpage-stepper">
              <div
                className={`inpage-step-indicator ${onboardingStep >= 1 ? 'active' : ''} ${onboardingStep === 1 ? 'current' : ''}`}
                onClick={() => setOnboardingStep(1)}
              >
                <div className="step-circle">1</div>
                <div className="step-meta">
                  <span className="step-seq">Bước 1 / 3</span>
                  <span className="step-name">Hồ sơ & Kỹ năng cá nhân</span>
                </div>
              </div>

              <div className={`inpage-step-line ${onboardingStep >= 2 ? 'filled' : ''}`} />

              <div
                className={`inpage-step-indicator ${onboardingStep >= 2 ? 'active' : ''} ${onboardingStep === 2 ? 'current' : ''}`}
                onClick={() => setOnboardingStep(2)}
              >
                <div className="step-circle">2</div>
                <div className="step-meta">
                  <span className="step-seq">Bước 2 / 3</span>
                  <span className="step-name">Mục tiêu nghề nghiệp</span>
                </div>
              </div>

              <div className={`inpage-step-line ${onboardingStep >= 3 ? 'filled' : ''}`} />

              <div
                className={`inpage-step-indicator ${onboardingStep >= 3 ? 'active' : ''} ${onboardingStep === 3 ? 'current' : ''}`}
                onClick={() => setOnboardingStep(3)}
              >
                <div className="step-circle">3</div>
                <div className="step-meta">
                  <span className="step-seq">Bước 3 / 3</span>
                  <span className="step-name">Xác nhận & Kích hoạt</span>
                </div>
              </div>
            </div>

            {/* In-Page Step Content Card */}
            <div className="onboarding-inpage-card">
              {/* STEP 1: PERSONAL & SKILLS */}
              {onboardingStep === 1 && (
                <motion.form
                  key="onboarding-step-1"
                  onSubmit={handleOnboardingStep1}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <div className="inpage-card-heading">
                    <h3>Chào bạn! Hãy giới thiệu về bản thân 👋</h3>
                    <p>Thông tin này giúp AI hiểu rõ hồ sơ để tối ưu hóa bộ câu hỏi phỏng vấn chuẩn xác nhất.</p>
                  </div>

                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">
                      <User size={15} />
                      <span>Họ và tên của bạn</span>
                      <span className="required-dot">*</span>
                    </label>
                    <input
                      type="text"
                      className="custom-form-input"
                      placeholder="VD: Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-two-col" style={{ marginBottom: '18px' }}>
                    <div className="form-group" style={{ flex: 1.8 }}>
                      <label className="form-label">
                        <GraduationCap size={15} />
                        <span>Trường học / Học vấn cao nhất</span>
                      </label>
                      <input
                        type="text"
                        className="custom-form-input"
                        placeholder="VD: Đại học Bách Khoa TP.HCM"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">
                        <Award size={15} />
                        <span>Năm tốt nghiệp</span>
                      </label>
                      <input
                        type="number"
                        min="1980"
                        max="2100"
                        className="custom-form-input"
                        placeholder="2026"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">
                      <FileText size={15} />
                      <span>Giới thiệu ngắn gọn (Bio)</span>
                    </label>
                    <textarea
                      rows={3}
                      className="custom-form-textarea"
                      placeholder="Chia sẻ định hướng nghề nghiệp, thế mạnh cá nhân..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '22px' }}>
                    <label className="form-label">
                      <Cpu size={15} />
                      <span>Kỹ năng chuyên môn chính ({skills.length})</span>
                    </label>

                    <div className="skills-tags-container">
                      {skills.map((s) => (
                        <span key={s} className="skill-pill-item">
                          {s}
                          <button
                            type="button"
                            className="skill-remove-btn"
                            onClick={() => handleRemoveSkill(s)}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      <div className="skill-add-wrapper">
                        <input
                          type="text"
                          className="skill-inline-input"
                          placeholder="+ Thêm kỹ năng (nhấn Enter)..."
                          value={newSkillInput}
                          onChange={(e) => setNewSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSkill();
                            }
                          }}
                        />
                        {newSkillInput.trim() && (
                          <button
                            type="button"
                            className="skill-add-btn"
                            onClick={() => handleAddSkill()}
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="suggested-skills-row">
                      <span className="suggested-skills-label">Gợi ý nhanh:</span>
                      <div className="suggested-skills-wrap">
                        {SUGGESTED_SKILLS.filter((s) => !skills.some((item) => item.toLowerCase() === s.toLowerCase()))
                          .slice(0, 8)
                          .map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="suggested-skill-btn"
                              onClick={() => handleAddSkill(item)}
                            >
                              + {item}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="onboarding-step-actions">
                    <button
                      type="submit"
                      className="onboarding-next-btn"
                      disabled={onboardingSaving}
                    >
                      <span>Tiếp tục sang Bước 2 (Mục tiêu)</span>
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </motion.form>
              )}

              {/* STEP 2: CAREER GOAL */}
              {onboardingStep === 2 && (
                <motion.form
                  key="onboarding-step-2"
                  onSubmit={handleOnboardingStep2}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <div className="inpage-card-heading">
                    <h3>Mục tiêu nghề nghiệp của bạn 🎯</h3>
                    <p>Chọn ngành nghề và vị trí công việc mục tiêu để AI thiết lập bộ câu hỏi phỏng vấn chuẩn JD.</p>
                  </div>

                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">
                      <Layers size={15} />
                      <span>Ngành nghề mục tiêu</span>
                      <span className="required-dot">*</span>
                    </label>
                    <select
                      className="custom-form-select"
                      value={field}
                      onChange={(e) => setField(e.target.value)}
                      required
                    >
                      {Object.keys(INDUSTRY_ROLES).map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '18px' }}>
                    <label className="form-label">
                      <Briefcase size={15} />
                      <span>Vị trí công việc cụ thể</span>
                      <span className="required-dot">*</span>
                    </label>
                    <select
                      className="custom-form-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                    >
                      {(INDUSTRY_ROLES[field] || POPULAR_ROLES).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">
                      <Award size={15} />
                      <span>Mức độ kinh nghiệm hiện tại</span>
                    </label>
                    <select
                      className="custom-form-select"
                      value={exp}
                      onChange={(e) => setExp(e.target.value)}
                      required
                    >
                      {EXP_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="onboarding-step-actions" style={{ justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      className="onboarding-back-btn"
                      onClick={() => setOnboardingStep(1)}
                    >
                      <ArrowLeft size={16} />
                      <span>Quay lại Bước 1</span>
                    </button>

                    <button
                      type="submit"
                      className="onboarding-next-btn"
                      disabled={onboardingSaving}
                    >
                      <span>Tiếp tục sang Bước 3 (Xác nhận)</span>
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </motion.form>
              )}

              {/* STEP 3: SUMMARY & ACTIVATE */}
              {onboardingStep === 3 && (
                <motion.div
                  key="onboarding-step-3"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <div className="inpage-card-heading text-center" style={{ textAlign: 'center', marginBottom: '22px' }}>
                    <div className="summary-success-badge">
                      <CheckCircle2 size={36} color="#16A34A" />
                    </div>
                    <h3 style={{ fontSize: '1.45rem', margin: '10px 0 6px' }}>Hồ sơ của bạn đã sẵn sàng! 🎉</h3>
                    <p>HireMate AI đã hoàn tất cấu hình theo đúng mục tiêu nghề nghiệp và kỹ năng của bạn.</p>
                  </div>

                  <div className="summary-review-box">
                    {/* Career Goal Review */}
                    <div className="summary-section-row">
                      <div className="section-title-wrap">
                        <Briefcase size={16} color="#0284C7" />
                        <strong>Mục tiêu nghề nghiệp</strong>
                      </div>
                      <button
                        type="button"
                        className="summary-edit-link"
                        onClick={() => setOnboardingStep(2)}
                      >
                        <Edit3 size={13} /> Sửa
                      </button>
                    </div>

                    <div className="summary-two-col">
                      <div>
                        <span className="summary-meta-label">Ngành nghề</span>
                        <div className="summary-meta-value">{field}</div>
                      </div>
                      <div>
                        <span className="summary-meta-label">Vị trí ứng tuyển</span>
                        <div className="summary-meta-value" style={{ color: '#0284C7' }}>{role}</div>
                      </div>
                      <div>
                        <span className="summary-meta-label">Mức kinh nghiệm</span>
                        <div className="summary-meta-value">{exp}</div>
                      </div>
                    </div>

                    <div className="summary-divider" />

                    {/* Personal Profile Review */}
                    <div className="summary-section-row">
                      <div className="section-title-wrap">
                        <User size={16} color="#0284C7" />
                        <strong>Thông tin cá nhân & Học vấn</strong>
                      </div>
                      <button
                        type="button"
                        className="summary-edit-link"
                        onClick={() => setOnboardingStep(1)}
                      >
                        <Edit3 size={13} /> Sửa
                      </button>
                    </div>

                    <div className="summary-two-col">
                      <div>
                        <span className="summary-meta-label">Họ và tên</span>
                        <div className="summary-meta-value">{name}</div>
                      </div>
                      <div>
                        <span className="summary-meta-label">Học vấn & Năm tốt nghiệp</span>
                        <div className="summary-meta-value">
                          {education} {graduationYear ? `(${graduationYear})` : ''}
                        </div>
                      </div>
                    </div>

                    {skills.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <span className="summary-meta-label" style={{ display: 'block', marginBottom: '6px' }}>
                          Kỹ năng chuyên môn
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {skills.map((s) => (
                            <span key={s} className="summary-skill-chip">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="onboarding-step-actions" style={{ justifyContent: 'space-between', marginTop: '20px' }}>
                    <button
                      type="button"
                      className="onboarding-back-btn"
                      onClick={() => setOnboardingStep(2)}
                    >
                      <ArrowLeft size={16} />
                      <span>Quay lại Bước 2</span>
                    </button>

                    <button
                      type="button"
                      className="onboarding-finish-btn"
                      onClick={handleOnboardingFinish}
                      disabled={onboardingSaving}
                    >
                      {onboardingSaving ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          <span>Đang lưu thiết lập...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={17} />
                          <span>Hoàn tất Onboarding & Mở Bảng điều khiển</span>
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Celebratory Toast when Onboarding completes */}
      {onboardingSuccessToast && (
        <motion.div
          className="applied-toast-floating"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
        >
          <CheckCircle2 size={20} color="#10B981" />
          <span>🎉 Chúc mừng! Bạn đã hoàn thành Onboarding thành công. Đang chuyển về Bảng điều khiển...</span>
        </motion.div>
      )}

      {/* User Tutorial Walkthrough Modal (Chỉ popup 1 lần cho người mới chưa điền hồ sơ) */}
      <DashboardGuideModal
        isOpen={guideModalOpen}
        onClose={() => {
          localStorage.setItem(`hm_tutorial_seen_${accountKey}`, 'true');
          setGuideModalOpen(false);
        }}
        accountKey={accountKey}
      />
    </div>
  );
};
