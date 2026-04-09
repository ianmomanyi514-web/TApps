import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  sponsored?: boolean;
  onMore?: () => void;
}

const SectionHeader = ({ title, subtitle, sponsored, onMore }: SectionHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <div>
        {sponsored && (
          <p className="text-xs text-muted-foreground mb-0.5">
            <span>Sponsored · </span>
            <span className="font-semibold text-foreground">{title}</span>
          </p>
        )}
        {!sponsored && (
          <p className="font-bold text-foreground text-base">{title}</p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {onMore && (
        <button
          onClick={onMore}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors"
        >
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
};

export default SectionHeader;
