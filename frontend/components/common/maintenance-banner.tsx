import { TriangleAlert } from 'lucide-react'
import { SHOW_MAINTENANCE_BANNER } from '@/constants/common'

export function MaintenanceBanner() {
  if (!SHOW_MAINTENANCE_BANNER) return null

  return (
    <div className="w-full bg-amber-400 text-zinc-950">
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-center">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          The data stream behind this page is down, so live stats are
          unavailable. We are working to bring it back.{' '}
          <strong className="font-semibold underline underline-offset-2">
            This does not affect the Monad network.
          </strong>
        </span>
      </div>
    </div>
  )
}
