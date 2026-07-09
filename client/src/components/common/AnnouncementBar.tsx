import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { announcementApi } from '../../api/misc.api';
import type { Announcement } from '../../types';

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    announcementApi.getActive('top_bar').then(({ data }) => {
      setAnnouncements(data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % announcements.length), 4000);
    return () => clearInterval(t);
  }, [announcements.length]);

  if (dismissed || !announcements.length) return null;

  const ann = announcements[current];

  return (
    <div
      className="relative flex items-center justify-center px-8 py-2 text-center text-xs tracking-[0.2em] uppercase font-body font-medium transition-colors duration-300"
      style={{
        backgroundColor: ann.bgColor || '#C8A97E',
        color: ann.textColor || '#fff',
      }}
    >
      <span>{ann.content}</span>
      {ann.ctaText && ann.ctaLink && (
        <a
          href={ann.ctaLink}
          className="ml-3 underline underline-offset-2 hover:opacity-80 transition-opacity"
          onClick={() => announcementApi.trackClick(ann._id)}
        >
          {ann.ctaText}
        </a>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
