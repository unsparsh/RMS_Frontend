import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';

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

  constructor(private heroService: HeroService) {}

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
              type: 'Full-time',
              department: j.department,
              salary: j.salary_range || 'Competitive',
              posted: this.calculateTimeAgo(j.created_at),
              description: j.job_description
            };
          }).filter((j: any) => j.id); // Filter out any empty mappings

          this.filteredJobs = [...this.jobs];
        }
      })
      .catch(err => {
        console.error('Error loading jobs', err);
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
    console.log('Applied for job:', jobId);
    // TODO: Integrate with backend to apply
    alert(`Applying for Job ID: ${jobId}`);
  }
}
