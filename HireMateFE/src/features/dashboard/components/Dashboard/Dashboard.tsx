import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import {
  profileService,
  cvService,
  matchService,
  emailService,
} from '../../../../shared/services';
import { dashboardService } from '../../api/dashboard.service';
import {
  Video,
  User,
  FolderOpen,
  Target,
  Mail,
  Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardGuideModal } from '../DashboardGuideModal/DashboardGuideModal';
import { DashboardHero } from './components/DashboardHero';
import { CareerProfileForm } from './components/CareerProfileForm';
import { MultiCvHub } from './components/MultiCvHub';
import { JdMatcher } from './components/JdMatcher';
import { AiEmailGenerator } from './components/AiEmailGenerator';
import { DashboardSidebar } from './components/DashboardSidebar';
import { CvDetailModal } from './components/CvDetailModal';
import { CheckCvModal } from './components/CheckCvModal';
import './css/Dashboard.css';

// Sample CVs for instant demo
export interface SampleCV {
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
    label: '📄 CV Frontend Developer (2 năm KN)',
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
    label: '🚀 CV Quản lý Sản phẩm (Product Manager 3+ năm)',
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

// Multi-CV Data Model
export interface UserCvCard {
  id: string;
  title: string;
  filename: string;
  role: string;
  field: string;
  exp: string;
  education: string;
  skills: string[];
  bio: string;
  uploadedAt: string;
  atsScore: number;
  formatScore?: number;
  keywordsScore?: number;
  readabilityScore?: number;
  isBackendDoc?: boolean;
}

const DEFAULT_USER_CVS: UserCvCard[] = [
  {
    id: 'cv-fe-01',
    title: 'CV_Frontend_Developer_React.pdf',
    filename: 'CV_Frontend_Developer_React.pdf',
    role: 'Frontend Developer',
    field: 'Công nghệ thông tin',
    exp: '1 - 3 năm (Mid-level)',
    education: 'Đại học Bách Khoa TP.HCM - Kỹ thuật Phần mềm',
    skills: ['React', 'TypeScript', 'TailwindCSS', 'Redux Toolkit', 'REST API', 'Next.js', 'Git'],
    bio: 'Kỹ sư Frontend với hơn 2 năm kinh nghiệm xây dựng ứng dụng web SPA hiệu năng cao, đam mê UI/UX tối giản và tối ưu trải nghiệm người dùng.',
    uploadedAt: '18/09/2026',
    atsScore: 88,
    formatScore: 92,
    keywordsScore: 85,
    readabilityScore: 88,
  },
  {
    id: 'cv-be-02',
    title: 'CV_Backend_Engineer_DotNet.pdf',
    filename: 'CV_Backend_Engineer_DotNet.pdf',
    role: 'Backend Engineer (C# / .NET)',
    field: 'Công nghệ thông tin',
    exp: '2 - 4 năm kinh nghiệm',
    education: 'Đại học Bách Khoa TP.HCM - Khoa học Máy tính',
    skills: ['C#', '.NET Core', 'SQL Server', 'REST API', 'Docker', 'Microservices', 'Redis'],
    bio: 'Kỹ sư Backend chuyên sâu kiến trúc hệ thống phân tán, xử lý dữ liệu lớn, thiết kế RESTful API an toàn và tối ưu truy vấn Database.',
    uploadedAt: '16/09/2026',
    atsScore: 92,
    formatScore: 95,
    keywordsScore: 90,
    readabilityScore: 91,
  },
  {
    id: 'cv-pm-03',
    title: 'CV_Product_Manager_Fintech.pdf',
    filename: 'CV_Product_Manager_Fintech.pdf',
    role: 'Product Manager',
    field: 'Tài chính - Ngân hàng (Fintech)',
    exp: '3 - 5 năm (Senior)',
    education: 'Đại học Kinh Tế TP.HCM - Hệ thống thông tin quản trị',
    skills: ['Product Strategy', 'Agile/Scrum', 'User Research', 'Figma', 'Roadmapping', 'Jira', 'Data-driven Decision'],
    bio: 'Product Manager với kinh nghiệm dẫn dắt đội ngũ kỹ thuật và thiết kế ra mắt các sản phẩm Fintech B2B/B2C tăng trưởng người dùng 40% hàng quý.',
    uploadedAt: '14/09/2026',
    atsScore: 85,
    formatScore: 88,
    keywordsScore: 82,
    readabilityScore: 86,
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

  // Active Tab: 'manual' (Hồ sơ nghề nghiệp) | 'scan' (Kho CV cá nhân) | 'match' | 'email'
  const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'match' | 'email'>(initialTab);
  const [checkCvModalOpen, setCheckCvModalOpen] = useState(false);

  // Multi-CV Hub State
  const [userCvs, setUserCvs] = useState<UserCvCard[]>([]);
  const [activeCvId, setActiveCvId] = useState<string>('');
  const [selectedCvForDetail, setSelectedCvForDetail] = useState<UserCvCard | null>(null);
  const [cvDetailModalOpen, setCvDetailModalOpen] = useState<boolean>(false);
  const [showAddCvForm, setShowAddCvForm] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedMatchCvId, setSelectedMatchCvId] = useState<string>('');

  // Scanning & Upload state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Career Profile Form State (Hồ sơ nghề nghiệp - dbo.CareerProfiles)
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
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

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

  // Stats & Guide
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  useEffect(() => {
    if (tabQuery && ['manual', 'scan', 'match', 'email'].includes(tabQuery)) {
      setActiveTab(tabQuery as 'manual' | 'scan' | 'match' | 'email');
    }
  }, [tabQuery]);

  const handleTabChange = (tab: 'manual' | 'scan' | 'match' | 'email') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Sync profile when AppContext updates
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

  // Load CV Collection
  useEffect(() => {
    const loadCvs = async () => {
      try {
        let loadedCvs: UserCvCard[] = [];

        if (localStorage.getItem('hm_access_token')) {
          try {
            const res = await cvService.listCvs();
            if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
              loadedCvs = res.data.map((d: any) => ({
                id: d.id,
                title: d.fileName || 'CV Document.pdf',
                filename: d.fileName || 'CV Document.pdf',
                role:
                  d.parsedProfile?.desiredPosition ||
                  (d.fileName.toLowerCase().includes('backend')
                    ? 'Backend Developer'
                    : d.fileName.toLowerCase().includes('data')
                    ? 'Data Analyst'
                    : 'Frontend Developer'),
                field: d.parsedProfile?.desiredIndustry || 'Công nghệ thông tin',
                exp: d.parsedProfile?.experienceYears || '1 - 3 năm (Mid-level)',
                education: d.parsedProfile?.education || 'Đại học Bách Khoa TP.HCM',
                skills: d.parsedProfile?.skills || ['React', 'TypeScript', 'REST API', 'Git'],
                bio: d.parsedProfile?.bio || 'Hồ sơ nghề nghiệp đã được phân tích bởi HireMate AI.',
                uploadedAt: d.uploadedAt
                  ? new Date(d.uploadedAt).toLocaleDateString('vi-VN')
                  : '18/09/2026',
                atsScore: d.overallScore || d.formatScore || 88,
                formatScore: d.formatScore || 90,
                keywordsScore: d.keywordsScore || 85,
                readabilityScore: d.readabilityScore || 89,
                isBackendDoc: true,
              }));
            }
          } catch (e) {}
        }

        if (loadedCvs.length === 0) {
          const localSaved = localStorage.getItem('hm_saved_user_cvs');
          if (localSaved) {
            try {
              loadedCvs = JSON.parse(localSaved);
            } catch {}
          }
        }

        if (loadedCvs.length === 0) {
          loadedCvs = DEFAULT_USER_CVS;
        }

        setUserCvs(loadedCvs);

        const savedActiveId = localStorage.getItem('hm_active_cv_id');
        const foundActive = loadedCvs.find((c) => c.id === savedActiveId);
        if (foundActive) {
          setActiveCvId(foundActive.id);
          setSelectedMatchCvId(foundActive.id);
        } else if (loadedCvs.length > 0) {
          setActiveCvId(loadedCvs[0].id);
          setSelectedMatchCvId(loadedCvs[0].id);
          localStorage.setItem('hm_active_cv_id', loadedCvs[0].id);
        }
      } catch (err) {
        setUserCvs(DEFAULT_USER_CVS);
        setActiveCvId(DEFAULT_USER_CVS[0].id);
      }
    };

    loadCvs();
  }, []);

  // Fetch Dashboard Stats
  useEffect(() => {
    if (localStorage.getItem('hm_access_token')) {
      dashboardService.getDashboardStats().then((res) => {
        if (res.ok && res.data) {
          setDashboardStats(res.data);
        }
      }).catch(() => {});
    }
  }, []);

  // Set Active CV: Updates Career Profile context and storage
  const handleSelectActiveCv = (cv: UserCvCard) => {
    setActiveCvId(cv.id);
    setSelectedMatchCvId(cv.id);
    localStorage.setItem('hm_active_cv_id', cv.id);

    setName(cv.title.replace(/^CV_/, '').replace(/\.pdf$/, '').replace(/_/g, ' ') || name);
    setRole(cv.role);
    setField(cv.field);
    setExp(cv.exp);
    setEducation(cv.education);
    setSkills(cv.skills);
    setBio(cv.bio);

    updateProfile({
      role: cv.role,
      field: cv.field,
      exp: cv.exp,
      education: cv.education,
      skills: cv.skills,
      bio: cv.bio,
    });

    setToastMsg(`🎯 Đã kích hoạt CV "${cv.title}" làm hồ sơ phỏng vấn chính!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleDeleteCv = (id: string, title: string) => {
    const remaining = userCvs.filter((c) => c.id !== id);
    setUserCvs(remaining);
    localStorage.setItem('hm_saved_user_cvs', JSON.stringify(remaining));

    if (activeCvId === id && remaining.length > 0) {
      handleSelectActiveCv(remaining[0]);
    }
    setToastMsg(`🗑️ Đã xóa CV "${title}" khỏi kho.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Upload New CV into user's collection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress(15);
    setScanStatusText(`📤 Đang tải lên file "${file.name}"...`);

    let newCvCard: UserCvCard;

    if (localStorage.getItem('hm_access_token')) {
      try {
        const uploadRes = await cvService.uploadCv(file);
        if (uploadRes.ok && uploadRes.data?.id) {
          setScanProgress(55);
          setScanStatusText('🤖 AI đang phân tích toàn diện nội dung CV...');
          const analyzeRes = await cvService.analyzeCv(uploadRes.data.id);
          const ai = analyzeRes.ok && analyzeRes.data ? analyzeRes.data : null;

          newCvCard = {
            id: uploadRes.data.id,
            title: file.name,
            filename: file.name,
            role:
              ai?.parsedRole ||
              (file.name.toLowerCase().includes('backend')
                ? 'Backend Developer'
                : file.name.toLowerCase().includes('data')
                ? 'Data Analyst'
                : file.name.toLowerCase().includes('pm') || file.name.toLowerCase().includes('manager')
                ? 'Product Manager'
                : 'Frontend Developer'),
            field: field || 'Công nghệ thông tin',
            exp: ai?.parsedExp || exp || '1 - 3 năm (Mid-level)',
            education: ai?.parsedEducation || education || 'Đại học Bách Khoa TP.HCM',
            skills:
              Array.isArray(ai?.parsedSkills) && ai?.parsedSkills.length > 0
                ? ai.parsedSkills
                : ['React', 'TypeScript', 'REST API', 'Git'],
            bio: ai?.parsedBio || 'Hồ sơ nghề nghiệp được trích xuất và phân tích bởi HireMate AI.',
            uploadedAt: new Date().toLocaleDateString('vi-VN'),
            atsScore: ai?.overallScore || ai?.formatScore || 90,
            formatScore: ai?.formatScore || 92,
            keywordsScore: ai?.keywordsScore || 88,
            readabilityScore: ai?.readabilityScore || 90,
            isBackendDoc: true,
          };

          setScanProgress(100);
          setScanStatusText('✅ Đã lưu CV mới vào kho CV của bạn!');
          setIsScanning(false);

          const updatedList = [newCvCard, ...userCvs];
          setUserCvs(updatedList);
          localStorage.setItem('hm_saved_user_cvs', JSON.stringify(updatedList));
          setShowAddCvForm(false);
          setToastMsg(`🎉 Đã thêm thành công CV "${file.name}" vào kho!`);
          setTimeout(() => setToastMsg(null), 3500);
          return;
        }
      } catch (err) {}
    }

    // Local simulation fallback
    const roleGuess = file.name.toLowerCase().includes('backend')
      ? 'Backend Developer'
      : file.name.toLowerCase().includes('data')
      ? 'Data Analyst'
      : file.name.toLowerCase().includes('manager') || file.name.toLowerCase().includes('pm')
      ? 'Product Manager'
      : 'Frontend Developer';

    newCvCard = {
      id: `cv-local-${Date.now()}`,
      title: file.name,
      filename: file.name,
      role: roleGuess,
      field: roleGuess === 'Data Analyst' ? 'Tài chính - Ngân hàng (Fintech)' : 'Công nghệ thông tin',
      exp: '1 - 3 năm (Mid-level)',
      education: 'Đại học Bách Khoa TP.HCM',
      skills:
        roleGuess === 'Backend Developer'
          ? ['C#', '.NET Core', 'SQL Server', 'Docker', 'REST API']
          : roleGuess === 'Data Analyst'
          ? ['SQL', 'Python', 'Power BI', 'Excel Advanced', 'Pandas']
          : ['React', 'TypeScript', 'TailwindCSS', 'Redux Toolkit', 'Git'],
      bio: `Hồ sơ ${roleGuess} chuyên môn đã được tải lên và lưu vào kho CV HireMate.`,
      uploadedAt: new Date().toLocaleDateString('vi-VN'),
      atsScore: Math.floor(Math.random() * 8) + 88,
      formatScore: 92,
      keywordsScore: 88,
      readabilityScore: 90,
    };

    setScanProgress(100);
    setIsScanning(false);
    const updatedList = [newCvCard, ...userCvs];
    setUserCvs(updatedList);
    localStorage.setItem('hm_saved_user_cvs', JSON.stringify(updatedList));
    setShowAddCvForm(false);
    setToastMsg(`🎉 Đã thêm thành công CV "${file.name}" vào kho!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleAddSampleCvToHub = (sample: SampleCV) => {
    const newCvCard: UserCvCard = {
      id: `cv-sample-${Date.now()}`,
      title: sample.filename,
      filename: sample.filename,
      role: sample.role,
      field: sample.field,
      exp: sample.exp,
      education: sample.education,
      skills: sample.skills,
      bio: sample.bio,
      uploadedAt: new Date().toLocaleDateString('vi-VN'),
      atsScore: Math.floor(Math.random() * 6) + 88,
      formatScore: 92,
      keywordsScore: 89,
      readabilityScore: 91,
    };

    const updatedList = [newCvCard, ...userCvs];
    setUserCvs(updatedList);
    localStorage.setItem('hm_saved_user_cvs', JSON.stringify(updatedList));
    setShowAddCvForm(false);
    setToastMsg(`🎉 Đã thêm CV "${sample.filename}" vào kho của bạn!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Save Career Profile (writes to dbo.CareerProfiles)
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManual(true);
    const parsedGradYear =
      typeof graduationYear === 'number'
        ? graduationYear
        : parseInt(String(graduationYear), 10) || 2026;

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
    } catch (err) {}

    setSavingManual(false);
    setSavedSuccess(true);
    setCheckCvModalOpen(true);
    setTimeout(() => setSavedSuccess(false), 2800);
  };

  // JD Matcher Handler
  const handleMatchJd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdText.trim()) return;
    setIsMatching(true);
    setMatchResult(null);

    const targetCv =
      userCvs.find((c) => c.id === selectedMatchCvId) ||
      userCvs.find((c) => c.id === activeCvId);
    const targetSkills =
      targetCv?.skills && targetCv.skills.length > 0 ? targetCv.skills : skills;

    try {
      const res = await matchService.match({
        jdText: jdText.trim(),
        cvDocumentId: targetCv?.isBackendDoc ? targetCv.id : undefined,
      });

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
        const matching = parsedJson?.skills || parsedJson?.matchingSkills || targetSkills.slice(0, 4);
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
        const jdLower = jdText.toLowerCase();
        const matched = targetSkills.filter((s) => jdLower.includes(s.toLowerCase()));
        const missing = ['Docker', 'CI/CD', 'Jest', 'GraphQL', 'AWS'].filter(
          (req) => jdLower.includes(req.toLowerCase()) && !targetSkills.some((s) => s.toLowerCase() === req.toLowerCase())
        );
        const score = Math.min(95, Math.max(65, Math.round((matched.length / Math.max(targetSkills.length, 1)) * 100)));
        setMatchResult({
          matchScore: score,
          overallScore: score,
          matchingSkills: matched.length > 0 ? matched : targetSkills.slice(0, 4),
          missingSkills: missing.length > 0 ? missing : ['CI/CD Pipeline', 'Microservices'],
          recommendations: [
            'Bổ sung các dự án thực chiến làm nổi bật khả năng xử lý bài toán hiệu năng.',
            'Chuẩn bị câu trả lời phương pháp STAR tập trung vào kỹ năng ' + (matched[0] || targetSkills[0] || 'chuyên môn'),
          ],
        });
      }
    } catch {
      setMatchResult({
        matchScore: 88,
        overallScore: 88,
        matchingSkills: targetSkills.slice(0, 4),
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

  // AI Email Generator Handler
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
            ? `Kính gửi Bộ phận Tuyển dụng ${comp},\n\nTôi tên là ${candidateName}, tôi viết thư này để bày tỏ nguyện vọng ứng tuyển vào vị trí ${pos} tại ${comp}.\n\nVới các kỹ năng cốt lõi (${skills.slice(0, 4).join(', ')}), tôi tin tưởng mình sẽ đóng góp giá trị thiết thực cho sự phát triển của công ty.\n\nTôi rất mong có cơ hội trao đổi trực tiếp trong buổi phỏng vấn.\n\nTrân trọng,\n${candidateName}`
            : `Kính gửi ${comp},\n\nTôi là ${candidateName}. Tôi xin chân thành cảm ơn Anh/Chị đã dành thời gian trao đổi cùng tôi về vị trí ${pos}.\n\nTrân trọng,\n${candidateName}`;

        setGeneratedEmail({
          subject: defaultSubject,
          body,
          email: body,
          tips: ['Kiểm tra lại thông tin người nhận trước khi gửi.'],
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

  // Completion calculation
  const calculateCompletion = () => {
    let score = 0;
    if (name && name.trim().length >= 2 && !name.toLowerCase().includes('google user')) score += 15;
    if (role && role.trim().length >= 2) score += 20;
    if (field && field.trim().length >= 2 && !field.includes('--')) score += 20;
    if (exp && exp.trim().length >= 2 && !exp.includes('--')) score += 15;
    if (education && education.trim().length >= 2) score += 15;
    if (skills && skills.length >= 2) score += 10;
    else if (skills && skills.length === 1) score += 5;
    if ((bio && bio.trim().length >= 10) || graduationYear) score += 5;
    return Math.min(score, 100);
  };

  const completionPercent = calculateCompletion();
  const isProUser = Boolean(
    profile.isPremium ||
    (profile.currentPlanCode && profile.currentPlanCode.toLowerCase() !== 'free')
  );

  const accountKey = (profile.name || name || 'user')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const readinessScore =
    dashboardStats?.readinessScore ||
    lastResult?.overall ||
    (history.length ? history[history.length - 1].score : 86);
  const totalInterviews =
    dashboardStats?.totalInterviews || (history.length > 0 ? history.length : 4);

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

  const activeCv = userCvs.find((c) => c.id === activeCvId) || userCvs[0];
  const otherCvs = userCvs.filter((c) => c.id !== activeCv?.id);

  return (
    <div className="dashboard-vibe-container">
      {/* 1. Top Hero Section */}
      <DashboardHero
        greetingName={getGreetingName()}
        completionPercent={completionPercent}
        isProUser={isProUser}
        onOpenGuideModal={() => setGuideModalOpen(true)}
      />

      {/* 2. Quick Action Cards */}
      <motion.div
        className="quick-actions-grid"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <Link to="/interview-setup" className="quick-action-card card-teal">
          <div className="card-content-left">
            <span className="card-tag">Interactive</span>
            <h3 className="card-title">Phỏng vấn AI</h3>
          </div>
          <div className="card-icon-right">
            <Video size={22} />
          </div>
        </Link>

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
            <h3 className="card-title">Kho CV của bạn</h3>
          </div>
          <div className="card-icon-right">
            <FolderOpen size={22} />
          </div>
        </div>
      </motion.div>

      {/* 3. Main 2-Column Grid */}
      <div className="dashboard-main-grid">
        {/* Left Column: Career Profile & Multi-CV Hub Tabs */}
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
                <h2>Hồ sơ nghề nghiệp & Kho CV cá nhân</h2>
                <p className="profile-header-subtitle">
                  Tùy chỉnh thông tin mục tiêu hoặc quản lý nhiều phiên bản CV theo từng vai trò
                </p>
              </div>
            </div>

            {/* Segmented Control */}
            <div className="profile-segmented-nav">
              <button
                type="button"
                className={`segmented-tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                onClick={() => handleTabChange('manual')}
              >
                <span>Hồ sơ nghề nghiệp</span>
              </button>

              <button
                type="button"
                className={`segmented-tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
                onClick={() => handleTabChange('scan')}
              >
                <FolderOpen size={13} />
                <span>Kho CV ({userCvs.length})</span>
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

              {(name.trim() || role.trim()) && (
                <button
                  type="button"
                  className="segmented-tab-btn"
                  onClick={() => setCheckCvModalOpen(true)}
                  title="Xem lại hồ sơ nghề nghiệp"
                  style={{
                    background: 'rgba(2, 132, 199, 0.08)',
                    color: '#0284C7',
                    fontWeight: 650,
                  }}
                >
                  <Eye size={13} />
                  <span>Xem hồ sơ</span>
                </button>
              )}
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

          {/* TAB 1: Hồ sơ nghề nghiệp (Career Profile Form) */}
          {activeTab === 'manual' && (
            <CareerProfileForm
              name={name}
              setName={setName}
              role={role}
              setRole={setRole}
              field={field}
              setField={setField}
              exp={exp}
              setExp={setExp}
              education={education}
              setEducation={setEducation}
              graduationYear={graduationYear}
              setGraduationYear={setGraduationYear}
              bio={bio}
              setBio={setBio}
              skills={skills}
              setSkills={setSkills}
              saving={savingManual}
              savedSuccess={savedSuccess}
              onSave={handleSaveManual}
              onOpenCheckCvModal={() => setCheckCvModalOpen(true)}
            />
          )}

          {/* TAB 2: Kho CV ứng viên (Multi-CV Collection Hub) */}
          {activeTab === 'scan' && (
            <MultiCvHub
              userCvs={userCvs}
              activeCv={activeCv}
              otherCvs={otherCvs}
              toastMsg={toastMsg}
              showAddCvForm={showAddCvForm}
              setShowAddCvForm={setShowAddCvForm}
              isScanning={isScanning}
              scanProgress={scanProgress}
              scanStatusText={scanStatusText}
              fileInputRef={fileInputRef}
              sampleCvs={SAMPLE_CVS}
              onFileUpload={handleFileUpload}
              onAddSample={handleAddSampleCvToHub}
              onSelectActiveCv={handleSelectActiveCv}
              onDeleteCv={handleDeleteCv}
              onOpenDetailModal={(cv) => {
                setSelectedCvForDetail(cv);
                setCvDetailModalOpen(true);
              }}
              onNavigateInterview={() => navigate('/interview-setup')}
              onSwitchToMatch={(cvId) => {
                setSelectedMatchCvId(cvId);
                handleTabChange('match');
              }}
            />
          )}

          {/* TAB 3: JD Matcher */}
          {activeTab === 'match' && (
            <JdMatcher
              userCvs={userCvs}
              activeCvId={activeCvId}
              selectedMatchCvId={selectedMatchCvId}
              setSelectedMatchCvId={setSelectedMatchCvId}
              jdText={jdText}
              setJdText={setJdText}
              isMatching={isMatching}
              matchResult={matchResult}
              onMatch={handleMatchJd}
            />
          )}

          {/* TAB 4: AI Email Generator */}
          {activeTab === 'email' && (
            <AiEmailGenerator
              emailType={emailType}
              setEmailType={setEmailType}
              emailPosition={emailPosition}
              setEmailPosition={setEmailPosition}
              emailCompany={emailCompany}
              setEmailCompany={setEmailCompany}
              emailTone={emailTone}
              setEmailTone={setEmailTone}
              isGeneratingEmail={isGeneratingEmail}
              generatedEmail={generatedEmail}
              copiedEmail={copiedEmail}
              onGenerateEmail={handleGenerateEmail}
              onCopyEmail={handleCopyEmail}
            />
          )}
        </motion.div>

        {/* Right Column: Career Readiness & AI Coach & Metrics */}
        <DashboardSidebar
          readinessScore={readinessScore}
          totalInterviews={totalInterviews}
          skillsCount={skills.length}
        />
      </div>

      {/* Check Career Profile Modal */}
      <CheckCvModal
        isOpen={checkCvModalOpen}
        name={name}
        role={role}
        field={field}
        exp={exp}
        skills={skills}
        onClose={() => setCheckCvModalOpen(false)}
        onEditProfile={() => {
          setCheckCvModalOpen(false);
          handleTabChange('manual');
        }}
      />

      {/* CV Detail Modal */}
      <CvDetailModal
        isOpen={cvDetailModalOpen}
        cv={selectedCvForDetail}
        activeCvId={activeCvId}
        onClose={() => setCvDetailModalOpen(false)}
        onSelectActiveCv={handleSelectActiveCv}
        onNavigateInterview={() => navigate('/interview-setup')}
      />

      {/* User Tutorial Walkthrough Modal */}
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
