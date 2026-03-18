import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroService } from '../../../hero.service';

interface PipelineStep {
  label: string;
  completed: boolean;
  current: boolean;
}

interface AppliedJob {
  title: string;
  company: string;
  location: string;
  appliedDate: string;
  status: string;
  statusColor: string;
  expanded: boolean;
  pipeline: PipelineStep[];
}

@Component({
  selector: 'app-applied-jobs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './applied-jobs.component.html',
  styleUrls: ['./applied-jobs.component.css']
})
export class AppliedJobsComponent implements OnInit {
  appliedJobs: AppliedJob[] = [];
  loading = true;
  candidateId = '';

  constructor(private heroService: HeroService) {
    this.candidateId = sessionStorage.getItem('candidate_id') || 'CAN002';
  }

  ngOnInit(): void {
    this.loadAppliedJobs();
  }

  loadAppliedJobs(): void {
    this.loading = true;
    this.heroService.getAppliedJobsByCandidate(this.candidateId)
      .then(resp => {
        console.log('GetAppliedJobsByCandidate RAW Response:', resp);
        
        // The service returns data inside <tuple><old><job_requisition>
        let rawData = this.heroService.xmltojson(resp, 'tuple');
        
        console.log('Extracted Tuples:', rawData);

        if (rawData) {
          const dataArray = Array.isArray(rawData) ? rawData : [rawData];
          this.appliedJobs = dataArray.map((item: any) => {
            // Looking at the provided response, the data is in item.old.job_requisition
            const j = item.old?.job_requisition || item.job_requisition || item.old || item;
            
            // If the structure is very nested, we might need another check
            const finalData = j.job_requisition || j;

            const status = finalData.status || 'Applied';
            
            return {
              title: finalData.job_title || 'Unknown Title',
              company: 'RMS',
              location: finalData.location || 'Remote',
              appliedDate: this.formatDate(finalData.created_at),
              status: status,
              statusColor: this.getStatusColor(status),
              expanded: false,
              pipeline: this.generatePipeline(status)
            };
          }).filter(val => val.title !== 'Unknown Title');
          
          console.log('Mapped Applied Jobs:', this.appliedJobs);
        }
        this.loading = false;
      })
      .catch(err => {
        console.error('Error loading applied jobs:', err);
        this.loading = false;
      });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  getStatusColor(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('review')) return 'bg-yellow-500/10 text-yellow-600';
    if (s.includes('interview')) return 'bg-blue-500/10 text-blue-600';
    if (s.includes('rejected')) return 'bg-destructive/10 text-destructive';
    if (s.includes('offer')) return 'bg-green-500/10 text-green-600';
    if (s.includes('screening')) return 'bg-blue-500/10 text-blue-600';
    return 'bg-primary/10 text-primary';
  }

  generatePipeline(status: string): PipelineStep[] {
    const steps = ['Applied', 'Screening', 'Under Review', 'Interview', 'Offer'];
    const currentStatus = status || 'Applied';
    
    // Simple logic: find current step index
    let currentIndex = steps.findIndex(s => currentStatus.toLowerCase().includes(s.toLowerCase()));
    if (currentIndex === -1) currentIndex = 0;

    // Handle Rejected special case
    if (currentStatus.toLowerCase().includes('rejected')) {
        return [
            { label: 'Applied', completed: true, current: false },
            { label: 'Rejected', completed: false, current: true }
        ];
    }

    return steps.map((label, index) => ({
      label: label,
      completed: index < currentIndex,
      current: index === currentIndex
    }));
  }

  toggleExpand(index: number): void {
    this.appliedJobs[index].expanded = !this.appliedJobs[index].expanded;
  }

  countByStatus(status: string): number {
    return this.appliedJobs.filter(j => j.status === status).length;
  }
}
