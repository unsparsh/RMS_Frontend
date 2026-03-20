import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack">
      <div *ngFor="let toast of toastService.toasts; trackBy: trackById"
           class="toast-notification"
           [ngClass]="{
             'toast-success': toast.type === 'success',
             'toast-error': toast.type === 'error',
             'toast-warning': toast.type === 'warning',
             'toast-info': toast.type === 'info'
           }">
        <!-- Success icon -->
        <svg *ngIf="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <!-- Error icon -->
        <svg *ngIf="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <!-- Warning icon -->
        <svg *ngIf="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <!-- Info icon -->
        <svg *ngIf="toast.type === 'info'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toast-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      max-width: 420px;
      width: 100%;
      pointer-events: none;
    }
    .toast-notification {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 12px;
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(8px);
    }
    .toast-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .toast-message {
      flex: 1;
      line-height: 1.4;
    }
    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      border-radius: 6px;
      opacity: 0.6;
      transition: opacity 0.2s;
      flex-shrink: 0;
      color: inherit;
    }
    .toast-close:hover {
      opacity: 1;
    }
    .toast-close svg {
      width: 16px;
      height: 16px;
    }
    .toast-success {
      background: #D1FAE5;
      color: #059669;
      border: 1px solid #A7F3D0;
    }
    .toast-error {
      background: #FEE2E2;
      color: #DC2626;
      border: 1px solid #FECACA;
    }
    .toast-warning {
      background: #FEF3C7;
      color: #D97706;
      border: 1px solid #FDE68A;
    }
    .toast-info {
      background: #DBEAFE;
      color: #2563EB;
      border: 1px solid #BFDBFE;
    }
    @keyframes toastSlideIn {
      from { opacity: 0; transform: translateX(40px) scale(0.95); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
  `]
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}

  trackById(_index: number, toast: any): number {
    return toast.id;
  }
}
