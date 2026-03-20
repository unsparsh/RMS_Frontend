import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-resume-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent implements OnInit {

  // --- State flags ---
  isParsing = false;
  isSaving = false;
  isApproved = false;
  isDragging = false;

  // --- Toast / Status ---
  statusMessage = '';
  statusType: 'success' | 'error' | 'info' = 'info';
  showStatus = false;

  // --- Data ---
  parsedData: any = null;
  selectedFile: File | null = null;
  selectedFileName = '';
  selectedFileSize = '';
  selectedFileType = '';

  // --- Persisted resume info (from DB) ---
  resumeFileName = '';

  // --- Stored details toggle ---
  showStoredDetails = false;
  isLoadingStoredDetails = false;
  storedCandidateFields: { label: string; value: string }[] = [];

  // --- Step 6: Final output ---
  finalCandidate: any = null;
  finalCandidateFields: { label: string; value: string }[] = [];

  // --- Step Progress ---
  currentStep = 0;
  workflowSteps = ['Upload', 'Parse', 'Review', 'Upload to Server', 'Save to DB', 'Done'];

  // --- Constants ---
  private readonly DOWNLOAD_BASE = 'http://43.242.214.239:81/home/training2025/MAHINDRA_UPLOADS/Intern_Uploads';

  constructor(private heroService: HeroService, private router: Router) {}

  // =====================================================================
  //  LIFECYCLE
  // =====================================================================
  ngOnInit(): void {
    const candidateId = sessionStorage.getItem('candidate_id');
    if (candidateId) {
      this.loadExistingResume(candidateId);
    } else {
      console.warn('No candidate_id in session.');
    }
  }

  private async loadExistingResume(candidateId: string) {
    try {
      const resp = await this.heroService.getCandidateObject(candidateId);
      const candidate = this.heroService.xmltojson(resp, 'candidate');
      if (candidate) {
        const path: string = this.extractTextField(candidate.resume_path);
        if (path) {
          this.resumeFileName = this.bareFileName(path);
        }
      }
    } catch (err) {
      console.error('Could not load existing resume:', err);
    }
  }

  // =====================================================================
  //  TOGGLE STORED CANDIDATE DETAILS
  // =====================================================================
  async toggleStoredDetails() {
    this.showStoredDetails = !this.showStoredDetails;

    // If opening and we haven't loaded yet (or want to refresh), fetch from DB
    if (this.showStoredDetails && this.storedCandidateFields.length === 0) {
      const candidateId = sessionStorage.getItem('candidate_id');
      if (!candidateId) return;

      this.isLoadingStoredDetails = true;
      try {
        const resp = await this.heroService.getCandidateObject(candidateId);
        const candidate = this.heroService.xmltojson(resp, 'candidate');
        if (candidate) {
          const ext = (field: any): string => {
            if (!field) return '';
            if (typeof field === 'string') return field;
            return field.text || field['#text'] || '';
          };
          this.storedCandidateFields = [
            { label: 'Candidate ID', value: ext(candidate.candidate_id) },
            { label: 'Name',         value: ext(candidate.name) },
            { label: 'Email',        value: ext(candidate.email) },
            { label: 'Phone',        value: ext(candidate.phone) },
            { label: 'Skills',       value: ext(candidate.skills) },
            { label: 'Experience',   value: ext(candidate.experience) ? ext(candidate.experience) + ' years' : '' },
            { label: 'Education',    value: ext(candidate.education) },
            { label: 'Resume File',  value: ext(candidate.resume_path) }
          ];
        }
      } catch (err) {
        console.error('Failed to load candidate details:', err);
      } finally {
        this.isLoadingStoredDetails = false;
      }
    }
  }

  // =====================================================================
  //  FILE SELECTION
  // =====================================================================
  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragging = true; }
  onDragLeave() { this.isDragging = false; }

  onDrop(e: DragEvent) {
    e.preventDefault(); this.isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) this.handleFile(files[0]);
  }

  onFileSelect(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.files && el.files.length > 0) this.handleFile(el.files[0]);
  }

  removeFile() {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.parsedData = null;
    this.isApproved = false;
    this.finalCandidate = null;
    this.finalCandidateFields = [];
    this.currentStep = 0;
  }

  private handleFile(file: File) {
    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.selectedFileSize = (file.size / 1024).toFixed(2) + ' KB';
    this.selectedFileType = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
    this.isApproved = false;
    this.finalCandidate = null;
    this.finalCandidateFields = [];
    this.currentStep = 0;
    this.showToast('File selected: ' + file.name, 'info');

    if (file.type === 'application/pdf') {
      this.parseResumeFromPDF(file);
    } else {
      // For DOC/DOCX files, show empty fields for manual entry
      this.parsedData = { name: null, email: null, phone: null, skills: null, experience: null, education: null };
      this.currentStep = 2; // Skip to review step
    }
  }

  // =====================================================================
  //  RESUME PARSING via Gemini API  (Step 1)
  // =====================================================================
  async parseResumeFromPDF(file: File) {
    this.isParsing = true;
    this.parsedData = null;
    this.currentStep = 1; // Parsing step
    try {
      // Step 1: Extract raw text from PDF
      const ab = await file.arrayBuffer();
      const pdfjsLib = await (import('pdfjs-dist') as any);
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const pdf = await (pdfjsLib.getDocument({ data: ab })).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        text += tc.items.map((item: any) => item.str).join(' ') + '\n';
      }

      console.log('Extracted PDF text length:', text.length);

      // Step 2: Send to Gemini API for intelligent parsing
      this.showToast('Parsing resume with Gemini AI…', 'info');
      const parsed = await this.parseWithGemini(text);

      if (parsed) {
        this.parsedData = this.normalizeNulls(parsed);
        this.currentStep = 2; // Advance to review step
        this.showToast('Resume parsed successfully with Gemini AI!', 'success');
      } else {
        // Fallback to basic regex if Gemini fails
        console.warn('Gemini parsing returned null, falling back to regex.');
        this.extractFieldsFromTextFallback(text);
        this.currentStep = 2;
        this.showToast('Parsed with basic extraction (Gemini unavailable).', 'info');
      }
    } catch (err: any) {
      console.error('PDF parse error:', err);
      this.showToast('Failed to parse PDF: ' + (err.message || err), 'error');
    } finally {
      this.isParsing = false;
    }
  }

  /** Call Gemini API to parse resume text into structured fields */
  private async parseWithGemini(resumeText: string): Promise<any> {
    const apiKey = environment.geminiApiKey;
    if (!apiKey) {
      console.warn('Gemini API key not configured.');
      return null;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `You are a resume parser. Extract the following information from the resume text below and return ONLY a valid JSON object (no markdown, no code fences, no explanation).

JSON format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "skills": "comma separated skills",
  "experience": 0,
  "education": "highest education details"
}

Rules:
- "experience" must be a number (years of experience). If not found, use 0.
- If a field is not found, use null for that field.
- For "skills", list all technical and professional skills found, comma separated.
- For "education", include degree, institution, and year if available.

Resume text:
${resumeText}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        console.error('Gemini API HTTP error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('Gemini API raw response:', data);

      // Extract the text content from the response
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('Gemini response text:', content);

      // Clean the response: strip possible markdown code fences
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(jsonStr);

      // Normalize the parsed data — return null for missing fields
      return {
        name:       parsed.name ? String(parsed.name).substring(0, 254) : null,
        email:      parsed.email ? String(parsed.email).substring(0, 254) : null,
        phone:      parsed.phone ? String(parsed.phone).substring(0, 19) : null,
        skills:     parsed.skills ? String(parsed.skills).substring(0, 499) : null,
        experience: typeof parsed.experience === 'number' ? parsed.experience : (parseInt(parsed.experience) || null),
        education:  parsed.education ? String(parsed.education).substring(0, 254) : null
      };
    } catch (err) {
      console.error('Gemini parsing error:', err);
      return null;
    }
  }

  /** Fallback: basic regex extraction if Gemini is unavailable */
  private extractFieldsFromTextFallback(text: string) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/[\d]{3}[- .]?[\d]{3}[- .]?[\d]{4}/) || text.match(/\+?\d[\d\s\-\(\)]{8,}/);

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    let name: string | null = null;
    for (const line of lines.slice(0, 5)) {
      if (!/resume|curriculum|vitae|profile|about|candidate|summary/i.test(line)) {
        name = line; break;
      }
    }

    const lower = text.toLowerCase();
    let skills: string | null = null;
    let education: string | null = null;
    let experienceNum: number | null = null;

    const si = lower.indexOf('skills');
    if (si !== -1) {
      const raw = text.substring(si + 6, si + 500).split('\n')[0].replace(/^[:\-·\s]+/, '').trim();
      skills = raw ? raw.substring(0, 499) : null;
    }

    const ei = lower.indexOf('experience');
    if (ei !== -1) {
      const near = text.substring(Math.max(0, ei - 50), ei + 150);
      const ym = near.match(/(\d+[\.,]?\d*)\s*(year|yr|exp)/i);
      if (ym) experienceNum = Math.round(parseFloat(ym[1].replace(',', '.')));
    }

    const edi = lower.indexOf('education');
    if (edi !== -1) {
      const raw = text.substring(edi + 9, edi + 250).split('\n')[0].replace(/^[:\-·\s]+/, '').trim();
      education = raw ? raw.substring(0, 254) : null;
    }

    this.parsedData = {
      name: name ? name.substring(0, 254) : null,
      email: emailMatch ? emailMatch[0].substring(0, 254) : null,
      phone: phoneMatch ? phoneMatch[0].substring(0, 19) : null,
      skills,
      experience: experienceNum,
      education
    };
    this.isApproved = false;
  }

  // =====================================================================
  //  DOWNLOAD URL
  // =====================================================================
  getResumeDownloadUrl(): string {
    if (!this.resumeFileName) return '#';
    return `${this.DOWNLOAD_BASE}/${this.resumeFileName}`;
  }

  // =====================================================================
  //  MAIN FLOW: UPLOAD → SAVE → FETCH  (Steps 3, 4, 5)
  // =====================================================================
  async processUploadAndSave() {
    if (!this.selectedFile || !this.parsedData) {
      this.showToast('Please upload a resume first.', 'error'); return;
    }
    if (!this.isApproved) {
      this.showToast('Please approve the parsed details before saving.', 'error'); return;
    }
    const candidateId = sessionStorage.getItem('candidate_id');
    if (!candidateId) {
      this.showToast('You must be logged in. Please login and try again.', 'error'); return;
    }

    this.isSaving = true;
    this.showToast('Uploading resume to server…', 'info');

    try {
      // --- Step 3: Convert to Base64 and upload ---
      this.currentStep = 3;
      const base64 = await this.fileToBase64(this.selectedFile);
      console.log(`Uploading: ${this.selectedFile.name} (${this.selectedFile.size} bytes, base64 len=${base64.length})`);

      const uploadResp = await this.heroService.uploadDocumentsRMS(this.selectedFile.name, base64);
      console.log('Upload response (XMLDocument):', uploadResp);

      // Extract path from the XML Document response
      let serverPath = '';
      if (uploadResp instanceof Document) {
        // Try to find the UploadDocuments_RMS element text
        const el = uploadResp.getElementsByTagName('UploadDocuments_RMS')[0];
        if (el) serverPath = el.textContent || '';
      }

      // Use the server path if found, otherwise fall back to original filename
      if (serverPath) {
        this.resumeFileName = this.bareFileName(serverPath);
      } else {
        console.warn('Could not extract path from response, using original filename.');
        this.resumeFileName = this.selectedFile.name;
      }

      console.log('Resume file name:', this.resumeFileName);
      this.showToast('File uploaded! Saving to profile…', 'info');

      // --- Step 4: Save resume_path + parsed fields ---
      this.currentStep = 4;
      const fields: any = {
        name:        this.parsedData.name || '',
        phone:       this.parsedData.phone || '',
        skills:      this.parsedData.skills || '',
        experience:  this.parsedData.experience ?? 0,
        education:   this.parsedData.education || '',
        resume_path: this.resumeFileName
      };
      await this.heroService.updateCandidate(candidateId, fields);

      // --- Step 5: Fetch updated candidate to verify ---
      const freshResp = await this.heroService.getCandidateObject(candidateId);
      console.log('Verified candidate:', freshResp);

      // Build the final candidate object for Step 6
      const candidateObj = this.heroService.xmltojson(freshResp, 'candidate');
      this.buildFinalOutput(candidateObj);

      // --- Step 6: Done ---
      this.currentStep = 5;
      this.showToast('Resume uploaded and saved successfully!', 'success');

      // Reload the page after a short delay so the user sees the success toast
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Upload/save error:', err);
      this.showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      this.isSaving = false;
    }
  }

  // =====================================================================
  //  STEP 6: Build Final Output
  // =====================================================================
  private buildFinalOutput(candidate: any) {
    if (!candidate) {
      this.finalCandidate = null;
      return;
    }

    this.finalCandidate = candidate;

    const ext = (field: any): string => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      return field.text || field['#text'] || '';
    };

    this.finalCandidateFields = [
      { label: 'Candidate ID', value: ext(candidate.candidate_id) },
      { label: 'Name',         value: ext(candidate.name) },
      { label: 'Email',        value: ext(candidate.email) },
      { label: 'Phone',        value: ext(candidate.phone) },
      { label: 'Skills',       value: ext(candidate.skills) },
      { label: 'Experience',   value: ext(candidate.experience) ? ext(candidate.experience) + ' years' : '' },
      { label: 'Education',    value: ext(candidate.education) },
      { label: 'Resume File',  value: ext(candidate.resume_path) }
    ];
  }

  // =====================================================================
  //  RESET WORKFLOW (allow re-upload)
  // =====================================================================
  resetWorkflow() {
    this.finalCandidate = null;
    this.finalCandidateFields = [];
    this.currentStep = 0;
    this.parsedData = null;
    this.selectedFile = null;
    this.selectedFileName = '';
    this.isApproved = false;
  }

  // =====================================================================
  //  TOAST NOTIFICATIONS
  // =====================================================================
  showToast(message: string, type: 'success' | 'error' | 'info') {
    this.statusMessage = message;
    this.statusType = type;
    this.showStatus = true;

    if (type !== 'info' || !this.isSaving) {
      setTimeout(() => { this.showStatus = false; }, 5000);
    }
  }

  dismissToast() {
    this.showStatus = false;
  }

  // =====================================================================
  //  UTILITIES
  // =====================================================================
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.substring(dataUrl.indexOf(',') + 1));
      };
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  private bareFileName(path: string): string {
    if (!path) return '';
    return path.split(/[/\\]/).pop() || path;
  }

  private extractTextField(field: any): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field.text || field['#text'] || '';
  }

  /** Ensure missing parsed fields are explicitly null (not empty string) */
  private normalizeNulls(data: any): any {
    const result: any = {};
    for (const key of ['name', 'email', 'phone', 'skills', 'education']) {
      result[key] = data[key] && data[key] !== '' ? data[key] : null;
    }
    result.experience = (data.experience !== undefined && data.experience !== null && data.experience !== '')
      ? data.experience
      : null;
    return result;
  }
}
