import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogIn, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authService } from '../../features/auth/api/auth.service';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('hm_access_token');
    if (!token) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    const payload = parseJwt(token);
    if (payload) {
      const email = payload.email || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      setCurrentEmail(email || null);

      const roleClaim =
        payload.role ||
        payload.roles ||
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

      const hasAdmin =
        Array.isArray(roleClaim)
          ? roleClaim.includes('Admin')
          : typeof roleClaim === 'string' && roleClaim.includes('Admin');

      if (hasAdmin) {
        setIsAdmin(true);
        setChecking(false);
        return;
      }
    }

    // Fallback: verify via getMe()
    authService.getMe().then((res) => {
      if (res.ok && res.data) {
        const roles = res.data.roles || [];
        const isAdm = Array.isArray(roles) && roles.includes('Admin');
        setIsAdmin(isAdm);
        if (res.data.email) setCurrentEmail(res.data.email);
      } else {
        setIsAdmin(false);
      }
      setChecking(false);
    }).catch(() => {
      setIsAdmin(false);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F4F8FC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748B',
        fontFamily: 'Plus Jakarta Sans, Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="admin-spinner" style={{
            width: 36,
            height: 36,
            border: '3px solid rgba(3, 191, 255, 0.2)',
            borderTopColor: '#0085FF',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ fontWeight: 600, color: '#001B3F' }}>Đang kiểm tra quyền Quản trị viên...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #E0F2FE 0%, #F4F8FC 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
        color: '#001B3F'
      }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          background: '#FFFFFF',
          border: '1px solid rgba(3, 191, 255, 0.25)',
          borderRadius: 20,
          padding: '36px 32px',
          boxShadow: '0 20px 45px -10px rgba(3, 191, 255, 0.15)',
          textAlign: 'center'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#EF4444'
          }}>
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: '#001B3F' }}>
            Khu vực Quản trị Hệ thống
          </h2>

          <p style={{ fontSize: '0.938rem', color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
            {currentEmail ? (
              <>
                Bạn đang đăng nhập bằng <b style={{ color: '#001B3F' }}>{currentEmail}</b> nhưng tài khoản này không có quyền Quản trị viên (<b>Admin</b>).
              </>
            ) : (
              'Bạn cần đăng nhập bằng tài khoản có quyền Quản trị viên để truy cập bảng điều khiển Admin.'
            )}
          </p>

          <div style={{
            background: 'rgba(3, 191, 255, 0.08)',
            border: '1px solid rgba(3, 191, 255, 0.25)',
            borderRadius: 12,
            padding: '14px 16px',
            textAlign: 'left',
            marginBottom: 24,
            fontSize: '0.875rem'
          }}>
            <div style={{ fontWeight: 700, color: '#0085FF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> Tài khoản Admin mặc định Backend (.NET):
            </div>
            <div style={{ color: '#334155', fontSize: '0.85rem', lineHeight: 1.6 }}>
              • Email: <code style={{ background: '#FFFFFF', padding: '2px 6px', borderRadius: 4, color: '#0085FF', fontWeight: 600, border: '1px solid rgba(3, 191, 255, 0.2)' }}>admin@gmail.com</code><br/>
              • Mật khẩu: <code style={{ background: '#FFFFFF', padding: '2px 6px', borderRadius: 4, color: '#0085FF', fontWeight: 600, border: '1px solid rgba(3, 191, 255, 0.2)' }}>12345</code>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => {
                localStorage.removeItem('hm_access_token');
                localStorage.removeItem('hm_refresh_token');
                localStorage.removeItem('hm_roles');
                navigate('/login');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '12px 20px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #03BFFF 0%, #0085FF 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.938rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(3, 191, 255, 0.35)'
              }}
            >
              <LogIn size={18} /> Đăng nhập bằng tài khoản Admin
            </button>

            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '12px 20px',
                borderRadius: 12,
                background: '#F8FAFC',
                color: '#64748B',
                fontWeight: 600,
                fontSize: '0.938rem',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ArrowLeft size={18} /> Quay về Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRouteGuard;
