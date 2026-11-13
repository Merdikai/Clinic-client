export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface AuthResponse {
  id?: string;
  userId?: string;
  token: string;
  refreshToken?: string;
  username: string;
  fullName: string;
  roles: string[];
  expiresAt?: string;
}

export interface UserInfo {
  id?: string;
  userId?: string;
  username: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  fullName: string;
  roles: string[];
  token?: string;
}
