import { Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'row' | 'card' | 'avatar' | 'table';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div
      class="skeleton-host"
      role="progressbar"
      aria-busy="true"
      [attr.aria-label]="label()">
      @switch (variant()) {
        @case ('avatar') {
          <div
            class="skeleton-block skeleton-avatar app-skeleton-bar"
            aria-hidden="true"
            [style.width]="width() ?? '40px'"
            [style.height]="height() ?? '40px'">
          </div>
        }
        @case ('text') {
          <div class="skeleton-stack" aria-hidden="true">
            @for (idx of rowIndices(); track idx) {
              <div
                class="skeleton-block skeleton-text app-skeleton-bar"
                [style.width]="width() ?? (idx === rowIndices().length - 1 && rowIndices().length > 1 ? '68%' : '100%')"
                [style.height]="height() ?? '14px'">
              </div>
            }
          </div>
        }
        @case ('row') {
          <div class="skeleton-stack" aria-hidden="true">
            @for (idx of rowIndices(); track idx) {
              <div class="skeleton-row-item">
                <div class="skeleton-block app-skeleton-bar" style="width: 32px; height: 32px;"></div>
                <div class="skeleton-row-lines">
                  <div class="skeleton-block app-skeleton-bar" style="width: 45%; height: 14px;"></div>
                  <div class="skeleton-block app-skeleton-bar" style="width: 28%; height: 12px;"></div>
                </div>
                <div class="skeleton-block app-skeleton-bar" style="width: 72px; height: 24px;"></div>
              </div>
            }
          </div>
        }
        @case ('card') {
          <div class="skeleton-cards-grid" aria-hidden="true">
            @for (idx of rowIndices(); track idx) {
              <div class="skeleton-card" [style.width]="width()" [style.min-height]="height() ?? '128px'">
                <div class="skeleton-card-head">
                  <div class="skeleton-block app-skeleton-bar" style="width: 40%; height: 12px;"></div>
                  <div class="skeleton-block app-skeleton-bar" style="width: 24px; height: 24px;"></div>
                </div>
                <div class="skeleton-block app-skeleton-bar" style="width: 55%; height: 24px;"></div>
                <div class="skeleton-block app-skeleton-bar" style="width: 78%; height: 12px;"></div>
              </div>
            }
          </div>
        }
        @case ('table') {
          <div class="skeleton-table" aria-hidden="true">
            <div class="skeleton-table-header">
              @for (col of colIndices(); track col) {
                <div class="skeleton-block app-skeleton-bar" style="height: 12px;"></div>
              }
            </div>
            @for (row of rowIndices(); track row) {
              <div class="skeleton-table-row">
                @for (col of colIndices(); track col) {
                  <div
                    class="skeleton-block app-skeleton-bar"
                    [style.width]="col === 0 ? '82%' : col === colIndices().length - 1 ? '60%' : '72%'"
                    style="height: 14px;">
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .skeleton-host {
      width: 100%;
    }

    .skeleton-stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
    }

    .skeleton-block {
      background-color: var(--skeleton-base);
      border-radius: var(--radius-sm);
    }

    .skeleton-avatar {
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }

    .skeleton-row-item {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      padding: var(--space-12) var(--space-16);
      background-color: var(--surface-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      min-block-size: 48px;
    }

    .skeleton-row-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
    }

    .skeleton-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-16);
    }

    .skeleton-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: var(--space-12);
      padding: var(--space-16);
      background-color: var(--surface-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    .skeleton-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-8);
    }

    .skeleton-table {
      width: 100%;
      background-color: var(--surface-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .skeleton-table-header {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);
      background-color: var(--surface-subtle);
      border-bottom: 1px solid var(--border-default);
      min-block-size: 44px;
      align-items: center;
    }

    .skeleton-table-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: var(--space-16);
      padding: var(--space-12) var(--space-16);
      border-bottom: 1px solid var(--border-subtle);
      min-block-size: 48px;
      align-items: center;

      &:last-child {
        border-bottom: none;
      }
    }
  `]
})
export class SkeletonComponent {
  variant = input<SkeletonVariant>('text');
  count = input<number>(1);
  columns = input<number>(5);
  width = input<string | undefined>(undefined);
  height = input<string | undefined>(undefined);
  label = input<string>('Loading content');

  protected rowIndices = computed(() =>
    Array.from({ length: Math.max(1, this.count()) }, (_, index) => index)
  );

  protected colIndices = computed(() =>
    Array.from({ length: Math.max(1, this.columns()) }, (_, index) => index)
  );
}

