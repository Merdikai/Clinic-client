import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const activeRole = permissionService.activeRole();
    if (activeRole && allowedRoles.some(r => r.toLowerCase() === activeRole.toLowerCase())) {
      return true;
    }

    if (!activeRole && authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
};
