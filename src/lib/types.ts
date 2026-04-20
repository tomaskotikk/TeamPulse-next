export type UserRole = 'manažer' | 'hráč' | 'trenér' | 'admin'

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  profile_picture: string | null
  role: UserRole
  organization: string | null
  two_factor_enabled: boolean
  created_at: string
  admin: boolean
}

export interface Club {
  id: number
  owner_user_id: number
  name: string
  sport: string | null
  city: string | null
  logo: string | null
  address: string | null
  ico: string | null
  dic: string | null
  website: string | null
  club_email: string | null
  club_phone: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  ui_gradient_enabled: boolean | null
  ui_gradient_strength: number | null
  ui_gradient_soft_strength: number | null
  ui_glow_strength: number | null
  ui_backdrop_blur_strength: number | null
  ui_motion_speed: number | null
  created_at: string
}

export interface ChatMessage {
  id: number
  club_id: number
  user_id: number
  message: string
  created_at: string
  updated_at: string
  user?: Pick<User, 'first_name' | 'last_name' | 'profile_picture' | 'role'>
}

export interface TeamInvitation {
  id: number
  token: string
  club_id: number
  inviter_user_id: number
  email: string
  role: UserRole
  expires_at: string
  used: boolean
}

export interface ClubColors {
  primary: string
  secondary: string
  accent: string
  redText: string // bílá nebo černá dle luminance
}
