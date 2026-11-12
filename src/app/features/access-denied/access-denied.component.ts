import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [RouterModule, MatButtonModule, StatusChipComponent],
  template: `
    <section class="error-page" aria-labelledby="error-title">
      <div class="error-card">
        <div class="error-status">
          <app-status-chip tone="danger" label="403 Forbidden" />
        </div>
        <h1 id="error-title" class="error-title">Access Restricted</h1>
        <p class="error-desc">
          Your active clinical role or permission policy does not authorize access to this workflow or record.
        </p>
        <div class="action-row">
          <a mat-flat-button color="primary" routerLink="/dashboard">
            Return to Dashboard
          </a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .error-page {
      min-block-size: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-24);
      background-color: var(--surface-page);
    }

    .error-card {
      max-inline-size: 480px;
      inline-size: 100%;
      background-color: var(--surface-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-card);
      padding: var(--space-32);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-12);
    }

    .error-status {
      margin-block-end: var(--space-4);
    }

    .error-title {
      margin: 0;
      font-size: var(--text-24);
      font-weight: 600;
      line-height: var(--leading-tight);
      color: var(--text-primary);
    }

    .error-desc {
      margin: 0 0 var(--space-12);
      font-size: var(--text-14);
      line-height: var(--leading-normal);
      color: var(--text-secondary);
    }

    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-12);
    }
  `]
})
export class AccessDeniedComponent {}
