import { cn } from '../../lib/utils';

export function Card({ className, variant = 'default', children, ...props }) {
  const variants = {
    default: 'ui-card',
    elevated: 'ui-card ui-card-hover',
    'film-strip': 'ui-card ui-card--top',
  };
  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-b border-white/5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-t border-white/5 bg-white/[0.02]', className)} {...props}>
      {children}
    </div>
  );
}