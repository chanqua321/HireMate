import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="brand" to="/">
              <img src="/logo.png" alt="HireMate" />
            </Link>
            <p className="footer-tag">
              Trợ lý AI hỗ trợ luyện tập phỏng vấn.
            </p>
          </div>

          <div className="footer-col">
            <h4>Sản phẩm</h4>
            <Link to="/">Trang chủ</Link>
            <Link to="/pricing">Bảng giá</Link>
            <Link to="/interview-setup">Phỏng vấn</Link>
            <Link to="/questions">Ngân hàng câu hỏi</Link>
          </div>

          <div className="footer-col">
            <h4>Pháp lý</h4>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>
              Chính sách bảo mật
            </a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>
              Điều khoản sử dụng
            </a>
          </div>

          <div className="footer-col">
            <h4>Liên hệ</h4>
            <a href="tel:0918306884">0918306884</a>
            <a href="mailto:hirematecompany@gmail.com">
              hirematecompany@gmail.com
            </a>
            <div className="social">
              <a href="#facebook" aria-label="Facebook" onClick={(e) => e.preventDefault()}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 HireMate. Đã đăng ký bản quyền.
        </div>
      </div>
    </footer>
  );
};
