import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  FileText,
  Eye,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../../../app/context/AppContext';
import { billingService } from '../../api/billing.service';
import { InvoiceDto } from '../../types';
import './css/Invoice.css';

const getPlanDisplay = (invoice: InvoiceDto) => {
  if (invoice.plan?.name) {
    return {
      name: invoice.plan.name,
      desc: invoice.plan.description || 'Luyện phỏng vấn AI và tối ưu hóa hồ sơ năng lực',
      price: `${invoice.amountVnd.toLocaleString('vi-VN')}đ`,
    };
  }
  const planCode = (invoice.plan?.code || '').toLowerCase();
  if (planCode.includes('combo') || planCode.includes('advance') || planCode.includes('cao cấp')) {
    return {
      name: 'Gói Cao cấp - 1 Tháng',
      desc: 'Luyện phỏng vấn AI, 50 lượt/tháng, tối ưu CV ATS chuyên sâu, tính năng Beta',
      price: `${invoice.amountVnd.toLocaleString('vi-VN')}đ`,
    };
  }
  if (planCode.includes('premium') || planCode.includes('standard') || planCode.includes('tiêu chuẩn')) {
    return {
      name: 'Gói Tiêu chuẩn - 1 Tháng',
      desc: 'Luyện phỏng vấn AI, 15 lượt/tháng, feedback STAR chi tiết',
      price: `${invoice.amountVnd.toLocaleString('vi-VN')}đ`,
    };
  }
  return {
    name: 'Gói Dịch Vụ HireMate AI',
    desc: 'Luyện phỏng vấn AI, phân tích và tối ưu CV',
    price: `${invoice.amountVnd.toLocaleString('vi-VN')}đ`,
  };
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
};

export const Invoice: React.FC = () => {
  const { profile } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const invoiceParam = searchParams.get('invoice');

  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await billingService.getInvoices();
      if (res.ok && Array.isArray(res.data)) {
        setInvoices(res.data);

        // Check if there is an invoice in URL params to auto-select
        if (invoiceParam) {
          const found = res.data.find(
            (inv) =>
              inv.id === invoiceParam ||
              inv.invoiceNumber === invoiceParam ||
              inv.orderCode === invoiceParam
          );
          if (found) {
            setSelectedInvoice(found);
          } else {
            // Attempt to fetch detail directly if not in list
            billingService
              .getInvoiceDetail(invoiceParam)
              .then((detailRes) => {
                if (detailRes.ok && detailRes.data) {
                  setSelectedInvoice(detailRes.data);
                }
              })
              .catch(() => {});
          }
        }
      } else {
        setInvoices([]);
      }
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [invoiceParam]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchInvoices();
  };

  const handleSelectInvoice = (inv: InvoiceDto) => {
    setSelectedInvoice(inv);
    setSearchParams({ invoice: inv.id || inv.invoiceNumber || '' });
  };

  const handleBackToList = () => {
    setSelectedInvoice(null);
    setSearchParams({});
  };

  const handlePrint = () => {
    window.print();
  };

  const renderStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid' || s === 'completed' || s === 'success' || s === 'đã thanh toán') {
      return (
        <span className="invoice-status-badge invoice-status-badge--paid">
          <CheckCircle2 size={13} /> Đã thanh toán
        </span>
      );
    }
    if (s === 'pending' || s === 'chờ thanh toán') {
      return (
        <span className="invoice-status-badge invoice-status-badge--pending">
          <Clock size={13} /> Chờ thanh toán
        </span>
      );
    }
    if (s === 'cancelled' || s === 'canceled' || s === 'failed' || s === 'đã hủy') {
      return (
        <span className="invoice-status-badge invoice-status-badge--cancelled">
          <XCircle size={13} /> Đã hủy
        </span>
      );
    }
    return (
      <span className="invoice-status-badge invoice-status-badge--default">
        {status || 'Đang xử lý'}
      </span>
    );
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="invoice-page-container">
        <div className="invoice-loading-box">
          <RefreshCw className="invoice-spinner" size={32} />
          <p>Đang tải dữ liệu hóa đơn giao dịch...</p>
        </div>
      </div>
    );
  }

  // 2. Detailed Invoice View (When user clicks on an invoice)
  if (selectedInvoice) {
    const planInfo = getPlanDisplay(selectedInvoice);
    const invoiceNum =
      selectedInvoice.invoiceNumber || selectedInvoice.id?.substring(0, 8).toUpperCase() || 'INV-000';
    const invoiceDateFormatted = formatShortDate(
      selectedInvoice.paidAt || selectedInvoice.createdAt
    );
    const amountStr = `${(selectedInvoice.amountVnd || 0).toLocaleString('vi-VN')}đ`;

    return (
      <div className="invoice-page-container invoice-detail-mode">
        {/* Toolbar */}
        <div className="invoice-detail-toolbar no-print">
          <button type="button" onClick={handleBackToList} className="invoice-back-btn">
            <ArrowLeft size={18} /> Danh sách hóa đơn
          </button>
          <button type="button" onClick={handlePrint} className="invoice-print-btn">
            <Printer size={18} /> In hóa đơn
          </button>
        </div>

        {/* Paper Invoice Card */}
        <div className="invoice-card">
          {/* Invoice Header */}
          <div className="invoice-header-row">
            <div>
              <div className="invoice-brand-title">
                <span className="invoice-brand-highlight">Hire</span>Mate
              </div>
              <p className="invoice-company-info">
                Công ty Cổ phần Công nghệ HireMate
                <br />
                Khu Công nghệ cao, TP. Hồ Chí Minh
                <br />
                MST: 0317829104
              </p>
            </div>

            <div className="invoice-header-right">
              <h2 className="invoice-title">HÓA ĐƠN ĐIỆN TỬ</h2>
              <div className="invoice-meta-info">
                <strong>Số hóa đơn:</strong> {invoiceNum}
                <br />
                <strong>Ngày lập:</strong> {invoiceDateFormatted}
              </div>
              <div style={{ marginTop: '10px' }}>
                {renderStatusBadge(selectedInvoice.status)}
              </div>
            </div>
          </div>

          <hr className="invoice-divider" />

          {/* Client & Billing Info */}
          <div className="invoice-info-grid">
            <div className="invoice-info-col">
              <span className="invoice-info-label">Đơn vị xuất hóa đơn:</span>
              <div className="invoice-info-value">HireMate Vietnam Ltd.</div>
              <p className="invoice-info-sub">
                Email: billing@hiremate.ai
                <br />
                Hotline: 0918 306 884
              </p>
            </div>

            <div className="invoice-info-col">
              <span className="invoice-info-label">Khách hàng:</span>
              <div className="invoice-info-value">
                {profile.name || 'Khách hàng HireMate'}
              </div>
              <p className="invoice-info-sub">
                Email: {profile.email || 'Chưa cập nhật'}
                <br />
                Vị trí mục tiêu: {profile.role || profile.field || 'Người dùng hệ thống'}
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="invoice-detail-table">
            <thead>
              <tr>
                <th>Mô tả dịch vụ</th>
                <th style={{ textAlign: 'center' }}>Số lượng</th>
                <th style={{ textAlign: 'right' }}>Đơn giá</th>
                <th style={{ textAlign: 'right' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="invoice-item-name">{planInfo.name}</div>
                  <div className="invoice-item-desc">{planInfo.desc}</div>
                </td>
                <td style={{ textAlign: 'center' }}>1</td>
                <td style={{ textAlign: 'right' }}>{amountStr}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{amountStr}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals & Payment Info */}
          <div className="invoice-totals-wrapper">
            <div className="invoice-payment-method-box">
              <div className="invoice-payment-method-title">
                <CreditCard size={16} /> Thông tin giao dịch
              </div>
              <div className="invoice-payment-method-row">
                <span>Phương thức:</span>
                <strong>{selectedInvoice.paymentMethod || 'PayOS / Chuyển khoản'}</strong>
              </div>
              {selectedInvoice.orderCode && (
                <div className="invoice-payment-method-row">
                  <span>Mã giao dịch:</span>
                  <code>#{selectedInvoice.orderCode}</code>
                </div>
              )}
              {selectedInvoice.paidAt && (
                <div className="invoice-payment-method-row">
                  <span>Thời gian thanh toán:</span>
                  <span>{formatDate(selectedInvoice.paidAt)}</span>
                </div>
              )}
            </div>

            <div className="invoice-totals-box">
              <div className="invoice-total-line">
                <span className="invoice-total-label">Cộng tiền hàng:</span>
                <span className="invoice-total-num">{amountStr}</span>
              </div>
              <div className="invoice-total-line">
                <span className="invoice-total-label">Thuế VAT (0%):</span>
                <span className="invoice-total-num">0đ</span>
              </div>
              <hr className="invoice-divider-sm" />
              <div className="invoice-total-line invoice-total-line--final">
                <span>Tổng thanh toán:</span>
                <span className="invoice-final-amount">{amountStr}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="invoice-footer-note">
            Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của HireMate!
            <br />
            Hóa đơn điện tử có giá trị lưu hành toàn quốc theo quy định pháp luật.
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State (When no invoices exist)
  if (invoices.length === 0) {
    return (
      <div className="invoice-page-container">
        <div className="invoice-toolbar no-print">
          <Link to="/dashboard" className="invoice-back-btn">
            <ArrowLeft size={18} /> Bảng điều khiển
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            className="invoice-refresh-btn"
            title="Làm mới"
          >
            <RefreshCw size={16} className={isRefreshing ? 'invoice-spinner' : ''} /> Làm mới
          </button>
        </div>

        <div className="invoice-empty-card">
          <div className="invoice-empty-icon-wrap">
            <Receipt size={48} className="invoice-empty-icon" />
          </div>
          <h2 className="invoice-empty-title">Chưa có giao dịch nào</h2>
          <p className="invoice-empty-desc">
            Bạn chưa phát sinh giao dịch thanh toán hoặc hóa đơn nào trên hệ thống HireMate.
          </p>
          <div className="invoice-empty-actions">
            <Link to="/pricing" className="invoice-primary-btn">
              <ShoppingBag size={18} /> Khám phá các gói dịch vụ
            </Link>
            <Link to="/dashboard" className="invoice-secondary-btn">
              Về bảng điều khiển
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Simple List View (When there are invoices in the table)
  return (
    <div className="invoice-page-container">
      {/* Header Bar */}
      <div className="invoice-page-header">
        <div>
          <h1 className="invoice-page-title">
            <Receipt size={26} className="invoice-title-icon" /> Lịch sử hóa đơn
          </h1>
          <p className="invoice-page-subtitle">
            Danh sách các hóa đơn và giao dịch thanh toán của bạn trên HireMate
          </p>
        </div>
        <div className="invoice-page-header-actions">
          <Link to="/dashboard" className="invoice-back-btn">
            <ArrowLeft size={16} /> Bảng điều khiển
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            className="invoice-refresh-btn"
            disabled={isRefreshing}
          >
            <RefreshCw size={15} className={isRefreshing ? 'invoice-spinner' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="invoice-table-wrapper">
        <table className="invoice-list-table">
          <thead>
            <tr>
              <th>Mã hóa đơn</th>
              <th>Gói dịch vụ</th>
              <th>Thời gian</th>
              <th>Phương thức</th>
              <th style={{ textAlign: 'right' }}>Số tiền</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const plan = getPlanDisplay(inv);
              const invCode =
                inv.invoiceNumber || inv.id?.substring(0, 8).toUpperCase() || 'INV-000';
              const dateDisplay = formatDate(inv.paidAt || inv.createdAt);
              const amountDisplay = `${(inv.amountVnd || 0).toLocaleString('vi-VN')}đ`;

              return (
                <tr
                  key={inv.id || invCode}
                  className="invoice-row"
                  onClick={() => handleSelectInvoice(inv)}
                >
                  <td className="invoice-code-cell">
                    <div className="invoice-code-badge">
                      <FileText size={15} />
                      <span>{invCode}</span>
                    </div>
                  </td>
                  <td>
                    <div className="invoice-plan-name">{plan.name}</div>
                    {inv.orderCode && (
                      <div className="invoice-sub-text">Mã ĐH: #{inv.orderCode}</div>
                    )}
                  </td>
                  <td className="invoice-date-cell">
                    <div className="invoice-date-wrap">
                      <Calendar size={14} className="invoice-muted-icon" />
                      <span>{dateDisplay}</span>
                    </div>
                  </td>
                  <td>
                    <span className="invoice-method-tag">{inv.paymentMethod || 'PayOS'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="invoice-amount-text">{amountDisplay}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{renderStatusBadge(inv.status)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="invoice-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectInvoice(inv);
                      }}
                      title="Xem chi tiết hóa đơn"
                    >
                      <Eye size={15} />
                      <span>Chi tiết</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="invoice-list-footer-hint">
        <AlertCircle size={15} /> Nhấp vào bất kỳ dòng nào hoặc nút <strong>Chi tiết</strong> để
        xem và in hóa đơn điện tử.
      </div>
    </div>
  );
};
