import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { HistoryItem, InterviewResult } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardChartsProps {
  history: HistoryItem[];
  lastResult: InterviewResult | null;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  history,
  lastResult,
}) => {
  // Progress line chart data
  const sampleData = [62, 68, 64, 72, 78, 85];
  const sampleLabels = ['Buổi 1', 'Buổi 2', 'Buổi 3', 'Buổi 4', 'Buổi 5', 'Buổi 6'];

  let dataPoints = sampleData;
  let labels = sampleLabels;

  if (history && history.length >= 2) {
    const recent = history.slice(-8);
    dataPoints = recent.map((h) => h.score);
    labels = recent.map(
      (_, i) => `Buổi ${history.length - recent.length + i + 1}`
    );
  }

  const lineData = {
    labels,
    datasets: [
      {
        label: 'Điểm STAR',
        data: dataPoints,
        borderColor: '#03BFFF',
        backgroundColor: 'rgba(3, 191, 255, 0.22)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#03BFFF',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#001B3F' },
    },
    scales: {
      y: {
        suggestedMin: 40,
        suggestedMax: 100,
        grid: { color: 'rgba(16,24,40,.08)' },
        ticks: { color: '#6B7280' },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#6B7280' },
      },
    },
  };

  // Doughnut chart data
  const subs = lastResult?.subs || { S: 88, T: 85, A: 80, R: 87 };
  const clarity = lastResult?.clarity || 82;
  const doughnutVals = [subs.S, subs.T, subs.A, subs.R, clarity];

  const doughnutData = {
    labels: ['Bối cảnh', 'Nhiệm vụ', 'Hành động', 'Kết quả', 'Sự rõ ràng'],
    datasets: [
      {
        data: doughnutVals,
        backgroundColor: [
          '#03BFFF',
          '#5B6BFF',
          '#22C55E',
          '#F59E0B',
          '#FF6B9A',
        ],
        borderColor: 'transparent',
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#1B1D21',
          usePointStyle: true,
          padding: 14,
          font: { size: 12, family: "'Be Vietnam Pro', sans-serif" },
        },
      },
    },
  };

  return (
    <div
      className="grid grid-2"
      style={{ gap: '24px', marginBottom: '32px', alignItems: 'stretch' }}
    >
      <div className="card" style={{ padding: '24px', minHeight: '320px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
          Tiến bộ điểm số theo thời gian
        </h3>
        <div style={{ height: '240px', position: 'relative' }}>
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      <div className="card" style={{ padding: '24px', minHeight: '320px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
          Phân bổ kỹ năng STAR
        </h3>
        <div style={{ height: '240px', position: 'relative' }}>
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </div>
    </div>
  );
};
