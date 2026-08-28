import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-white/5 border-white/10 text-neutral-300',
  crimson: 'bg-[#ffffff]/10 border-[#ffffff]/20 text-[#ffffff]',
  amber: 'bg-[#a3a3a3]/10 border-[#a3a3a3]/20 text-[#a3a3a3]',
  teal: 'bg-[#404040]/10 border-[#404040]/20 text-[#404040]',
  purple: 'bg-[#ffffff]/10 border-[#ffffff]/20 text-[#ffffff]',
  positive: 'bg-[#ffffff]/10 border-[#ffffff]/20 text-[#ffffff]',
  negative: 'bg-[#ffffff]/10 border-[#ffffff]/20 text-[#ffffff]',
  neutral: 'bg-white/5 border-white/10 text-neutral-400',
  outline: 'bg-transparent border-white/20 text-white hover:bg-white/5',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

export function Chip({ children, variant = 'default', size = 'md', className, icon, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold border',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

export function SentimentChip({ label, compound }) {
  if (!label) return null;
  const variant = label === 'positive' ? 'positive' : label === 'negative' ? 'negative' : 'neutral';
  return (
    <Chip variant={variant} size="sm">
      {label.charAt(0).toUpperCase() + label.slice(1)}
      {compound !== undefined && (
        <span className="font-mono tnum ml-1">({Number(compound).toFixed(2)})</span>
      )}
    </Chip>
  );
}

export function GenreChip({ children, ...props }) {
  return <Chip variant="outline" size="sm" {...props}>{children}</Chip>;
}

export function EntityChip({ type, children, ...props }) {
  const variants = {
    PERSON: 'teal',
    LOCATION: 'amber',
    ORGANIZATION: 'purple',
    PRODUCT: 'crimson',
  };
  return <Chip variant={variants[type] || 'default'} size="sm" {...props}>{children}</Chip>;
}