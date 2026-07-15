export interface StatusTab {
  value: string;
  label: string;
  text: string; // active text color
  dot: string;  // status accent dot
  count?: number;
}

interface Props {
  tabs: StatusTab[];
  value: string;
  onChange: (v: string) => void;
}

/**
 * Modern segmented filter control used on the Orders / Returns / Support admin
 * pages. Active tab lifts to a raised surface pill with its status colour;
 * inactive tabs are muted with a soft hover.
 */
export default function StatusTabs({ tabs, value, onChange }: Props) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl"
      style={{ background: 'var(--c-th-bg)', border: '1px solid var(--c-border)' }}>
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11.5px] font-semibold capitalize transition-all duration-150"
            style={active
              ? { background: t.dot, color: '#fff', boxShadow: `0 2px 6px ${t.dot}55` }
              : { background: 'transparent', color: 'var(--c-muted)' }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--c-text)'; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--c-muted)'; }}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="ml-0.5 min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-full text-[9px] font-bold"
                style={active ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: 'var(--c-border)', color: 'var(--c-muted)' }}>
                {t.count > 99 ? '99+' : t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
