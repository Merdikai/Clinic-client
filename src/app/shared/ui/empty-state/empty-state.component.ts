import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ehr-empty-state">
      @if (icon()) {
        <div class="empty-icon-box" aria-hidden="true">
          <mat-icon>{{ icon() }}</mat-icon>
        </div>
      }
      <h2 class="empty-title">{{ title() }}</h2>
      @if (description()) {
        <p class="empty-description">{{ description() }}</p>
      }
      @if (actionLabel()) {
        <div class="empty-actions">
          <button mat-stroked-button type="button" (click)="action.emit()">
            {{ actionLabel() }}
          </button>
        </div>
      }
      <div class="empty-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ehr-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: var(--space-8);
      padding: var(--space-32) var(--space-24);
      background-color: var(--surface-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    .empty-icon-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background-color: var(--surface-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      margin-bottom: var(--space-4);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .empty-title {
      margin: 0;
      font-size: var(--text-16);
      line-height: var(--leading-normal);
      font-weight: 600;
      color: var(--text-primary);
    }

    .empty-description {
      margin: 0;
      max-width: 48ch;
      font-size: var(--text-14);
      line-height: var(--leading-normal);
      color: var(--text-secondary);
    }

    .empty-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-8);
      margin-top: var(--space-8);
    }

    .empty-actions:empty {
      display: none;
      margin-top: 0;
    }
  `]
})
export class EmptyStateComponent {
  icon = input<string>('inbox');
  title = input.required<string>();
  description = input<string | undefined>(undefined);
  actionLabel = input<string | undefined>(undefined);

  action = output<void>();
}

