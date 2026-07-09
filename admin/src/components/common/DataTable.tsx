import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from './Spinner';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: { page: number; pages: number; total: number; onPageChange: (page: number) => void; };
  keyExtractor: (row: T) => string;
}

export default function DataTable<T>({ columns, data, isLoading, emptyMessage = 'No data found', pagination, keyExtractor }: Props<T>) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-brand-border/60">
              {columns.map((col) => (
                <th key={col.key} className={`th ${col.width || ''}`}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={columns.length} className="text-center py-14"><div className="flex justify-center"><Spinner /></div></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-14">
                <p className="font-body text-[11px] text-brand-muted">{emptyMessage}</p>
              </td></tr>
            ) : (
              data.map((row) => (
                <tr key={keyExtractor(row)} className="border-b border-brand-border/40 hover:bg-brand-bg/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="td">
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3.5 rounded-b-xl"
          style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-surface)' }}
        >
          <p className="font-body text-[10px]" style={{ color: 'var(--c-muted)' }}>
            Page {pagination.page} of {pagination.pages} &middot; {pagination.total} total
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="pagn-btn w-7 h-7 flex items-center justify-center rounded disabled:opacity-40"
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const p = Math.max(1, Math.min(pagination.page - 2, pagination.pages - 4)) + i;
              const active = p === pagination.page;
              return (
                <button
                  key={p}
                  onClick={() => pagination.onPageChange(p)}
                  className={`w-7 h-7 font-body text-xs rounded transition-colors ${active ? '' : 'pagn-btn'}`}
                  style={active
                    ? { background: 'var(--c-primary)', color: '#fff', border: '1px solid var(--c-primary)' }
                    : undefined}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="pagn-btn w-7 h-7 flex items-center justify-center rounded disabled:opacity-40"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
