import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminService, AdminPaymentRow } from '../../shared/services/admin.service';
import './admin.css';

const PAGE_SIZE = 20;

type Filter = { q: string; status: string; from: string; to: string };
const emptyFilter = (): Filter => ({ q: '', status: '', from: '', to: '' });

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;

const statusLabel: Record<string, string> = {
  paid: 'Đã thanh toán',
  pending: 'Chờ thanh toán',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy',
  refunded: 'Hoàn tiền',
};

const statusTone: Record<string, string> = {
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
  canceled: 'neutral',
  refunded: 'neutral',
};

function when(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const AdminPayments: React.FC = () => {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Filter>(emptyFilter);
  const [applied, setApplied] = useState<Filter>(emptyFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminService.getPayments({
      q: applied.q || undefined,
      status: applied.status || undefined,
      from: applied.from || undefined,
      to: applied.to || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
    if (!res.ok || !res.data) {
      setRows([]);
      setTotal(0);
      setError(res.message || 'Không thể tải danh sách thanh toán.');
    } else {
      setRows(res.data.items || []);
      setTotal(res.data.total || 0);
    }
    setLoading(false);
  }, [applied, page]);

  useEffect(() => { void load(); }, [load, reload]);

  const apply = () => {
    if ((draft.from && !draft.to) || (!draft.from && draft.to) || (draft.from && draft.to && draft.from > draft.to)) {
      setFilterError('Chọn đủ từ ngày và đến ngày, với từ ngày không sau đến ngày.');
      return;
    }
    setFilterError('');
    setPage(1);
    setApplied(draft);
    setReload((n) => n + 1);
  };

  const clear = () => {
    const next = emptyFilter();
    setDraft(next);
    setApplied(next);
    setPage(1);
    setError('');
    setFilterError('');
    setReload((n) => n + 1);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="adm-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Thanh toán</h1>
          <p className="admin-page-subtitle">Theo dõi và tra cứu hóa đơn trong hệ thống.</p>
        </div>
        <div className="adm-actions">
          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setReload((n) => n + 1)} disabled={loading} aria-label="Làm mới danh sách thanh toán">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Đang cập nhật...' : 'Làm mới'}
          </button>
        </div>
      </div>

      <section className="adm-card adm-filter" aria-label="Bộ lọc hóa đơn">
        <label className="adm-field adm-field-search">
          <span>Tìm kiếm</span>
          <input className="admin-input" placeholder="Mã hóa đơn, email hoặc tên" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') apply(); }} />
        </label>
        <div className="adm-filter-row">
          <label className="adm-field">
            <span>Trạng thái</span>
            <select className="admin-select" aria-label="Trạng thái" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              <option value="">Tất cả</option>
              <option value="Paid">Đã thanh toán</option>
              <option value="Pending">Chờ thanh toán</option>
              <option value="Failed">Thất bại</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </label>
          <label className="adm-field">
            <span>Từ ngày</span>
            <input className="admin-input" type="date" lang="vi" aria-label="Từ ngày" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </label>
          <label className="adm-field">
            <span>Đến ngày</span>
            <input className="admin-input" type="date" lang="vi" aria-label="Đến ngày" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </label>
          <div className="adm-filter-actions">
            <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={apply}>Lọc</button>
            <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={clear}>Xóa lọc</button>
          </div>
        </div>
        {filterError && <p className="adm-filter-error" role="alert">{filterError}</p>}
      </section>

      {loading && <div className="adm-skeleton" aria-busy="true" aria-live="polite"><span className="sr-only">Đang tải danh sách thanh toán</span></div>}

      {!loading && error && (
        <div className="adm-error" role="alert">
          <p>Không thể tải danh sách thanh toán.</p>
          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setReload((n) => n + 1)}>Thử lại</button>
        </div>
      )}

      {!loading && !error && (
        <div className="adm-card">
          <div className="admin-table-container">
            <table className="admin-table adm-table">
              <thead>
                <tr>
                  <th>Hóa đơn</th><th>Người dùng</th><th>Gói</th>
                  <th className="adm-num">Số tiền</th><th>Trạng thái</th><th>Tạo</th><th>Thanh toán</th><th>Cổng</th><th>Mã giao dịch</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} className="adm-empty-cell">Không có hóa đơn.</td></tr>
                ) : rows.map((row) => {
                  const key = (row.status || '').toLowerCase();
                  return (
                    <tr key={row.id}>
                      <td className="adm-mono">{row.invoiceNumber || '—'}</td>
                      <td>
                        <div className="adm-strong">{row.fullName || '—'}</div>
                        <div className="adm-sub">{row.email || '—'}</div>
                      </td>
                      <td>{row.planName || '—'}</td>
                      <td className="adm-num">{vnd(Number(row.amountVnd) || 0)}</td>
                      <td><span className={`admin-badge ${statusTone[key] || 'neutral'}`}>{statusLabel[key] || row.status || '—'}</span></td>
                      <td>{when(row.createdAt)}</td>
                      <td>{when(row.paidAt)}</td>
                      <td>{row.provider ? <span className="admin-badge neutral">{row.provider}</span> : '—'}</td>
                      <td className="adm-mono">{row.transactionRef || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="adm-pager">
            <span>{start}–{end} / {total} hóa đơn</span>
            <div className="adm-pager-nav">
              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button>
              <span>Trang {page} / {pages}</span>
              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Sau</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
