import { cn } from '@/lib/utils';

interface AppIconProps {
  icon: string;
  iconBg: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12 rounded-[14px] text-base',
  md: 'w-16 h-16 rounded-[18px] text-xl',
  lg: 'w-20 h-20 rounded-[22px] text-2xl',
  xl: 'w-24 h-24 rounded-[26px] text-3xl',
};

const AppIcon = ({ icon, iconBg, name, size = 'md', className }: AppIconProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0 font-bold text-white shadow-sm',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: iconBg }}
      title={name}
    >
      {icon.length <= 3 ? (
        <span>{icon}</span>
      ) : (
        <span className="text-2xl">{icon}</span>
      )}
    </div>
  );
};

export default AppIcon;
