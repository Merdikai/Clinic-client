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
  token: string;
  refreshToken?: string;
  username: string;
  fullName: string;
  roles: string[];
  expiresAt?: string;
}

export interface UserInfo {
  username: string;
  email?: string;
  fullName: string;
  roles: string[];
  token?: string;
}
