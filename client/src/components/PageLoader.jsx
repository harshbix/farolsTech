export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
        <div className="absolute inset-0 rounded-full border-2 border-t-brand-500 animate-spin" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-40 w-full rounded-lg" />
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-5/6" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}
