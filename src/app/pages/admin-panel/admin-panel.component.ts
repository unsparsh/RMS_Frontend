import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeroService } from '../../hero.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent {
  isSidebarCollapsed = false;
  activeTab = 'Dashboard';

  // Toast
  showToastMsg = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Loading for create actions
  isCreating = false;

  constructor(private heroService: HeroService, private auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  sidebarSections = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', icon: 'fas fa-th-large' },
        { name: 'All Employees', icon: 'fas fa-users' }
      ]
    },
    {
      title: 'User Management',
      items: [
        { name: 'Create HR', icon: 'fas fa-user-shield' },
        { name: 'Create Leadership', icon: 'fas fa-crown' }
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Departments', icon: 'fas fa-sitemap' },
        { name: 'Settings', icon: 'fas fa-cog' }
      ]
    }
  ];

  // --- Dashboard Stats ---
  dashboardStats = {
    totalEmployees: 142,
    activeHRs: 6,
    leadershipRoles: 4,
    departments: 8,
    newHiresThisMonth: 12,
    attritionRate: 3.2
  };

  departmentDistribution = [
    { name: 'Engineering', count: 52, color: '#0B2265', percentage: 36.6 },
    { name: 'Design', count: 18, color: '#8B5CF6', percentage: 12.7 },
    { name: 'Product', count: 14, color: '#0088A8', percentage: 9.9 },
    { name: 'HR & Ops', count: 22, color: '#F59E0B', percentage: 15.5 },
    { name: 'Marketing', count: 16, color: '#EF4444', percentage: 11.3 },
    { name: 'Sales', count: 12, color: '#10B981', percentage: 8.5 },
    { name: 'Finance', count: 5, color: '#00C4F0', percentage: 3.5 },
    { name: 'Legal', count: 3, color: '#EC4899', percentage: 2.1 }
  ];

  monthlyHiringData = [
    { month: 'Oct', hires: 8 },
    { month: 'Nov', hires: 12 },
    { month: 'Dec', hires: 5 },
    { month: 'Jan', hires: 15 },
    { month: 'Feb', hires: 10 },
    { month: 'Mar', hires: 12 }
  ];

  recentActivity = [
    { action: 'New HR account created', user: 'Sneha Patel', time: '2 hours ago', icon: 'fas fa-user-shield', color: '#0B2265' },
    { action: 'Leadership role assigned', user: 'Vikram Joshi', time: '5 hours ago', icon: 'fas fa-crown', color: '#F59E0B' },
    { action: 'Employee onboarded', user: 'Rohit Mehta', time: '1 day ago', icon: 'fas fa-user-plus', color: '#10B981' },
    { action: 'Department restructured', user: 'Admin', time: '2 days ago', icon: 'fas fa-sitemap', color: '#8B5CF6' },
    { action: 'New HR account created', user: 'Priya Nair', time: '3 days ago', icon: 'fas fa-user-shield', color: '#0B2265' }
  ];

  // --- Employees ---
  employeeSearchQuery = '';
  employees = [
    { id: 'E001', name: 'Rajesh Kumar', department: 'Engineering', role: 'Engineering Manager', avatar: 'RK', status: 'Active', joinDate: '2024-03-15', email: 'rajesh.k@adnate.com' },
    { id: 'E002', name: 'Priya Sharma', department: 'Engineering', role: 'Senior Developer', avatar: 'PS', status: 'Active', joinDate: '2024-06-20', email: 'priya.s@adnate.com' },
    { id: 'E003', name: 'Amit Verma', department: 'Engineering', role: 'Tech Lead', avatar: 'AV', status: 'Active', joinDate: '2023-01-10', email: 'amit.v@adnate.com' },
    { id: 'E004', name: 'Sneha Patel', department: 'HR & Ops', role: 'HR Business Partner', avatar: 'SP', status: 'Active', joinDate: '2023-08-01', email: 'sneha.p@adnate.com' },
    { id: 'E005', name: 'Vikram Joshi', department: 'Product', role: 'Product Manager', avatar: 'VJ', status: 'On Leave', joinDate: '2024-01-05', email: 'vikram.j@adnate.com' },
    { id: 'E006', name: 'Neha Gupta', department: 'Design', role: 'Design Lead', avatar: 'NG', status: 'Active', joinDate: '2024-02-14', email: 'neha.g@adnate.com' },
    { id: 'E007', name: 'Ravi Singh', department: 'Marketing', role: 'Marketing Head', avatar: 'RS', status: 'Active', joinDate: '2023-11-20', email: 'ravi.s@adnate.com' },
    { id: 'E008', name: 'Kavita Menon', department: 'Sales', role: 'Sales Executive', avatar: 'KM', status: 'Active', joinDate: '2025-01-08', email: 'kavita.m@adnate.com' },
    { id: 'E009', name: 'Arjun Reddy', department: 'Finance', role: 'Finance Analyst', avatar: 'AR', status: 'Inactive', joinDate: '2023-05-15', email: 'arjun.r@adnate.com' },
    { id: 'E010', name: 'Meera Joshi', department: 'Engineering', role: 'Full Stack Developer', avatar: 'MJ', status: 'Active', joinDate: '2025-03-01', email: 'meera.j@adnate.com' }
  ];

  get filteredEmployees() {
    if (!this.employeeSearchQuery.trim()) return this.employees;
    const q = this.employeeSearchQuery.toLowerCase();
    return this.employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    );
  }

  // --- Create HR ---
  showCreateHRModal = false;
  newHR = { name: '', email: '', department: 'HR & Ops', phone: '' };

  openCreateHRModal() {
    this.showCreateHRModal = true;
    this.newHR = { name: '', email: '', department: 'HR & Ops', phone: '' };
  }

  closeCreateHRModal() {
    this.showCreateHRModal = false;
  }

  createHR() {
    if (!this.newHR.name || !this.newHR.email) {
      this.showToast('Please fill in all required fields.', 'error');
      return;
    }

    this.isCreating = true;
    this.heroService.createUserInOrganization({
      userName: this.newHR.email,
      description: this.newHR.name,
      userId: this.newHR.email,
      password: 'a1b2c3',
      role: 'HR_RMS'
    }).then((resp: any) => {
      console.log('HR user created in Cordys:', resp);
      const initials = this.newHR.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
      this.employees.push({
        id: 'E0' + (this.employees.length + 1),
        name: this.newHR.name,
        department: this.newHR.department,
        role: 'HR Manager',
        avatar: initials,
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0],
        email: this.newHR.email
      });
      this.recentActivity.unshift({
        action: 'New HR account created',
        user: this.newHR.name,
        time: 'Just now',
        icon: 'fas fa-user-shield',
        color: '#0B2265'
      });
      this.dashboardStats.activeHRs++;
      this.dashboardStats.totalEmployees++;
      this.isCreating = false;
      this.closeCreateHRModal();
      this.showToast('HR account created successfully!', 'success');
    }).catch((err: any) => {
      console.error('Failed to create HR user in Cordys:', err);
      this.isCreating = false;
      this.showToast('Failed to create HR account. Please try again.', 'error');
    });
  }

  // --- Create Leadership ---
  showCreateLeadershipModal = false;
  newLeader = { name: '', email: '', department: 'Engineering', role: '', phone: '' };

  openCreateLeadershipModal() {
    this.showCreateLeadershipModal = true;
    this.newLeader = { name: '', email: '', department: 'Engineering', role: '', phone: '' };
  }

  closeCreateLeadershipModal() {
    this.showCreateLeadershipModal = false;
  }

  createLeadership() {
    if (!this.newLeader.name || !this.newLeader.email || !this.newLeader.role) {
      this.showToast('Please fill in all required fields.', 'error');
      return;
    }

    this.isCreating = true;
    this.heroService.createUserInOrganization({
      userName: this.newLeader.email,
      description: this.newLeader.name,
      userId: this.newLeader.email,
      password: 'a1b2c3',
      role: 'Leadership_RMS'
    }).then((resp: any) => {
      console.log('Leadership user created in Cordys:', resp);
      const initials = this.newLeader.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
      this.employees.push({
        id: 'E0' + (this.employees.length + 1),
        name: this.newLeader.name,
        department: this.newLeader.department,
        role: this.newLeader.role,
        avatar: initials,
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0],
        email: this.newLeader.email
      });
      this.recentActivity.unshift({
        action: 'Leadership role assigned',
        user: this.newLeader.name,
        time: 'Just now',
        icon: 'fas fa-crown',
        color: '#F59E0B'
      });
      this.dashboardStats.leadershipRoles++;
      this.dashboardStats.totalEmployees++;
      this.isCreating = false;
      this.closeCreateLeadershipModal();
      this.showToast('Leadership role created successfully!', 'success');
    }).catch((err: any) => {
      console.error('Failed to create Leadership user in Cordys:', err);
      this.isCreating = false;
      this.showToast('Failed to create leadership role. Please try again.', 'error');
    });
  }

  get maxHires() {
    return Math.max(...this.monthlyHiringData.map(d => d.hires));
  }

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastMsg = true;
    setTimeout(() => {
      this.showToastMsg = false;
    }, 4000);
  }
}

