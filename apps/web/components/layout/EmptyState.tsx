import Link from "next/link";
import { Inbox, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-12 text-center">
      <div className="flex justify-center mb-4">
        {icon ?? <Inbox className="h-12 w-12 text-muted-foreground/40" strokeWidth={1} />}
      </div>
      <h3 className="text-base font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="text-sm text-[var(--nv-text-tertiary)] mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button asChild size="sm">
          <Link href={actionHref}>
            {actionLabel}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
