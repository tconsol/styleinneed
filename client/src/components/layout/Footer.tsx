import { Link } from 'react-router-dom';
import { Camera, Share2, Play, MessageCircle } from 'lucide-react';
import PaymentLogos from '../common/PaymentLogos';

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
    { label: 'My Orders', href: '/account?tab=orders' },
    { label: 'Wishlist', href: '/account?tab=wishlist' },
    { label: 'Returns', href: '/account/returns' },
    { label: 'Support', href: '/account/support' },
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
  return (
    <footer className="bg-brand-text text-white/80">
      {/* Marquee */}
      <div className="border-y border-white/10 py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {Array(6).fill(null).map((_, i) => (
            <span key={i} className="font-heading text-2xl font-bold italic text-white/10 mx-8 select-none">
              STYLE IN NEED FASHIONS &nbsp;✦&nbsp;
            </span>
          ))}
        </div>
      </div>

      <div className="container-custom py-16">
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
