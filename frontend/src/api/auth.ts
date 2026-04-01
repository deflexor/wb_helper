import { apiPostJson } from '@/api/client'
import type { AuthResponse, LoginBody, RegisterBody } from '@/api/types'

export async function login(body: LoginBody): Promise<AuthResponse> {
  return apiPostJson<AuthResponse>('/api/auth/login', body)
}

export async function register(body: RegisterBody): Promise<AuthResponse> {
  return apiPostJson<AuthResponse>('/api/auth/register', body)
}
