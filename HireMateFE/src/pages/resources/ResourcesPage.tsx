import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ExternalLink, Download, Sparkles, Filter, CheckCircle2, Bookmark } from 'lucide-react';
import { publicService } from '../../shared/services/public.service';
import './css/ResourcesPage.css';

const fallbackResources = [
  {
    id: '1',
    title: 'Tuyển Tập 50+ Bộ Template CV Chuẩn Quốc Tế & ATS',
    category: 'CV Templates',
    type: 'Template',
    description: 'Bộ sưu tập mẫu CV định dạng DOCX và Figma đã tối ưu bố cục và từ khóa ngành CNTT, Marketing, Data.',
    url: 'https://github.com',
    free: true,
    featured: true,
  },
  {
    id: '2',
    title: 'System Design Primer (Bản dịch & Tóm tắt tiếng Việt)',
    category: 'Architecture',
    type: 'Ebook',
    description: 'Tài liệu gối đầu giường về thiết kế hệ thống phân tán, xử lý tải cao, Caching và Database Sharding.',
    url: 'https://github.com/donnemartin/system-design-primer',
    free: true,
    featured: true,
  },
  {
    id: '3',
    title: 'LeetCode 75 Curated Interview Questions Checklist',
    category: 'Algorithms',
    type: 'Cheatsheet',
    description: 'Bảng theo dõi 75 bài toán thuật toán trọng tâm nhất thường xuyên xuất hiện ở các kỳ phỏng vấn Big Tech.',
    url: 'https://leetcode.com',
    free: false,
    featured: false,
  },
  {
    id: '4',
    title: 'React 19 & Next.js 15 Comprehensive CheatSheet',
    category: 'Frontend',
    type: 'Cheatsheet',
    description: 'Tổng hợp Server Components, Server Actions, useOptimistic, useActionState và các patterns tối ưu nhất.',
    url: 'https://react.dev',
    free: true,
    featured: true,
  },
  {
    id: '5',
    title: 'Kịch Bản Trả Lời 30 Câu Hỏi Behavioral Phỏng Vấn Theo Chuẩn STAR',
    category: 'Interview Tips',
    type: 'Guide',
    description: 'Hướng dẫn xây dựng câu chuyện cá nhân sinh động, cách xử lý các câu hỏi bẫy về điểm yếu và xung đột dự án.',
    url: '/blog/10-cau-hoi-frontend-2026',
    free: true,
    featured: false,
  },
  {
    id: '6',
    title: 'Checklist Kiểm Thử Hiệu Năng Web (Core Web Vitals)',
    category: 'Frontend',
    type: 'Tool',
    description: 'Bảng kiểm chi tiết các tiêu chí tối ưu LCP, INP, CLS trước khi deploy lên môi trường production.',
    url: 'https://web.dev/vitals/',
    free: true,
    featured: false,
  },
];

const CATS = ['Tất cả', 'Frontend', 'CV Templates', 'Architecture', 'Algorithms', 'Interview Tips'];

export const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<any[]>(fallbackResources);
  const [activeCat, setActiveCat] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await publicService.getResources();
        if (res.ok && res.data && res.data.length > 0) {
          const mapped = res.data.map((r: any, i: number) => ({
            id: r.id || String(i),
            title: r.title,
            category: r.category || 'Tài liệu',
            type: r.type || 'Guide',
            description: r.description || '',
            url: r.url || 'https://hiremate.vn',
            free: r.free !== false,
            featured: r.featured === true,
          }));
          setResources(mapped);
        }
      } catch (err) {
        console.warn('Real resources API fallback:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, []);

  const filtered = resources.filter(r => {
    const matchCat = activeCat === 'Tất cả' || r.category === activeCat;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="res-page-container">
      {/* Hero */}
      <div className="res-hero">
        <div className="res-badge">
          <BookOpen size={16} color="#03bffd" />
          <span>Kho Tài Nguyên Tuyển Dụng & Phát Triển Kỹ Năng</span>
        </div>
        <h1 className="res-title">
          Tài Liệu, Template CV & <span className="res-gradient">Cẩm Nang Kỹ Thuật Tuyển Chọn</span>
        </h1>
        <p className="res-desc">
          Tổng hợp tài nguyên chất lượng cao được đội ngũ HireMate thẩm định để phục vụ tối đa cho quá trình chuẩn bị phỏng vấn và thăng tiến sự nghiệp.
        </p>

        {/* Search */}
        <div className="res-search-wrap">
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Tìm kiếm tài nguyên, CV template, System design..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="res-filter-tabs">
        {CATS.map(c => (
          <button
            key={c}
            className={`res-filter-btn ${activeCat === c ? 'active' : ''}`}
            onClick={() => setActiveCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="res-cards-grid">
        {filtered.map(res => (
          <div key={res.id} className="res-item-card">
            <div className="res-card-top">
              <span className="res-type-pill">{res.type}</span>
              <span className={`res-price-pill ${res.free ? 'free' : 'pro'}`}>
                {res.free ? 'Miễn phí' : 'Dành cho VIP'}
              </span>
            </div>

            <h3 className="res-card-name">{res.title}</h3>
            <p className="res-card-desc">{res.description}</p>

            <div className="res-card-footer">
              <span className="res-cat-text">📁 {res.category}</span>
              <a
                href={res.url}
                target={res.url.startsWith('http') ? '_blank' : '_self'}
                rel="noreferrer"
                className="res-action-link"
              >
                Truy cập ngay <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ResourcesPage;
