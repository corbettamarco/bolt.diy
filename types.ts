export type Profile = {
  id: string
  created_at: string
  email: string
  full_name: string
  role: 'user' | 'owner'
  avatar_url?: string
}

export type Equipment = {
  id: string
  owner_id: string
  name: string
  description: string
  category: string
  price_hour: number
  price_day: number
  price_week: number
  price_month: number
  location: string
  tracking_type: 'bulk' | 'serial'
  serial_code?: string
  quantity?: number
  images: string[]
  status: 'available' | 'rented' | 'repair'
  features?: string[]
}

export type Rental = {
  id: string
  equipment_id: string
  user_id: string
  start_date: string
  end_date: string
  total_price: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
}

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  encrypted_content: string
  created_at: string
  read: boolean
  type: 'text' | 'image' | 'document'
  metadata?: Record<string, any>
}

export type Conversation = {
  id: string
  participant1_id: string
  participant2_id: string
  created_at: string
  updated_at: string
  last_message_id?: string
}

export type Notification = {
  id: string
  user_id: string
  type: 'message' | 'system' | 'rental'
  title: string
  body: string
  read: boolean
  created_at: string
  metadata?: Record<string, any>
}

export type Review = {
  id: string
  reviewer_id: string
  target_id: string
  equipment_id?: string
  rating: number
  comment: string
  created_at: string
}
