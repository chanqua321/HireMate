import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, LifeBuoy, CheckCircle2, AlertCircle } from 'lucide-react';
import { publicService } from '../../services/public.service';
import { useApp } from '../../../app/context/AppContext';
import './css/SupportTicketModal.css';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useApp();
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (profile.email) {
        setEmail(profile.email);
      }
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, profile.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !subject.trim() || !body.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await publicService.createTicket({
        email: email.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });

      if (res.ok) {
        setSuccess(true);
        setSubject('');
        setBody('');
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2200);
      } else {
        setError(res.message || 'Không thể gửi ticket. Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="ticket-modal-overlay" onClick={onClose}>
        <motion.div
          className="ticket-modal-card"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ticket-modal-header">
            <div className="ticket-modal-title-wrap">
              <div className="ticket-modal-icon">
                <LifeBuoy size={20} color="#03bffd" />
              </div>
              <div>
                <h3 className="ticket-modal-title">Gửi Yêu Cầu Hỗ Trợ Kỹ Thuật</h3>
                <p className="ticket-modal-sub">Đội ngũ kỹ sư HireMate sẽ phản hồi qua email trong 24 giờ</p>
              </div>
            </div>
            <button className="ticket-modal-close" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>

          {success ? (
            <motion.div
              className="ticket-success-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CheckCircle2 size={54} color="#10b981" />
              <h4>Ticket đã được tiếp nhận thành công!</h4>
              <p>Mã yêu cầu đã được đồng bộ vào hệ thống quản trị trung tâm. Chúng tôi sẽ kiểm tra và giải quyết ngay.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="ticket-form">
              {error && (
                <div className="ticket-alert danger">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="ticket-field">
                <label>Email liên hệ <span className="req">*</span></label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="ticket-field">
                <label>Tiêu đề vấn đề <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="Ví dụ: Gặp sự cố kết nối micro khi phỏng vấn AI"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="ticket-field">
                <label>Mô tả chi tiết nội dung sự cố <span className="req">*</span></label>
                <textarea
                  rows={4}
                  placeholder="Mô tả cụ thể các bước dẫn tới sự cố, thiết bị hoặc đường link liên quan..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>

              <div className="ticket-modal-footer">
                <button type="button" className="ticket-btn-cancel" onClick={onClose}>
                  Hủy bỏ
                </button>
                <button type="submit" className="ticket-btn-submit" disabled={loading}>
                  <Send size={15} />
                  {loading ? 'Đang gửi...' : 'Gửi yêu cầu hỗ trợ'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
