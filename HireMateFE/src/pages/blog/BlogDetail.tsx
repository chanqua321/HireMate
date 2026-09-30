import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicService } from '../../shared/services/public.service';
import { BlogPost } from '../../shared/types/blog';
import { BlogArticle } from '../../shared/components/BlogArticle';
import './css/Blog.css';

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setPost(null); setError(''); setMissing(false);
    (async () => {
      try {
        if (!slug) { if (active) setMissing(true); return; }
        const res = await publicService.getBlogDetail(slug);
        if (!active) return;
        if (res.status === 404) { setMissing(true); return; }
        if (!res.ok || !res.data) throw new Error(res.message || 'Không tải được bài viết.');
        setPost(res.data);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Không thể kết nối API.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [slug, retry]);
  return <div className="blog-page-container"><div className="blog-detail-wrap"><Link to="/blog" className="blog-back-link">← Quay lại cẩm nang</Link>
    {loading ? <p role="status">Đang tải bài viết...</p> : missing ? <h1>Không tìm thấy bài viết (404)</h1> : error ? <div role="alert">{error} <button onClick={() => setRetry(p => p + 1)}>Thử lại</button></div> : post && <BlogArticle post={post} author={post.author} publishedAt={post.publishedAt} coverUrl={post.coverUrl} />}
  </div></div>;
}
