'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-background-subtle rounded ${className}`}
    />
  );
}

export function ArrivalSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-6 rounded" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="w-16 h-6 ml-auto" />
        <Skeleton className="w-14 h-4 ml-auto" />
      </div>
    </div>
  );
}

export function StopCardSkeleton() {
  return (
    <div className="p-4 bg-background-elevated rounded-xl">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <Skeleton className="w-40 h-5" />
          <Skeleton className="w-24 h-4" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="w-10 h-6 rounded" />
        <Skeleton className="w-10 h-6 rounded" />
        <Skeleton className="w-10 h-6 rounded" />
      </div>
    </div>
  );
}

export function RouteCardSkeleton() {
  return (
    <div className="p-4 bg-background-elevated rounded-xl">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="w-12 h-10 rounded" />
        <div className="space-y-2 flex-1">
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-1/2 h-4" />
        </div>
      </div>
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="w-3/4 h-4" />
            <Skeleton className="w-1/2 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlertSkeleton() {
  return (
    <div className="p-4 bg-background-elevated rounded-xl">
      <div className="flex items-start gap-3">
        <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      </div>
    </div>
  );
}

