import DashboardLayout from '@/components/DashboardLayout'
import Topbar from '@/components/Topbar'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAppUser, getThemeVars } from '@/lib/app-context'
import { createAdminClient } from '@/lib/supabase/server'
import {
  canManageAttendance,
  eventHasStarted,
  getAttendanceSubject,
  getEventForUser,
  getInviteeIdsForEvents,
  withMemberResponses,
} from '@/lib/attendance'
import EventDetail from './EventDetail'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')

  const eventId = Number.parseInt((await params).id, 10)
  if (!Number.isInteger(eventId)) notFound()

  const supabase = await createAdminClient()
  const found = await getEventForUser(supabase, user, eventId)
  if (!found) notFound()
  const { event, club } = found

  const subject = await getAttendanceSubject(user)
  const invited = (await getInviteeIdsForEvents(supabase, club, [eventId])).get(eventId) ?? new Set<number>()
  const subjectInvited = subject.memberId !== null && invited.has(subject.memberId)

  const [withResponse] = await withMemberResponses([event], subject.memberId ?? -1)

  let reason: string | null = null
  if (subjectInvited) {
    const { data } = await supabase
      .from('event_attendance')
      .select('response_reason')
      .eq('event_id', eventId)
      .eq('user_id', subject.memberId!)
      .maybeSingle()
    reason = data?.response_reason ?? null
  }

  return (
    <DashboardLayout user={user} isManager={user.role === 'manažer'} themeVars={getThemeVars(club)}>
      <Topbar title="Událost" backHref="/events" backLabel="Kalendář" />
      <div className="app-content event-detail-page">
        <EventDetail
          event={withResponse}
          reason={reason}
          started={eventHasStarted(event)}
          canRespond={subjectInvited}
          subjectId={subject.memberId}
          subjectName={user.role === 'rodič' ? subject.memberName : null}
          canManage={canManageAttendance(user)}
        />
      </div>
    </DashboardLayout>
  )
}
