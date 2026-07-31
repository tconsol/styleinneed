import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Share2, Play, MessageCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentLogos from '../common/PaymentLogos';
import CurvedInput from '../common/CurvedInput';
import { newsletterApi } from '../../api/misc.api';

const LINKS = {
  Shop: [
    { label: 'New Arrivals', href: '/products?isNewArrival=true' },
    { label: 'Sarees', href: '/products?search=sarees' },
    { label: 'Kurtis', href: '/products?search=kurtis' },
    { label: 'Lehengas', href: '/products?search=lehengas' },
    { label: 'Western Wear', href: '/products?category=western' },
    { label: 'Collections', href: '/collections' },
  ],
  Account: [
    { label: 'My Account', href: '/account' },
    { label: 'My Orders', href: '/orders' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Returns', href: '/returns' },
    { label: 'Support', href: '/support' },
  ],
  Company: [
    { label: 'About Us', href: '/cms/about' },
    { label: 'Blog', href: '/blogs' },
    { label: 'Contact Us', href: '/cms/contact' },
  ],
  Policies: [
    { label: 'Privacy Policy', href: '/cms/privacy' },
    { label: 'Terms of Service', href: '/cms/terms' },
    { label: 'Return Policy', href: '/cms/returns' },
    { label: 'Shipping Policy', href: '/cms/shipping' },
  ],
};

export default function Footer() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleSubscribe = async (raw: string) => {
    const email = raw.trim();
    if (status === 'loading' || !email) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setStatus('loading');
    try {
      await newsletterApi.subscribe(email);
      setStatus('done');
      toast.success('Successfully subscribed!');
    } catch {
      setStatus('idle');
      toast.error('Could not subscribe. Please try again.');
    }
  };

  return (
    <footer className="bg-brand-text text-white/80">
      <div className="container-custom py-16">
        {/* Newsletter */}
        <div className="mb-14 flex flex-col gap-8 border-b border-white/10 pb-14 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <h3 className="font-heading text-2xl font-semibold text-white md:text-3xl">Get Exclusive Access</h3>
            <p className="mt-2 font-body text-sm leading-relaxed text-white/50">
              Join the inner circle for early access to new collections, member-only offers and styling tips.
            </p>
          </div>

          {status === 'done' ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Check size={18} />
              </div>
              <p className="font-body text-sm text-white/80">You're in! Watch your inbox for a little hello.</p>
            </div>
          ) : (
            <div className="w-full max-w-xl">
              <CurvedInput
                placeholder="Enter your email address"
                buttonText={status === 'loading' ? 'Subscribing…' : 'Subscribe'}
                theme="dark"
                bend={16}
                height={58}
                width="100%"
                fontSize={15}
                cornerRadius={16}
                backgroundColor="#211C18"
                borderColor="#453C33"
                buttonColor="#C8A97E"
                buttonTextColor="#1C1C1C"
                placeholderColor="#9C948A"
                shadowSize="none"
                onSubmit={handleSubscribe}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="block mb-4">
              <span className="font-heading text-2xl font-bold tracking-wider text-white">STYLE IN NEED</span>
              <span className="block font-body text-[9px] tracking-[0.4em] uppercase text-primary mt-0.5">FASHIONS</span>
            </Link>
            <p className="font-body text-sm leading-relaxed text-white/60 mb-6">
              Premium women's fashion celebrating Indian heritage with modern elegance.
            </p>
            <div className="flex gap-4">
              {[
                { Icon: Camera, href: '#', label: 'Instagram' },
                { Icon: Share2, href: '#', label: 'Facebook' },
                { Icon: Play, href: '#', label: 'YouTube' },
                { Icon: MessageCircle, href: '#', label: 'WhatsApp' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 border border-white/20 flex items-center justify-center hover:border-primary hover:text-primary transition-colors duration-200"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="font-body text-xs tracking-[0.25em] uppercase text-white font-semibold mb-5">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="font-body text-sm text-white/60 hover:text-primary transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-white/40">
            © {new Date().getFullYear()} Style In Need Fashions. All rights reserved.
          </p>
          <PaymentLogos />
        </div>
      </div>
    </footer>
  );
}
