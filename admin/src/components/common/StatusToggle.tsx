interface Props {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function StatusToggle({ isActive, onToggle, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${isActive ? 'bg-emerald-500' : 'bg-red-400'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}
      />
    </button>
  );
}
