import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { extractProblemDetailsMessage } from '../../models/api.model';

interface ForgotPasswordResponse {
  readonly resetToken?: string | null;
  readonly resetLink?: string | null;
  readonly message?: string;
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  isSubmitting = signal(false);
  isSubmitted = signal(false);
  errorMessage = signal('');

  resetToken = signal<string | null>(null);
  resetLink = signal<string | null>(null);
  copied = signal(false);

  forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  fillEmail(email: string): void {
    this.forgotForm.patchValue({ email });
    this.forgotForm.markAsDirty();
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { email } = this.forgotForm.getRawValue();

    this.authService.forgotPassword(email).subscribe({
      next: (res: ForgotPasswordResponse) => {
        this.isSubmitting.set(false);
        this.isSubmitted.set(true);
        if (res?.resetToken) {
          this.resetToken.set(res.resetToken);
          this.resetLink.set(res.resetLink || `/reset-password?token=${res.resetToken}`);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractProblemDetailsMessage(err.error, 'Failed to dispatch password reset request.'));
      }
    });
  }

  copyLink(): void {
    const link = this.resetLink();
    if (!link) return;

    const fullUrl = window.location.origin + (link.startsWith('/') ? link : '/' + link);
    void navigator.clipboard.writeText(fullUrl).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    });
  }
}
