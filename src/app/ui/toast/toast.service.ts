import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private snackBar = inject(MatSnackBar);

  success(message: string, duration = 3000) {
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass: ['toast-success'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      politeness: 'polite'
    });
  }

  error(message: string, duration = 3000) {
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass: ['toast-error'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      politeness: 'polite'
    });
  }

  info(message: string, duration = 3000) {
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass: ['toast-info'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      politeness: 'polite'
    });
  }

  warning(message: string, duration = 3000) {
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass: ['toast-warning'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      politeness: 'polite'
    });
  }
}
