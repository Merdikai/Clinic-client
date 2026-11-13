import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse } from '../models/auth.model';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should initialize with default unauthenticated state if storage is empty', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.userRoles()).toEqual([]);
  });

  it('should update authenticated state, roles, and computed flags on auth success', () => {
    const mockAuthResponse: AuthResponse = {
      token: 'mock-jwt-token-header.payload.signature',
      refreshToken: 'mock-refresh-token',
      username: 'admin',
      email: 'admin@clinic.com',
      fullName: 'System Administrator',
      roles: ['Admin'],
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    (service as any).handleAuthSuccess(mockAuthResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe('mock-jwt-token-header.payload.signature');
    expect(service.isAdmin()).toBe(true);
    expect(service.isDoctor()).toBe(false);
    expect(service.hasRole('Admin')).toBe(true);
    expect(service.hasAnyRole(['Doctor', 'Admin'])).toBe(true);
    expect(service.currentUserName()).toBe('System Administrator');
  });

  it('should clear session on clearAuth', () => {
    const mockAuthResponse: AuthResponse = {
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
      username: 'dr.smith',
      email: 'dr.smith@clinic.com',
      fullName: 'Dr. John Smith',
      roles: ['Doctor'],
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    };

    (service as any).handleAuthSuccess(mockAuthResponse);
    expect(service.isAuthenticated()).toBe(true);

    service.clearAuth();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
  });
});
