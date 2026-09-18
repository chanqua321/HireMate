import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { authService } from '../../features/auth';

export function readPremiumFlag(): boolean {
  return sessionStorage.getItem('hm_is_premium') === '1';
}

export const ONBOARDING_REDIRECT_KEY = 'hm_post_onboarding';

/**
 * Gate interview: bắt buộc đăng nhập + onboarding.
 * Hạn mức gói (3/15/50 phiên, CV 1/20/70) do BE enforce — Free vẫn vào được setup.
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

      const onboarded = me.ok
        ? !!(me.data?.onboardingCompleted ?? me.data?.OnboardingCompleted)
        : sessionStorage.getItem('hm_onboarding_done') === '1';

      if (!onboarded) {
        const backTo =
          window.location.pathname + window.location.search || '/interview-setup';
        const target = backTo.startsWith('/') ? backTo : '/interview-setup';
        sessionStorage.setItem(ONBOARDING_REDIRECT_KEY, target);
        navigate(`/onboarding/profile?redirect=${encodeURIComponent(target)}`);
        return;
      }

      // Đồng bộ cờ premium (không chặn Free — quota do BE)
      if (me.ok) {
        const premium = !!(me.data?.isPremium ?? me.data?.IsPremium);
        sessionStorage.setItem('hm_is_premium', premium ? '1' : '0');
      }

      setAllowed(true);
      setChecking(false);
    };

    run().catch(() => {
      if (!cancelled) {
        setAllowed(Boolean(sessionStorage.getItem('hm_access_token')));
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
        <p className="muted">Đang kiểm tra tài khoản…</p>
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
            <Sparkles size={14} /> Cần đăng nhập
          </span>
          <h2 style={{ marginBottom: 10 }}>Chưa thể vào phòng phỏng vấn</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            Vui lòng đăng nhập và hoàn tất hồ sơ. Gói Miễn phí vẫn có 3 lượt/tháng; hết hạn mức sẽ
            được nhắc nâng cấp.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn btn-primary">
              Đăng nhập <ArrowRight size={16} />
            </Link>
            <Link to={redirectTo} className="btn btn-ghost">
              Xem bảng giá
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
