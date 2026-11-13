import { Injectable, signal, effect, computed } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'clinic_theme_preference';
  
  theme = signal<AppTheme>(this.getInitialTheme());
  isDark = signal<boolean>(this.theme() === 'dark');
  isDarkMode = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => {
      const currentTheme = this.theme();
      this.isDark.set(currentTheme === 'dark');
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.body?.setAttribute('data-theme', currentTheme);
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark-theme', 'dark-mode');
        document.body?.classList.add('dark-theme', 'dark-mode');
      } else {
        document.documentElement.classList.remove('dark-theme', 'dark-mode');
        document.body?.classList.remove('dark-theme', 'dark-mode');
      }
      localStorage.setItem(this.THEME_KEY, currentTheme);
    });
  }

  toggleTheme(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  toggleDarkMode(): void {
    this.toggleTheme();
  }

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
  }

  private getInitialTheme(): AppTheme {
    try {
      const saved = localStorage.getItem(this.THEME_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Fallback in SSR or restricted storage environments
    }
    return 'light';
  }
}
