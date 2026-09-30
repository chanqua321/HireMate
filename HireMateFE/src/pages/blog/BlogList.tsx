import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicService } from '../../shared/services/public.service';
import { BlogPost, blogDate } from '../../shared/types/blog';
import { BlogCover } from '../../shared/components/BlogArticle';
import './css/Blog.css';

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const res = await publicService.getBlogList();
      if (!res.ok || !Array.isArray(res.data)) throw new Error(res.message || 'Không tải được bài viết.');
      setPosts(res.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể kết nối API.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const visible = posts.filter(p => (!category || p.tag === category) && `${p.title} ${p.summary}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  return <div className="blog-page-container">
    <header className="blog-hero"><h1 className="blog-title">Cẩm nang nghề nghiệp</h1><p className="blog-desc">Bài viết từ HireMate về CV, phỏng vấn và phát triển sự nghiệp.</p></header>
    <label htmlFor="blog-search">Tìm bài viết</label><input id="blog-search" className="blog-search-bar" value={search} onChange={e => setSearch(e.target.value)} />
    <label htmlFor="blog-category">Danh mục</label><select id="blog-category" value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả</option>{Array.from(new Set(posts.map(p => p.tag).filter(Boolean))).map(c => <option key={c} value={c}>{c}</option>)}</select>
    {loading ? <p role="status">Đang tải bài viết...</p> : error ? <div role="alert">{error} <button onClick={() => void load()}>Thử lại</button></div> : visible.length === 0 ? <p>{posts.length ? 'Không tìm thấy bài viết phù hợp.' : 'Chưa có bài viết.'}</p> :
      <div className="blog-cards-grid">{visible.map(post => <article key={post.id} className="blog-card">
        <Link to={`/blog/${post.slug}`}><BlogCover url={post.coverUrl} title={post.title} /></Link>
        <div className="blog-card-body"><p>{post.tag}</p><h2 className="blog-card-title"><Link to={`/blog/${post.slug}`}>{post.title}</Link></h2><p className="blog-card-excerpt">{post.summary}</p>{post.author && <p>{post.author}</p>}{post.publishedAt && <p>{blogDate(post.publishedAt)}</p>}<Link to={`/blog/${post.slug}`} className="blog-read-more">Đọc bài viết</Link></div>
      </article>)}</div>}
  </div>;
}
