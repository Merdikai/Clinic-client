import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="error-container">
      <div class="error-card">
        <div class="icon-bubble">
          <mat-icon class="status-icon">shield</mat-icon>
        </div>
        <span class="error-code">403 FORBIDDEN</span>
        <h1 class="error-title">Access Restricted</h1>
        <p class="error-desc">
          Your active clinical credentials or role permissions do not authorize access to this department or administrative workflow.
        </p>
        <div class="action-row">
          <a mat-flat-button color="primary" routerLink="/dashboard" class="action-btn">
            <mat-icon>dashboard</mat-icon> Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: inherit;
    }
    .error-card {
      max-width: 480px;
      width: 100%;
      text-align: center;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 20px;
      padding: 48px 32px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }
    .icon-bubble {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .status-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #ef4444;
    }
    .error-code {
      display: inline-block;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      padding: 4px 12px;
      border-radius: 12px;
      margin-bottom: 8px;
    }
    .error-title {
      font-size: 26px;
      font-weight: 700;
      color: #f8fafc;
      margin: 8px 0 12px;
    }
    .error-desc {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .action-row {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 10px;
      padding: 0 24px;
      height: 44px;
    }
  `]
})
export class AccessDeniedComponent {}

