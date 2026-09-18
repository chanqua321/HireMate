import React, { useState, useEffect } from 'react';
import {
  Sliders, Check, Server, Shield, AlertTriangle, Save, Clock, Info
} from 'lucide-react';
import './admin.css';

interface SystemConfigState {
  platformName: string;
  version: string;
  supportEmail: string;
  hotline: string;
  freeMonthlyInterviews: number;
  maxInterviewDurationMinutes: number;
  starThreshold: number;
  maxQuestionsPerSession: number;
  requireEmailConfirmation: boolean;
  jwtExpiryDays: number;
  enableGoogleAuth: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  autoBackupDaily: boolean;
}

const DEFAULT_SYSTEM_CONFIG: SystemConfigState = {
  platformName: 'HireMate - Nền tảng Luyện Phỏng Vấn AI Thông Minh',
  version: 'v2.4.0 (Official Production)',
  supportEmail: 'support@hiremate.vn',
  hotline: '1900 6868',
  freeMonthlyInterviews: 3,
  maxInterviewDurationMinutes: 30,
  starThreshold: 6.5,
  maxQuestionsPerSession: 5,
  requireEmailConfirmation: true,
  jwtExpiryDays: 7,
  enableGoogleAuth: true,
  maintenanceMode: false,
  maintenanceMessage: 'Hệ thống HireMate đang bảo trì định kỳ để nâng cấp mô hình AI đánh giá phỏng vấn. Vui lòng quay lại sau ít phút.',
  autoBackupDaily: true,
};

const AdminConfig: React.FC = () => {
  // Đảm bảo đưa giao diện về lại 1 màu chuẩn duy nhất Luminous Ice-Blue
  useEffect(() => {
    localStorage.removeItem('hm_admin_theme_config');
  }, []);

  // System config state
  const [systemConfig, setSystemConfig] = useState<SystemConfigState>(() => {
    try {
      const saved = localStorage.getItem('hm_system_config');
      return saved ? { ...DEFAULT_SYSTEM_CONFIG, ...JSON.parse(saved) } : DEFAULT_SYSTEM_CONFIG;
    } catch {
      return DEFAULT_SYSTEM_CONFIG;
    }
  });

  const [sysSaveNotice, setSysSaveNotice] = useState(false);

  const handleSaveSystemConfig = () => {
    localStorage.setItem('hm_system_config', JSON.stringify(systemConfig));
    setSysSaveNotice(true);
    setTimeout(() => setSysSaveNotice(false), 2500);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders size={26} color="var(--admin-primary)" />
            Cấu hình Hệ thống Quản trị
          </h1>
          <p className="admin-page-subtitle">
            Thiết lập quy tắc vận hành dự án, hạn mức phỏng vấn, chính sách bảo mật và chế độ bảo trì hệ thống.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={handleSaveSystemConfig}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem' }}
        >
          <Save size={16} /> Lưu cấu hình hệ thống
        </button>
      </div>

      {sysSaveNotice && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#059669',
          padding: '0.75rem 1.25rem',
          borderRadius: 12,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          animation: 'fadeInUp 0.3s ease'
        }}>
          <Check size={18} /> Đã lưu thông số cấu hình hệ thống thành công!
        </div>
      )}

      {/* SYSTEM CONFIGURATION SECTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Thông tin chung */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="var(--admin-primary)" />
            <h3 className="admin-card-title">1. Thông tin chung nền tảng</h3>
          </div>
          <div className="admin-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div className="admin-form-group">
              <label className="admin-label">Tên nền tảng</label>
              <input
                className="admin-input"
                value={systemConfig.platformName}
                onChange={(e) => setSystemConfig({ ...systemConfig, platformName: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Phiên bản hệ thống (System Version)</label>
              <input
                className="admin-input"
                value={systemConfig.version}
                onChange={(e) => setSystemConfig({ ...systemConfig, version: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Email hỗ trợ & kỹ thuật</label>
              <input
                className="admin-input"
                type="email"
                value={systemConfig.supportEmail}
                onChange={(e) => setSystemConfig({ ...systemConfig, supportEmail: e.target.value })}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Hotline hỗ trợ</label>
              <input
                className="admin-input"
                value={systemConfig.hotline}
                onChange={(e) => setSystemConfig({ ...systemConfig, hotline: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Quy tắc phỏng vấn & Hạn mức */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#3b82f6" />
            <h3 className="admin-card-title">2. Quy tắc nghiệp vụ & Hạn mức phỏng vấn AI</h3>
          </div>
          <div className="admin-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div className="admin-form-group">
              <label className="admin-label">Số lượt phỏng vấn miễn phí / tháng (Free Tier)</label>
              <input
                className="admin-input"
                type="number"
                min={1}
                max={20}
                value={systemConfig.freeMonthlyInterviews}
                onChange={(e) => setSystemConfig({ ...systemConfig, freeMonthlyInterviews: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '4px', display: 'block' }}>
                Giới hạn số phiên dành cho tài khoản ứng viên gói Free.
              </span>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Thời gian tối đa 1 phiên phỏng vấn (Phút)</label>
              <input
                className="admin-input"
                type="number"
                min={10}
                max={90}
                value={systemConfig.maxInterviewDurationMinutes}
                onChange={(e) => setSystemConfig({ ...systemConfig, maxInterviewDurationMinutes: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '4px', display: 'block' }}>
                Hệ thống sẽ tự động tổng kết điểm khi hết thời gian này.
              </span>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Ngưỡng điểm STAR đạt chuẩn (Thang 10)</label>
              <input
                className="admin-input"
                type="number"
                step="0.1"
                min={1}
                max={10}
                value={systemConfig.starThreshold}
                onChange={(e) => setSystemConfig({ ...systemConfig, starThreshold: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '4px', display: 'block' }}>
                Điểm STAR tối thiểu để được cấp chứng nhận vượt qua phiên phỏng vấn.
              </span>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Số câu hỏi tối đa trong 1 phiên</label>
              <input
                className="admin-input"
                type="number"
                min={3}
                max={15}
                value={systemConfig.maxQuestionsPerSession}
                onChange={(e) => setSystemConfig({ ...systemConfig, maxQuestionsPerSession: Number(e.target.value) })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '4px', display: 'block' }}>
                AI sẽ chủ động điều phối lượt hỏi dựa theo chỉ số này.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Chính sách bảo mật & Xác thực */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#10b981" />
            <h3 className="admin-card-title">3. Chính sách bảo mật & Xác thực tài khoản</h3>
          </div>
          <div className="admin-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div className="admin-form-group">
              <label className="admin-label">Thời hạn phiên đăng nhập (JWT Expiry - Ngày)</label>
              <input
                className="admin-input"
                type="number"
                min={1}
                max={30}
                value={systemConfig.jwtExpiryDays}
                onChange={(e) => setSystemConfig({ ...systemConfig, jwtExpiryDays: Number(e.target.value) })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--admin-text)' }}>
                <input
                  type="checkbox"
                  checked={systemConfig.requireEmailConfirmation}
                  onChange={(e) => setSystemConfig({ ...systemConfig, requireEmailConfirmation: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--admin-primary)' }}
                />
                <span>Bắt buộc xác nhận Email trước khi bắt đầu phỏng vấn</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--admin-text)' }}>
                <input
                  type="checkbox"
                  checked={systemConfig.enableGoogleAuth}
                  onChange={(e) => setSystemConfig({ ...systemConfig, enableGoogleAuth: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--admin-primary)' }}
                />
                <span>Cho phép đăng nhập nhanh qua Google OAuth 2.0</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Vận hành & Bảo trì */}
        <div className="admin-card" style={{ borderColor: systemConfig.maintenanceMode ? '#ef4444' : 'var(--admin-border)' }}>
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color={systemConfig.maintenanceMode ? '#ef4444' : '#f59e0b'} />
              <h3 className="admin-card-title">4. Vận hành sàn & Chế độ bảo trì hệ thống</h3>
            </div>
            <span className={`admin-badge ${systemConfig.maintenanceMode ? 'danger' : 'success'}`}>
              {systemConfig.maintenanceMode ? 'ĐANG BẢO TRÌ' : 'HOẠT ĐỘNG BÌNH THƯỜNG'}
            </span>
          </div>
          <div className="admin-card-body">
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.92rem', fontWeight: 650, color: systemConfig.maintenanceMode ? '#ef4444' : 'var(--admin-text)' }}>
                <input
                  type="checkbox"
                  checked={systemConfig.maintenanceMode}
                  onChange={(e) => setSystemConfig({ ...systemConfig, maintenanceMode: e.target.checked })}
                  style={{ width: 20, height: 20, accentColor: '#ef4444' }}
                />
                <span>Kích hoạt chế độ bảo trì hệ thống (Maintenance Mode)</span>
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', display: 'block', marginLeft: '2.2rem', marginTop: '4px' }}>
                Khi bật, thí sinh sẽ nhận thông báo bảo trì và tạm thời không thể bắt đầu phiên phỏng vấn mới.
              </span>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Thông điệp bảo trì hiển thị cho người dùng</label>
              <textarea
                className="admin-textarea"
                rows={3}
                value={systemConfig.maintenanceMessage}
                onChange={(e) => setSystemConfig({ ...systemConfig, maintenanceMessage: e.target.value })}
              />
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--admin-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--admin-text)' }}>
                <input
                  type="checkbox"
                  checked={systemConfig.autoBackupDaily}
                  onChange={(e) => setSystemConfig({ ...systemConfig, autoBackupDaily: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--admin-primary)' }}
                />
                <span>Tự động sao lưu cơ sở dữ liệu (Daily Automated Backup lúc 02:00 AM)</span>
              </label>
            </div>
          </div>
          <div className="admin-card-footer" style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="admin-btn admin-btn-primary" onClick={handleSaveSystemConfig}>
              <Save size={15} /> Lưu toàn bộ cấu hình hệ thống
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConfig;
