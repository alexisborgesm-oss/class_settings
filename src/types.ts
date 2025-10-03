
export type Role = 'super_admin' | 'admin' | 'Instructor' | 'PA' | 'standard'

export type User = {
  id: string
  username: string
  display_name: string
  role: Role
  password: string
  created_at: string
}

export type Class = {
  id: number
  name: string
  created_at: string
}

export type InstructorClass = {
  instructor_id: string
  class_id: number
  created_at: string
}

export type PropItem = {
  id: number
  name: string
  created_at: string
}

export type ClassProp = {
  id: number
  class_id: number
  instructor_id: string
  prop_id: number
}

export type ClassImage = {
  id: number
  class_id: number
  instructor_id: string
  url: string
  created_at: string
}

export type ClassNote = {
  id: number
  class_id: number
  instructor_id: string
  note: string
  updated_at: string
}
