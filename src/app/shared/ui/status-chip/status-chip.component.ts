import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const SUCCESS_STATUSES = new Set([
  'completed', 'complete', 'paid', 'checkedin', 'active', 'approved',
  'dispensed', 'normal', 'verified', 'signed', 'validated', 'acknowledged',
  'collected', 'ready', 'instock', 'healthy', 'online', 'onduty',
  'available', 'cleared', 'fulfilled', 'resolved'
]);

const WARNING_STATUSES = new Set([
  'partiallypaid', 'lowstock', 'scheduled', 'ordered', 'pending',
  'pendingapproval', 'triagecomplete', 'triaged', 'waiting', 'urgent',
  'expiring', 'deferred', 'partial', 'uncollected', 'offduty', 'rescheduled'
]);

const DANGER_STATUSES = new Set([
  'cancelled', 'canceled', 'unpaid', 'outofstock', 'critical', 'rejected',
  'overdue', 'noshow', 'expired', 'failed', 'alert', 'stat', 'emergency',
  'suspended', 'locked', 'breakglass', 'abnormal', 'high', 'void'
]);

const INFO_STATUSES = new Set([
  'inconsultation', 'inprogress', 'samplecollected', 'processing',
  'submitted', 'analyzing', 'imaging', 'reported', 'preliminary',
  'dispatched', 'inreview', 'scanned', 'started'
]);

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="status-chip" [class]="'status-chip tone-' + resolvedTone()">
      @if (showIcon()) {
        <mat-icon class="chip-icon" aria-hidden="true">{{ resolvedIcon() }}</mat-icon>
      }
      <span class="chip-label">{{ resolvedLabel() }}</span>
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      vertical-align: middle;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-4);
      min-block-size: 28px;
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-sm);
      border: 1px solid var(--semantic-neutral-border);
      background-color: var(--semantic-neutral-bg);
      color: var(--semantic-neutral-text);
      font-size: var(--text-12);
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: 0.01em;
    }

    .chip-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      flex-shrink: 0;
    }

    .tone-success {
      background-color: var(--semantic-success-bg);
      color: var(--semantic-success-text);
      border-color: var(--semantic-success-border);

      .chip-icon {
        color: var(--semantic-success-accent);
      }
    }

    .tone-warning {
      background-color: var(--semantic-warning-bg);
      color: var(--semantic-warning-text);
      border-color: var(--semantic-warning-border);

      .chip-icon {
        color: var(--semantic-warning-accent);
      }
    }

    .tone-danger {
      background-color: var(--semantic-danger-bg);
      color: var(--semantic-danger-text);
      border-color: var(--semantic-danger-border);

      .chip-icon {
        color: var(--semantic-danger-accent);
      }
    }

    .tone-info {
      background-color: var(--semantic-info-bg);
      color: var(--semantic-info-text);
      border-color: var(--semantic-info-border);

      .chip-icon {
        color: var(--semantic-info-accent);
      }
    }

    .tone-neutral {
      background-color: var(--semantic-neutral-bg);
      color: var(--semantic-neutral-text);
      border-color: var(--semantic-neutral-border);

      .chip-icon {
        color: var(--semantic-neutral-accent);
      }
    }

    @media (forced-colors: active) {
      .status-chip {
        border: 1px solid CanvasText;
      }
    }
  `]
})
export class StatusChipComponent {
  status = input<string | null | undefined>('');
  label = input<string | undefined>(undefined);
  tone = input<StatusTone | undefined>(undefined);
  showIcon = input<boolean>(true);

  private normalizedKey = computed(() =>
    (this.status() ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
  );

  protected resolvedTone = computed<StatusTone>(() => {
    const explicit = this.tone();
    if (explicit) return explicit;
    const key = this.normalizedKey();
    if (SUCCESS_STATUSES.has(key)) return 'success';
    if (WARNING_STATUSES.has(key)) return 'warning';
    if (DANGER_STATUSES.has(key)) return 'danger';
    if (INFO_STATUSES.has(key)) return 'info';
    return 'neutral';
  });

  protected resolvedIcon = computed(() => {
    switch (this.resolvedTone()) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'schedule';
      case 'danger':
        return 'error_outline';
      case 'info':
        return 'info';
      default:
        return 'remove_circle_outline';
    }
  });

  protected resolvedLabel = computed(() => {
    const custom = this.label();
    if (custom) return custom;
    const raw = (this.status() ?? '').toString().trim();
    if (!raw) return 'Unknown';
    return raw
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim();
  });
}

