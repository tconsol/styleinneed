// Payment-method logos loaded from the web, on white chips so they read on
// the dark footer. Each hides itself if the remote image fails to load.
const LOGOS = [
  { name: 'Visa', src: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg' },
  { name: 'RuPay', src: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Rupay-Logo.png' },
  { name: 'Razorpay', src: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg' },
  { name: 'Stripe', src: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg' },
  { name: 'PayPal', src: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg' },
];

export default function PaymentLogos() {
  return (
    <div className="flex items-center gap-2">
      {LOGOS.map((l) => (
        <span key={l.name} className="bg-white rounded-md px-2 flex items-center justify-center h-7">
          <img
            src={l.src}
            alt={l.name}
            title={l.name}
            loading="lazy"
            className="h-4 w-auto object-contain"
            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
          />
        </span>
      ))}
    </div>
  );
}
