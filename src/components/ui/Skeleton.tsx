interface SkeletonProps {
  className?: string
  dark?: boolean
}

export function Skeleton({ className = '', dark }: SkeletonProps) {
  return (
    <div
      className={`rounded-[14px] skeleton ${
        dark ? '' : 'opacity-60'
      } ${className}`}
    />
  )
}

export function CardSkeleton({ dark }: { dark?: boolean }) {
  return (
    <div className={`rounded-[18px] p-4 space-y-3 ${dark ? 'bg-slate' : 'bg-cream'}`}>
      <Skeleton dark={dark} className="h-40 w-full" />
      <Skeleton dark={dark} className="h-4 w-3/4" />
      <Skeleton dark={dark} className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton dark={dark} className="h-6 w-16" />
        <Skeleton dark={dark} className="h-6 w-16" />
      </div>
    </div>
  )
}
