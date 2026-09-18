import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Edit3, Video, ArrowRight } from 'lucide-react';
import './CheckCvModal.css';

interface CheckCvModalProps {
  isOpen: boolean;
  name: string;
  role: string;
  field: string;
  exp: string;
  skills: string[];
  onClose: () => void;
  onEditProfile: () => void;
}

export const CheckCvModal: React.FC<CheckCvModalProps> = ({
  isOpen,
  name,
  role,
  field,
  exp,
  skills,
  onClose,
  onEditProfile,
}) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="check-cv-modal-overlay" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.25 }}
            className="check-cv-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div className="check-cv-modal-icon-header">
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                Hồ Sơ Nghề Nghiệp Đã Sẵn Sàng!
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#64748B' }}>
                Dữ liệu Career Profile đã được lưu & đồng bộ để tối ưu bộ câu hỏi phỏng vấn chuẩn xác nhất.
              </p>
            </div>

            {/* Overview Card */}
            <div className="check-cv-preview-box">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Họ và tên:</span>
                  <strong style={{ color: '#0F172A' }}>{name || 'Chưa cập nhật'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Vị trí mục tiêu:</span>
                  <strong style={{ color: '#0284C7' }}>{role || 'Chưa cập nhật'}</strong>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Ngành nghề:</span>
                  <strong style={{ color: '#0F172A' }}>{field || 'Chưa chọn'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block' }}>Kinh nghiệm:</span>
                  <strong style={{ color: '#0F172A' }}>{exp || 'Chưa chọn'}</strong>
                </div>
              </div>
              {skills.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '4px' }}>
                    Kỹ năng ({skills.length}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {skills.slice(0, 8).map((s) => (
                      <span
                        key={s}
                        style={{
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                    {skills.length > 8 && (
                      <span style={{ color: '#64748B', fontSize: '0.75rem', padding: '2px 4px' }}>
                        +{skills.length - 8} kỹ năng khác
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={onEditProfile}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: '1.5px solid #0284C7',
                  background: '#F0F9FF',
                  color: '#0284C7',
                  fontWeight: 750,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title="Chỉnh sửa lại thông tin hồ sơ nghề nghiệp"
              >
                <Edit3 size={18} />
                <span>Chỉnh sửa hồ sơ (Career Profile)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/interview-setup');
                }}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284C7 0%, #03BFFF 100%)',
                  color: '#FFFFFF',
                  fontWeight: 750,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                }}
              >
                <Video size={18} />
                <span>Tiến hành Phỏng vấn AI ngay</span>
                <ArrowRight size={16} />
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/pricing');
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #BAE6FD',
                    background: '#FFFFFF',
                    color: '#0284C7',
                    fontWeight: 650,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  💎 Xem gói dịch vụ
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/');
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 650,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  🏠 Về Trang chủ
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
