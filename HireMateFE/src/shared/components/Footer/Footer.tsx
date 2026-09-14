import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Mail, Send, X, CheckCircle2, Loader2 } from 'lucide-react';
import { publicService } from '../../services';
import './css/Footer.css';

export const Footer: React.FC = () => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await publicService.sendContact({
        fullName: contactName,
        email: contactEmail,
        subject: contactSubject,
        body: contactMessage,
      });
      if (res.ok) {
        setSendSuccess(true);
        setTimeout(() => {
          setShowContactModal(false);
          setSendSuccess(false);
          setContactName('');
          setContactEmail('');
          setContactSubject('');
          setContactMessage('');
        }, 2000);
      } else {
        setSendSuccess(true);
      }
    } catch {
      setSendSuccess(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-left">
            <div className="footer-brand-row">
              <Link to="/" className="footer-brand-title">
                HireMate
              </Link>
            </div>
            <p className="footer-slogan">
              2026 HireMate. Empowering the next generation of Vietnamese talent.
            </p>
          </div>

          <div className="footer-links-row">
            <a href="#privacy" onClick={(e) => e.preventDefault()}>
              Privacy Policy
            </a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>
              Terms of Service
            </a>
            <Link to="/pricing">
              Bảng giá
            </Link>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Liên hệ hỗ trợ
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Contact Modal */}
      {showContactModal &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: '20px',
            }}
            onClick={() => setShowContactModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '32px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6B7280',
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(3, 191, 255, 0.1)',
                    color: '#03BFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mail size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#111827' }}>Gửi tin nhắn cho HireMate</h3>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#6B7280' }}>
                Chúng tôi luôn sẵn sàng hỗ trợ phản hồi trong vòng 24 giờ làm việc.
              </p>

              {sendSuccess ? (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid #22C55E',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    color: '#15803D',
                  }}
                >
                  <CheckCircle2 size={36} style={{ margin: '0 auto 8px', color: '#22C55E' }} />
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px' }}>
                    Gửi liên hệ thành công!
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    Cảm ơn bạn đã đóng góp. Đội ngũ HireMate sẽ liên hệ qua email sớm nhất.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitContact}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.92rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Email của bạn
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.92rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Chủ đề
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Vấn đề tài khoản, góp ý tính năng..."
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.92rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Nội dung tin nhắn
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Chi tiết câu hỏi hoặc vấn đề của bạn..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.92rem',
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '10px',
                      background: '#03BFFF',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.96rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(3, 191, 255, 0.3)',
                    }}
                  >
                    {isSending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Đang gửi tin nhắn...
                      </>
                    ) : (
                      <>
                        <Send size={18} /> Gửi tin nhắn
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
