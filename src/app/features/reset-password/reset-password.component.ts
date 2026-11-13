import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  private subs = new Subscription();

  hidePassword = signal(true);
  hideConfirm = signal(true);

  token = signal<string>('');
  isSubmitting = signal(false);
  isSubmitted = signal(false);
  errorMessage = signal('');

  passwordValue = signal('');
  confirmValue = signal('');

  resetForm = this.fb.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(12),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/)
        ]
      ],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: [passwordMatchValidator] }
  );

  hasMinLength = computed(() => (this.passwordValue()?.length ?? 0) >= 12);
  hasUpperCase = computed(() => /[A-Z]/.test(this.passwordValue()));
  hasLowerCase = computed(() => /[a-z]/.test(this.passwordValue()));
  hasNumber = computed(() => /[0-9]/.test(this.passwordValue()));
  hasSpecial = computed(() => /[^a-zA-Z0-9]/.test(this.passwordValue()));
  passwordsMatch = computed(() => {
    const p1 = this.passwordValue();
    const p2 = this.confirmValue();
    return !!p1 && !!p2 && p1 === p2;
  });

  ngOnInit(): void {
    const passSub = this.resetForm.get('newPassword')?.valueChanges.subscribe(v => {
      this.passwordValue.set(v || '');
    });
    if (passSub) this.subs.add(passSub);

    const confSub = this.resetForm.get('confirmPassword')?.valueChanges.subscribe(v => {
      this.confirmValue.set(v || '');
    });
    if (confSub) this.subs.add(confSub);

    const routeSub = this.route.queryParamMap.subscribe(params => {
      const tokenParam = params.get('token');
      if (tokenParam) {
        this.token.set(tokenParam);
      }
    });
    this.subs.add(routeSub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  fillDemoPassword(password: string): void {
    this.resetForm.patchValue({
      newPassword: password,
      confirmPassword: password
    });
    this.passwordValue.set(password);
    this.confirmValue.set(password);
    this.resetForm.markAsDirty();
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const newPassword = this.resetForm.value.newPassword!;

    this.authService.resetPassword(this.token(), newPassword).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSubmitted.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.detail || err?.error?.message || 'Invalid or expired password reset token.';
        this.errorMessage.set(detail);
      }
    });
  }
}
