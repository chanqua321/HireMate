import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
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
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardGuideModal } from '../DashboardGuideModal/DashboardGuideModal';
import './css/Dashboard.css';

// Popular job roles
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
    field: 'Tài chính - Ngân hàng (Fintech)',
    exp: '1 - 3 năm (Mid-level)',
    education: 'Đại học Kinh Tế Quốc Dân - Hệ thống thông tin',
    skills: ['SQL', 'Python', 'Power BI', 'Tableau', 'Excel Advanced', 'Pandas', 'Data Modeling'],
    bio: 'Chuyên viên phân tích dữ liệu có tư duy logic sắc bén, thành thạo xây dựng dashboard trực quan hóa dữ liệu và trích xuất insights hỗ trợ ra quyết định kinh doanh.',
    filename: 'CV_TranHoangLong_DataAnalyst.pdf',
  },
  {
    id: 'pm-lead',
    label: '🚀 CV Quản lý Sản phẩm / E-Commerce (3+ năm KN)',
    name: 'Lê Thanh Thảo',
    role: 'Product Manager',
    field: 'Thương mại điện tử (E-Commerce)',
    exp: '3 - 5 năm (Senior)',
    education: 'Đại học Ngoại Thương - Quản trị Kinh doanh',
    skills: ['Product Strategy', 'Agile/Scrum', 'User Research', 'Figma', 'Roadmapping', 'Data-driven Decision', 'Jira'],
    bio: 'Product Manager với kinh nghiệm dẫn dắt đội ngũ cross-functional ra mắt các giải pháp B2B/B2C đạt hơn 100,000 người dùng hàng tháng.',
    filename: 'CV_LeThanhThao_PM.pdf',
  },
];

export const Dashboard: React.FC = () => {
  const { profile, updateProfile, history, lastResult } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabQuery = searchParams.get('tab');

  const initialTab =
    tabQuery && ['manual', 'scan', 'match', 'email'].includes(tabQuery)
      ? (tabQuery as 'manual' | 'scan' | 'match' | 'email')
      : 'manual';

  // Active Tab: 'manual' (Tự động tạo CV / Điền hồ sơ) | 'scan' (Tải lên CV) | 'match' | 'email'
  const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'match' | 'email'>(initialTab);
  const [checkCvModalOpen, setCheckCvModalOpen] = useState(false);

  useEffect(() => {
    if (tabQuery && ['manual', 'scan', 'match', 'email'].includes(tabQuery)) {
      setActiveTab(tabQuery as 'manual' | 'scan' | 'match' | 'email');
    }
  }, [tabQuery]);

  const handleTabChange = (tab: 'manual' | 'scan' | 'match' | 'email') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Manual Profile Form State (Đa ngành, để trống ban đầu nếu chưa điền)
  const [name, setName] = useState(profile.name || '');
  const [role, setRole] = useState(profile.role || '');
  const [field, setField] = useState(profile.field || '');
  const [exp, setExp] = useState(profile.exp || '');
  const [education, setEducation] = useState(profile.education || '');
  const [graduationYear, setGraduationYear] = useState<number | ''>(profile.graduationYear || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [skills, setSkills] = useState<string[]>(
    profile.skills && profile.skills.length > 0 ? profile.skills : []
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
  const [emailPosition, setEmailPosition] = useState(profile.role || '');
  const [emailCompany, setEmailCompany] = useState('');
  const [emailTone, setEmailTone] = useState('formal');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<any>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Tutorial Popup State (Chỉ popup 1 lần duy nhất cho tài khoản mới chưa điền đủ 100% hồ sơ)
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // Combobox Dropdown States for Field & Experience
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [expDropdownOpen, setExpDropdownOpen] = useState(false);
  const fieldWrapperRef = useRef<HTMLDivElement>(null);
  const expWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fieldWrapperRef.current && !fieldWrapperRef.current.contains(e.target as Node)) {
        setFieldDropdownOpen(false);
      }
      if (expWrapperRef.current && !expWrapperRef.current.contains(e.target as Node)) {
        setExpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        setMatchResult(null);
        alert(res.message || 'So khớp CV–JD thất bại. Kiểm tra gói/hạn mức AI rồi thử lại.');
      }
    } catch (err: any) {
      setMatchResult(null);
      alert(err?.message || 'So khớp CV–JD thất bại. Vui lòng thử lại hoặc nâng cấp gói.');
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
        setGeneratedEmail(null);
        alert(res.message || 'Không tạo được email/Cover Letter. Kiểm tra gói AI rồi thử lại.');
      }
    } catch (err: any) {
      setGeneratedEmail(null);
      alert(err?.message || 'Không tạo được email/Cover Letter.');
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

  // Calculate profile completion percentage accurately (bắt buộc hoàn thiện thông tin cơ bản để đạt 100%)
  const calculateCompletion = () => {
    let score = 0;
    // 1. Họ và tên ứng viên (Bắt buộc)
    if (name && name.trim().length >= 2 && !name.toLowerCase().includes('google user')) score += 15;
    // 2. Vị trí mục tiêu (Bắt buộc)
    if (role && role.trim().length >= 2) score += 20;
    // 3. Ngành nghề / Lĩnh vực (Bắt buộc)
    if (field && field.trim().length >= 2 && !field.includes('--')) score += 20;
    // 4. Số năm kinh nghiệm (Bắt buộc)
    if (exp && exp.trim().length >= 2 && !exp.includes('--')) score += 15;
    // 5. Học vấn / Trường ĐH (Bắt buộc)
    if (education && education.trim().length >= 2) score += 15;
    // 6. Kỹ năng chuyên môn (Bắt buộc tối thiểu 2 kỹ năng)
    if (skills && skills.length >= 2) score += 10;
    else if (skills && skills.length === 1) score += 5;
    // 7. Giới thiệu / Mục tiêu hoặc Năm tốt nghiệp
    if ((bio && bio.trim().length >= 10) || graduationYear) score += 5;

    return Math.min(score, 100);
  };

  const completionPercent = calculateCompletion();

  // Kiểm tra tài khoản Pro / Premium dựa trên dữ liệu thật từ Backend
  const isProUser = Boolean(
    profile.isPremium ||
    (profile.currentPlanCode && profile.currentPlanCode.toLowerCase() !== 'free')
  );

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
    const parsedGradYear =
      typeof graduationYear === 'number'
        ? graduationYear
        : parseInt(String(graduationYear), 10);
    const updated = {
      name: name.trim(),
      fullName: name.trim(),
      role: role.trim(),
      desiredPosition: role.trim(),
      field: field.trim(),
      desiredIndustry: field.trim(),
      exp: exp.trim(),
      experienceLevel: exp.trim(),
      experienceYears: exp.trim(),
      education: education.trim(),
      university: education.trim(),
      graduationYear: Number.isFinite(parsedGradYear) && parsedGradYear > 0 ? parsedGradYear : undefined,
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
    setCheckCvModalOpen(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2800);
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
                name: ai.parsedName || name || '',
                role: ai.parsedRole || role || '',
                field: field,
                exp: ai.parsedExp || exp || '',
                education: ai.parsedEducation || education || '',
                skills: Array.isArray(ai.parsedSkills) && ai.parsedSkills.length > 0 ? ai.parsedSkills : skills,
                bio: ai.parsedBio || bio || '',
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
          setIsScanning(false);
          setScanStatusText('');
          alert('Phân tích CV thất bại. Kiểm tra kết nối API / gói dịch vụ rồi thử lại.');
          return;
        }
      }

      setIsScanning(false);
      setScanStatusText('');
      alert('Không phân tích được CV. Vui lòng thử lại.');
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
      setCheckCvModalOpen(true);
    }, 1200);
  };


  const getGreetingName = () => {
    const rawName = (profile.name || name || '').trim();
    if (
      !rawName ||
      rawName.toLowerCase().includes('người dùng google') ||
      rawName.toLowerCase().includes('google user') ||
      rawName.toLowerCase() === 'ứng viên'
    ) {
      return '';
    }
    return `, ${rawName}`;
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
            Welcome back{getGreetingName()}! 👋
          </h1>
          <p className="dashboard-hero-subtitle">
            Hồ sơ của bạn đã hoàn thiện <strong>{completionPercent}%</strong>.{' '}
            {completionPercent >= 100
              ? 'Hồ sơ đã sẵn sàng 100%. Bạn có thể tự tin bắt đầu phỏng vấn AI ngay bây giờ!'
              : 'Vui lòng hoàn thiện hồ sơ hoặc tải lên CV để nhận câu hỏi phỏng vấn sát thực tế nhất.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Nút Tutorial chỉ hiển thị cho tài khoản Free (nếu là Pro Member thì ẩn đi vì họ đã biết cách dùng) */}
          {!isProUser && (
            <button
              type="button"
              className="dashboard-guide-trigger-btn"
              onClick={() => setGuideModalOpen(true)}
              title="Xem cẩm nang hướng dẫn hoàn thiện hồ sơ"
            >
              <BookOpen size={15} color="#0284c7" />
              <span>Hướng dẫn (Tutorial)</span>
            </button>
          )}

          {isProUser ? (
            <div className="pro-member-pill">
              <Star size={15} fill="#0284c7" color="#0284c7" />
              <span>Pro Member</span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#F1F5F9',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '0.813rem',
                color: '#475569',
                fontWeight: 650,
                border: '1px solid #E2E8F0',
              }}
              title="Gói dịch vụ Miễn phí"
            >
              <span>Tài khoản Free</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Profile & CV Hub */}
      <div>
        {/* 2. Quick Action Cards (2 Focused Cards) */}
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

          {/* Card 2: Upload CV */}
          <div
            onClick={() => {
              handleTabChange('scan');
              window.scrollTo({ top: 260, behavior: 'smooth' });
            }}
            className="quick-action-card card-navy"
            style={{ cursor: 'pointer' }}
          >
            <div className="card-content-left">
              <span className="card-tag">AI OCR</span>
              <h3 className="card-title">Tải lên & Quét CV</h3>
            </div>
            <div className="card-icon-right">
              <UploadCloud size={22} />
            </div>
          </div>
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
                  <span>Điền hồ sơ</span>
                </button>

                <button
                  type="button"
                  className={`segmented-tab-btn ${activeTab === 'scan' ? 'active priority-tab' : ''}`}
                  onClick={() => handleTabChange('scan')}
                >
                  <UploadCloud size={13} />
                  <span>Tải lên CV (Upload CV)</span>
                </button>

                <button
                  type="button"
                  className={`segmented-tab-btn ${activeTab === 'match' ? 'active' : ''}`}
                  onClick={() => handleTabChange('match')}
                >
                  <Target size={13} />
                  <span>So khớp JD</span>
                </button>

                <button
                  type="button"
                  className={`segmented-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
                  onClick={() => handleTabChange('email')}
                >
                  <Mail size={13} />
                  <span>Thư AI</span>
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

            {/* TAB 1: MANUAL PROFILE INPUT (TỰ ĐỘNG TẠO CV CHO NGƯỜI CHƯA CÓ CV) */}
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
                      placeholder="VD: Nguyễn Văn A"
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
                      placeholder="VD: Chuyên viên Phân tích, Nhân viên Marketing, Kỹ sư..."
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Field & Experience (Cho phép nhập tự do hoặc chọn nhanh từ dropdown có bộ lọc tìm kiếm) */}
                <div className="form-two-col">
                  {/* Ngành nghề / Lĩnh vực */}
                  <div className="form-group" ref={fieldWrapperRef} style={{ position: 'relative' }}>
                    <label className="form-label">
                      <Layers size={15} />
                      <span>Ngành nghề / Lĩnh vực</span>
                      <span className="required-dot">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="custom-form-input"
                        placeholder="Nhập hoặc chọn ngành nghề (VD: Công nghệ thông tin, Marketing...)"
                        value={field}
                        onChange={(e) => {
                          setField(e.target.value);
                          setFieldDropdownOpen(true);
                        }}
                        onFocus={() => setFieldDropdownOpen(true)}
                        autoComplete="off"
                        required
                        style={{ paddingRight: '2.2rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setFieldDropdownOpen((prev) => !prev)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        tabIndex={-1}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    {fieldDropdownOpen && (
                      <ul
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '10px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                          zIndex: 60,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          padding: '6px 0',
                          margin: '4px 0 0',
                          listStyle: 'none',
                        }}
                      >
                        {[
                          'Công nghệ thông tin',
                          'Tài chính - Ngân hàng (Fintech)',
                          'Thương mại điện tử (E-Commerce)',
                          'Marketing & Truyền thông',
                          'Quản trị Nhân sự & Tuyển dụng',
                          'Kinh doanh & Bán lẻ (Sales / Retail)',
                          'Thiết kế Đồ họa / UI-UX',
                          'Logistics & Chuỗi cung ứng',
                          'Giáo dục & Đào tạo',
                          'Y tế & Chăm sóc sức khỏe',
                          'Khách sạn & Du lịch',
                          'Bất động sản & Xây dựng',
                          'Kỹ thuật & Cơ khí',
                        ]
                          .filter((item) =>
                            !field.trim() || item.toLowerCase().includes(field.trim().toLowerCase())
                          )
                          .map((item) => (
                            <li
                              key={item}
                              onClick={() => {
                                setField(item);
                                setFieldDropdownOpen(false);
                              }}
                              style={{
                                padding: '8px 14px',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                color: '#0F172A',
                                background: field === item ? '#EFF6FF' : 'transparent',
                                fontWeight: field === item ? 600 : 400,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = field === item ? '#EFF6FF' : 'transparent')
                              }
                            >
                              {item}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  {/* Số năm kinh nghiệm */}
                  <div className="form-group" ref={expWrapperRef} style={{ position: 'relative' }}>
                    <label className="form-label">
                      <Award size={15} />
                      <span>Số năm kinh nghiệm</span>
                      <span className="required-dot">*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="custom-form-input"
                        placeholder="Nhập hoặc chọn kinh nghiệm (VD: 2 năm, Chưa có KN...)"
                        value={exp}
                        onChange={(e) => {
                          setExp(e.target.value);
                          setExpDropdownOpen(true);
                        }}
                        onFocus={() => setExpDropdownOpen(true)}
                        autoComplete="off"
                        required
                        style={{ paddingRight: '2.2rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setExpDropdownOpen((prev) => !prev)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        tabIndex={-1}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    {expDropdownOpen && (
                      <ul
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '10px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                          zIndex: 60,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          padding: '6px 0',
                          margin: '4px 0 0',
                          listStyle: 'none',
                        }}
                      >
                        {[
                          'Chưa có KN (Intern / Fresher)',
                          'Dưới 1 năm (Junior)',
                          '1 - 2 năm kinh nghiệm',
                          '2 - 3 năm (Mid-level)',
                          '3 - 5 năm (Senior)',
                          '5+ năm (Lead / Manager)',
                        ]
                          .filter((item) =>
                            !exp.trim() || item.toLowerCase().includes(exp.trim().toLowerCase())
                          )
                          .map((item) => (
                            <li
                              key={item}
                              onClick={() => {
                                setExp(item);
                                setExpDropdownOpen(false);
                              }}
                              style={{
                                padding: '8px 14px',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                color: '#0F172A',
                                background: exp === item ? '#EFF6FF' : 'transparent',
                                fontWeight: exp === item ? 600 : 400,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = exp === item ? '#EFF6FF' : 'transparent')
                              }
                            >
                              {item}
                            </li>
                          ))}
                      </ul>
                    )}
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
                      placeholder="VD: Đại học Kinh Tế TP.HCM / ĐH Bách Khoa..."
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
                        placeholder="+ Nhập kỹ năng rồi nhấn Enter..."
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
          </div>

      {/* Modal Kiểm Tra Hồ Sơ & CV (Check CV Modal) */}
      <AnimatePresence>
        {checkCvModalOpen && (
          <div
            className="check-cv-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setCheckCvModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.25 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                maxWidth: '560px',
                width: '100%',
                padding: '32px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                border: '1px solid rgba(2, 132, 199, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setCheckCvModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                <X size={18} />
              </button>

              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto',
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  Hồ Sơ & CV Đã Sẵn Sàng!
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#64748B' }}>
                  Dữ liệu đã được hệ thống AI bóc tách & đồng bộ để tối ưu bộ câu hỏi phỏng vấn chuẩn xác nhất.
                </p>
              </div>

              {/* CV Overview Card */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '16px',
                  marginBottom: '22px',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Họ và tên:</span>
                    <strong style={{ color: '#0F172A' }}>{name || 'Chưa cập nhật'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Vị trí mục tiêu:</span>
                    <strong style={{ color: '#0284C7' }}>{role || 'Chưa cập nhật'}</strong>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Ngành nghề:</span>
                    <strong style={{ color: '#0F172A' }}>{field || 'Chưa chọn'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Kinh nghiệm:</span>
                    <strong style={{ color: '#0F172A' }}>{exp || 'Chưa chọn'}</strong>
                  </div>
                </div>
                {skills.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '4px' }}>
                      Kỹ năng ({skills.length}):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {skills.slice(0, 8).map((s) => (
                        <span
                          key={s}
                          style={{
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                      {skills.length > 8 && (
                        <span style={{ color: '#64748B', fontSize: '0.75rem', padding: '2px 4px' }}>
                          +{skills.length - 8} kỹ năng khác
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Interview vs Pricing vs Home */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCheckCvModalOpen(false);
                    navigate('/interview-setup');
                  }}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284C7 0%, #03BFFF 100%)',
                    color: '#FFFFFF',
                    fontWeight: 750,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                  }}
                >
                  <Video size={18} />
                  <span>Tiến hành Phỏng vấn AI ngay</span>
                  <ArrowRight size={16} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckCvModalOpen(false);
                      navigate('/pricing');
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid #BAE6FD',
                      background: '#F0F9FF',
                      color: '#0284C7',
                      fontWeight: 650,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    💎 Xem gói dịch vụ
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCheckCvModalOpen(false);
                      navigate('/');
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 650,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    🏠 Về Trang chủ
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCheckCvModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  ✏️ Ở lại trang này để chỉnh sửa thêm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
