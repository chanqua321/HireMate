import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { adminService, AdminDashboardData } from '../../shared/services/admin.service';
import './admin.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const RANGES = [
  ['today', 'Hôm nay'],
  ['last7days', '7 ngày'],
  ['last30days', '30 ngày'],
  ['thisweek', 'Tuần này'],
  ['thismonth', 'Tháng này'],
  ['thisyear', 'Năm nay'],
  ['custom', 'Tùy chọn'],
] as const;

const vnd = (n: number) => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const changeText = (value: number | null | undefined) =>
  value == null ? 'Chưa có kỳ trước để so sánh' : `${value > 0 ? '+' : ''}${value}% so với kỳ trước`;

const AdminDashboard: React.FC = () => {
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('last7days');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [grain, setGrain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AdminDashboardData | null>(null);

  const load = async () => {
    if (range === 'custom' && (!from || !to)) {
      setLoading(false);
      setError('Chọn đủ từ ngày và đến ngày.');
      setData(null);
      return;
    }
    if (range === 'custom' && from > to) {
      setLoading(false);
      setError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    const res = await adminService.getDashboard({
      range,
      from: range === 'custom' ? from : undefined,
      to: range === 'custom' ? to : undefined,
      granularity: grain || undefined,
    });
    if (!res.ok || !res.data) {
      setData(null);
      setError(res.message || 'Không thể tải dữ liệu thống kê.');
    } else {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => { load().catch((e) => { setError(e?.message || 'Không thể tải dữ liệu thống kê.'); setLoading(false); }); }, [range, from, to, grain]);

  const labels = (data?.series || []).map((p) => dayLabel(p.date));
  const chartBase = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const cards = data ? [
    ['Tổng người dùng', data.users.total.toLocaleString('vi-VN'), 'Tài khoản chưa xóa, không lọc theo kỳ'],
    ['Người dùng mới', data.users.new.toLocaleString('vi-VN'), changeText(data.users.percentageChange)],
    ['Phiên phỏng vấn', data.interviews.total.toLocaleString('vi-VN'), changeText(data.interviews.percentageChange)],
    ['Hoàn thành', data.interviews.completed.toLocaleString('vi-VN'), data.interviews.completionRate == null ? 'Chưa có phiên trong kỳ' : `Tỷ lệ ${data.interviews.completionRate}%`],
    ['CV tạo mới', data.cvs.created.toLocaleString('vi-VN'), changeText(data.cvs.percentageChange)],
    ['CV đã phân tích', data.cvs.analyzed.toLocaleString('vi-VN'), 'Có AnalyzedAt trong kỳ'],
    ['JD match', data.jdMatches.total.toLocaleString('vi-VN'), changeText(data.jdMatches.percentageChange)],
    ['Thanh toán thành công', data.revenue.successfulPayments.toLocaleString('vi-VN'), 'Hóa đơn Paid'],
    ['Doanh thu', vnd(data.revenue.totalVnd), changeText(data.revenue.percentageChange)],
    ['User trả phí hiện tại', data.activePaidUsers.toLocaleString('vi-VN'), 'IsPremium, không theo kỳ'],
  ] : [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Tổng quan</h1>
          <p className="admin-page-subtitle">
            {data ? `${dayLabel(data.range.from)} – ${dayLabel(data.range.to)} · ${data.range.timezone}` : 'Thống kê theo ngày Việt Nam'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <select className="admin-select" value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
            {RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="admin-select" value={grain} onChange={(e) => setGrain(e.target.value)}>
            <option value="">Nhóm mặc định</option>
            <option value="day">Theo ngày</option>
            <option value="week">Theo tuần</option>
            <option value="month">Theo tháng</option>
          </select>
          {range === 'custom' && (
            <>
              <input className="admin-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <input className="admin-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {loading && <div className="admin-card" style={{ padding: '1.5rem' }}>Đang tải thống kê...</div>}
      {!loading && error && <div className="admin-card" style={{ padding: '1.5rem', color: '#b91c1c' }}>{error}</div>}
      {!loading && data && (
        <>
          <div className="admin-stats-grid">
            {cards.map(([label, value, note]) => (
              <div key={label} className="admin-stat-card" style={{ minWidth: 0 }}>
                <div className="admin-stat-value" style={{ fontSize: '1.35rem' }}>{value}</div>
                <div className="admin-stat-label">{label}</div>
                <div className="admin-stat-change">{note}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <ChartCard title="Người dùng mới">
              <Line data={{ labels, datasets: [{ label: 'Người dùng mới', data: data.series.map(p => p.newUsers), borderColor: '#0284c7', backgroundColor: 'rgba(2,132,199,0.15)', fill: true, tension: 0.3 }] }} options={chartBase} />
            </ChartCard>
            <ChartCard title="Phiên phỏng vấn">
              <Bar data={{ labels, datasets: [{ label: 'Phiên', data: data.series.map(p => p.interviews), backgroundColor: 'rgba(3,191,255,0.75)', borderRadius: 6 }] }} options={chartBase} />
            </ChartCard>
            <ChartCard title="Doanh thu đã thanh toán">
              <Bar data={{ labels, datasets: [{ label: 'VND', data: data.series.map(p => p.revenueVnd), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6 }] }} options={{ ...chartBase, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => vnd(Number(item.raw)) } } } }} />
            </ChartCard>
            <ChartCard title="Phân bổ gói">
              {data.plans.length === 0 ? <Empty /> : (
                <Doughnut data={{ labels: data.plans.map(p => p.code), datasets: [{ data: data.plans.map(p => p.count), backgroundColor: ['#cbd5e1', '#0284c7', '#7c3aed', '#10b981'] }] }} options={{ responsive: true, maintainAspectRatio: false }} />
              )}
            </ChartCard>
            <ChartCard title="CV tạo và phân tích">
              <Line data={{ labels, datasets: [
                { label: 'Tạo', data: data.series.map(p => p.cvsCreated), borderColor: '#0369a1', tension: 0.3 },
                { label: 'Đã phân tích', data: data.series.map(p => p.cvsAnalyzed), borderColor: '#059669', tension: 0.3 },
              ] }} options={{ ...chartBase, plugins: { legend: { display: true } } }} />
            </ChartCard>
          </div>
          <div className="admin-card" style={{ marginTop: '1rem' }}>
            <div className="admin-card-body">
              <p>Điểm trung bình chỉ tính phiên Completed có OverallScore: {data.interviews.averageScore == null ? 'chưa có' : data.interviews.averageScore}.</p>
              <p>Ngôn ngữ phỏng vấn và ngôn ngữ CV không có cột riêng, nên không đưa vào thống kê. Bộ đếm UserFeatureUsage là theo tháng, không phải từng lần dùng, nên không vẽ thành biểu đồ ngày.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="admin-card" style={{ minWidth: 0 }}>
    <div className="admin-card-header"><h3 className="admin-card-title">{title}</h3></div>
    <div className="admin-card-body" style={{ height: 260, minWidth: 0 }}>{children}</div>
  </div>
);

const Empty = () => <p style={{ textAlign: 'center', color: 'var(--admin-text-muted)' }}>Chưa có dữ liệu.</p>;

export default AdminDashboard;
