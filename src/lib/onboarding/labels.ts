import type { ApplicationStatus } from '@/lib/onboarding/applications'

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending_manager: 'Čeká na schválení',
  pending_parent: 'Čeká na rodiče',
  completed: 'Dokončeno',
  rejected: 'Zamítnuto',
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })
}
