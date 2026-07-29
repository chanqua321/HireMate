import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { authService } from '../../services';

export function readPremiumFlag(): boolean {
  return sessionStorage.getItem('hm_is_premium') === '1';
}

export const ONBOARDING_REDIRECT_KEY = 'hm_post_onboarding';

/**
 * Chặn Interview nếu chưa mua gói hoặc chưa hoàn thành onboarding.
 * Chưa onboarding → chuyển thẳng sang trang thiết lập hồ sơ.
 */
export const RequirePremium: React.FC<{ children: React.ReactNode; redirectTo?: string }> = ({
  children,
  redirectTo = '/pricing',
}) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!sessionStorage.getItem('hm_access_token')) {
        navigate(
          `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
        );
        return;
      }

      const me = await authService.getMe();
      if (cancelled) return;

      const premium = me.ok
        ? !!(me.data?.isPremium ?? me.data?.IsPremium)
        : readPremiumFlag();

      if (!premium) {
        setAllowed(false);
        setChecking(false);
        return;
      }

      const onboarded = me.ok
        ? !!(me.data?.onboardingCompleted ?? me.data?.OnboardingCompleted)
        : sessionStorage.getItem('hm_onboarding_done') === '1';

      if (!onboarded) {
        const backTo =
          window.location.pathname + window.location.search || '/interview-setup';
        // pathname luôn có '/', nhưng giữ fallback rõ ràng
        const target = backTo.startsWith('/') ? backTo : '/interview-setup';
        sessionStorage.setItem(ONBOARDING_REDIRECT_KEY, target);
        navigate(`/onboarding/profile?redirect=${encodeURIComponent(target)}`);
        return;
      }

      setAllowed(true);
      setChecking(false);
    };

    run().catch(() => {
      if (!cancelled) {
        setAllowed(readPremiumFlag());
        setChecking(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="section container" style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center' }}>
        <p className="muted">Đang kiểm tra gói đăng ký…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="section container" style={{ maxWidth: 560, margin: '48px auto' }}>
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <div
            className="icon-chip"
            style={{
              margin: '0 auto 16px',
              width: 56,
              height: 56,
              color: '#03BFFF',
              background: 'rgba(3,191,255,0.12)',
            }}
          >
            <Lock size={28} />
          </div>
          <span className="eyebrow" style={{ justifyContent: 'center', marginBottom: 8 }}>
            <Sparkles size={14} /> Cần gói Premium
          </span>
          <h2 style={{ marginBottom: 10 }}>Chưa mua gói — chưa vào được phỏng vấn</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            Phòng phỏng vấn AI chỉ mở cho tài khoản đã thanh toán gói Premium / Combo.
            Hãy nâng cấp để bắt đầu luyện tập.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={redirectTo} className="btn btn-primary">
              Xem bảng giá <ArrowRight size={16} />
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              Về dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
