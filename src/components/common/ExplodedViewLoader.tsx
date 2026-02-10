import { cn } from '@/lib/utils'

export default function ExplodedViewLoader() {
  return (
    <div className={cn(
      'absolute inset-0 flex flex-col items-center justify-center gap-4',
      'bg-transparent'
    )}>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      <p className="font-sans text-sm text-zinc-500">
        Laddar 3D-modell...
      </p>
    </div>
  )
}
