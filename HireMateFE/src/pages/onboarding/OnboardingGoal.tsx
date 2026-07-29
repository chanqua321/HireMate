import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { INDUSTRY_ROLES } from '../../data/questionBank';
import { Target, ArrowRight } from 'lucide-react';
import { onboardingService } from '../../services';

export const OnboardingGoal: React.FC = () => {
  const { profile, updateProfile, updateInterviewConfig } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const industries = Object.keys(INDUSTRY_ROLES);
  const initialField = profile.field && INDUSTRY_ROLES[profile.field]
    ? profile.field
    : 'Công nghệ thông tin';

  const [field, setField] = useState<string>(initialField);
  const [role, setRole] = useState<string>(() => {
    const validRoles = INDUSTRY_ROLES[initialField] || [];
    if (profile.role && validRoles.includes(profile.role)) {
      return profile.role;
    }
    return validRoles[0] || 'Lập trình viên Frontend';
  });
  const [exp, setExp] = useState<string>(profile.exp || '1-3 năm');

  useEffect(() => {
    const roles = INDUSTRY_ROLES[field] || [];
    if (!roles.includes(role)) {
      setRole(roles[0] || '');
    }
  }, [field, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateProfile({ field, role, exp }, { skipApi: true });
    updateInterviewConfig({ field, role });

    if (sessionStorage.getItem('hm_access_token')) {
      setSaving(true);
      try {
        const res = await onboardingService.saveGoal({
          desiredIndustry: field,
          desiredPosition: role,
          experienceLevel: exp,
        });
        if (!res.ok) {
          setError(res.message || 'Không lưu được mục tiêu nghề nghiệp');
          setSaving(false);
          return;
        }
      } catch (err: any) {
        setError(err?.message || 'Lỗi kết nối API');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    navigate('/onboarding/summary');
  };

  const currentRoles = INDUSTRY_ROLES[field] || [];

  return (
    <div className="section container" style={{ maxWidth: '640px', margin: '30px auto' }}>
      <div className="card" style={{ padding: '36px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span className="badge badge--success">Bước 2 / 3</span>
          <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Mục tiêu ứng tuyển
          </span>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h2>Mục tiêu nghề nghiệp của bạn là gì?</h2>
          <p className="muted">
            Chọn ngành nghề và vị trí ứng tuyển để hệ thống chuẩn bị bộ câu hỏi phù hợp nhất.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="field" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Ngành nghề
            </label>
            <select
              id="field"
              className="form-control"
              value={field}
              onChange={(e) => setField(e.target.value)}
              required
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="pos" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Vị trí ứng tuyển
            </label>
            <select
              id="pos"
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              {currentRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="exp" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Số năm kinh nghiệm
            </label>
            <select
              id="exp"
              className="form-control"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
              required
            >
              <option value="Chưa có kinh nghiệm (Fresher)">Chưa có kinh nghiệm (Fresher)</option>
              <option value="1-3 năm">1 - 3 năm</option>
              <option value="3-5 năm">3 - 5 năm</option>
              <option value="Trên 5 năm">Trên 5 năm</option>
            </select>
          </div>

          {error && (
            <p style={{ color: '#EF4444', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={saving}
          >
            {saving ? 'Đang lưu…' : 'Tiếp tục'} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
