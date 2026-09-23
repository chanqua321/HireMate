import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { onboardingService, ensureInterviewReady } from '../../api/onboarding.service';
import { ONBOARDING_REDIRECT_KEY } from '../../../../components/common/RequirePremium';
import { cvService } from '../../../../shared/services/cv.service';
import { profileService } from '../../../../shared/services/profile.service';
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  LayoutDashboard,
  User,
  Briefcase,
  GraduationCap,
  Video,
  FileCheck,
  SkipForward,
} from 'lucide-react';
import { motion } from 'framer-motion';
import './css/OnboardingSummary.css';

/**
 * T1.1: Sau khi có CV, đây là bước review (dữ liệu lấy từ CV) — không bắt nhập lại form 1→2.
 * Có thể bỏ qua review và vào phỏng vấn theo CV đang chọn.
 */
export const OnboardingSummary: React.FC = () => {
  const { profile, updateProfile } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [cvTitle, setCvTitle] = useState('');
  const [cvId, setCvId] = useState<string | null>(null);

  const [view, setView] = useState({
    name: '',
    education: '',
    field: '',
    role: '',
    exp: '',
    skills: [] as string[],
    bio: '',
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [profRes, cvRes, statusRes] = await Promise.all([
          profileService.getProfile().catch(() => null),
          cvService.listCvs().catch(() => null),
          onboardingService.getStatus().catch(() => null),
        ]);

        if (!alive) return;

        const next = statusRes?.data?.nextStep || statusRes?.data?.NextStep;
        const cvs = Array.isArray(cvRes?.data) ? cvRes!.data! : [];
        const p: any = profRes?.data || {};
        const confirmedId = String(
          p.confirmedCvDocumentId || p.ConfirmedCvDocumentId || ''
        ).trim();
        // Server SoT only — never prefer localStorage / first CV over Confirmed.
        const chosen =
          (confirmedId && cvs.find((c: any) => String(c.id) === confirmedId)) ||
          cvs.find((c: any) => c.isActive) ||
          null;

        // Analyze + gợi ý sửa chỉ làm lúc tạo/upload CV — không kẹt ở bước này
        if (next === 'upload_cv' || next === 'analyze' || cvs.length === 0) {
          navigate('/dashboard?tab=scan', { replace: true });
          return;
        }
        if (next === 'select_plan') {
          navigate('/pricing', { replace: true });
          return;
        }

        if (chosen) {
          setCvId(chosen.id);
          setCvTitle(
            (chosen as any).displayName ||
              (chosen as any).DisplayName ||
              chosen.fileName ||
              'CV HireMate'
          );
          localStorage.setItem('hm_active_cv_id', chosen.id);
        } else {
          localStorage.removeItem('hm_active_cv_id');
          localStorage.removeItem('hm_active_cv');
        }

        let extract: any = null;
        if (chosen?.analysis) {
          try {
            const raw = chosen.analysis;
            extract = typeof raw === 'string' ? JSON.parse(raw)?.extract : (raw as any)?.extract;
          } catch {}
        }

        const name =
          p.fullName || p.FullName || extract?.fullName || profile.name || '';
        const education =
          p.university || p.University || extract?.university || profile.education || '';
        const field =
          p.desiredIndustry ||
          p.DesiredIndustry ||
          extract?.desiredIndustry ||
          profile.field ||
          '';
        const role =
          p.desiredPosition ||
          p.DesiredPosition ||
          extract?.desiredPosition ||
          profile.role ||
          '';
        const exp =
          p.experienceLevel ||
          p.ExperienceLevel ||
          extract?.experienceLevel ||
          profile.exp ||
          '';
        const skills =
          (Array.isArray(p.skills) && p.skills) ||
          (Array.isArray(p.Skills) && p.Skills) ||
          (Array.isArray(extract?.skills) && extract.skills) ||
          profile.skills ||
          [];
        const bio = p.bio || p.Bio || extract?.bio || profile.bio || '';

        setView({ name, education, field, role, exp, skills, bio });
        updateProfile({
          name,
          fullName: name,
          education,
          university: education,
          field,
          desiredIndustry: field,
          role,
          desiredPosition: role,
          exp,
          experienceLevel: exp,
          skills,
          bio,
        } as any);

        if (chosen) {
          localStorage.setItem(
            'hm_active_cv',
            JSON.stringify({
              id: chosen.id,
              title:
                (chosen as any).displayName ||
                (chosen as any).DisplayName ||
                chosen.fileName ||
                'CV',
              filename: chosen.fileName,
              role,
              field,
              exp,
              skills,
              bio,
              education,
              isBackendDoc: true,
            })
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]); // load once from CV/Profile API

  const goInterview = async (_skipConfirmNoise: boolean) => {
    setErrorMsg('');
    if (!localStorage.getItem('hm_access_token')) {
      navigate('/login');
      return;
    }
    setConfirming(true);
    try {
      const ready = await ensureInterviewReady(cvId);
      if (!ready.ok) {
        if (ready.reason === 'need_plan') {
          navigate('/pricing');
          return;
        }
        if (ready.reason === 'need_cv') {
          navigate('/dashboard?tab=scan');
          return;
        }
        setErrorMsg(ready.message);
        return;
      }

      const fromCv = (() => {
        try {
          const raw = localStorage.getItem('hm_active_cv');
          return raw ? JSON.parse(raw) : cvId ? { id: cvId } : undefined;
        } catch {
          return cvId ? { id: cvId } : undefined;
        }
      })();

      const qRedirect = searchParams.get('redirect');
      const stored = sessionStorage.getItem(ONBOARDING_REDIRECT_KEY);
      sessionStorage.removeItem(ONBOARDING_REDIRECT_KEY);
      let dest = '/interview-setup';
      const candidate = qRedirect || stored;
      if (candidate && candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('://')) {
        dest = candidate;
      }
      navigate(dest, { state: { fromCv } });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi khi vào phỏng vấn.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
        <Loader2 className="animate-spin" size={28} color="#0284C7" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F8FAFC', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              Review từ CV
            </span>
            <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
              Kiểm tra nhanh rồi vào phỏng vấn
            </span>
          </div>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.86rem',
              color: '#0284c7',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <LayoutDashboard size={15} /> Bảng điều khiển
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '32px 28px',
            boxShadow: '0 10px 40px rgba(15,23,42,0.06)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <CheckCircle2 size={48} color="#22C55E" style={{ marginBottom: 8 }} />
            <h2 style={{ margin: '0 0 6px', fontSize: '1.45rem', fontWeight: 800, color: '#0F172A' }}>
              Hồ sơ đã lấy từ CV của bạn
            </h2>
            <p style={{ margin: 0, color: '#64748B', fontSize: '0.92rem' }}>
              Không cần nhập lại. Chỉ kiểm tra — hoặc bỏ qua để vào phỏng vấn theo CV đã chọn.
            </p>
          </div>

          {cvTitle && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 16,
              }}
            >
              <FileCheck size={20} color="#0284C7" />
              <div>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>CV phỏng vấn</div>
                <div style={{ fontSize: '0.84rem', color: '#0369A1' }}>{cvTitle}</div>
              </div>
            </div>
          )}

          <div
            style={{
              background: '#F8FAFC',
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <User size={16} color="#64748B" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Họ tên</div>
                  <strong>{view.name || '—'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <GraduationCap size={16} color="#64748B" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Học vấn</div>
                  <strong>{view.education || '—'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Briefcase size={16} color="#64748B" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Ngành / Vị trí</div>
                  <strong>
                    {view.field || '—'} · {view.role || '—'}
                  </strong>
                  {view.exp ? (
                    <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 2 }}>{view.exp}</div>
                  ) : null}
                </div>
              </div>
              {view.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {view.skills.slice(0, 12).map((s) => (
                    <span
                      key={s}
                      style={{
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginTop: 12, fontSize: '0.82rem' }}>
              <Link to="/dashboard?tab=manual" style={{ color: '#0284C7', fontWeight: 600 }}>
                Chỉnh sửa trên Dashboard
              </Link>
              {' · '}
              <Link to="/dashboard?tab=scan" style={{ color: '#0284C7', fontWeight: 600 }}>
                Đổi CV trong Kho CV
              </Link>
            </div>
          </div>

          {errorMsg && (
            <p style={{ color: '#DC2626', fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>{errorMsg}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              disabled={confirming}
              onClick={() => goInterview(false)}
              className="checkout-submit-btn"
              style={{ width: '100%' }}
            >
              {confirming ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang mở phòng phỏng vấn…</span>
                </>
              ) : (
                <>
                  <Video size={18} />
                  <span>Bắt đầu phỏng vấn AI với CV này</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <button
              type="button"
              disabled={confirming}
              onClick={() => goInterview(true)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                border: '1.5px solid #E2E8F0',
                background: '#fff',
                color: '#475569',
                fontWeight: 650,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: confirming ? 'wait' : 'pointer',
              }}
            >
              <SkipForward size={16} />
              Bỏ qua review — vào phỏng vấn ngay
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
