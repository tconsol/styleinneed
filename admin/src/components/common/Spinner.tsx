export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }[size];
  return <div className={`${s} border-2 border-brand-border border-t-primary rounded-full animate-spin`} />;
}

export function PageSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[300px]">
      <Spinner size="lg" />
    </div>
  );
}
