import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, filter, take, BehaviorSubject } from 'rxjs';
import { ToastService } from '../ui/toast/toast.service';
import { AuthService } from '../services/auth.service';
import { extractProblemDetailsMessage } from '../models/api.model';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const errorMessage = extractProblemDetailsMessage(error.error);

      const isAuthEndpoint =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/register') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/csrf') ||
        req.url.includes('/auth/logout') ||
        req.url.includes('/auth/forgot-password') ||
        req.url.includes('/auth/reset-password');

      // 401 Unauthorized Handling with Silent HttpOnly Cookie Refresh Token Retry
      if (error.status === 401) {
        if (!isAuthEndpoint && authService.hasRefreshSession()) {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshTokenSubject.next(null);

            return authService.refreshToken().pipe(
              switchMap((res) => {
                isRefreshing = false;
                refreshTokenSubject.next(res.token);
                return next(
                  req.clone({
                    withCredentials: true,
                    setHeaders: {
                      Authorization: `Bearer ${res.token}`
                    }
                  })
                );
              }),
              catchError((refreshErr: unknown) => {
                isRefreshing = false;
                authService.clearAuth();
                toast.error('Session expired. Please log in again.');
                router.navigate(['/login']);
                return throwError(() => refreshErr);
              })
            );
          }

          return refreshTokenSubject.pipe(
            filter((token): token is string => token !== null),
            take(1),
            switchMap((token) =>
              next(
                req.clone({
                  withCredentials: true,
                  setHeaders: {
                    Authorization: `Bearer ${token}`
                  }
                })
              )
            )
          );
        } else if (!isAuthEndpoint) {
          authService.clearAuth();
          toast.error('Session expired. Please log in again.');
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        toast.error('Access denied. You do not have permission.');
      } else if (error.status === 409) {
        toast.warning(errorMessage || 'Conflict detected. Record may have been updated by another user.');
      } else if (error.status === 423) {
        toast.error(errorMessage || 'Account is temporarily locked due to repeated failed attempts.');
      } else if (error.status === 429) {
        toast.warning('Too many requests. Please slow down.');
      } else if (error.status >= 400 && error.status < 500) {
        if (!isAuthEndpoint) {
          toast.error(errorMessage);
        }
      } else if (error.status >= 500) {
        toast.error('Server error. Please try again later.');
      }

      return throwError(() => error);
    })
  );
};
