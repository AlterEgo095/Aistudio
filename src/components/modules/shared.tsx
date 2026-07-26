'use client'

import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      role="status"
      aria-label="Chargement"
    />
  )
}

export function LoadingOverlay({ label = 'Traitement en cours...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <Spinner className="h-8 w-8 text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
