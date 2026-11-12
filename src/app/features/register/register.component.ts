import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../ui/toast/toast.service';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  isSubmitting = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);

  registerForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    username: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(50),
      Validators.pattern('^[a-zA-Z0-9_.]+$')
    ]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.maxLength(20)]],
    password: ['', [
      Validators.required,
      Validators.minLength(12),
      Validators.pattern('^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).+$')
    ]],
    confirmPassword: ['', Validators.required]
  });

  passwordValue = signal('');
  confirmValue = signal('');

  hasMinLength = computed(() => this.passwordValue().length >= 12);
  hasUpper = computed(() => /[A-Z]/.test(this.passwordValue()));
  hasLower = computed(() => /[a-z]/.test(this.passwordValue()));
  hasNumber = computed(() => /[0-9]/.test(this.passwordValue()));
  hasSpecial = computed(() => /[^a-zA-Z0-9]/.test(this.passwordValue()));
  passwordsMatch = computed(() => {
    const p = this.passwordValue();
    const c = this.confirmValue();
    return p.length > 0 && c.length > 0 && p === c;
  });

  constructor() {
    this.registerForm.get('password')?.valueChanges.subscribe(v => this.passwordValue.set(v || ''));
    this.registerForm.get('confirmPassword')?.valueChanges.subscribe(v => this.confirmValue.set(v || ''));
  }

  fillDemoPatient(): void {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const demoPass = 'PatientPassword@2026!';
    this.registerForm.patchValue({
      firstName: 'Jane',
      lastName: `Doe${randomNum}`,
      username: `jane.doe${randomNum}`,
      email: `jane.doe${randomNum}@clinic-patient.com`,
      phoneNumber: `+1-555-019-${randomNum}`,
      password: demoPass,
      confirmPassword: demoPass
    });
    this.passwordValue.set(demoPass);
    this.confirmValue.set(demoPass);
    this.registerForm.markAsDirty();
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (this.registerForm.value.password !== this.registerForm.value.confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      this.toast.error('Passwords do not match');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request = {
      username: this.registerForm.value.username!.trim(),
      email: this.registerForm.value.email!.trim(),
      password: this.registerForm.value.password!,
      firstName: this.registerForm.value.firstName!.trim(),
      lastName: this.registerForm.value.lastName!.trim(),
      phoneNumber: this.registerForm.value.phoneNumber!.trim()
    };

    this.authService.register(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Registration successful. Please sign in to continue.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        const msg = error.error?.detail || error.error?.title || 'Registration failed. Please verify your details.';
        this.errorMessage.set(msg);
        this.toast.error(msg);
      }
    });
  }
}
