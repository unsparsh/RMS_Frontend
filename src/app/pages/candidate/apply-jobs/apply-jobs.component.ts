import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';
import { AuthService } from '../../../auth.service';
import { ToastService } from '../../../toast.service';

@Component({
  selector: 'app-apply-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apply-jobs.component.html',
  styleUrls: ['./apply-jobs.component.css']
})
export class ApplyJobsComponent implements OnInit {
  searchQuery = '';
  jobs: any[] = [];
  filteredJobs: any[] = [];

  // Confirmation modal state
  showConfirmModal = false;
  confirmJobId = '';
  confirmJobTitle = '';

  constructor(
    private heroService: HeroService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.heroService.showAllJobRequisition()
      .then(resp => {
        // Attempt to find the array of tuples or job requisitions
        let rawData = this.heroService.xmltojson(resp, 'tuple');
        if (!rawData) {
          rawData = this.heroService.xmltojson(resp, 'job_requisition');
        }

        if (rawData) {
          const dataArray = Array.isArray(rawData) ? rawData : [rawData];
          this.jobs = dataArray.map((item: any) => {
            // Data could be in item.old.job_requisition (standard Cordys tuple)
            // or directly in item if xmltojson found job_requisition array
            const j = item.old?.job_requisition || item.job_requisition || item;
            
            return {
              id: j.jr_id,
              title: j.job_title,
              company: 'RMS',
              location: j.location,
              type: j.status || 'Active', // Mapping status here
              department: j.department,
              salary: j.salary_range || 'Competitive',
              posted: this.calculateTimeAgo(j.created_at),
              description: j.job_description
            };
          }).filter((j: any) => j.id && j.type?.toLowerCase() === 'active'); // Filter for Active marks

          this.filteredJobs = [...this.jobs];
        }
      })
      .catch(err => {
        console.error('Error loading jobs', err);
        this.toast.error('Failed to load job listings. Please try again.');
      });
  }

  calculateTimeAgo(dateStr: string): string {
    if (!dateStr) return 'Just now';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  }

  filterJobs(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredJobs = this.jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q)
    );
  }

  applyForJob(jobId: string): void {
    const candidateId = this.authService.getCandidateId();
    if (!candidateId) {
      this.toast.error('Candidate ID not found. Please log in again.');
      return;
    }

    // Find the job title for the confirmation modal
    const job = this.filteredJobs.find(j => j.id === jobId);
    this.confirmJobTitle = job?.title || 'this job';
    this.confirmJobId = jobId;
    this.showConfirmModal = true;
  }

  cancelApply(): void {
    this.showConfirmModal = false;
    this.confirmJobId = '';
    this.confirmJobTitle = '';
  }

  confirmApply(): void {
    this.showConfirmModal = false;
    const candidateId = this.authService.getCandidateId();
    const jobId = this.confirmJobId;
    this.confirmJobId = '';
    this.confirmJobTitle = '';

    // STEP 1: CHECK FOR DUPLICATE APPLICATION
    this.heroService.getApplicationByCandidateAndJR(candidateId, jobId)
      .then(resp => {
        const existingApp = this.heroService.xmltojson(resp, 'candidate_job_application');
        
        // STEP 2: ANALYZE RESPONSE
        if (existingApp) {
          // DUPLICATE EXISTS
          const response = {
            status: "duplicate",
            message: "You have already applied for this job."
          };
          console.log(JSON.stringify(response, null, 2));
          this.toast.warning(response.message);
          return;
        }

        // NO DUPLICATE - STEP 3: CREATE NEW APPLICATION
        const applicationData = {
          candidate_id: candidateId,
          jr_id: jobId,
          application_status: 'APPLIED',
          applied_at: new Date().toISOString(),
          stage: 'Applied'
        };

        this.heroService.updateCandidateJobApplication(applicationData)
          .then(() => {
            // SUCCESS RESPONSE - STEP 4
            const response = {
              status: "success",
              message: "Application submitted successfully."
            };
            console.log(JSON.stringify(response, null, 2));
            this.toast.success(response.message);
          })
          .catch(err => {
            console.error('Error applying for job:', err);
            const response = {
              status: "error",
              message: "Something went wrong. Please try again later."
            };
            console.log(JSON.stringify(response, null, 2));
            this.toast.error(response.message);
          });
      })
      .catch(err => {
        console.error('Error checking duplicate application:', err);
        const response = {
          status: "error",
          message: "Something went wrong. Please try again later."
        };
        console.log(JSON.stringify(response, null, 2));
        this.toast.error(response.message);
      });
  }
}

