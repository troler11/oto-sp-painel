export default function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-200 rounded-l-2xl" />
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-100/80 to-transparent" />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 rounded-full w-3/4" />
          <div className="h-2.5 bg-slate-100 rounded-full w-1/2" />
        </div>
      </div>
      <div className="space-y-2 mb-4 border-l-2 border-slate-100 pl-2.5">
        <div className="h-2.5 bg-slate-100 rounded-full w-full" />
        <div className="h-2.5 bg-slate-100 rounded-full w-4/5" />
        <div className="h-2.5 bg-slate-100 rounded-full w-3/5" />
      </div>
      <div className="bg-slate-100 rounded-xl p-3 space-y-2 mb-4">
        <div className="h-2.5 bg-slate-200 rounded-full w-2/3" />
        <div className="h-2.5 bg-slate-200 rounded-full w-1/2" />
        <div className="h-2.5 bg-slate-200 rounded-full w-3/4" />
      </div>
      <div className="h-10 bg-slate-200 rounded-xl w-full" />
    </div>
  );
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}
