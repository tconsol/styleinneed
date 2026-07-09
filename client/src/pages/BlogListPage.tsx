import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Eye } from 'lucide-react';
import SectionHeader from '../components/common/SectionHeader';
import Spinner from '../components/common/Spinner';
import NewsletterSection from '../components/home/NewsletterSection';
import { blogApi } from '../api/misc.api';
import type { Blog } from '../types';
import { formatDate } from '../utils/format';

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blogApi.getBlogs({ page: 1 }).then(({ data }) => {
      setBlogs(data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: "var(--topbar-height)" }}>
      <div className="container-custom py-12">
        <SectionHeader
          label="Stories & Style"
          title="Fashion Blog"
          subtitle="Styling tips, fashion guides, and behind-the-scenes from our world"
        />

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : blogs.length === 0 ? (
          <p className="text-center font-body text-brand-muted py-12">No posts yet. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog, i) => (
              <motion.article
                key={blog._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group"
              >
                <Link to={`/blogs/${blog.slug}`} className="block">
                  <div className="overflow-hidden aspect-[16/10] mb-4 bg-brand-surface">
                    <img
                      src={blog.coverImage}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <p className="section-label mb-2">{blog.category}</p>
                  <h2 className="font-heading text-xl font-semibold text-brand-text group-hover:text-primary transition-colors leading-snug mb-3">
                    {blog.title}
                  </h2>
                  <p className="font-body text-sm text-brand-muted line-clamp-2 mb-4">{blog.excerpt}</p>
                  <div className="flex items-center gap-4 text-brand-muted font-body text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(blog.publishedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {blog.views} views
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
      <NewsletterSection />
    </div>
  );
}
