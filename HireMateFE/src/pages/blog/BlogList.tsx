import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, ArrowRight, Clock, Calendar, User, Sparkles } from 'lucide-react';
import { publicService } from '../../shared/services/public.service';
import './css/Blog.css';

const fallbackPosts = [
  {
    id: '1',
    title: '10 Câu Hỏi Phỏng Vấn Frontend Thường Gặp Nhất 2026 & Cách Trả Lời Chuẩn STAR',
    slug: '10-cau-hoi-frontend-2026',
    category: 'Interview Tips',
    author: 'Ban Biên Tập HireMate',
    views: 4821,
    date: '2026-07-15',
    readTime: '6 phút đọc',
    excerpt: 'Tổng hợp chi tiết các câu hỏi phỏng vấn React 19, Javascript Core, Web Performance và mô hình trả lời theo phương pháp STAR giúp bạn ghi điểm tuyệt đối trong mắt nhà tuyển dụng.',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    id: '2',
    title: 'Cách Tối Ưu CV Để Vượt Hệ Thống Lọc ATS Trong 5 Phút',
    slug: 'toi-uu-cv-ats',
    category: 'CV Tips',
    author: 'Chuyên gia Tuyển dụng AI',
    views: 3240,
    date: '2026-07-10',
    readTime: '4 phút đọc',
    excerpt: 'Hơn 75% CV bị loại trước khi đến tay HR bởi hệ thống ATS. Khám phá 5 quy tắc bố cục và từ khóa vàng để nâng tỷ lệ qua vòng hồ sơ lên 95%.',
    image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    id: '3',
    title: 'Lộ Trình Phát Triển Sự Nghiệp: Từ Junior Lên Staff Engineer',
    slug: 'lo-trinh-data-science',
    category: 'Career Path',
    author: 'Tech Lead HireMate',
    views: 2980,
    date: '2026-07-08',
    readTime: '8 phút đọc',
    excerpt: 'Chiến lược tích lũy chiều sâu kỹ thuật, mở rộng tầm ảnh hưởng hệ thống và kỹ năng thương lượng đãi ngộ dành riêng cho kỹ sư phần mềm.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    id: '4',
    title: 'Tại Sao Luyện Phỏng Vấn Với AI Lại Đạt Kết Quả Vượt Trội 40%?',
    slug: 'phong-van-ai-hieu-qua',
    category: 'AI Tech',
    author: 'AI Research Team',
    views: 2189,
    date: '2026-07-05',
    readTime: '5 phút đọc',
    excerpt: 'Khảo sát thực nghiệm trên 5.000 ứng viên luyện tập với trợ lý ảo HireMate cho thấy sự gia tăng đáng kể về độ phản xạ và cấu trúc diễn đạt logic.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
];

const CATEGORIES = ['Tất cả', 'Interview Tips', 'CV Tips', 'Career Path', 'AI Tech'];

export const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<any[]>(fallbackPosts);
  const [selectedCat, setSelectedCat] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await publicService.getBlogList();
        if (res.ok && res.data && res.data.length > 0) {
          const mapped = res.data.map((b: any, idx: number) => ({
            id: b.id || String(idx),
            title: b.title,
            slug: b.slug || 'slug-bai-viet',
            category: b.category || 'Interview Tips',
            author: b.author || 'HireMate Team',
            views: b.views || 100,
            date: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '2026-07-20',
            readTime: '5 phút đọc',
            excerpt: b.summary || b.content?.substring(0, 150) || '',
            image: fallbackPosts[idx % fallbackPosts.length]?.image,
          }));
          setPosts(mapped);
        }
      } catch (e) {
        console.warn('Real blog list API fallback:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const filtered = posts.filter(p => {
    const matchCat = selectedCat === 'Tất cả' || p.category === selectedCat;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="blog-page-container">
      {/* Hero Header */}
      <div className="blog-hero">
        <div className="blog-badge">
          <BookOpen size={16} color="#03bffd" />
          <span>Cẩm Nang Nghề Nghiệp & Bí Kíp Phỏng Vấn</span>
        </div>
        <h1 className="blog-title">
          Kiến thức chuyên sâu từ <span className="blog-gradient">Chuyên Gia Tuyển Dụng & AI</span>
        </h1>
        <p className="blog-desc">
          Cập nhật những xu hướng tuyển dụng mới nhất, kỹ năng phỏng vấn theo phương pháp STAR và cách xây dựng thương hiệu cá nhân đỉnh cao.
        </p>

        {/* Search Bar */}
        <div className="blog-search-bar">
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Tìm kiếm bài viết, mẹo phỏng vấn, ATS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="blog-categories-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`blog-cat-btn ${selectedCat === cat ? 'active' : ''}`}
            onClick={() => setSelectedCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Blog Cards Grid */}
      <div className="blog-cards-grid">
        {filtered.map(post => (
          <article key={post.id} className="blog-card">
            <Link to={`/blog/${post.slug}`} className="blog-card-img-wrap">
              <img src={post.image} alt={post.title} loading="lazy" />
              <span className="blog-card-cat-badge">{post.category}</span>
            </Link>
            <div className="blog-card-body">
              <div className="blog-card-meta">
                <span className="meta-item"><Calendar size={13} /> {post.date}</span>
                <span className="meta-item"><Clock size={13} /> {post.readTime}</span>
              </div>
              <h3 className="blog-card-title">
                <Link to={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <div className="blog-card-footer">
                <div className="blog-card-author">
                  <div className="author-avatar">{post.author[0]}</div>
                  <span>{post.author}</span>
                </div>
                <Link to={`/blog/${post.slug}`} className="blog-read-more">
                  Đọc tiếp <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
export default BlogList;
