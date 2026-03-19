import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { HeroService } from '../../hero.service';

declare var $: any;

// Role to route mapping — add more roles as needed
const ROLE_ROUTES: { [key: string]: { route: string; displayName: string } } = {
  Admin_RMS: { route: '/admin', displayName: 'Admin' },
  Leadership_RMS: { route: '/leadership-dashboard', displayName: 'Leadership' },
  HR_RMS: { route: '/hr-panel', displayName: 'HR' },
  Candidate_RMS: { route: '/candidate', displayName: 'Candidate' },
  Employee_RMS: { route: '/employee-dashboard', displayName: 'Employee' },
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginType: 'candidate' | 'employee' = 'candidate';
  email = '';
  empId = '';
  password = '';
  showPassword = false;
  rememberMe = false;
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private auth: AuthService,
    private heroService: HeroService
  ) { }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Get the redirect route based on user role
  private getRouteForRole(roles: string[]): { route: string; displayName: string } | null {
    for (const role of roles) {
      const trimmedRole = role.trim();
      if (ROLE_ROUTES[trimmedRole]) {
        return ROLE_ROUTES[trimmedRole];
      }
    }
    return null;
  }

  // Fetch user roles after authentication and redirect accordingly
  private async fetchUserRolesAndRedirect(username: string): Promise<void> {
    try {
      const resp: any = await this.heroService.ajax(
        'GetUserDetails',
        'http://schemas.cordys.com/UserManagement/1.0/Organization',
        { UserName: username }
      );

      console.log('GetUserDetails response:', resp);

      // Extract roles from response
      let roles: string[] = [];
      const roleData = this.heroService.xmltojson(resp, 'Role');
      console.log('GetUserDetails roleData:', roleData);

      // Helper to extract the text content from a role object
      const extractRoleText = (r: any): string => {
        if (typeof r === 'string') return r;
        if (r?.text) return r.text;
        if (r?.['#text']) return r['#text'];
        if (r?.['$t']) return r['$t'];
        if (r?.Description) return r.Description;
        // Last resort: stringify and return
        return String(r);
      };

      if (roleData) {
        if (Array.isArray(roleData)) {
          roles = roleData.map((r: any) => extractRoleText(r));
        } else {
          roles = [extractRoleText(roleData)];
        }
      }

      // Fallback: if roles are empty or just [object Object], scan the full response string
      if (roles.length === 0 || roles.every(r => r === '[object Object]')) {
        console.warn('Role extraction via xmltojson failed. Scanning full response string...');
        const fullStr = JSON.stringify(resp);
        const knownRoles = Object.keys(ROLE_ROUTES);
        roles = knownRoles.filter(role => fullStr.includes(role));
      }

      console.log('User roles:', roles);

      // Store user info
      sessionStorage.setItem('displayName', username);
      sessionStorage.setItem('employeeId', username);
      sessionStorage.setItem('userRoles', JSON.stringify(roles));

      // Find matching route for the user's role
      const roleRoute = this.getRouteForRole(roles);

      if (roleRoute) {
        console.log('Role matched:', roleRoute.displayName, '→', roleRoute.route);
        sessionStorage.setItem('userRole', roleRoute.displayName);
        this.auth.setAuthenticated(true);
        this.loading = false;
        this.router.navigate([roleRoute.route]);
      } else {
        // No matching role — redirect to landing page
        console.warn('No matching role found. User roles:', roles, '. Redirecting to /');
        this.loading = false;
        this.router.navigate(['/']);
      }
    } catch (e) {
      console.error('Failed to fetch user roles:', e);
      // Redirect to landing page on error
      this.loading = false;
      this.router.navigate(['/']);
    }
  }

  // Perform Cordys SSO authentication
  private authenticateWithCordys(username: string, password: string): void {
    try {
      $.cordys.authentication.sso
        .authenticate(username, password)
        .done((resp: any) => {
          console.log('Cordys SSO authenticate done:', resp);
          // Store employee ID immediately on successful auth
          sessionStorage.setItem('employeeId', username);
          // After successful authentication, fetch user roles to determine redirect
          this.fetchUserRolesAndRedirect(username);
        })
        .fail((err: any) => {
          console.error('Cordys SSO authenticate failed:', err);
          this.loading = false;
          this.errorMessage = 'Authentication failed. Please check your credentials.';
        });
    } catch (e) {
      console.error('Cordys SSO error:', e);
      this.loading = false;
      this.errorMessage = 'Authentication service is not available. Please try again later.';
    }
  }

  // Called when the form is submitted
  onLogin(): void {
    this.errorMessage = '';
    this.loading = true;

    // Determine login identifier based on login type
    const username = this.loginType === 'employee' ? this.empId.trim() : this.email.trim();

    // Validate inputs
    if (!username || !this.password.trim()) {
      this.loading = false;
      this.errorMessage = this.loginType === 'employee'
        ? 'Please enter both Employee ID and password.'
        : 'Please enter both email and password.';
      return;
    }

    // Authenticate with Cordys SSO
    this.authenticateWithCordys(username, this.password);
  }
}
