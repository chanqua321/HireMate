import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import {
  profileService,
  cvService,
  matchService,
  emailService,
} from '../../../../shared/services';
import { careerService } from '../../../../shared/services/career.service';
import { dashboardService } from '../../api/dashboard.service';
import {
  Video,
  User,
  FolderOpen,
  Target,
  Mail,
  Eye,
  Sparkles,
  FileSearch,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardGuideModal } from '../DashboardGuideModal/DashboardGuideModal';
import { DashboardHero } from './components/DashboardHero';
import { CareerProfileForm } from './components/CareerProfileForm';
import { MultiCvHub } from './components/MultiCvHub';
import { AiCvAnalyzer } from './components/AiCvAnalyzer';
import { JdMatcher } from './components/JdMatcher';
import { AiEmailGenerator } from './components/AiEmailGenerator';
import { DashboardSidebar } from './components/DashboardSidebar';
import { CvDetailModal } from './components/CvDetailModal';
import { CheckCvModal } from './components/CheckCvModal';
import { CvWizardModal } from '../../../../shared/components/CvWizard/CvWizardModal';
import './css/Dashboard.css';



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
  professionalismScore?: number;
  fitT1Score?: number;
  readinessScore?: number;
  analysisJson?: string;
  isBackendDoc?: boolean;
}

const parseCvDocumentFromBackend = (d: any): UserCvCard => {
  let parsedExtract: any = null;
  if (d.analysis) {
    try {
      const raw = typeof d.analysis === 'string' ? JSON.parse(d.analysis) : d.analysis;
      parsedExtract = raw?.extract || raw?.parsedProfile || raw;
    } catch {}
  } else if (d.parsedProfile) {
    parsedExtract = d.parsedProfile;
  }

  const role =
    parsedExtract?.desiredPosition ||
    d.parsedRole ||
    d.targetRole ||
    (d.analyzedAt ? 'Chuyên viên' : 'Chưa phân tích');

  const field =
    parsedExtract?.desiredIndustry ||
    d.targetField ||
    'Chưa xác định';

  const exp =
    parsedExtract?.experienceLevel ||
    d.parsedExp ||
    (parsedExtract?.graduationYear ? `Năm TN: ${parsedExtract.graduationYear}` : 'Chưa xác định');

  const education =
    parsedExtract?.university ||
    parsedExtract?.education ||
    d.parsedEducation ||
    '';

  const skills =
    Array.isArray(parsedExtract?.skills) && parsedExtract.skills.length > 0
      ? parsedExtract.skills
      : Array.isArray(d.parsedSkills)
      ? d.parsedSkills
      : [];

  const bio = parsedExtract?.bio || d.parsedBio || '';

  const atsScore =
    d.readinessScore ||
    d.overallScore ||
    d.formatScore ||
    (parsedExtract ? 75 : 0);

  return {
    id: d.id || d.cvId || `cv-${Date.now()}`,
    title: d.fileName || d.filename || 'CV Document.pdf',
    filename: d.fileName || d.filename || 'CV Document.pdf',
    role,
    field,
    exp,
    education,
    skills,
    bio,
    uploadedAt: d.uploadedAt
      ? new Date(d.uploadedAt).toLocaleDateString('vi-VN')
      : new Date().toLocaleDateString('vi-VN'),
    atsScore,
    formatScore: d.formatScore || 0,
    keywordsScore: d.keywordsScore || 0,
    readabilityScore: d.readabilityScore || 0,
    professionalismScore: d.professionalismScore || 0,
    fitT1Score: d.fitT1Score || 0,
    readinessScore: d.readinessScore || 0,
    analysisJson:
      typeof d.analysisJson === 'string'
        ? d.analysisJson
        : typeof d.analysis === 'string'
        ? d.analysis
        : undefined,
    isBackendDoc: true,
  };
};

export const Dashboard: React.FC = () => {
  const { profile, updateProfile, updateInterviewConfig, history, lastResult } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabQuery = searchParams.get('tab');
  const initialTab =
    tabQuery && ['manual', 'scan', 'analyze', 'match', 'email'].includes(tabQuery)
      ? (tabQuery as 'manual' | 'scan' | 'analyze' | 'match' | 'email')
      : 'manual';

  // Active Tab: 'manual' (Tạo CV) | 'scan' (Kho CV) | 'analyze' (AI Đánh giá CV) | 'match' | 'email'
  const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'analyze' | 'match' | 'email'>(initialTab);
  const [checkCvModalOpen, setCheckCvModalOpen] = useState(false);
  const [wizardModalOpen, setWizardModalOpen] = useState(false);
  const [selectedCvForAnalyzeId, setSelectedCvForAnalyzeId] = useState<string>('');
  const [isAnalyzingCv, setIsAnalyzingCv] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeStatusText, setAnalyzeStatusText] = useState('');


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
  const [emailPosition, setEmailPosition] = useState(profile.role || '');
  const [emailCompany, setEmailCompany] = useState('');
  const [emailTone, setEmailTone] = useState('formal');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<any>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Stats & Guide
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [careerHubData, setCareerHubData] = useState<any>(null);
  const [isLoadingProfileHub, setIsLoadingProfileHub] = useState(false);

  // Load CV Collection from real API (GET /api/cv/list)
  const loadCvs = useCallback(async () => {
    try {
      let loadedCvs: UserCvCard[] = [];

      if (localStorage.getItem('hm_access_token')) {
        try {
          const res = await cvService.listCvs();
          if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
            loadedCvs = res.data.map(parseCvDocumentFromBackend);
          }
        } catch (e) {}
      }

      setUserCvs(loadedCvs);

      if (loadedCvs.length > 0) {
        const savedActiveId = localStorage.getItem('hm_active_cv_id');
        const foundActive = loadedCvs.find((c) => c.id === savedActiveId);
        const targetActive = foundActive || loadedCvs[0];
        setActiveCvId(targetActive.id);
        setSelectedMatchCvId(targetActive.id);
        localStorage.setItem('hm_active_cv_id', targetActive.id);
        localStorage.setItem('hm_active_cv', JSON.stringify(targetActive));

        if (targetActive.role && targetActive.role !== 'Chưa phân tích') {
          setRole((prev) => prev || targetActive.role);
        }
        if (targetActive.field && targetActive.field !== 'Chưa xác định') {
          setField((prev) => prev || targetActive.field);
        }
        if (targetActive.skills && targetActive.skills.length > 0) {
          setSkills((prev) => (prev && prev.length > 0 ? prev : targetActive.skills));
        }
      }
    } catch (err) {
      setUserCvs([]);
    }
  }, []);

  // Load Career Profile from real API (GET /api/Career/profile)
  const fetchCareerProfile = useCallback(async () => {
    if (!localStorage.getItem('hm_access_token')) return;
    setIsLoadingProfileHub(true);
    try {
      const res = await careerService.getProfileHub();
      if (res.ok && res.data) {
        const hub: any = res.data;
        setCareerHubData(hub);
        const cp = hub.profile;
        if (cp) {
          if (cp.desiredPosition) setRole(cp.desiredPosition);
          if (cp.desiredIndustry || cp.major) setField(cp.desiredIndustry || cp.major);
          if (cp.experienceLevel) setExp(cp.experienceLevel);
          if (cp.university) {
            const eduText = cp.major && !cp.university.includes(cp.major)
              ? `${cp.university} - ${cp.major}`
              : cp.university;
            setEducation(eduText);
          }
          if (cp.bio) setBio(cp.bio);
          // Parse skills from JSON string (supports skillsJson or hobbiesJson or skills)
          try {
            const rawSkills = cp.skillsJson || cp.hobbiesJson || cp.skills;
            if (typeof rawSkills === 'string') {
              const parsed = JSON.parse(rawSkills);
              if (Array.isArray(parsed) && parsed.length > 0) setSkills(parsed);
            } else if (Array.isArray(rawSkills) && rawSkills.length > 0) {
              setSkills(rawSkills);
            }
          } catch {}
          if (cp.graduationYear) setGraduationYear(cp.graduationYear);
        }
        if (hub.fullName) setName(hub.fullName);
      }
    } catch (err) {
      console.error('Failed to fetch career profile hub:', err);
    } finally {
      setIsLoadingProfileHub(false);
    }
  }, []);

  useEffect(() => {
    if (tabQuery && ['manual', 'scan', 'analyze', 'match', 'email'].includes(tabQuery)) {
      setActiveTab(tabQuery as 'manual' | 'scan' | 'analyze' | 'match' | 'email');
    }
  }, [tabQuery]);

  const handleTabChange = (tab: 'manual' | 'scan' | 'analyze' | 'match' | 'email') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    if (tab === 'manual') {
      fetchCareerProfile();
    } else if (tab === 'scan') {
      loadCvs();
    }
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

  // Initial fetch on mount
  useEffect(() => {
    loadCvs();
    fetchCareerProfile();
  }, [loadCvs, fetchCareerProfile]);

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
    localStorage.setItem('hm_active_cv', JSON.stringify(cv));

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
      desiredPosition: cv.role,
      desiredIndustry: cv.field,
      exp: cv.exp,
      education: cv.education,
      skills: cv.skills,
      bio: cv.bio,
    });

    updateInterviewConfig({
      field: cv.field,
      role: cv.role,
    });

    setToastMsg(`Đã kích hoạt CV "${cv.title}" làm hồ sơ phỏng vấn chính!`);
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

  // Upload New CV into user's collection (real API only)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!localStorage.getItem('hm_access_token')) {
      setToastMsg('⚠️ Vui lòng đăng nhập để tải lên CV.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    setIsScanning(true);
    setScanProgress(15);
    setScanStatusText(`📤 Đang tải lên file "${file.name}"...`);

    try {
      const uploadRes = await cvService.uploadCv(file);
      if (uploadRes.ok && uploadRes.data?.id) {
        setScanProgress(55);
        const analyzeRes = await cvService.analyzeCv(uploadRes.data.id);
        const ai = analyzeRes.ok && analyzeRes.data ? analyzeRes.data : null;

        const newCvCard = parseCvDocumentFromBackend({
          ...(uploadRes.data || {}),
          ...(ai || {}),
          id: uploadRes.data.id,
          fileName: file.name,
        });

        setScanProgress(100);
        setScanStatusText('✅ Đã lưu CV mới vào kho CV của bạn!');
        setIsScanning(false);

        const updatedList = [newCvCard, ...userCvs];
        setUserCvs(updatedList);
        setShowAddCvForm(false);
        setToastMsg(`🎉 Đã thêm thành công CV "${file.name}" vào kho!`);
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        setIsScanning(false);
        setToastMsg(uploadRes.message || '❌ Không tải được CV. Vui lòng thử lại.');
        setTimeout(() => setToastMsg(null), 3500);
      }
    } catch (err) {
      setIsScanning(false);
      setToastMsg('❌ Lỗi khi tải lên CV. Vui lòng thử lại.');
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  // AI Analyze Handler for existing CV
  const handleAnalyzeCv = async (cvId: string) => {
    setIsAnalyzingCv(true);
    setAnalyzeProgress(20);
    setAnalyzeStatusText('🤖 AI đang trích xuất và đọc nội dung văn bản CV...');
    try {
      setAnalyzeProgress(50);
      setAnalyzeStatusText('🔍 Đang phân tích cấu trúc ATS, mật độ từ khóa và độ dễ đọc...');
      const analyzeRes = await cvService.analyzeCv(cvId);
      setAnalyzeProgress(85);
      setAnalyzeStatusText('📊 Đang tổng hợp các thang điểm chuẩn quốc tế...');

      if (analyzeRes.ok && analyzeRes.data) {
        const ai: any = analyzeRes.data;
        setUserCvs((prev) =>
          prev.map((c) => {
            if (c.id === cvId) {
              const updatedAts = ai.atsScore || ai.overallScore || c.atsScore || 85;
              return {
                ...c,
                atsScore: updatedAts,
                formatScore: ai.formatScore || 90,
                keywordsScore: ai.keywordsScore || 85,
                readabilityScore: ai.readabilityScore || 88,
                professionalismScore: ai.professionalismScore || 92,
                fitT1Score: ai.fitT1Score || updatedAts,
                readinessScore: ai.readinessScore || updatedAts,
                skills: ai.parsedSkills && ai.parsedSkills.length > 0 ? ai.parsedSkills : c.skills,
                role: ai.parsedRole || c.role,
                analysisJson: typeof ai.analysisJson === 'string' ? ai.analysisJson : JSON.stringify(ai),
              };
            }
            return c;
          })
        );
        setAnalyzeProgress(100);
        setAnalyzeStatusText('✅ Phân tích CV hoàn tất!');
        setToastMsg('🎉 Đã hoàn tất phân tích và đánh giá ATS cho CV!');
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        setToastMsg(analyzeRes.message || '⚠️ Không thể phân tích CV. Vui lòng thử lại.');
        setTimeout(() => setToastMsg(null), 3500);
      }
    } catch (err: any) {
      setToastMsg('❌ Lỗi khi phân tích CV bằng AI. Vui lòng thử lại.');
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setIsAnalyzingCv(false);
    }
  };

  // Upload and analyze immediately in AI Analyze tab
  const handleUploadAndAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingCv(true);
    setAnalyzeProgress(15);
    setAnalyzeStatusText(`📤 Đang tải lên file "${file.name}"...`);

    try {
      const uploadRes = await cvService.uploadCv(file);
      if (uploadRes.ok && uploadRes.data?.id) {
        setAnalyzeProgress(50);
        setAnalyzeStatusText('🤖 AI đang phân tích ATS và trích xuất dữ liệu...');
        const analyzeRes = await cvService.analyzeCv(uploadRes.data.id);
        const ai = analyzeRes.ok && analyzeRes.data ? analyzeRes.data : null;

        const newCvCard = parseCvDocumentFromBackend({
          ...(uploadRes.data || {}),
          ...(ai || {}),
          id: uploadRes.data.id,
          fileName: file.name,
        });

        setAnalyzeProgress(100);
        setAnalyzeStatusText('✅ Đã phân tích và lưu CV vào kho!');
        setIsAnalyzingCv(false);

        setUserCvs((prev) => [newCvCard, ...prev]);
        setSelectedCvForAnalyzeId(newCvCard.id);
        setActiveCvId(newCvCard.id);
        setToastMsg(`🎉 Đã tải lên và hoàn tất phân tích CV "${file.name}"!`);
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        setIsAnalyzingCv(false);
        setToastMsg(uploadRes.message || '❌ Không tải được CV.');
        setTimeout(() => setToastMsg(null), 3500);
      }
    } catch {
      setIsAnalyzingCv(false);
      setToastMsg('❌ Lỗi khi tải và phân tích CV.');
      setTimeout(() => setToastMsg(null), 3500);
    }
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
      await fetchCareerProfile();
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

  const activeCv = userCvs.find((c) => c.id === activeCvId) || userCvs[0];
  const otherCvs = userCvs.filter((c) => c.id !== activeCv?.id);

  const readinessScore =
    activeCv?.atsScore ||
    dashboardStats?.cvReadinessScore ||
    (dashboardStats?.interviewScore ? Math.round(dashboardStats.interviewScore) : 0);

  const totalInterviews =
    typeof dashboardStats?.sessionsCount === 'number'
      ? dashboardStats.sessionsCount
      : (typeof dashboardStats?.totalInterviews === 'number' ? dashboardStats.totalInterviews : 0);

  const skillsCount = skills.length > 0 ? skills.length : (activeCv?.skills?.length || 0);

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
                <Sparkles size={13} />
                <span>Tạo CV bằng AI Wizard</span>
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
                className={`segmented-tab-btn ${activeTab === 'analyze' ? 'active' : ''}`}
                onClick={() => handleTabChange('analyze')}
              >
                <FileSearch size={13} />
                <span>AI Đánh giá CV</span>
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

          {/* TAB 1: Studio Tạo CV bằng AI Wizard */}
          {activeTab === 'manual' && (
            <CareerProfileForm
              onOpenWizardModal={() => setWizardModalOpen(true)}
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
              onFileUpload={handleFileUpload}
              onSelectActiveCv={handleSelectActiveCv}
              onDeleteCv={handleDeleteCv}
              onOpenDetailModal={(cv) => {
                setSelectedCvForDetail(cv);
                setCvDetailModalOpen(true);
              }}
              onNavigateInterview={() => {
                const targetCv = activeCv || userCvs[0];
                if (targetCv) {
                  handleSelectActiveCv(targetCv);
                  navigate('/interview-setup', { state: { fromCv: targetCv } });
                } else {
                  navigate('/interview-setup');
                }
              }}
              onSwitchToMatch={(cvId) => {
                setSelectedMatchCvId(cvId);
                handleTabChange('match');
              }}
              onSwitchToAnalyze={(cvId) => {
                setSelectedCvForAnalyzeId(cvId);
                handleTabChange('analyze');
              }}
              onOpenWizardModal={() => setWizardModalOpen(true)}
              isFreeTier={!isProUser}
            />
          )}

          {/* TAB 3: AI Analyze (Đánh giá & Phân tích CV chuẩn ATS) */}
          {activeTab === 'analyze' && (
            <AiCvAnalyzer
              userCvs={userCvs}
              activeCv={activeCv}
              selectedCvId={selectedCvForAnalyzeId}
              onSelectCvId={(id) => setSelectedCvForAnalyzeId(id)}
              isFreeTier={!isProUser}
              isAnalyzing={isAnalyzingCv}
              analyzeProgress={analyzeProgress}
              analyzeStatusText={analyzeStatusText}
              onAnalyzeCv={handleAnalyzeCv}
              onFileUploadAndAnalyze={handleUploadAndAnalyze}
              onNavigateInterview={(cv) => {
                handleSelectActiveCv(cv);
                navigate('/interview-setup', { state: { fromCv: cv } });
              }}
              onNavigateMatch={(cvId) => {
                setSelectedMatchCvId(cvId);
                handleTabChange('match');
              }}
              onOpenWizard={() => setWizardModalOpen(true)}
            />
          )}

          {/* TAB 4: JD Matcher */}
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
          skillsCount={skillsCount}
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

      {/* CV Wizard Modal (10 câu hỏi chuẩn BR09) */}
      <CvWizardModal
        isOpen={wizardModalOpen}
        onClose={() => setWizardModalOpen(false)}
        defaultIndustry={field || 'Công nghệ thông tin'}
        defaultRole={role}
        onSuccess={(newCv) => {
          loadCvs();
          handleSelectActiveCv(newCv);
        }}
      />
    </div>
  );
};

