import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        router.navigate(['/login']);
      }
      if (error.status === 403) {
        console.error('Access denied');
      }
      if (error.status === 429) {
        console.error('Rate limit exceeded');
      }

      const detail = error.error?.detail || error.message;
      console.error(`API Error: ${detail}`);

      return throwError(() => error);
    })
  );
};
