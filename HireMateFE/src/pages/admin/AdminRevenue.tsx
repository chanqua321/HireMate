import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, CreditCard, FileText, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { adminService, AdminInvoiceRow, AdminRevenueSeries, RevenueBucket } from '../../shared/services/admin.service';
import './admin.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type Grain = 'day' | 'week' | 'month';
type Preset = 'today' | 'last7' | 'last30' | 'thisweek' | 'thismonth' | 'thisyear' | 'custom';

const GRAINS: { id: Grain; label: string }[] = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
];

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'last7', label: '7 ngày' },
  { id: 'last30', label: '30 ngày' },
  { id: 'thisweek', label: 'Tuần này' },
  { id: 'thismonth', label: 'Tháng này' },
  { id: 'thisyear', label: 'Năm nay' },
  { id: 'custom', label: 'Tùy chỉnh' },
];

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
const metric = (n: number) => (n > 0 ? vnd(n) : '—');
const countOrDash = (n: number) => (n > 0 ? n.toLocaleString('vi-VN') : '—');

const statusBadge = (s: string) => {
  const key = s.toLowerCase();
  const map: Record<string, string> = { paid: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral' };
  const label: Record<string, string> = { paid: 'Đã thanh toán', pending: 'Chờ xử lý', failed: 'Thất bại', refunded: 'Hoàn tiền' };
  return <span className={`admin-badge ${map[key] || 'neutral'}`}>{label[key] || s}</span>;
};

function vietnamParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: num('year'), m: num('month'), d: num('day') };
}

function iso(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function shift(y: number, m: number, d: number, days: number) {
  return iso(y, m, d + days);
}

function presetRange(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const { y, m, d } = vietnamParts();
  const today = iso(y, m, d);
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'last7') return { from: shift(y, m, d, -6), to: today };
  if (preset === 'last30') return { from: shift(y, m, d, -29), to: today };
  if (preset === 'thismonth') return { from: iso(y, m, 1), to: iso(y, m + 1, 0) };
  if (preset === 'thisyear') return { from: iso(y, 1, 1), to: iso(y, 12, 31) };
  const mondayOffset = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const from = shift(y, m, d, -mondayOffset);
  const [fy, fm, fd] = from.split('-').map(Number);
  return { from, to: shift(fy, fm, fd, 6) };
}

function pretty(isoDate: string) {
  const [y, m, d] = isoDate.split('-');
  return y && m && d ? `${d}/${m}/${y}` : isoDate;
}

const AdminRevenue: React.FC = () => {
  const [tab, setTab] = useState<'overview' | 'invoices'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grain, setGrain] = useState<Grain>('month');
  const [preset, setPreset] = useState<Preset | null>(null);
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [series, setSeries] = useState<AdminRevenueSeries | null>(null);
  const [buckets, setBuckets] = useState<RevenueBucket[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoiceRow[]>([]);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminService.getRevenueSeries(grain, appliedFrom || undefined, appliedTo || undefined);
    if (res.ok && res.data) {
      setSeries(res.data);
      setBuckets(res.data.buckets ?? []);
      setInvoices(res.data.invoices ?? []);
    } else {
      setSeries(null);
      setBuckets([]);
      setInvoices([]);
      setError(res.message || 'Không thể tải dữ liệu doanh thu.');
    }
    setLoading(false);
  }, [grain, appliedFrom, appliedTo]);

  useEffect(() => { void load(); }, [load, reload]);

  const applyPreset = (next: Preset) => {
    setPreset(next);
    setRangeError('');
    if (next === 'custom') return;
    const range = presetRange(next);
    setAppliedFrom(range.from);
    setAppliedTo(range.to);
  };

  const applyCustom = () => {
    if (!draftFrom || !draftTo) {
      setRangeError('Chọn đủ từ ngày và đến ngày.');
      return;
    }
    if (draftFrom > draftTo) {
      setRangeError('Từ ngày phải trước hoặc bằng đến ngày.');
      return;
    }
    setRangeError('');
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
  };

  const onSegmentKey = (
    event: React.KeyboardEvent<HTMLDivElement>,
    ids: string[],
    current: string | null,
    choose: (id: string) => void,
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = Math.max(0, ids.indexOf(current ?? ''));
    const delta = event.key === 'ArrowRight' ? 1 : ids.length - 1;
    choose(ids[(index + delta) % ids.length]);
  };

  const summary = series?.summary;
  const change = summary?.changePercent ?? 0;
  const changeTone = change > 0 ? 'up' : change < 0 ? 'down' : '';
  const hasRevenue = buckets.some((b) => b.revenue > 0);
  const grainLabel = grain === 'day' ? 'ngày' : grain === 'week' ? 'tuần' : 'tháng';
  const showData = !loading && !error && series;

  return (
    <div className="rev-page adm-page">
      <div className="admin-page-header rev-header">
        <div>
          <h1 className="admin-page-title">Doanh thu & Thanh toán</h1>
          <p className="admin-page-subtitle">Theo dõi doanh thu và hiệu quả thanh toán.</p>
        </div>
        <button className="admin-btn admin-btn-secondary admin-btn-sm rev-refresh" onClick={() => setReload((n) => n + 1)} disabled={loading} aria-label="Làm mới dữ liệu doanh thu">
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Đang cập nhật...' : 'Làm mới'}
        </button>
      </div>

      <section className="rev-toolbar" aria-label="Bộ lọc doanh thu">
        <div className="rev-field">
          <span className="rev-label" id="rev-grain-label">Nhóm dữ liệu</span>
          <div
            className="rev-segment"
            role="radiogroup"
            aria-labelledby="rev-grain-label"
            onKeyDown={(e) => onSegmentKey(e, GRAINS.map((g) => g.id), grain, (id) => setGrain(id as Grain))}
          >
            {GRAINS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={grain === item.id}
                className="rev-chip"
                onClick={() => setGrain(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rev-field rev-field-grow">
          <span className="rev-label" id="rev-range-label">Khoảng thời gian</span>
          <div
            className="rev-segment"
            role="radiogroup"
            aria-labelledby="rev-range-label"
            onKeyDown={(e) => onSegmentKey(e, PRESETS.map((p) => p.id), preset, (id) => applyPreset(id as Preset))}
          >
            {PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={preset === item.id}
                className="rev-chip"
                onClick={() => applyPreset(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <div className="rev-custom">
            <label className="rev-date">
              <span>Từ ngày</span>
              <input className="admin-input" type="date" value={draftFrom} aria-label="Từ ngày" onChange={(e) => { setDraftFrom(e.target.value); setRangeError(''); }} />
            </label>
            <label className="rev-date">
              <span>Đến ngày</span>
              <input className="admin-input" type="date" value={draftTo} aria-label="Đến ngày" onChange={(e) => { setDraftTo(e.target.value); setRangeError(''); }} />
            </label>
            <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={applyCustom}>Áp dụng</button>
          </div>
        )}

        <p className={`rev-hint${rangeError ? ' is-error' : ''}`} role={rangeError ? 'alert' : undefined}>
          {rangeError
            ? rangeError
            : preset === null
              ? 'Đang dùng khoảng mặc định của hệ thống theo nhóm dữ liệu đã chọn.'
              : preset === 'custom' && (appliedFrom !== draftFrom || appliedTo !== draftTo)
                ? 'Nhấn Áp dụng để tải khoảng tùy chỉnh. Khoảng không hợp lệ sẽ không được gửi.'
                : appliedFrom && appliedTo
                  ? `Đang xem ${pretty(appliedFrom)} – ${pretty(appliedTo)}.`
                  : 'Chọn đủ từ ngày và đến ngày, rồi nhấn Áp dụng.'}
        </p>
      </section>

      {loading && (
        <div className="rev-skeleton" aria-busy="true" aria-live="polite">
          <span className="sr-only">Đang tải dữ liệu doanh thu</span>
          <div className="rev-kpis">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rev-skel-card" />)}
          </div>
          <div className="rev-skel-chart" />
        </div>
      )}

      {!loading && error && (
        <div className="rev-error" role="alert">
          <p>Không thể tải dữ liệu doanh thu.</p>
          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setReload((n) => n + 1)}>Thử lại</button>
        </div>
      )}

      {showData && (
        <>
          <div className="rev-kpis">
            <article className="rev-kpi">
              <div className="rev-kpi-icon green" aria-hidden="true"><DollarSign size={18} /></div>
              <div className="rev-kpi-value">{vnd(summary?.totalRevenue ?? 0)}</div>
              <div className="rev-kpi-label">Doanh thu trong kỳ</div>
              <div className={`rev-kpi-note${changeTone ? ` ${changeTone}` : ''}`}>
                {change > 0 && <ArrowUpRight size={13} />}
                {change < 0 && <ArrowDownRight size={13} />}
                <span>{change > 0 ? '+' : ''}{change}% so với kỳ trước</span>
              </div>
            </article>
            <article className="rev-kpi">
              <div className="rev-kpi-icon blue" aria-hidden="true"><CreditCard size={18} /></div>
              <div className="rev-kpi-value">{(summary?.premiumUsers ?? 0).toLocaleString('vi-VN')}</div>
              <div className="rev-kpi-label">User Premium</div>
              <div className="rev-kpi-note">Tổng mọi thời điểm {vnd(summary?.allTimeRevenue ?? 0)}</div>
            </article>
            <article className="rev-kpi">
              <div className="rev-kpi-icon blue" aria-hidden="true"><TrendingUp size={18} /></div>
              <div className="rev-kpi-value">{summary?.conversionRate ?? 0}%</div>
              <div className="rev-kpi-label">Tỷ lệ chuyển đổi</div>
              <div className="rev-kpi-note">ARPU kỳ này {vnd(summary?.arpu ?? 0)}</div>
            </article>
            <article className="rev-kpi">
              <div className="rev-kpi-icon orange" aria-hidden="true"><FileText size={18} /></div>
              <div className="rev-kpi-value">{summary?.paidInvoices ?? 0}</div>
              <div className="rev-kpi-label">Hóa đơn đã thanh toán</div>
              <div className="rev-kpi-note">{invoices.length.toLocaleString('vi-VN')} giao dịch trong kỳ</div>
            </article>
          </div>

          <div className="rev-tabs" role="tablist" aria-label="Nội dung doanh thu">
            <button type="button" role="tab" id="rev-tab-chart" aria-selected={tab === 'overview'} aria-controls="rev-panel-chart" className="rev-tab" onClick={() => setTab('overview')}>Biểu đồ</button>
            <button type="button" role="tab" id="rev-tab-invoices" aria-selected={tab === 'invoices'} aria-controls="rev-panel-invoices" className="rev-tab" onClick={() => setTab('invoices')}>Hóa đơn</button>
          </div>

          {tab === 'overview' && (
            <div role="tabpanel" id="rev-panel-chart" aria-labelledby="rev-tab-chart">
              <div className="rev-card">
                <div className="rev-card-head"><h2>Doanh thu theo {grainLabel}</h2></div>
                <div className="rev-card-body">
                  {!hasRevenue ? (
                    <p className="rev-empty rev-empty-chart">Chưa có doanh thu trong khoảng thời gian này</p>
                  ) : (
                    <div className="rev-chart">
                      <Bar
                        data={{
                          labels: buckets.map((b) => b.label),
                          datasets: [{
                            label: 'Doanh thu',
                            data: buckets.map((b) => b.revenue),
                            backgroundColor: '#0085FF',
                            borderRadius: 6,
                            maxBarThickness: buckets.length <= 2 ? 28 : 36,
                            categoryPercentage: 0.62,
                            barPercentage: 0.78,
                          }],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: '#001B3F',
                              titleColor: '#fff',
                              bodyColor: '#E2E8F0',
                              padding: 10,
                              callbacks: {
                                title: (items) => `Kỳ: ${items[0]?.label ?? ''}`,
                                label: (item) => {
                                  const bucket = buckets[item.dataIndex];
                                  return [
                                    `Doanh thu: ${vnd(bucket?.revenue ?? 0)}`,
                                    `Hóa đơn: ${bucket?.invoices ?? 0}`,
                                  ];
                                },
                              },
                            },
                          },
                          scales: {
                            x: { grid: { display: false }, ticks: { color: '#64748B', maxRotation: 0, autoSkip: true } },
                            y: {
                              beginAtZero: true,
                              grid: { color: 'rgba(15, 23, 42, 0.06)' },
                              ticks: { color: '#64748B', callback: (value) => vnd(Number(value)) },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="rev-card rev-table-card">
                <div className="admin-table-container">
                  <table className="admin-table rev-table">
                    <thead>
                      <tr>
                        <th>Kỳ</th>
                        <th className="rev-num">Doanh thu</th>
                        <th className="rev-num">Hóa đơn</th>
                        <th className="rev-num">User mới</th>
                        <th className="rev-num">ARPU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buckets.length === 0 ? (
                        <tr><td colSpan={5} className="rev-empty-cell">Chưa có dữ liệu trong khoảng này.</td></tr>
                      ) : buckets.map((m) => (
                        <tr key={m.start}>
                          <td>{m.label}</td>
                          <td className={`rev-num${m.revenue > 0 ? ' rev-pos' : ''}`}>{metric(m.revenue)}</td>
                          <td className="rev-num">{countOrDash(m.invoices)}</td>
                          <td className="rev-num">{countOrDash(m.newUsers)}</td>
                          <td className="rev-num">{m.invoices > 0 ? vnd(Math.round(m.revenue / m.invoices)) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'invoices' && (
            <div className="rev-card rev-table-card" role="tabpanel" id="rev-panel-invoices" aria-labelledby="rev-tab-invoices">
              <div className="admin-table-container">
                <table className="admin-table rev-table">
                  <thead>
                    <tr>
                      <th>Mã</th><th>Người dùng</th><th>Gói</th>
                      <th className="rev-num">Số tiền</th><th>Phương thức</th><th>Ngày</th><th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td colSpan={7} className="rev-empty-cell">Không có hóa đơn trong khoảng đã chọn.</td></tr>
                    ) : invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="rev-mono">{inv.invoiceNumber || inv.id.slice(0, 8)}</td>
                        <td><div className="rev-strong">{inv.fullName || 'Người dùng'}</div><div className="rev-sub">{inv.email}</div></td>
                        <td>{inv.planName || '—'}</td>
                        <td className={`rev-num${inv.amountVnd > 0 ? ' rev-pos' : ''}`}>{metric(inv.amountVnd)}</td>
                        <td>{inv.paymentMethod}</td>
                        <td>{(inv.paidAt || inv.createdAt || '').slice(0, 10)}</td>
                        <td>{statusBadge(inv.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminRevenue;
