type BadgeVariant = 'default' | 'pending' | 'preparing' | 'completed' | 'soldout';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  soldout: 'bg-red-100 text-red-800',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export default function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
