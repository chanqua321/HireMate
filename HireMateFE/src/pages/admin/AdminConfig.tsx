import React, { useState, useEffect } from 'react';
import { Palette, Check, RotateCcw, Sparkles, Moon, Sun, Sliders, Eye } from 'lucide-react';
import { AdminThemeConfig } from './AdminLayout';
import './admin.css';

interface ThemePresetOption {
  id: AdminThemeConfig['preset'];
  name: string;
  subtitle: string;
  description: string;
  mode: 'light' | 'dark';
  primary: string;
  accent: string;
  bg: string;
  cardBg: string;
  tag: string;
}

const PRESETS: ThemePresetOption[] = [
  {
    id: 'ice-blue',
    name: 'Luminous Ice-Blue',
    subtitle: 'Chuẩn thương hiệu HireMate',
    description: 'Tông xanh băng sáng dịu mát, thanh thoát, nịnh mắt và tối ưu cho công việc hàng ngày.',
    mode: 'light',
    primary: '#0085FF',
    accent: '#03BFFF',
    bg: '#F4F8FC',
    cardBg: '#FFFFFF',
    tag: 'Mặc định ⭐',
  },
  {
    id: 'cyber-dark',
    name: 'Cyber Dark Cockpit',
    subtitle: 'Chế độ tối công nghệ',
    description: 'Nền đen sâu thẳm kết hợp viền phát sáng Neon Cyan, chống mỏi mắt ban đêm.',
    mode: 'dark',
    primary: '#00F2FE',
    accent: '#4FACFE',
    bg: '#0B1120',
    cardBg: '#111827',
    tag: 'Dark Mode 🌌',
  },
  {
    id: 'sapphire',
    name: 'Royal Sapphire',
    subtitle: 'Xanh dương hoàng gia',
    description: 'Phong cách doanh nghiệp cao cấp (Enterprise), tạo cảm giác tin cậy và chuyên nghiệp vững chãi.',
    mode: 'light',
    primary: '#2563EB',
    accent: '#3B82F6',
    bg: '#F0F4FA',
    cardBg: '#FFFFFF',
    tag: 'Enterprise 💎',
  },
  {
    id: 'emerald',
    name: 'Emerald Mint',
    subtitle: 'Xanh ngọc lục bảo',
    description: 'Tươi sáng, dịu mắt, mang năng lượng phát triển và sinh thái công nghệ sạch.',
    mode: 'light',
    primary: '#059669',
    accent: '#10B981',
    bg: '#F0FDF4',
    cardBg: '#FFFFFF',
    tag: 'Fresh 🍃',
  },
  {
    id: 'sunset',
    name: 'Sunset Coral',
    subtitle: 'Cam san hô ấm áp',
    description: 'Tràn đầy sinh lực, nổi bật, thúc đẩy hành động và gia tăng sự tập trung xử lý dữ liệu.',
    mode: 'light',
    primary: '#EA580C',
    accent: '#F97316',
    bg: '#FFF7ED',
    cardBg: '#FFFFFF',
    tag: 'Warm 🌅',
  },
];

const DEFAULT_CONFIG: AdminThemeConfig = {
  preset: 'ice-blue',
  mode: 'light',
  primaryColor: '#0085FF',
  accentColor: '#03BFFF',
};

const AdminConfig: React.FC = () => {
  const [config, setConfig] = useState<AdminThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('hm_admin_theme_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [customPrimary, setCustomPrimary] = useState(config.primaryColor || '#0085FF');
  const [customAccent, setCustomAccent] = useState(config.accentColor || '#03BFFF');
  const [customMode, setCustomMode] = useState<'light' | 'dark'>(config.mode || 'light');
  const [copiedNotice, setCopiedNotice] = useState(false);

  const applyTheme = (newConfig: AdminThemeConfig) => {
    setConfig(newConfig);
    localStorage.setItem('hm_admin_theme_config', JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent('hm-admin-theme-changed', { detail: newConfig }));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const handleSelectPreset = (p: ThemePresetOption) => {
    applyTheme({
      preset: p.id,
      mode: p.mode,
      primaryColor: p.primary,
      accentColor: p.accent,
    });
  };

  const handleApplyCustom = () => {
    applyTheme({
      preset: 'custom',
      mode: customMode,
      primaryColor: customPrimary,
      accentColor: customAccent,
    });
  };

  const handleReset = () => {
    applyTheme(DEFAULT_CONFIG);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Palette size={26} color="var(--admin-primary)" />
            Cấu hình Giao diện Quản trị
          </h1>
          <p className="admin-page-subtitle">
            Tùy biến phong cách màu sắc, độ tương phản và giao diện hiển thị cho Admin Dashboard.
          </p>
        </div>

        <button
          className="admin-btn admin-btn-secondary"
          onClick={handleReset}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RotateCcw size={15} /> Đặt lại mặc định
        </button>
      </div>

      {copiedNotice && (
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
          <Check size={18} /> Đã áp dụng giao diện thành công cho toàn bộ hệ thống!
        </div>
      )}

      {/* Preset Theme Selection Grid */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--admin-text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--admin-primary)" />
          Bộ sưu tập Theme cài sẵn (Presets)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)', marginBottom: '1.25rem' }}>
          Nhấp chuột để đổi giao diện tức thì. Cấu hình được lưu tự động trên trình duyệt.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {PRESETS.map((p) => {
            const isSelected = config.preset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                style={{
                  background: 'var(--admin-card-bg)',
                  borderRadius: 16,
                  border: isSelected ? `2px solid ${p.accent}` : '1px solid var(--admin-card-border)',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected
                    ? `0 12px 30px ${p.accent}25, 0 2px 8px rgba(0,0,0,0.04)`
                    : 'var(--admin-shadow)',
                  transform: isSelected ? 'translateY(-3px)' : 'none',
                }}
              >
                {/* Header of card */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <span className="admin-badge neutral" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    {p.tag}
                  </span>
                  {isSelected && (
                    <span style={{
                      background: p.accent,
                      color: '#FFFFFF',
                      borderRadius: 999,
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Check size={12} /> Đang dùng
                    </span>
                  )}
                </div>

                {/* Color Palette Preview Bar */}
                <div style={{
                  height: 48,
                  borderRadius: 10,
                  background: p.bg,
                  border: `1px solid ${p.accent}30`,
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '1rem',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: p.primary, border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }} title="Primary Color" />
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: p.accent, border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }} title="Accent Color" />
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: p.cardBg, border: `1px solid ${p.accent}40` }} title="Card Background" />
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600, color: p.mode === 'dark' ? '#CBD5E1' : '#475569' }}>
                    {p.mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 0.25rem' }}>
                  {p.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--admin-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {p.subtitle}
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--admin-text-muted)', lineHeight: 1.5, margin: 0 }}>
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Mini Preview Box */}
      <div className="admin-card" style={{ marginBottom: '2.5rem' }}>
        <div className="admin-card-header">
          <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} color="var(--admin-primary)" />
            Khung xem trước trực quan (Live Mini Preview)
          </h3>
          <span className="admin-badge info">Mô phỏng Dashboard</span>
        </div>

        <div className="admin-card-body" style={{ background: 'var(--admin-bg)', borderRadius: '0 0 16px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="admin-stat-card" style={{ padding: '1rem' }}>
              <div className="admin-stat-value" style={{ fontSize: '1.4rem' }}>5 Users</div>
              <div className="admin-stat-label">Tổng người dùng</div>
            </div>
            <div className="admin-stat-card" style={{ padding: '1rem' }}>
              <div className="admin-stat-value" style={{ fontSize: '1.4rem' }}>98.0 / 10</div>
              <div className="admin-stat-label">Điểm STAR trung bình</div>
            </div>
            <div className="admin-stat-card" style={{ padding: '1rem' }}>
              <div className="admin-stat-value" style={{ fontSize: '1.4rem', color: '#059669' }}>₫259.7M</div>
              <div className="admin-stat-label">Doanh thu tích lũy</div>
            </div>
          </div>

          <div className="admin-card" style={{ padding: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Gói</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>Admin HireMate</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>admin@gmail.com</div>
                  </td>
                  <td><span className="admin-badge purple">Super Admin</span></td>
                  <td><span className="admin-badge success">Hoạt động</span></td>
                  <td>
                    <button className="admin-btn admin-btn-primary admin-btn-sm">Chi tiết</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Advanced Custom Theme Panel */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="var(--admin-primary)" />
            Tùy chỉnh màu sắc nâng cao (Custom Palette)
          </h3>
          <span className="admin-badge neutral">Dành riêng cho Admin</span>
        </div>

        <div className="admin-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Primary color picker */}
            <div>
              <label className="admin-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Màu thương hiệu chính (Primary Color)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="color"
                  value={customPrimary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  style={{ width: 44, height: 44, padding: 0, borderRadius: 10, border: 'none', cursor: 'pointer' }}
                />
                <input
                  className="admin-input"
                  value={customPrimary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  placeholder="#0085FF"
                  style={{ flex: 1, fontFamily: 'monospace' }}
                />
              </div>
            </div>

            {/* Accent color picker */}
            <div>
              <label className="admin-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Màu nhấn phát sáng (Accent Color)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="color"
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  style={{ width: 44, height: 44, padding: 0, borderRadius: 10, border: 'none', cursor: 'pointer' }}
                />
                <input
                  className="admin-input"
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  placeholder="#03BFFF"
                  style={{ flex: 1, fontFamily: 'monospace' }}
                />
              </div>
            </div>

            {/* Mode selector */}
            <div>
              <label className="admin-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Chế độ nền (Background Mode)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCustomMode('light')}
                  className={`admin-btn ${customMode === 'light' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <Sun size={15} /> Sáng
                </button>
                <button
                  type="button"
                  onClick={() => setCustomMode('dark')}
                  className={`admin-btn ${customMode === 'dark' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <Moon size={15} /> Tối
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="admin-btn admin-btn-primary" onClick={handleApplyCustom} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Check size={16} /> Áp dụng cấu hình tùy chỉnh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminConfig;
