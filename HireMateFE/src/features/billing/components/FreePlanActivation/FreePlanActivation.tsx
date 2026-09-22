import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../../auth';
import { useApp } from '../../../../app/context/AppContext';
import { billingService } from '../../api/billing.service';

/** Activate the 0đ plan without showing a payment method or payment receipt. */
export const FreePlanActivation: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useApp();
  const inFlight = useRef(false);
  const [error, setError] = useState('');

  const activate = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError('');
    try {
      const token = localStorage.getItem('hm_access_token') || sessionStorage.getItem('hm_access_token');
      if (!token) {
        navigate('/login?redirect=/activate-free', { replace: true });
        return;
      }

      const me = await authService.getMe();
      if (!me.ok || !me.data) throw new Error(me.message || 'Không kiểm tra được tài khoản. Vui lòng thử lại.');

      // An existing free or paid plan already grants interview access; do not create another 0đ invoice.
      if (!(me.data.planSelectedAt || me.data.PlanSelectedAt)) {
        const result = await billingService.checkout({ planCode: 'free', paymentMethod: 'Free' });
        if (!result.ok || result.data?.status !== 'Paid') {
          throw new Error(result.message || 'Không kích hoạt được gói Miễn phí. Vui lòng thử lại.');
        }
        await refreshProfile();
      }

      navigate('/interview-setup', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Không kích hoạt được gói Miễn phí. Vui lòng thử lại.');
    } finally {
      inFlight.current = false;
    }
  };

  useEffect(() => { void activate(); }, []);

  return <main className="section container" style={{ maxWidth: 560, margin: '64px auto', textAlign: 'center' }}>
    <h1>{error ? 'Chưa thể bắt đầu phỏng vấn' : 'Đang mở phỏng vấn AI…'}</h1>
    {error ? <><p role="alert">{error}</p><button type="button" className="btn btn-primary" onClick={() => void activate()}>Thử lại</button> <Link to="/pricing" className="btn btn-ghost">Về bảng giá</Link></> : <p>Đang kiểm tra và kích hoạt quyền sử dụng gói Miễn phí.</p>}
  </main>;
};
