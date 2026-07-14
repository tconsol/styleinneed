import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10 max-w-4xl">
        <Link to="/account" className="lg:hidden inline-flex items-center gap-1 font-body text-sm text-brand-muted hover:text-primary mb-4">
          <ChevronLeft size={16} /> My Account
        </Link>
        <div className="bg-white border border-brand-border p-6">
          <h1 className="font-heading text-xl font-semibold mb-6">Returns & Refunds</h1>
          <p className="font-body text-sm text-brand-muted">Visit your orders to initiate a return for delivered items.</p>
          <Link to="/orders" className="btn-outline mt-4 inline-flex">View Orders</Link>
        </div>
      </div>
    </div>
  );
}
