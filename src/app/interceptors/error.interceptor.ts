import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, filter, take, BehaviorSubject } from 'rxjs';
import { ToastService } from '../ui/toast/toast.service';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred.';

      if (error.error) {
        // RFC 7807 ProblemDetails parsing
        if (typeof error.error === 'object') {
          if (error.error.detail) {
            errorMessage = error.error.detail;
          } else if (error.error.title) {
            errorMessage = error.error.title;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }

          // Validation errors dictionary
          if (error.error.errors && typeof error.error.errors === 'object') {
            const firstKey = Object.keys(error.error.errors)[0];
            if (firstKey && Array.isArray(error.error.errors[firstKey])) {
              errorMessage = error.error.errors[firstKey][0];
            }
          }
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }
      }

      const isAuthEndpoint =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/register') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/forgot-password') ||
        req.url.includes('/auth/reset-password');

      // 401 Unauthorized Handling with Silent Refresh Token Retry
      if (error.status === 401) {
        if (!isAuthEndpoint && authService.getRefreshToken()) {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshTokenSubject.next(null);

            return authService.refreshToken().pipe(
              switchMap((res) => {
                isRefreshing = false;
                refreshTokenSubject.next(res.token);
                return next(
                  req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${res.token}`
                    }
                  })
                );
              }),
              catchError((refreshErr) => {
                isRefreshing = false;
                authService.clearAuth();
                toast.error('Session expired. Please log in again.');
                router.navigate(['/login']);
                return throwError(() => refreshErr);
              })
            );
          } else {
            // Queue concurrent requests while token refresh is in progress
            return refreshTokenSubject.pipe(
              filter((token) => token !== null),
              take(1),
              switchMap((token) =>
                next(
                  req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${token}`
                    }
                  })
                )
              )
            );
          }
        } else if (!isAuthEndpoint) {
          authService.clearAuth();
          toast.error('Session expired. Please log in again.');
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        toast.error('Access denied. You do not have permission.');
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
