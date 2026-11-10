import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { environment } from '../../environments/environment';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    // In production, strictly enforce verified token roles
    if (environment.production) {
      if (authService.hasAnyRole(allowedRoles)) {
        return true;
      }
      router.navigate(['/403']);
      return false;
    }

    // In development / staging preview mode, allow persona simulation
    const activeRole = permissionService.activeRole();
    if (activeRole && allowedRoles.some(r => r.toLowerCase() === activeRole.toLowerCase())) {
      return true;
    }

    if (authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    router.navigate(['/403']);
    return false;
  };
};
