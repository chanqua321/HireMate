import { HistoryItem, InterviewResult } from '../types';

export const SAMPLE_HISTORY: HistoryItem[] = [
  { date: '2026-07-20', role: 'Lập trình viên Frontend', score: 85 },
  { date: '2026-07-22', role: 'Lập trình viên Frontend', score: 78 },
  { date: '2026-07-24', role: 'Lập trình viên React', score: 92 },
];

export const SAMPLE_LAST_RESULT: InterviewResult = {
  overall: 85,
  role: 'Lập trình viên Frontend',
  clarity: 82,
  subs: {
    S: 88,
    T: 85,
    A: 80,
    R: 87,
  },
  date: '2026-07-26',
  feedbacks: [
    {
      question: 'Bạn hãy kể về một dự án mà bạn tự hào nhất?',
      answer: 'Trong dự án X, tôi phụ trách tối ưu quy trình và giảm 30% thời gian xử lý thông qua việc áp dụng Redis cache.',
      feedback: 'Câu trả lời rất tốt, thể hiện rõ ràng kỹ năng và kinh nghiệm. Tuy nhiên, phần kết quả (R) có thể bổ sung thêm việc tối ưu đó tác động như thế nào đến doanh thu hoặc người dùng cuối.',
      score: 85
    },
    {
      question: 'Bạn giải quyết mâu thuẫn trong nhóm như thế nào?',
      answer: 'Tôi thường lắng nghe ý kiến của mọi người và tìm ra điểm chung để giải quyết.',
      feedback: 'Câu trả lời còn chung chung. Bạn nên tập trung vào cấu trúc STAR, lấy một ví dụ cụ thể về một lần mâu thuẫn bạn đã trải qua và cách bạn trực tiếp giải quyết nó.',
      score: 65
    }
  ]
};
