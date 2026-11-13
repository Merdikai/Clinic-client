import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();
  const isApiRequest = req.url.startsWith(environment.apiUrl) || req.url.startsWith('/api');

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  req = req.clone({
    withCredentials: isApiRequest ? true : req.withCredentials,
    setHeaders: headers
  });

  return next(req);
};
