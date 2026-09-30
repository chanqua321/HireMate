export interface BlogWrite {
  title: string;
  slug: string;
  tag: string;
  summary: string;
  body: string;
  isPublished: boolean;
}

export interface BlogPost extends BlogWrite {
  id: string;
  author: string | null;
  coverUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
}

export const blogSlug = (value: string) => value.toLowerCase().replace(/đ/g, 'd')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const blogDate = (value: string | null) => value
  ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  : '';
