import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      console.warn('RoleGuard: Not authenticated. Redirecting to /login');
      this.router.navigate(['/login']);
      return false;
    }

    // If route has specific allowed roles, check them
    const allowedRoles: string[] = route.data?.['roles'] || [];
    if (allowedRoles.length > 0) {
      const userRole = (sessionStorage.getItem('userRole') || '').toLowerCase();
      const hasAccess = allowedRoles.some(r => r.toLowerCase() === userRole);
      if (!hasAccess) {
        console.warn('RoleGuard: Role', userRole, 'not in allowed roles', allowedRoles, '. Redirecting to /');
        this.router.navigate(['/']);
        return false;
      }
    }

    return true;
  }
}
