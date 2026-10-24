export type EventType = 'training' | 'match' | 'meeting' | 'event'
export type Response = 'yes' | 'no' | null

export type Me = {
  user: {
    id: number
    first_name: string
    last_name: string
    email: string
    phone: string | null
    role: string
    dateBirth: string | null
    avatar: string | null
  }
  club: {
    id: number
    name: string
    sport: string | null
    city: string | null
    logo: string | null
    primary_color: string
    secondary_color: string
  }
  children: Array<{ id: number; first_name: string; last_name: string; avatar: string | null }>
  selectedChildId: number | null
}

export type ClubEvent = {
  id: number
  type: EventType
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  response: Response
  categories: Array<{ name: string; color: string }>
}

export type AttendanceRow = {
  user: { id: number; first_name: string; last_name: string; profile_picture: string | null }
  response: Response
  reason: string | null
  responded_by_parent: boolean
  attended: 'present' | 'absent' | 'excused' | null
}

export type AttendanceData = {
  started: boolean
  summary: { invited: number; yes: number; no: number; pending: number }
  rows: AttendanceRow[]
}

export type ChatMessage = {
  id: number
  user_id: number
  message: string
  created_at: string
  first_name: string | null
  last_name: string | null
  role: string | null
  profile_picture: string | null
}
