import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeroService } from '../../hero.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  company = '';
  showPassword = false;
  showConfirmPassword = false;
  agreeToTerms = false;
  loading = false;
  errorMsg = '';

  constructor(private heroService: HeroService, private router: Router) {}

  get passwordStrength(): string {
    if (!this.password) return '';
    if (this.password.length < 6) return 'weak';
    if (this.password.length < 10) return 'medium';
    const hasUpperCase = /[A-Z]/.test(this.password);
    const hasLowerCase = /[a-z]/.test(this.password);
    const hasNumbers = /\d/.test(this.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(this.password);
    const criteria = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;
    if (criteria >= 3 && this.password.length >= 10) return 'strong';
    if (criteria >= 2) return 'medium';
    return 'weak';
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword && this.confirmPassword.length > 0;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSignup(): void {
    if (!this.agreeToTerms || !this.passwordsMatch) return;
    this.loading = true;
    this.errorMsg = '';

    // Step 1: Authenticate with sysadmin to gain rights to create user
    this.heroService.authenticateSSO('sysadmin', 'sys@admin')
      .then(() => {
        // Step 2: Call CreateUserInOrganization Service to create the Cordys SSO User
        return this.heroService.createUserInOrganization({
          userName: this.email,
          description: this.fullName,
          userId: this.email,
          password: this.password,
          role: 'Candidate_RMS'
        });
      })
      .then((userResponse: any) => {
        // console.log('User created in organization successfully. Response:', userResponse);
        
        // Step 3: Create the Candidate record using UpdateCandidate service
        // We do this while still under sysadmin SSO to have write permissions.
        return this.heroService.createCandidate(this.fullName, this.email);
      })
      .then((candidateResp: any) => {
        // console.log('Candidate record created successfully. Response:', candidateResp);

        let candidateId: string | undefined = undefined;
        try {
          // Robust extraction: try multiple case variations often used by Cordys
          let extId = this.heroService.xmltojson(candidateResp, 'candidate_id');
          if (!extId) { extId = this.heroService.xmltojson(candidateResp, 'Candidate_id'); }
          if (!extId) { extId = this.heroService.xmltojson(candidateResp, 'CANDIDATE_ID'); }

          const extractIdText = (r: any): string => {
            if (Array.isArray(r)) r = r[0];
            if (!r) return '';
            if (typeof r === 'string') return r;
            if (r?.text) return r.text;
            if (r?.['#text']) return r['#text'];
            if (r?.['$t']) return r['$t'];
            return String(r);
          };
          
          if (extId) {
            let extracted = extractIdText(extId);
            if (extracted && extracted !== '[object Object]') {
              candidateId = extracted;
            }
          }
        } catch (e) {
          console.warn('Silent error extracting candidateId:', e);
        }

        if (!candidateId) {
          console.warn('Warning: candidate_id could not be extracted. Falling back to email to prevent unlinked records.');
          candidateId = this.email;
        }

        // Step 4: Call the UpdateCandidate_login service
        return this.heroService.createCandidateLogin(this.fullName, this.email, this.password, candidateId);
      })
      .then(() => {
        // Step 5 & 6: Set Email Profile and Send Welcome Mail
        // We use a sub-promise chain and catch here so that if the Email Service fails, 
        // the user's account is still created and they are redirected to login.
        return this.heroService.setEmailProfile()
          .then(() => {
            const mailSubject = 'Welcome to RMS - Account Created Successfully';
            const mailBody = `
              <div style="font-family:'Inter', 'Segoe UI', Arial, sans-serif; max-width:650px; margin:0 auto; background-color:#f8faff; border-radius:12px; overflow:hidden; border:1px solid #e1e8ed;">
                <!-- Header with Gradient Area -->
                <div style="background:linear-gradient(135deg,#0B2265 0%,#132d7a 100%); padding:35px 40px; position:relative;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <h1 style="color:#fff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.5px;">Adnate IT Solutions</h1>
                        <p style="color:rgba(255,255,255,0.7); margin:5px 0 0; font-size:12px;">Recruitment Management System (RMS)</p>
                      </td>
                      <td style="text-align:right;">
                        <span style="background:rgba(0,196,240,0.2); color:#00C4F0; padding:8px 16px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Welcome</span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Body Content -->
                <div style="background-color:#ffffff; padding:40px; border-bottom:1px solid #e1e8ed;">
                  <h2 style="color:#0B2265; font-size:20px; margin:0 0 15px;">Dear ${this.fullName},</h2>
                  
                  <p style="color:#4a5d75; line-height:1.8; font-size:15px; margin-bottom:25px;">
                    We are thrilled to welcome you to the <strong>Adnate IT Solutions</strong> careers portal! 
                    Your account has been successfully created, giving you full access to explore and apply for our latest career opportunities.
                  </p>

                  <!-- Account Details Card (Matching Offer Details Style) -->
                  <div style="background:linear-gradient(135deg,#f0f4ff 0%,#e8f7fc 100%); border-radius:12px; padding:25px; margin:25px 0; border:1px solid rgba(0,196,240,0.15);">
                    <h3 style="color:#0B2265; margin:0 0 15px; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Your Account Details</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="color:#8899a8; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Registered Email</span><br>
                          <span style="color:#0f1f3d; font-size:15px; font-weight:600;">${this.email}</span>
                        </td>
                        <td style="padding:10px 0;">
                          <span style="color:#8899a8; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">User Role</span><br>
                          <span style="color:#0f1f3d; font-size:15px; font-weight:600;">Candidate</span>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <p style="color:#4a5d75; line-height:1.8; font-size:15px; margin-bottom:30px;">
                    You can now complete your professional profile, upload your resume, and track your job applications in real-time through our dashboard.
                  </p>

                  <!-- Action Button -->
                  <div style="text-align:center;">
                    <a href="${window.location.origin}/login" style="display:inline-block; background-color:#00C4F0; color:#ffffff; padding:14px 35px; text-decoration:none; border-radius:8px; font-weight:700; font-size:15px; box-shadow:0 4px 6px rgba(0,196,240,0.2);">Login to Candidate Portal</a>
                  </div>
                </div>

                <!-- Footer -->
                <div style="background-color:#f8faff; padding:30px 40px; text-align:center;">
                  <p style="color:#8899a8; font-size:13px; margin:0;">
                    If you have any questions, feel free to reach out to our recruitment team.<br>
                    <strong>Adnate IT Solutions Private Limited</strong>
                  </p>
                </div>
              </div>
            `;
            // Securely passing this.email to the SendMail helper
            return this.heroService.sendMail(this.email, this.fullName, undefined, undefined, mailSubject, mailBody);
          })
          .catch(emailErr => {
            console.warn('Profile setup or Welcome email failed, but account creation was successful:', emailErr);
            // Non-blocking error
          });
      })
      .then(() => {
        // Step 7: Logout sysadmin and redirect to login page for the user to login with their new credentials
        return this.heroService.logoutAndRedirect('/login');
      })
      .then(() => {
        // console.log('Logout and redirected to login successfully.');
        this.loading = false;
      })
      .catch((err: any) => {
        console.error('Signup error:', err);
        // Add detailed logging of the possible SOAP fault string for debugging 500 errors
        if (err && err[0] && err[0].responseText) {
          console.error('SOAP Fault Response Data:', err[0].responseText);
        }
        let extractedError = '';
        try {
          const rText = err[0]?.responseText || err?.responseText || err?.message || String(err);
          if (rText.includes('already exists')) {
            extractedError = `An account with the email ${this.email} already exists. Please login instead.`;
          } else {
            const faultMatch = rText.match(/<faultstring[^>]*>(.*?)<\/faultstring>/);
            if (faultMatch && faultMatch[1]) {
              extractedError = faultMatch[1];
            }
          }
        } catch (e) {
          // fallback
        }

        this.errorMsg = extractedError || 'Failed to create account. Please try again.';
        this.loading = false;
      });
  }
}
