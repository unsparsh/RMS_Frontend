import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';

declare const $: any;

@Component({
  selector: 'app-candidate-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-data.component.html',
  styleUrls: ['./candidate-data.component.css']
})
export class CandidateDataComponent implements OnInit {
  loading = true;
  saving = false;
  isEditing = false;
  error = '';
  candidateId = '';

  profile: any = {
    candidate_id: '',
    name: '',
    email: '',
    phone: '',
    skills: '',
    experience: '',
    education: '',
    resume_path: '',
    source: '',
    ready_to_relocate: '',
    notice_period: '',
    expected_salary: '',
    linkedin_url: '',
    has_referral: '',
    referral_id: '',
    created_at: '',
    created_by: ''
  };

  constructor(private heroService: HeroService) {
    try {
      this.candidateId = sessionStorage.getItem('candidate_id') || 'CAN002';
    } catch (e) {
      this.candidateId = 'CAN002';
    }
  }

  ngOnInit(): void {
    this.loadCandidateData();
  }

  loadCandidateData(): void {
    this.loading = true;
    this.error = '';

    // Authenticate SSO first, then fetch candidate data
    $.cordys.authentication?.sso
      ?.authenticate('sysadmin', 'sys@admin')
      .done(() => {
        this.heroService.ajax(
          'GetCandidateObject',
          'http://schemas.cordys.com/RMS_DB_Metadata',
          { Candidate_id: this.candidateId }
        ).then((response: any) => {
          try {
            const candidate = this.heroService.xmltojson(response, 'candidate');
            if (candidate) {
              this.profile = {
                candidate_id: candidate.candidate_id || '',
                name: candidate.name || '',
                email: candidate.email || '',
                phone: candidate.phone || '',
                skills: candidate.skills || '',
                experience: candidate.experience || '',
                education: candidate.education || '',
                resume_path: candidate.resume_path || '',
                source: candidate.source || '',
                ready_to_relocate: candidate.ready_to_relocate || 'false',
                notice_period: candidate.notice_period || '',
                expected_salary: candidate.expected_salary || '',
                linkedin_url: candidate.linkedin_url || '',
                has_referral: candidate.has_referral || 'false',
                referral_id: candidate.referral_id || '',
                created_at: candidate.created_at || '',
                created_by: candidate.created_by || ''
              };
            } else {
              this.error = 'No candidate data found.';
            }
          } catch (e) {
            console.error('Error parsing candidate data:', e);
            this.error = 'Failed to parse candidate data.';
          }
          this.loading = false;
        }).catch((err: any) => {
          console.error('Error fetching candidate data:', err);
          this.error = 'Failed to load candidate data. Please try again.';
          this.loading = false;
        });
      })
      .fail(() => {
        this.error = 'Platform authentication failed.';
        this.loading = false;
      });
  }

  getInitials(): string {
    if (!this.profile.name) return 'C';
    const parts = this.profile.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  }

  toggleEdit(): void {
    if (this.isEditing) {
      // Cancel edit: revert changes by reloading from server
      this.isEditing = false;
      this.loadCandidateData();
    } else {
      this.isEditing = true;
    }
  }

  onSave(): void {
    if (this.saving || !this.isEditing) return;
    this.saving = true;
    this.error = '';

    $.cordys.authentication?.sso
      ?.authenticate('sysadmin', 'sys@admin')
      .done(() => {
        const updatedFields: any = {
          email: this.profile.email,
          phone: this.profile.phone,
          skills: this.profile.skills,
          experience: this.profile.experience,
          education: this.profile.education,
          expected_salary: this.profile.expected_salary,
          name: this.profile.name,
          source: this.profile.source,
          ready_to_relocate: this.profile.ready_to_relocate,
          notice_period: this.profile.notice_period,
          linkedin_url: this.profile.linkedin_url
        };

        this.heroService.updateCandidate(this.profile.candidate_id, updatedFields)
          .then((response: any) => {
            this.saving = false;
            this.isEditing = false;
            this.loadCandidateData();
          }).catch((err: any) => {
            console.error('Error saving candidate data:', err);
            this.error = 'Failed to save candidate data. Please try again.';
            this.saving = false;
          });
      })
      .fail(() => {
        this.error = 'Platform authentication failed during save.';
        this.saving = false;
      });
  }
}
