import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <header class="ehr-page-header">
      <div class="header-main">
        @if (backLink()) {
          <a
            mat-button
            [routerLink]="backLink()"
            class="back-link"
            [attr.aria-label]="backLabel()">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
            <span>{{ backLabel() }}</span>
          </a>
        }
        <h1 class="page-title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="header-actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ehr-page-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-16);
      padding-bottom: var(--space-16);
      margin-bottom: var(--space-24);
      border-bottom: 1px solid var(--border-subtle);
    }

    .header-main {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      min-width: 0;
    }

    .back-link {
      align-self: flex-start;
      padding-inline: 0;
      min-block-size: 32px;
      color: var(--text-secondary);
      font-size: var(--text-14);
      font-weight: 600;
      margin-bottom: var(--space-4);

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        margin-right: var(--space-4);
      }
    }

    .page-title {
      margin: 0;
      font-size: var(--text-24);
      line-height: var(--leading-tight);
      font-weight: 700;
      color: var(--text-primary);
    }

    .page-subtitle {
      margin: 0;
      font-size: var(--text-14);
      line-height: var(--leading-normal);
      color: var(--text-secondary);
    }

    .header-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-8);
    }

    .header-actions:empty {
      display: none;
    }
  `]
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string | undefined>(undefined);
  backLink = input<string | unknown[] | undefined>(undefined);
  backLabel = input<string>('Back');
}

