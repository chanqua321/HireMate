import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, Share2, Sparkles, BookOpen, CheckCircle2 } from 'lucide-react';
import { publicService } from '../../shared/services/public.service';
import './css/Blog.css';

export const BlogDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await publicService.getBlogDetail(slug);
        if (res.ok && res.data) {
          setPost(res.data);
        } else {
          // Fallback detail
          setPost({
            title: '10 Câu Hỏi Phỏng Vấn Frontend Thường Gặp Nhất 2026 & Cách Trả Lời Chuẩn STAR',
            category: 'Interview Tips',
            author: 'Ban Biên Tập HireMate',
            date: '2026-07-15',
            readTime: '6 phút đọc',
            content: `
              Trong thị trường công nghệ ngày càng cạnh tranh, việc nắm chắc các khái niệm chuyên sâu và diễn đạt mạch lạc theo phương pháp STAR là chìa khóa then chốt để tạo ấn tượng mạnh mẽ với nhà tuyển dụng.

              ### 1. Phương Pháp STAR Là Gì?
              STAR là viết tắt của:
              - **S - Situation (Tình huống)**: Mô tả bối cảnh hoặc thách thức bạn phải đối mặt.
              - **T - Task (Nhiệm vụ)**: Mục tiêu và trách nhiệm cụ thể của bạn trong tình huống đó.
              - **A - Action (Hành động)**: Những giải pháp kỹ thuật và bước triển khai cụ thể bạn đã áp dụng.
              - **R - Result (Kết quả)**: Thành quả định lượng đạt được sau hành động.

              ### 2. Câu Hỏi 1: "Hãy kể về một lần bạn tối ưu hiệu năng Web Vitals bị tụt giảm nghiêm trọng?"
              - **Tình huống**: Hệ thống thương mại điện tử bị sụt giảm LCP lên tới 4.8s sau khi tích hợp thư viện banner mới.
              - **Nhiệm vụ**: Phải đưa LCP về dưới 2.5s trong vòng 48 giờ để tránh ảnh hưởng đến SEO và tỷ lệ chuyển đổi.
              - **Hành động**: Tôi dùng Chrome Performance Profiler để audit, phát hiện render-blocking script, lazy-load các module không thiết yếu và chuyển đổi toàn bộ ảnh sang chuẩn WebP/AVIF.
              - **Kết quả**: LCP giảm từ 4.8s xuống còn 1.6s, tỷ lệ thoát trang (bounce rate) giảm 18%.

              ### 3. Lời Khuyên Từ AI HireMate
              Hãy luyện tập trả lời tự nhiên qua voice với trợ lý AI HireMate trước khi bước vào buổi phỏng vấn chính thức. Sự chuẩn bị kỹ lưỡng sẽ giúp bạn tự tin xử lý mọi câu hỏi hóc búa!
            `,
          });
        }
      } catch (err) {
        console.warn('Blog detail API error, using fallback:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [slug]);

  if (!post) {
    return (
      <div className="blog-page-container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <p>Đang tải bài viết...</p>
      </div>
    );
  }

  return (
    <div className="blog-page-container">
      <div className="blog-detail-wrap">
        <Link to="/blog" className="blog-back-link">
          <ArrowLeft size={16} /> Quay lại danh sách cẩm nang
        </Link>

        <header className="blog-detail-header">
          <span className="blog-card-cat-badge inline">{post.category || 'Interview Tips'}</span>
          <h1 className="blog-detail-title">{post.title}</h1>
          <div className="blog-detail-meta">
            <span><User size={14} /> {post.author || 'HireMate Team'}</span>
            <span><Calendar size={14} /> {post.date || '2026-07-15'}</span>
            <span><Clock size={14} /> {post.readTime || '5 phút đọc'}</span>
          </div>
        </header>

        <div className="blog-detail-body">
          {post.content ? (
            <div style={{ whiteSpace: 'pre-line', lineHeight: '1.8', fontSize: '1.05rem', color: '#334155' }}>
              {post.content}
            </div>
          ) : (
            <p>Nội dung bài viết đang được cập nhật...</p>
          )}
        </div>

        {/* CTA banner at the end of article */}
        <div className="blog-cta-box">
          <div className="cta-icon-wrap">
            <Sparkles size={28} color="#03bffd" />
          </div>
          <div className="cta-content">
            <h3>Sẵn sàng thực hành phỏng vấn ngay hôm nay?</h3>
            <p>Trải nghiệm phòng phỏng vấn AI thông minh và nhận báo cáo đánh giá STAR chỉ sau 15 phút.</p>
          </div>
          <Link to="/interview-setup" className="btn-cta-blog">
            Bắt đầu phỏng vấn AI
          </Link>
        </div>
      </div>
    </div>
  );
};
export default BlogDetail;
