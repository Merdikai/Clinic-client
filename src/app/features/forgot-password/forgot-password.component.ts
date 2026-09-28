import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

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
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  themeService = inject(ThemeService);

  isDarkMode = computed(() => this.themeService.isDarkMode());
  isSubmitting = signal(false);
  isSubmitted = signal(false);
  errorMessage = signal('');
  
  resetToken = signal<string | null>(null);
  resetLink = signal<string | null>(null);
  copied = signal(false);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  fillEmail(email: string): void {
    this.forgotForm.patchValue({ email });
    this.forgotForm.markAsDirty();
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const email = this.forgotForm.value.email!;

    this.authService.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.isSubmitted.set(true);
        if (res?.resetToken) {
          this.resetToken.set(res.resetToken);
          this.resetLink.set(res.resetLink || `/reset-password?token=${res.resetToken}`);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.detail || err?.error?.message || 'Failed to dispatch password reset request.';
        this.errorMessage.set(detail);
      }
    });
  }

  copyLink(): void {
    const link = this.resetLink();
    if (!link) return;

    const fullUrl = window.location.origin + (link.startsWith('/') ? link : '/' + link);
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    });
  }
}
