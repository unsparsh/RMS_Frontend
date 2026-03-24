import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../hero.service';

@Component({
  selector: 'app-career',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './career.component.html',
  styleUrls: ['./career.component.css']
})
export class CareerComponent implements OnInit {
  jobs: any[] = [];
  filteredJobs: any[] = [];
  searchQuery = '';
  loading = true;
  isLoggedIn = false;

  constructor(private heroService: HeroService) { }

  ngOnInit() {
    this.isLoggedIn = sessionStorage.getItem('isAuthenticated') === 'true';
    this.fetchJobs();
  }

  fetchJobs() {
    this.loading = true;
    this.heroService.showAllJobRequisition()
      .then((response: any) => {
        const jobData = this.heroService.xmltojson(response, 'job_requisition');
        if (jobData) {
          const rawJobs = Array.isArray(jobData) ? jobData : [jobData];
          this.jobs = rawJobs
            .filter((j: any) => j.status?.toLowerCase() === 'active')
            .map((j: any) => ({
              id: j.jr_id || '',
              title: j.job_title || 'Untitled Position',
              company: j.department || 'Adnate IT Solutions',
              location: j.location || 'Remote',
              type: j.status || 'Full-time'
            }));
          this.filteredJobs = [...this.jobs];
        }
        this.loading = false;
      })
      .catch((err: any) => {
        console.error('Error fetching jobs:', err);
        this.loading = false;
      });
  }

  filterJobs() {
    const query = this.searchQuery.toLowerCase();
    this.filteredJobs = this.jobs.filter(job => 
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query)
    );
  }

  sortByCompany() {
    this.filteredJobs.sort((a, b) => a.company.localeCompare(b.company));
  }
}

