import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function ToolCard({
  title,
  description,
  icon: Icon,
  children,
  className = "",
}: ToolCardProps) {
  return (
    <div
      className={`bg-card rounded-2xl border shadow-soft p-6 transition-all duration-300 hover:shadow-elevated animate-in-up ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl gradient-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
