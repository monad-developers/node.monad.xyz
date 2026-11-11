import { TriangleAlert } from 'lucide-react'
import { publicEnv } from '@/config/env'
import {
  MAINTENANCE_BANNER_HIGHLIGHT,
  MAINTENANCE_BANNER_MESSAGE,
} from '@/constants/common'

export function MaintenanceBanner() {
  if (!publicEnv.SHOW_MAINTENANCE_BANNER) return null

  return (
    <div className="w-full bg-amber-400 text-zinc-950">
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-center">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {MAINTENANCE_BANNER_MESSAGE}{' '}
          <strong className="font-semibold underline underline-offset-2">
            {MAINTENANCE_BANNER_HIGHLIGHT}
          </strong>
        </span>
      </div>
    </div>
  )
}
