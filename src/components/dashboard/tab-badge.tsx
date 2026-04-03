'use client'

import { useEffect } from 'react'

const BASE_TITLE = 'Dashboard'

/**
 * Updates the browser tab title with an alert count badge.
 * e.g. "(3) Dashboard" when there are 3 alerts.
 */
export function TabBadge({ count }: { count: number }) {
  useEffect(() => {
    document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [count])

  return null
}
