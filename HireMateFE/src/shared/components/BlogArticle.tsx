import { useEffect, useState } from 'react';
import { authenticatedFetch, getFileUrl } from '../api/apiClient';
import { BlogWrite, blogDate } from '../types/blog';

export function BlogCover({ url, title }: { url: string | null; title: string }) {
  const [source, setSource] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setSource(''); setFailed(false);
    if (url?.startsWith('/api/Admin/')) {
      authenticatedFetch(getFileUrl(url)).then(async response => {
        if (!response.ok) throw new Error('Không tải được ảnh');
        const blob = await response.blob();
        if (active) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); }
      }).catch(() => { if (active) setFailed(true); });
    } else if (url) setSource(url.startsWith('blob:') ? url : getFileUrl(url));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);
  if (failed) return <p role="status">Không tải được ảnh bìa.</p>;
  return source ? <img src={source} alt={title} onError={() => setFailed(true)} style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 12 }} /> : null;
}

export function BlogArticle({ post, coverUrl, author, publishedAt }: {
  post: BlogWrite; coverUrl: string | null; author?: string | null; publishedAt?: string | null;
}) {
  return <article style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
    <p>{post.tag} · {post.isPublished ? 'Xuất bản' : 'Bản nháp'}</p>
    <h1>{post.title}</h1>
    {author && <p>{author}</p>}
    {publishedAt && <p>{blogDate(publishedAt)}</p>}
    <BlogCover url={coverUrl} title={post.title} />
    <p style={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{post.summary}</p>
    {/* Plain text only: React escapes markup, event handlers and javascript: strings. */}
    <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.8 }}>{post.body}</div>
  </article>;
}
