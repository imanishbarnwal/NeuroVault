/** Reusable skeleton loading components for async data. */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer h-4 rounded bg-slate-800 ${className}`} />
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded-xl border border-slate-800 bg-slate-900/50 p-5 ${className}`}>
      <div className="h-3 w-24 rounded bg-slate-800 mb-3" />
      <div className="h-8 w-16 rounded bg-slate-800 mb-2" />
      <div className="h-3 w-20 rounded bg-slate-800" />
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded-xl border border-slate-800 bg-slate-900/50 p-6 ${className}`}>
      <div className="w-12 h-12 rounded-lg bg-slate-800 mb-4" />
      <div className="h-4 w-28 rounded bg-slate-800 mb-2" />
      <div className="h-3 w-full rounded bg-slate-800 mb-1" />
      <div className="h-3 w-3/4 rounded bg-slate-800" />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-slate-800 flex-shrink-0 skeleton-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-slate-800 skeleton-shimmer" />
        <div className="h-3 w-48 rounded bg-slate-800 skeleton-shimmer" />
      </div>
      <div className="space-y-2 flex-shrink-0">
        <div className="h-4 w-16 rounded bg-slate-800 skeleton-shimmer ml-auto" />
        <div className="h-3 w-20 rounded bg-slate-800 skeleton-shimmer" />
      </div>
    </div>
  );
}

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded-xl border border-slate-800 bg-slate-900/50 p-6 ${className}`}>
      <div className="h-4 w-32 rounded bg-slate-800 mb-4" />
      <div className="h-48 rounded bg-slate-800/50 flex items-end justify-around px-4 pb-4 gap-2">
        {[40, 65, 45, 80, 60, 90, 55].map((h, i) => (
          <div key={i} className="w-full rounded-t bg-slate-800" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
