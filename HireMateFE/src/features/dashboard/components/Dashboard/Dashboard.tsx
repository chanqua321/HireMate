import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import {
  profileService,
  cvService,
  cvTemplateService,
  matchService,
  emailService,
  aiService,
} from '../../../../shared/services';
import type { QuotaUsage } from '../../../../shared/services/ai.service';
import type { CvTemplateDto } from '../../../../shared/services/cv.service';
import { careerService } from '../../../../shared/services/career.service';
import { onboardingService, ensureInterviewReady } from '../../../onboarding/api/onboarding.service';
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
import { MultiCvHub } from './components/MultiCvHub';
import { JdMatcher } from './components/JdMatcher';
import { AiEmailGenerator } from './components/AiEmailGenerator';
import { DashboardSidebar } from './components/DashboardSidebar';
import { CvDetailModal } from './components/CvDetailModal';
import { CvWizardModal } from '../../../../shared/components/CvWizard/CvWizardModal';
import './css/Dashboard.css';


// Multi-CV Data Model
export interface UserCvCard {
  id: string;
  /** DisplayName (or fileName fallback) — primary label in UI. */
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
  parseSucceeded?: boolean;
  analyzedAt?: string | null;
  suggestions?: string[];
  isActive?: boolean;
  isConfirmed?: boolean;
  templateId?: string | null;
  templateName?: string | null;
  templateLayoutKey?: string | null;
  canDownload?: boolean;
  source?: string;
}

const parseCvDocumentFromBackend = (d: any): UserCvCard => {
  let parsedExtract: any = null;
  let suggestions: string[] = [];
  if (d.analysis) {
    try {
      const raw = typeof d.analysis === 'string' ? JSON.parse(d.analysis) : d.analysis;
      parsedExtract = raw?.extract || raw?.parsedProfile || raw;
      if (Array.isArray(raw?.suggestions)) suggestions = raw.suggestions;
    } catch {}
  } else if (d.parsedProfile) {
    parsedExtract = d.parsedProfile;
  }
  if (Array.isArray(d.suggestions) && d.suggestions.length > 0) {
    suggestions = d.suggestions;
  }

  const parseSucceeded = !!(d.parseSucceeded ?? d.ParseSucceeded ?? d.analyzedAt ?? d.AnalyzedAt);
  const role =
    parsedExtract?.desiredPosition ||
    d.parsedRole ||
    d.targetRole ||
    (parseSucceeded ? 'Chuyên viên' : 'Chưa phân tích');

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
    d.ReadinessScore ||
    d.overallScore ||
    d.formatScore ||
    0;

  const fileName = d.fileName || d.filename || 'CV Document.pdf';
  const displayName = (d.displayName || d.DisplayName || '').trim();
  const title = displayName || fileName;

  return {
    id: d.id || d.cvId || `cv-${Date.now()}`,
    title,
    filename: fileName,
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
    formatScore: d.formatScore || d.FormatScore || 0,
    keywordsScore: d.keywordsScore || d.KeywordsScore || 0,
    readabilityScore: d.readabilityScore || d.ReadabilityScore || 0,
    isBackendDoc: true,
    parseSucceeded,
    analyzedAt: d.analyzedAt || d.AnalyzedAt || null,
    suggestions,
    isConfirmed: !!(d.isConfirmed ?? d.IsConfirmed),
    isActive: !!(d.isActive ?? d.IsActive),
    canDownload: !!(d.canDownload ?? d.CanDownload),
    source: d.source ?? d.Source,
    templateId: d.templateId ?? d.TemplateId ?? null,
    templateName: d.templateName ?? d.TemplateName ?? null,
    templateLayoutKey: d.templateLayoutKey ?? d.TemplateLayoutKey ?? null,
  };
};

export const Dashboard: React.FC = () => {
  const { profile, updateProfile, updateInterviewConfig, history, lastResult } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabQuery = searchParams.get('tab');
  const initialTab =
    tabQuery && ['manual', 'scan', 'match', 'email'].includes(tabQuery)
      ? (tabQuery as 'manual' | 'scan' | 'match' | 'email')
      : 'manual';

  // 'manual' is the single CV builder; keep the route key for existing dashboard links.
  const [activeTab, setActiveTab] = useState<'manual' | 'scan' | 'match' | 'email'>(initialTab);

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
  const [experiences, setExperiences] = useState<any[]>(profile.experiences || []);
  const [projects, setProjects] = useState<any[]>(profile.projects || []);
  const [certifications, setCertifications] = useState<any[]>(profile.certifications || []);
  const [cvEmail, setCvEmail] = useState(profile.email || '');
  const [cvPhone, setCvPhone] = useState(profile.phone || '');
  const [cvAddress, setCvAddress] = useState(profile.address || '');
  const [cvDateOfBirth, setCvDateOfBirth] = useState(profile.dateOfBirth || '');
  const [cvGender, setCvGender] = useState(profile.gender || '');
  const [cvLinkedIn, setCvLinkedIn] = useState(profile.linkedIn || '');
  const [cvGitHub, setCvGitHub] = useState(profile.gitHub || '');
  const [cvAvatarUrl, setCvAvatarUrl] = useState(profile.avatarUrl || '');
  const [cvBuilderReady, setCvBuilderReady] = useState(!localStorage.getItem('hm_access_token'));
  const [cvTemplates, setCvTemplates] = useState<CvTemplateDto[]>([]);

  // JD Matcher State
  const [jdText, setJdText] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage | null>(null);

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
    if (profile.email !== undefined) setCvEmail(profile.email || '');
    if (profile.phone !== undefined) setCvPhone(profile.phone || '');
    if (profile.address !== undefined) setCvAddress(profile.address || '');
    if (profile.dateOfBirth !== undefined) setCvDateOfBirth(profile.dateOfBirth || '');
    if (profile.gender !== undefined) setCvGender(profile.gender || '');
    if (profile.linkedIn !== undefined) setCvLinkedIn(profile.linkedIn || '');
    if (profile.gitHub !== undefined) setCvGitHub(profile.gitHub || '');
    if (profile.avatarUrl !== undefined) setCvAvatarUrl(profile.avatarUrl || '');
  }, [profile]);

  // Load CV Collection from real API
  useEffect(() => {
    const loadCvs = async () => {
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
          // Server source of truth only. Stale localStorage / first CV must not become Active.
          const backendActive = loadedCvs.find((c) => c.isActive);
          if (backendActive) {
            setActiveCvId(backendActive.id);
            setSelectedMatchCvId((prev) => prev || backendActive.id);
            localStorage.setItem('hm_active_cv_id', backendActive.id);
            localStorage.setItem('hm_active_cv', JSON.stringify(backendActive));
          } else {
            setActiveCvId('');
            localStorage.removeItem('hm_active_cv_id');
            localStorage.removeItem('hm_active_cv');
          }

          if (backendActive?.role && backendActive.role !== 'Chưa phân tích') {
            setRole((prev) => prev || backendActive.role);
          }
          if (backendActive?.field && backendActive.field !== 'Chưa xác định') {
            setField((prev) => prev || backendActive.field);
          }
          if (backendActive?.skills && backendActive.skills.length > 0) {
            setSkills((prev) => (prev && prev.length > 0 ? prev : backendActive.skills));
          }
        } else {
          setActiveCvId('');
          localStorage.removeItem('hm_active_cv_id');
          localStorage.removeItem('hm_active_cv');
        }
      } catch (err) {
        setUserCvs([]);
      }
    };

    loadCvs();

    if (localStorage.getItem('hm_access_token')) {
      cvTemplateService.listTemplates().then((res) => {
        if (res.ok && Array.isArray(res.data)) setCvTemplates(res.data);
      }).catch(() => setToastMsg('Không thể tải mẫu CV. Vui lòng thử lại.'));
    }
  }, []);

  // Fetch Dashboard Stats + AI quota usage (backend source of truth)
  useEffect(() => {
    if (localStorage.getItem('hm_access_token')) {
      dashboardService.getDashboardStats().then((res) => {
        if (res.ok && res.data) {
          setDashboardStats(res.data);
        }
      }).catch(() => setToastMsg('Không thể tải dữ liệu Dashboard. Vui lòng thử lại.'));

      aiService.getUsage().then((res) => {
        if (res.ok && res.data) setQuotaUsage(res.data);
      }).catch(() => setToastMsg('Không thể tải hạn mức AI. Vui lòng thử lại.'));
    }
  }, []);

  // Load Career Profile from real API (GET /api/Profile + hub fallback)
  useEffect(() => {
    if (!localStorage.getItem('hm_access_token')) return;

    const applyProfileDto = (cp: any, fullName?: string) => {
      if (!cp) return;
      if (fullName) setName(fullName);
      else if (cp.fullName) setName(cp.fullName);
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
      if (cp.graduationYear) setGraduationYear(cp.graduationYear);
      if (cp.email !== undefined) setCvEmail(cp.email || '');
      if (cp.phone !== undefined) setCvPhone(cp.phone || '');
      if (cp.address !== undefined) setCvAddress(cp.address || '');
      if (cp.dateOfBirth !== undefined) setCvDateOfBirth(cp.dateOfBirth || '');
      if (cp.gender !== undefined) setCvGender(cp.gender || '');
      if (cp.linkedIn !== undefined) setCvLinkedIn(cp.linkedIn || '');
      if (cp.gitHub !== undefined) setCvGitHub(cp.gitHub || '');
      if (cp.avatarUrl !== undefined) setCvAvatarUrl(cp.avatarUrl || '');
      if (Array.isArray(cp.skills) && cp.skills.length > 0) setSkills(cp.skills);
      else {
        try {
          const rawSkills = cp.skillsJson || cp.hobbiesJson || cp.skills;
          if (typeof rawSkills === 'string') {
            const parsed = JSON.parse(rawSkills);
            if (Array.isArray(parsed) && parsed.length > 0) setSkills(parsed);
          }
        } catch { /* ignore */ }
      }
      if (Array.isArray(cp.experiences)) setExperiences(cp.experiences);
      else if (typeof cp.experiencesJson === 'string') {
        try {
          const parsed = JSON.parse(cp.experiencesJson);
          if (Array.isArray(parsed)) setExperiences(parsed);
        } catch { /* ignore */ }
      }
      if (Array.isArray(cp.projects)) setProjects(cp.projects);
      else if (typeof cp.projectsJson === 'string') {
        try {
          const parsed = JSON.parse(cp.projectsJson);
          if (Array.isArray(parsed)) setProjects(parsed);
        } catch { /* ignore */ }
      }
      if (Array.isArray(cp.certifications)) setCertifications(cp.certifications);
      else if (typeof cp.certificationsJson === 'string') {
        try {
          const parsed = JSON.parse(cp.certificationsJson);
          if (Array.isArray(parsed)) setCertifications(parsed);
        } catch { /* ignore */ }
      }
    };

    const profileRequest = profileService.getProfile().then((res) => {
      if (res.ok && res.data) applyProfileDto(res.data);
    }).catch(() => setToastMsg('Không thể tải hồ sơ. Vui lòng thử lại.'));

    const hubRequest = careerService.getProfileHub().then((res) => {
      if (res.ok && res.data) {
        const hub: any = res.data;
        applyProfileDto(hub.profile, hub.fullName);
      }
    }).catch(() => setToastMsg('Không thể tải thông tin đã lưu để điền sẵn CV. Vui lòng thử lại.'));
    void Promise.allSettled([profileRequest, hubRequest]).then(() => setCvBuilderReady(true));
  }, []);

  // Set Active CV via Backend API — localStorage chỉ cache sau khi BE OK
  const handleSelectActiveCv = async (cv: UserCvCard) => {
    if (!localStorage.getItem('hm_access_token')) {
      setToastMsg('⚠️ Đăng nhập để kích hoạt CV trên server.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    if (!cv.parseSucceeded) {
      setToastMsg('⚠️ CV chưa được chấm điểm. Bấm “Chấm điểm CV” trên thẻ CV rồi thử kích hoạt lại.');
      setTimeout(() => setToastMsg(null), 3500);
      return;
    }

    setToastMsg('⏳ Đang kích hoạt CV…');
    try {
      const res = await cvService.activateCv(cv.id);
      if (!res.ok) {
        setToastMsg(res.message || 'Không kích hoạt được CV.');
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }

      const activeId = (res.data as any)?.activeCvDocumentId || cv.id;
      setUserCvs((prev) =>
        prev.map((c) => ({
          ...c,
          isActive: c.id === activeId,
          isConfirmed: c.id === activeId,
        }))
      );
      setActiveCvId(activeId);
      setSelectedMatchCvId(activeId);

      const activated = {
        ...cv,
        id: activeId,
        isActive: true,
        isConfirmed: true,
      };
      localStorage.setItem('hm_active_cv_id', activeId);
      localStorage.setItem('hm_active_cv', JSON.stringify(activated));

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

      setToastMsg(`🎯 Đã kích hoạt CV "${cv.title}" làm hồ sơ phỏng vấn chính!`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch {
      setToastMsg('Không kích hoạt được CV. Thử lại.');
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const applyActiveFromList = (list: UserCvCard[], preferredId?: string | null) => {
    const backendActive = list.find((c) => c.isActive);
    const preferred = preferredId ? list.find((c) => c.id === preferredId) : undefined;
    const next = backendActive || preferred;
    if (next) {
      setActiveCvId(next.id);
      setSelectedMatchCvId(next.id);
      localStorage.setItem('hm_active_cv_id', next.id);
      localStorage.setItem('hm_active_cv', JSON.stringify(next));
    } else {
      setActiveCvId('');
      localStorage.removeItem('hm_active_cv_id');
      localStorage.removeItem('hm_active_cv');
    }
  };

  const handleDeleteCv = async (id: string, title: string) => {
    if (!localStorage.getItem('hm_access_token')) {
      setToastMsg('⚠️ Đăng nhập để xóa CV trên server.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    if (!window.confirm(`Xóa CV "${title}"? Hành động không hoàn tác.`)) return;

    setToastMsg('⏳ Đang xóa CV…');
    try {
      const res = await cvService.deleteCv(id);
      if (!res.ok) {
        setToastMsg(res.message || 'Không xóa được CV.');
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }

      const payload = res.data as any;
      const newActiveId: string | null = payload?.activeCvDocumentId ?? null;

      // Refresh list từ BE để đồng bộ isActive
      let remaining: UserCvCard[] = [];
      const listRes = await cvService.listCvs();
      if (listRes.ok && Array.isArray(listRes.data)) {
        remaining = listRes.data.map(parseCvDocumentFromBackend);
      } else {
        remaining = userCvs
          .filter((c) => c.id !== id)
          .map((c) => ({
            ...c,
            isActive: newActiveId ? c.id === newActiveId : false,
            isConfirmed: newActiveId ? c.id === newActiveId : false,
          }));
      }

      setUserCvs(remaining);
      applyActiveFromList(remaining, newActiveId);

      setToastMsg(`🗑️ Đã xóa CV "${title}" khỏi kho.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch {
      setToastMsg('Không xóa được CV. Thử lại.');
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  /** Vào PV với CV cho operation — KHÔNG activate. Active giữ nguyên. */
  const goInterviewFromDashboard = async (cv?: UserCvCard | null) => {
    // Operation CV: explicit card, else Active. Never cvs[0] / localStorage.
    const targetCv = cv || activeCv;
    if (!targetCv) {
      setToastMsg('⚠️ Hãy kích hoạt một CV trong Kho CV trước khi phỏng vấn.');
      handleTabChange('scan');
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }
    if (!localStorage.getItem('hm_access_token')) {
      navigate('/login?redirect=/interview-setup');
      return;
    }

    // Selecting B for interview must NOT call activate — Active stays A.
    if (!activeCvId && !cv) {
      setToastMsg('⚠️ Hãy bấm 「Chọn làm CV phỏng vấn」 trước khi vào phỏng vấn.');
      handleTabChange('scan');
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    if (!targetCv.parseSucceeded) {
      setToastMsg('⚠️ CV chưa đạt phân tích. Xem gợi ý sửa bên dưới trước khi phỏng vấn.');
      setSelectedCvForDetail(targetCv);
      setCvDetailModalOpen(true);
      handleTabChange('scan');
      setTimeout(() => setToastMsg(null), 4500);
      return;
    }

    setToastMsg('⏳ Đang mở buổi phỏng vấn…');
    try {
      const ready = await ensureInterviewReady(targetCv.id);
      if (!ready.ok) {
        setToastMsg(ready.message);
        setTimeout(() => setToastMsg(null), 4500);
        if (ready.reason === 'need_plan') {
          setTimeout(() => navigate('/pricing'), 800);
        } else if (ready.reason === 'need_cv') {
          if (/thiếu|Tạo CV/i.test(ready.message)) {
            handleTabChange('manual');
          } else {
            setSelectedCvForDetail(targetCv);
            setCvDetailModalOpen(true);
            handleTabChange('scan');
          }
        }
        return;
      }
      setToastMsg(null);
      navigate('/interview-setup', { state: { fromCv: targetCv } });
    } catch (err: any) {
      setToastMsg(err?.message || '❌ Không vào được phòng phỏng vấn.');
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const showCvReviewAfterSave = (card: UserCvCard, msg: string) => {
    setSelectedCvForDetail(card);
    setCvDetailModalOpen(true);
    handleTabChange('scan');
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const reAnalyzeCv = async (cv: UserCvCard) => {
    setToastMsg('⏳ Đang phân tích lại CV…');
    try {
      const res = await cvService.analyzeCv(cv.id);
      if (!res.ok) {
        setToastMsg(res.message || '❌ Phân tích lại thất bại.');
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }
      const card = parseCvDocumentFromBackend({ ...cv, ...(res.data || {}), id: cv.id });
      setUserCvs((prev) => {
        const next = [card, ...prev.filter((c) => c.id !== cv.id)];
        localStorage.setItem('hm_saved_user_cvs', JSON.stringify(next));
        return next;
      });
      showCvReviewAfterSave(
        card,
        card.parseSucceeded
          ? '✅ Đã phân tích. Xem gợi ý — đạt rồi có thể luyện phỏng vấn.'
          : '⚠️ Chưa đủ điều kiện. Sửa theo gợi ý rồi phân tích lại.'
      );
    } catch (err: any) {
      setToastMsg(err?.message || '❌ Lỗi phân tích CV.');
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Upload New CV into user's collection (real API only)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    displayName?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Allow re-selecting the same file later
    e.target.value = '';

    if (!localStorage.getItem('hm_access_token')) {
      setToastMsg('⚠️ Vui lòng đăng nhập để tải lên CV.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    const nameLabel = displayName?.trim() || file.name;
    setIsScanning(true);
    setScanProgress(15);
    setScanStatusText(`📤 Đang tải lên "${nameLabel}"...`);

    try {
      const uploadRes = await cvService.uploadCv(file, displayName?.trim() || undefined);
      if (uploadRes.ok && uploadRes.data?.id) {
        // Upload BE đã auto-analyze — lấy kết quả (điểm + gợi ý) từ response
        setScanProgress(85);
        setScanStatusText('🤖 Đang chấm ATS & tạo gợi ý sửa…');
        let aiPayload: any = uploadRes.data;
        // Nếu upload trả về chưa có điểm, gọi analyze thêm lần
        if (!(uploadRes.data as any).readinessScore && !(uploadRes.data as any).parseSucceeded) {
          const analyzeRes = await cvService.analyzeCv(uploadRes.data.id);
          if (analyzeRes.ok && analyzeRes.data) aiPayload = { ...uploadRes.data, ...analyzeRes.data };
        }

        const newCvCard = parseCvDocumentFromBackend({
          ...aiPayload,
          id: uploadRes.data.id,
          fileName: (uploadRes.data as any).fileName || file.name,
          displayName: (uploadRes.data as any).displayName || displayName?.trim() || undefined,
        });

        setScanProgress(100);
        setScanStatusText('✅ Đã lưu & chấm CV — xem gợi ý trước khi phỏng vấn.');
        setIsScanning(false);

        const updatedList = [newCvCard, ...userCvs];
        setUserCvs(updatedList);
        setShowAddCvForm(false);
        // Upload does NOT activate. Active CV stays ConfirmedCvDocumentId until user clicks Activate.
        showCvReviewAfterSave(
          newCvCard,
          newCvCard.parseSucceeded
            ? `✅ CV "${newCvCard.title}" đã chấm ATS. Xem gợi ý rồi mới luyện phỏng vấn.`
            : `⚠️ CV "${newCvCard.title}" cần sửa theo gợi ý rồi phân tích lại.`
        );

        try {
          const statusRes = await onboardingService.getStatus();
          const next = statusRes.data?.nextStep || statusRes.data?.NextStep;
          if (next === 'select_plan') {
            setTimeout(() => navigate('/pricing'), 1800);
          } else if (newCvCard.parseSucceeded) {
            const confirmRes = await onboardingService.confirm();
            if (confirmRes.ok) sessionStorage.setItem('hm_onboarding_done', '1');
          }
        } catch { /* giữ modal gợi ý */ }
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

  const handleRenameCv = async (cv: UserCvCard, displayName: string) => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setToastMsg('⚠️ Tên CV không được để trống.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    try {
      const res = await cvService.renameCv(cv.id, trimmed);
      if (!res.ok) {
        setToastMsg(res.message || '❌ Không đổi được tên CV.');
        setTimeout(() => setToastMsg(null), 3500);
        return;
      }
      const card = parseCvDocumentFromBackend({ ...cv, ...(res.data || {}), id: cv.id, displayName: trimmed });
      setUserCvs((prev) => {
        const next = prev.map((c) => (c.id === cv.id ? { ...c, ...card, title: trimmed } : c));
        localStorage.setItem('hm_saved_user_cvs', JSON.stringify(next));
        return next;
      });
      setSelectedCvForDetail((prev) =>
        prev && prev.id === cv.id ? { ...prev, title: trimmed } : prev
      );
      if (activeCvId === cv.id) {
        const updated = { ...cv, title: trimmed };
        localStorage.setItem('hm_active_cv', JSON.stringify(updated));
      }
      setToastMsg(`✅ Đã đổi tên thành «${trimmed}».`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      setToastMsg(err?.message || '❌ Không đổi được tên CV.');
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleChangeCvTemplate = async (cv: UserCvCard, templateId: string) => {
    if (!templateId) return;
    try {
      const res = await cvService.changeCvTemplate(cv.id, templateId);
      if (!res.ok) {
        setToastMsg(res.message || '❌ Không đổi được mẫu CV.');
        setTimeout(() => setToastMsg(null), 3500);
        return;
      }
      const card = parseCvDocumentFromBackend({ ...cv, ...(res.data || {}), id: cv.id });
      setUserCvs((prev) => {
        const next = prev.map((c) => (c.id === cv.id ? card : c));
        localStorage.setItem('hm_saved_user_cvs', JSON.stringify(next));
        return next;
      });
      setSelectedCvForDetail((prev) => (prev && prev.id === cv.id ? card : prev));
      setToastMsg(`✅ Đã đổi mẫu: ${card.templateName || 'OK'}.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      setToastMsg(err?.message || '❌ Không đổi được mẫu CV.');
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleSaveAsTemplate = async (cv: UserCvCard) => {
    try {
      const defaultName = `Mẫu từ ${cv.title}`;
      const name = window.prompt('Tên mẫu CV tùy chỉnh:', defaultName);
      if (name === null) return;
      const res = await cvTemplateService.createFromCv(cv.id, {
        name: name.trim() || undefined,
      });
      if (!res.ok) {
        setToastMsg(res.message || '❌ Không lưu được mẫu.');
        setTimeout(() => setToastMsg(null), 3500);
        return;
      }
      const listRes = await cvTemplateService.listTemplates();
      if (listRes.ok && Array.isArray(listRes.data)) setCvTemplates(listRes.data);
      setToastMsg(`✅ Đã lưu mẫu «${(res.data as any)?.name || name}».`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setToastMsg(err?.message || '❌ Không lưu được mẫu.');
      setTimeout(() => setToastMsg(null), 3500);
    }
  };



  const handleWizardCreated = async (created: any, analysisMessage?: string) => {
    try {
      const listRes = await cvService.listCvs();
      if (listRes.ok && Array.isArray(listRes.data)) setUserCvs(listRes.data.map(parseCvDocumentFromBackend));
      else setUserCvs(prev => [parseCvDocumentFromBackend(created), ...prev]);
      setToastMsg(created.parseSucceeded
        ? '✅ Đã tạo PDF, lưu CV và chấm điểm thành công.'
        : `⚠️ ${analysisMessage || 'Đã lưu CV nhưng chưa chấm điểm. Bấm “Chấm điểm CV” để thử lại.'}`);
      handleTabChange('scan');
    } finally {
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const refreshQuota = async () => {
    try {
      const res = await aiService.getUsage();
      if (res.ok && res.data) setQuotaUsage(res.data);
    } catch { /* ignore */ }
  };

  // JD Matcher Handler
  const handleMatchJd = async (
    e: React.FormEvent,
    opts: { jobDescriptionId?: string; saveJd: boolean; jdTitle: string }
  ) => {
    e.preventDefault();
    if (!opts.jobDescriptionId && !jdText.trim()) return;
    const jdRemaining = quotaUsage?.jdMatch?.remaining;
    if (typeof jdRemaining === 'number' && jdRemaining <= 0) {
      alert(quotaUsage?.jdMatch?.limit === 0
        ? 'Gói Miễn phí không hỗ trợ so khớp JD. Nâng cấp Tiêu chuẩn/Cao cấp.'
        : 'Đã hết hạn mức so khớp JD tháng này. Nâng cấp gói hoặc đợi chu kỳ mới.');
      return;
    }
    setIsMatching(true);
    setMatchResult(null);

    const selected =
      selectedMatchCvId && userCvs.find((c) => c.id === selectedMatchCvId && c.isBackendDoc);
    // Explicit non-Active → send id. Active / empty → null so backend resolves Confirmed.
    // Never cvs[0], never localStorage, never activate for match.
    let cvDocumentId: string | undefined;
    if (selected && selected.id !== activeCvId) {
      cvDocumentId = selected.id;
    } else if (activeCvId) {
      cvDocumentId = undefined;
    } else {
      alert('ACTIVE_CV_REQUIRED: Hãy kích hoạt một CV trước khi so khớp JD.');
      setIsMatching(false);
      return;
    }

    try {
      const res = await matchService.match({
        jobDescriptionId: opts.jobDescriptionId,
        jdText: opts.jobDescriptionId ? undefined : jdText.trim(),
        cvDocumentId,
        saveJd: opts.jobDescriptionId ? false : opts.saveJd,
        jdTitle: opts.jdTitle,
      });

      if (res.ok && res.data) {
        setMatchResult({
          matchScore: res.data.overallScore,
          overallScore: res.data.overallScore,
          matchingSkills: res.data.matchedSkills || res.data.matchingSkills || [],
          matchedSkills: res.data.matchedSkills || [],
          missingSkills: res.data.missingSkills || [],
          experienceGaps: res.data.experienceGaps || [],
          keywordGaps: res.data.keywordGaps || [],
          strengths: res.data.strengths || [],
          recommendations: res.data.recommendations || [],
          aiProvider: res.data.aiProvider,
          jdTitle: res.data.jdTitle,
          cvFileName: res.data.cvFileName,
          createdAt: res.data.createdAt,
        });
        await refreshQuota();
      } else {
        setMatchResult(null);
        alert(res.message || 'So khớp CV–JD thất bại. Kiểm tra gói/hạn mức AI rồi thử lại.');
      }
    } catch (err: unknown) {
      setMatchResult(null);
      alert(err instanceof Error ? err.message : 'So khớp CV–JD thất bại. Vui lòng thử lại hoặc nâng cấp gói.');
    } finally {
      setIsMatching(false);
    }
  };

  // AI Email Generator Handler
  const handleGenerateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRemaining = quotaUsage?.cvEmailGeneration?.remaining;
    if (typeof emailRemaining === 'number' && emailRemaining <= 0) {
      alert(quotaUsage?.cvEmailGeneration?.limit === 0
        ? 'Gói Miễn phí không hỗ trợ tạo Email/CV bằng AI. Nâng cấp gói để sử dụng.'
        : 'Đã hết hạn mức tạo Email/CV AI tháng này. Nâng cấp hoặc đợi chu kỳ mới.');
      return;
    }
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
        await refreshQuota();
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

  const isProUser = Boolean(
    profile.isPremium ||
    (profile.currentPlanCode && profile.currentPlanCode.toLowerCase() !== 'free')
  );

  const accountKey = (profile.name || name || 'user')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  // ConfirmedCvDocumentId loaded from the server is the sole active-CV authority.
  const activeCv = activeCvId ? userCvs.find((c) => c.id === activeCvId) : undefined;
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

  const educationParts = education.split(/\s[-–]\s/);
  const cvBuilderInitial = {
    fullName: name,
    email: cvEmail,
    phone: cvPhone,
    address: cvAddress,
    dateOfBirth: cvDateOfBirth,
    gender: cvGender,
    linkedIn: cvLinkedIn,
    gitHub: cvGitHub,
    avatarUrl: cvAvatarUrl,
    desiredIndustry: field,
    desiredPosition: role,
    experienceLevel: exp,
    university: profile.university || educationParts[0] || '',
    major: profile.major || educationParts.slice(1).join(' - '),
    graduationYear: typeof graduationYear === 'number' ? graduationYear : 0,
    bio,
    careerObjective: bio,
    skills,
    experiences,
    projects,
    certifications,
    hobbies: profile.hobbies || [],
  };

  return (
    <div className="dashboard-vibe-container">
      {/* 1. Top Hero Section */}
      <DashboardHero
        greetingName={getGreetingName()}
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
        <button
          type="button"
          className="quick-action-card card-teal"
          onClick={() => goInterviewFromDashboard()}
          style={{ border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <div className="card-content-left">
            <span className="card-tag">Interactive</span>
            <h3 className="card-title">Phỏng vấn AI</h3>
          </div>
          <div className="card-icon-right">
            <Video size={22} />
          </div>
        </button>

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
                <h2>Tạo CV & Kho CV cá nhân</h2>
                <p className="profile-header-subtitle">
                  Điền thông tin một lần, xem trước và lưu CV theo vai trò ứng tuyển
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
                <span>Tạo CV</span>
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
            </div>
          </div>

          {/* Keep the single builder mounted across tabs so a draft is not lost. */}
          <div style={{ display: activeTab === 'manual' ? 'block' : 'none' }}>
            {cvBuilderReady ? <CvWizardModal
              embedded
              isOpen
              onClose={() => handleTabChange('scan')}
              onSuccess={handleWizardCreated}
              defaultIndustry={field}
              defaultRole={role}
              templates={cvTemplates}
              initial={cvBuilderInitial}
            /> : <p>Đang tải thông tin đã lưu để điền sẵn CV…</p>}
          </div>

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
              onAnalyzeCv={reAnalyzeCv}
              onDeleteCv={handleDeleteCv}
              onOpenDetailModal={(cv) => {
                setSelectedCvForDetail(cv);
                setCvDetailModalOpen(true);
              }}
              onPreviewCv={async (cv) => {
                try { await cvService.previewCv(cv.id); }
                catch (err: any) { setToastMsg(err?.message || '❌ Không xem trước được CV.'); }
              }}
              onNavigateInterview={() => goInterviewFromDashboard()}
              onSwitchToMatch={(cvId) => {
                setSelectedMatchCvId(cvId);
                handleTabChange('match');
              }}
              onDownloadCv={async (cv) => {
                try {
                  await cvService.downloadCv(cv.id, cv.filename || 'HireMate-CV.pdf');
                  setToastMsg('✅ Đã tải CV về máy.');
                } catch (err: any) {
                  setToastMsg(err?.message || '❌ Không tải được CV.');
                }
                setTimeout(() => setToastMsg(null), 3000);
              }}
              templates={cvTemplates}
              onRenameCv={handleRenameCv}
              onChangeCvTemplate={handleChangeCvTemplate}
              onSaveAsTemplate={handleSaveAsTemplate}
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
              quotaRemaining={quotaUsage?.jdMatch?.remaining}
              quotaLimit={quotaUsage?.jdMatch?.limit}
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
              quotaRemaining={quotaUsage?.cvEmailGeneration?.remaining}
              quotaLimit={quotaUsage?.cvEmailGeneration?.limit}
            />
          )}
        </motion.div>

        {/* Right Column: Career Readiness & AI Coach & Metrics */}
        <DashboardSidebar
          readinessScore={readinessScore}
          totalInterviews={totalInterviews}
          skillsCount={skillsCount}
          onNavigateInterview={() => goInterviewFromDashboard()}
        />
      </div>

      {/* CV Detail Modal */}
      <CvDetailModal
        isOpen={cvDetailModalOpen}
        cv={selectedCvForDetail}
        activeCvId={activeCvId}
        onClose={() => setCvDetailModalOpen(false)}
        onSelectActiveCv={handleSelectActiveCv}
        onNavigateInterview={() => {
          setCvDetailModalOpen(false);
          goInterviewFromDashboard(selectedCvForDetail);
        }}
        onReAnalyze={async (cv) => {
          await reAnalyzeCv(cv);
        }}
        onSaveBio={async (cvId, nextBio) => {
          setBio(nextBio);
          updateProfile({ bio: nextBio } as any);
          await profileService.updateProfile({ bio: nextBio });
          setUserCvs((prev) => {
            const next = prev.map((c) => (c.id === cvId ? { ...c, bio: nextBio } : c));
            localStorage.setItem('hm_saved_user_cvs', JSON.stringify(next));
            return next;
          });
          setSelectedCvForDetail((prev) => (prev && prev.id === cvId ? { ...prev, bio: nextBio } : prev));
        }}
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
