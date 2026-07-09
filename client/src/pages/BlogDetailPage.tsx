import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Eye, ArrowLeft } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import NewsletterSection from '../components/home/NewsletterSection';
import { blogApi } from '../api/misc.api';
import type { Blog } from '../types';
import { formatDate } from '../utils/format';

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    blogApi.getBlogBySlug(slug).then(({ data }) => setBlog(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!blog) return <div className="min-h-screen flex items-center justify-center"><p className="font-body text-brand-muted">Post not found</p></div>;

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: "var(--topbar-height)" }}>
      <article className="container-custom max-w-4xl py-12">
        <Link to="/blogs" className="inline-flex items-center gap-2 font-body text-sm text-brand-muted hover:text-primary transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Blog
        </Link>

        <p className="section-label mb-3">{blog.category}</p>
        <h1 className="heading-md text-brand-text mb-5">{blog.title}</h1>

        <div className="flex items-center gap-5 text-brand-muted font-body text-sm mb-8 pb-8 border-b border-brand-border">
          {blog.author && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-body text-xs font-bold text-primary">
                {blog.author.name[0]}
              </div>
              <span>{blog.author.name}</span>
            </div>
          )}
          <span className="flex items-center gap-1.5"><Calendar size={14} />{formatDate(blog.publishedAt)}</span>
          <span className="flex items-center gap-1.5"><Eye size={14} />{blog.views} views</span>
        </div>

        {blog.coverImage && (
          <div className="aspect-[16/9] overflow-hidden mb-8 bg-brand-surface">
            <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div
          className="prose prose-sm md:prose-base max-w-none font-body text-brand-text prose-headings:font-heading prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: blog.content || blog.excerpt }}
        />

        {blog.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-brand-border">
            {blog.tags.map((tag) => (
              <Link
                key={tag}
                to={`/blogs?tag=${tag}`}
                className="font-body text-xs border border-brand-border px-3 py-1 hover:border-primary hover:text-primary transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </article>
      <NewsletterSection />
    </div>
  );
}
