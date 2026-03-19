import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    // Check if user has admin role stored from the login flow
    const role = sessionStorage.getItem('userRole');
    if (role && role.toLowerCase() === 'admin') {
      return true;
    }

    // Not an admin — redirect to login
    console.warn('AdminGuard: Access denied. Role =', role);
    this.router.navigate(['/login']);
    return false;
  }
}
