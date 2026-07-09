import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Spinner from '../components/common/Spinner';
import Breadcrumb from '../components/common/Breadcrumb';
import { cmsApi } from '../api/misc.api';

interface CmsContent {
  heading?: string;
  body?: string;
  stats?: { label: string; value: string }[];
}

interface CmsDoc {
  key: string;
  title: string;
  content: string | CmsContent;
}

export default function CmsPage() {
  const { key } = useParams<{ key: string }>();
  const [page, setPage] = useState<CmsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!key) return;
    setLoading(true);
    setNotFound(false);
    cmsApi
      .getPage(key)
      .then(({ data }) => setPage(data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [key]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center text-center px-4" style={{ paddingTop: 'var(--topbar-height)' }}>
        <h1 className="heading-md text-brand-text mb-2">Page not found</h1>
        <p className="font-body text-sm text-brand-muted">This page hasn't been published yet.</p>
      </div>
    );
  }

  const isHtml = typeof page.content === 'string';
  const obj = (typeof page.content === 'object' ? page.content : {}) as CmsContent;

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      {/* Hero */}
      <div className="border-b border-brand-border" style={{ background: 'linear-gradient(135deg, #FFF9F5 0%, #F5EFE8 100%)' }}>
        <div className="container-custom py-12 md:py-16">
          <Breadcrumb crumbs={[{ label: 'Home', href: '/' }, { label: page.title }]} />
          <h1 className="heading-lg text-brand-text mt-4">{obj.heading || page.title}</h1>
        </div>
      </div>

      <div className="container-custom py-10 md:py-14 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {isHtml ? (
            <div
              className="prose-cms font-body text-[15px] leading-relaxed text-brand-text/90 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: page.content as string }}
            />
          ) : (
            <>
              {obj.body && <p className="font-body text-[15px] leading-relaxed text-brand-text/90 mb-8">{obj.body}</p>}
              {obj.stats && obj.stats.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-10">
                  {obj.stats.map((s) => (
                    <div key={s.label} className="text-center border border-brand-border rounded-2xl py-6 bg-white">
                      <p className="font-heading text-2xl md:text-3xl font-bold text-primary">{s.value}</p>
                      <p className="font-body text-xs text-brand-muted mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
