# Clinical EHR Frontend UI Refactor Plan

**Repository:** `https://github.com/Merdikai/Clinic-client` (`C:\Users\hp\clinic-client`, branch `main`)  
**Stack:** Angular 22 (standalone components, signals, zoneless change detection), NgRx SignalStore, Angular Material 22, SignalR  
**Backend API:** `.NET 10 Web API` (`ClinicManagementSystem` — separate repository, untouched)

---

## Executive Alignment: DeepSeek Prompt vs. Actual Repository State

Before beginning Phase 1, the following discrepancies between the prompt assumptions and actual codebase progress were identified and reconciled:

1. **Repository Separation (NTFS Junction):** `clinic-client/` is linked inside `C:\Users\hp\ClinicManagementSystem\clinic-client`, but is an independent Git repository rooted at `C:\Users\hp\clinic-client`. All commits, branches, pushes (`origin main`), and this plan live in `C:\Users\hp\clinic-client`. Backend files in `src/ClinicManagementSystem.*` remain completely untouched.
2. **Active User Roles (9 instead of 7):** The system supports **9 clinical roles** in `ShellComponent`, `app.routes.ts`, and `PermissionService`:
   - `Admin`, `Doctor`, `Nurse`, `Receptionist`, `Pharmacist`, `LabTechnician`, `Radiologist`, `Accountant`, `Patient`
   - All 9 role workspaces and sidebar links must be audited and tightened.
3. **Full Route & Feature Surface (24 Feature Views + Shell):** Beyond core Patient/Appointment/Pharmacy/Billing/Reports/User Management routes, the application includes `reset-password`, `access-denied` (403), `not-found` (404), `dashboard`, `doctor-schedules`, `doctor-inbasket`, `my-consultations`, `my-patients`, `laboratory`, `radiology`, `nursing-procedures`, `shift-handover`, and 4 Patient Portal pages (`my-appointments`, `my-medical-file`, `my-prescriptions`, `my-invoices`). Every single view (~60,000+ lines of HTML/SCSS/TS) is covered in Phases 10–30.
4. **Prebuilt Material Theme & `styles.scss` Baseline:** `angular.json` currently loads `@angular/material/prebuilt-themes/azure-blue.css` alongside `src/styles.scss` (1,074 lines containing gradients, glassmorphism, `.premium-card`, `.giant-glow-box`, `!important` dark-mode overrides, hover lift transforms, and global `* { margin: 0; padding: 0 }` resets). Both will be replaced cleanly with an Angular Material M3 neutral light-first theme and tiered CSS custom properties.
5. **Existing Service & Store Preservation:** `ThemeService` (`theme`, `isDark`, `isDarkMode`, `toggleTheme`, `setTheme`) and `ToastService` (`success`, `error`, `info`, `warning`) are injected across features. Method and signal signatures remain intact while defaulting visually to a crisp, neutral light EHR palette and compliant bottom-center snackbar positioning (`3000ms`, `aria-live="polite"`).
6. **WCAG AA Semantic Color Contrast Enforcement:** Pure bright Material orange (`#ed6c02`) and bright info blue (`#0288d1`) fail WCAG AA `4.5:1` contrast when used as text on white/light surfaces. Our semantic tokens pair accessible high-contrast foreground text hues (`>= 4.5:1`) with muted fills and subtle borders, always accompanied by explicit text labels or icons so color never conveys meaning alone.

---

## Non-Negotiable Architecture & Design System Rules

- **Typography Scale (6 sizes only):** `12px` (`0.75rem`), `14px` (`0.875rem`), `16px` (`1rem`), `20px` (`1.25rem`), `24px` (`1.5rem`), `32px` (`2rem`). Unitless `line-height` (`1.4`–`1.5`).
- **Spacing Scale (multiples of 4px only):** `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- **Border Radius (2 values only):** `4px` (inputs, chips, small controls), `8px` (cards, tables, panels, dialogs). Nothing rounder (except circular avatars if strictly plain).
- **Elevation / Shadows:** Zero blur glassmorphism, zero layered glows, zero hover bounce transforms. Flat bordered surfaces (`1px solid var(--border-default)`) or at most one subtle card shadow (`--shadow-card`).
- **Palette:** Neutral grey/slate surfaces & typography (`#ffffff`, `#f8fafc`, `#f1f5f9`, `#0f172a`, `#475569`) + strict semantic meaning tokens:
  - **Primary Action:** Neutral Slate (`#1e293b` / `#0f172a` or clinical slate `#334155`) — single primary filled CTA per view.
  - **Success (`Completed`, `Paid`, `CheckedIn`, `Active`):** Foreground `#1b5e20` (`#2e7d32` borders/icons), surface `#edf7ed`.
  - **Warning (`PartiallyPaid`, `Low Stock`, `Scheduled`, `Ordered`):** Foreground `#8a3c00` (`#ed6c02` borders/icons), surface `#fff4e5`.
  - **Danger (`Cancelled`, `Unpaid`, `OutOfStock`, `Critical`, `BreakGlass`):** Foreground `#b71c1c` (`#c62828` borders/icons), surface `#fdeded`.
  - **Info (`InConsultation`, `InProgress`, informational):** Foreground `#01579b` (`#0288d1` borders/icons), surface `#e5f6fd`.
  - **Neutral / Disabled:** Foreground `#475569`, surface `#f1f5f9`.
- **Buttons:** Filled (`mat-flat-button`), Outlined (`mat-stroked-button`), Text (`mat-button`) / Icon-only with `aria-label` (for universal edit/delete/download/close actions).
- **Tables:** Uniform `mat-table`, `~48px` min-row-height, `14px` body text, `12px` column header uppercase/medium weight, hover row tint, no zebra striping, `<th scope="col">`.
- **Forms:** `<mat-form-field appearance="outline">`, 1 column mobile / 2 columns desktop, proper `<mat-label>`, `autocomplete` attributes, `aria-describedby` error/hint associations.
- **Modals / Dialogs:** Max width `480px` (standard confirmations/forms), single primary action, Cancel placed on the right of Primary, focus trapped cleanly, `Esc` dismissible.
- **Skeleton Loaders:** Reusable `<app-skeleton>` (`text`, `row`, `card`, `avatar`, `table`) with reduced-motion-safe shimmer (`@media (prefers-reduced-motion: no-preference)`). Zero `<mat-spinner>` remaining for data loading.
- **Accessibility (WCAG 2.1 AA):** Skip link to `<main id="main-content" tabindex="-1">`, single `<h1>` per route, logical headings, semantic `<button>` (zero `<div (click)>`), visible `:focus-visible` outlines, `aria-hidden="true"` on decorative `<mat-icon>`s, `aria-label` on icon buttons, zero critical/serious `axe-core` violations.

---

## 32-Phase Execution Roadmap

### Phase 1 — Codebase Audit & Baseline Inventory (Read-Only)
- Document exact component inventory, line counts, `<mat-spinner>` occurrences (`52` instances), decorative gradients/glows (`~387` occurrences), clickable `<div>` elements (`~138` instances), role coverage across all 9 clinical roles, and verify clean `ng build` baseline before editing code.
- **No source files modified** in Phase 1 (verify and record baseline metrics inside `docs/ui-refactor-plan.md`).

### Phase 2 — Design Tokens & Semantic Color System
- Create `src/styles/_tokens.scss` defining `:root` custom properties for typography (`--text-12` .. `--text-32`), spacing (`--space-4` .. `--space-48`), radii (`--radius-sm: 4px`, `--radius-md: 8px`), elevation (`--shadow-card`, `--shadow-none`), neutral surfaces/borders/text, WCAG AA semantic colors, and clean dark-mode fallback surface variables (`[data-theme='dark']`).

### Phase 3 — Angular Material M3 Neutral Theme
- Create `src/styles/_material-theme.scss` configuring Angular Material M3 palette using neutral/slate tonal palettes (removing `@angular/material/prebuilt-themes/azure-blue.css` from `angular.json`), uniform density, and exact shape/typography alignment.

### Phase 4 — Global Reset, Typography & Accessibility Primitives
- Refactor `src/styles.scss` and `src/index.html`: remove `* { margin: 0; padding: 0 }` global nuke, remove all `.premium-*`, `.giant-glow-box`, `.primary-glow`, `.gradient-text`, glassmorphism `blur()`, hover bounce transforms, and page-specific `!important` hacks.
- Add `<meta name="text-scale" content="scale">`, verify `<html lang="en">`, add `.visually-hidden` utility, high-contrast `:focus-visible` outlines, subtle reduced-motion-safe `@keyframes` skeleton shimmer, uniform `mat-table` / `mat-form-field` / dialog global styles, and `forced-colors: active` fallbacks.

### Phase 5 — Snackbar & Theme Service Visual Alignment
- Standardize `ToastService` (`src/app/ui/toast/toast.service.ts`): set `duration: 3000`, `horizontalPosition: 'center'`, `verticalPosition: 'bottom'`, `politeness: 'polite'`, clean semantic toast panel classes in `styles.scss`.
- Update `ThemeService` default initialization preference to `'light'` when no preference is stored so clinical light theme is guaranteed on initial load while preserving all existing API signals/methods.

### Phase 6 — Reusable `<app-skeleton>` Primitive
- Build standalone `SkeletonComponent` (`src/app/shared/ui/skeleton/skeleton.component.ts`): inputs `variant` (`'text' | 'row' | 'card' | 'avatar' | 'table'`), `count`, `columns`, `height`, `width`. Accessible `aria-hidden="true"` visuals paired with `.visually-hidden` `"Loading content..."` container status where appropriate.

### Phase 7 — Reusable `<app-status-chip>` Primitive
- Build standalone `StatusChipComponent` (`src/app/shared/ui/status-chip/status-chip.component.ts`): maps clinical, appointment, lab, radiology, pharmacy stock, and invoice statuses (`Completed`, `Paid`, `CheckedIn`, `Scheduled`, `PartiallyPaid`, `LowStock`, `Cancelled`, `Unpaid`, `OutOfStock`, `Critical`, `InConsultation`, etc.) to strict semantic token colors + crisp label text + optional status icon (no color-only signaling).

### Phase 8 — Reusable `<app-page-header>` Wrapper Primitive
- Build standalone `PageHeaderComponent` (`src/app/shared/ui/page-header/page-header.component.ts`): consistent minimal hospital EHR page header with single `<h1>` title, optional subtitle/back link, and right-aligned action toolbar slot (enforcing clean spacing scale & hierarchy across every feature).

### Phase 9 — Reusable `<app-empty-state>` Component
- Build standalone `EmptyStateComponent` (`src/app/shared/ui/empty-state/empty-state.component.ts`): minimal neutral card/region displaying clear message, optional context icon (`aria-hidden="true"`), and single optional CTA button.

### Phase 10 — Auth Page Refactor: Login
- Refactor `src/app/features/login/login.component.*`: remove gradient background, rainbow demo chips, emoji characters, floating blur switch, and glowing brand icon badge. Plain neutral `#f8fafc` canvas, crisp `<h1>`, accessible outlined credentials form, keyboard-reachable password visibility toggle (`aria-label` + removed `tabindex="-1"`), `aria-describedby` errors.

### Phase 11 — Auth Page Refactor: Register
- Refactor `src/app/features/register/register.component.*`: plain EHR registration card, remove glowing header box/gradient buttons, align 1-col mobile / 2-col desktop grid, accessible HIPAA checklist, keyboard-reachable visibility toggles.

### Phase 12 — Auth Pages Refactor: Forgot Password & Reset Password
- Refactor `src/app/features/forgot-password/*` and `src/app/features/reset-password/*`: unify layout with plain neutral auth surface, remove rainbow emoji demo chips and accent glow buttons, preserve dev recovery link functionality, ensure full keyboard/screen-reader conformance.

### Phase 13 — Error Pages: Access Denied (403) & Not Found (404)
- Refactor `src/app/features/access-denied/access-denied.component.ts` and `src/app/features/not-found/not-found.component.ts`: replace hardcoded dark glassmorphism styles with neutral semantic tokens, clean single `<h1>`, semantic button actions (`Return to Dashboard`).

### Phase 14 — Application Shell & 9-Role Sidebar Navigation
- Refactor `src/app/shell/shell.component.*` (83KB template / 32KB SCSS):
  - Add skip-to-main-content link targeting `#main-content` (`<main id="main-content" tabindex="-1">`)
  - Replace dual-tier glowing HUD cards, pulse indicators, emoji buttons, and cyan/emerald/amber glow wrappers with crisp neutral navigation list links
  - Verify strict per-role visibility across **all 9 roles** (`Admin`, `Doctor`, `Nurse`, `Receptionist`, `Pharmacist`, `LabTechnician`, `Radiologist`, `Accountant`, `Patient`)
  - Make duty modal & notification/topbar controls WCAG AA keyboard accessible with semantic `<header>` / `<nav aria-label>` landmarks.

### Phase 15 — Multi-Role Clinical Dashboard
- Refactor `src/app/features/dashboard/dashboard.component.*` (121KB HTML / 67KB SCSS): remove oversized role welcome banners, linear-gradient CTA buttons, pulse badges, and decorative color cards across all 9 role panels; replace `<mat-spinner>` with `<app-skeleton>`; convert clickable `<div>`s to `<button type="button">`; apply `<app-page-header>` and `<app-status-chip>`.

### Phase 16 — Patient Master Directory (`PatientListComponent`)
- Refactor `src/app/features/patient-list/patient-list.component.*`: remove EHR hero card, pulse dot, redundant male/female glow stat cards (keep filter chips bar), gradient avatars, and pill `view_file` button; apply `<app-page-header>`, `<app-skeleton variant="table">`, `<app-empty-state>`, accessible search label, and consistent table/action buttons.

### Phase 17 — Patient Intake & Edit Form (`PatientFormComponent`)
- Refactor `src/app/features/patient-form/patient-form.component.*`: remove hero banner & glowing badges; convert spinner indicators; structure into clean bordered form sections with `appearance="outline"`, responsive 1/2-column grid, accessible MPI duplicate warning banner, and `aria-describedby` validation.

### Phase 18 — Patient Clinical Chart Detail (`PatientDetailComponent`)
- Refactor `src/app/features/patient-detail/patient-detail.component.*` (53KB HTML / 43KB SCSS): remove glassmorphism/gradients; replace all 6 `<mat-spinner>` elements with shaped `<app-skeleton>` loaders (`card`, `table`, `text`); convert `<div (click)>` to buttons; use `<app-page-header>` and `<app-status-chip>`.

### Phase 19 — Appointments List & Clinical Triage Queue (`AppointmentListComponent`)
- Refactor `src/app/features/appointment-list/appointment-list.component.*`: replace 3 `<mat-spinner>` loaders with `<app-skeleton>`; replace arbitrary colored status badges with `<app-status-chip>`; convert all 10 clickable `<div>` elements to native `<button>`s; unify table & action columns.

### Phase 20 — Appointment Booking (`AppointmentBookingComponent`)
- Refactor `src/app/features/appointment-booking/appointment-booking.component.*`: remove glassmorphism/hero card & inline spacing hacks; clean `<app-page-header>` + 2-col desktop / 1-col mobile form; preserve existing `exhaustMap` + `takeUntilDestroyed()` reactive pipeline untouched.

### Phase 21 — Doctor Portal: Consultations, InBasket & My Patients
- Refactor `src/app/features/doctor-portal/my-consultations/*`, `doctor-inbasket/*`, and `my-patients/*`: remove gradient cards, glows, and purple InBasket styling; replace clickable `<div>`s with buttons; apply `<app-page-header>`, `<app-skeleton>`, and `<app-status-chip>`.

### Phase 22 — Doctor & Staff Duty Schedules (`DoctorSchedulesComponent`)
- Refactor `src/app/features/doctor-schedules/doctor-schedules.component.*`: replace 3 `<mat-spinner>` instances with `<app-skeleton>`; remove purple gradients/glows; add proper `<label>` associations for roster filters and `<th scope="col">` on schedule tables.

### Phase 23 — Patient Self-Service Portal (Appointments, Medical File, Prescriptions, Invoices)
- Refactor all 4 views under `src/app/features/patient-portal/`: standardize with `<app-page-header>`, `<app-skeleton>`, `<app-status-chip>`, `<app-empty-state>`; eliminate clickable `<div>` cards and decorative gradient styles.

### Phase 24 — Pharmacy & Dispensary Control (`PharmacyComponent`)
- Refactor `src/app/features/pharmacy/pharmacy.component.*` (64KB HTML / 58KB SCSS): replace 3 `<mat-spinner>` elements with `<app-skeleton>`, convert 17 `<div (click)>` elements to `<button>`, standardize Low/OutOfStock/InStock/Dispensed indicators with `<app-status-chip>`, simplify inventory, POS, formulary, and requisition modals (`480px` standard forms where applicable).

### Phase 25 — Laboratory Information Management System (`LaboratoryComponent`)
- Refactor `src/app/features/laboratory/laboratory.component.*` (122KB HTML / 90KB SCSS): eliminate all 15 `<mat-spinner>` instances (replacing list/bench loaders with `<app-skeleton>` and button loaders with disabled `[attr.aria-busy]` / text labels), convert 32 `<div (click)>` metric cards & specimens to buttons, enforce strict semantic colors (`Critical` danger, `Completed` success, `Ordered` warning), preserve Doctor/Nurse/LabTechnician views.

### Phase 26 — Diagnostic Imaging & Radiology (`RadiologyComponent`)
- Refactor `src/app/features/radiology/radiology.component.*` (97KB HTML / 118KB SCSS): remove purple glow headers, pulse chips, decorative card shadows; convert 19 `<div (click)>` items to native `<button>`s; add `<app-skeleton>` loading states and `<app-status-chip>` across RIS worklist, structured reporting, radiation safety, and modality suites (preserving Radiologist/Doctor/Nurse permissions).

### Phase 27 — Nursing Procedures & Shift Handover (`NursingProceduresComponent`, `ShiftHandoverComponent`)
- Refactor both Nurse workflow components: replace all 6 `<mat-spinner>` loaders with `<app-skeleton>`, remove gradient styling, convert 4 clickable `<div>` cards to `<button>`, enforce semantic statuses and clean 2-col forms.

### Phase 28 — Billing & Financial Control Center (`BillingComponent`)
- Refactor `src/app/features/billing/billing.component.*` (86KB HTML / 27KB SCSS): replace 2 `<mat-spinner>`s with `<app-skeleton>`, convert 29 `<div (click)>` KPI & modal triggers to semantic buttons, remove inline arbitrary badge styles, use `<app-status-chip>` (`Paid`, `PartiallyPaid`, `Unpaid`, `Submitted`), maintain strict Pharmacist/LabTech/Receptionist/Accountant/Doctor scoping.

### Phase 29 — Executive P&L Reports & Data Export (`ReportsComponent`)
- Refactor `src/app/features/reports/reports.component.*`: remove inline `style="color: ..."` and emerald/rose/amber/purple gradient KPI accents; replace 2 `<mat-spinner>` loaders with `<app-skeleton>`; convert 5 `<div (click)>` triggers to `<button>`; provide accessible captions/tables alongside progress bars.

### Phase 30 — User Management, PBAC & Audit Trail (`UserManagementComponent`)
- Refactor `src/app/features/user-management/user-management.component.*`: remove inline emoji (`🚨`), animate fade-in fluff, and colored tiles; replace 3 `<mat-spinner>` loaders with `<app-skeleton>`; convert 10 `<div (click)>` tiles to buttons; verify PBAC checkbox matrix labels and HIPAA audit table `<th scope="col">`.

### Phase 31 — Accessibility & Automated `axe-core` Verification Sweep
- Conduct end-to-end static and live verification:
  - Keyboard-only navigation (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`) audit on all forms, tables, menus, and dialogs
  - Serve application (`ng serve`) and run automated `@axe-core/cli` / headless Chromium accessibility audits across all public and authenticated routes
  - Remediate any flagged contrast, heading hierarchy, ARIA, landmark, or label issues until zero critical/serious violations remain.

### Phase 32 — Cross-Role Security/UI Audit, Dead Code Cleanup & Plan Finalization
- Run repository-wide verification greps across `src/`:
  - Confirm **0 `<mat-spinner>`** occurrences remain
  - Confirm **0 decorative gradients / blur / glow / forbidden border radii / un-tokenized hex colors** remain in component SCSS
  - Verify all **9 roles** (`Admin`, `Doctor`, `Nurse`, `Receptionist`, `Pharmacist`, `LabTechnician`, `Radiologist`, `Accountant`, `Patient`) display only authorized navigation links and controls
  - Remove unused imports (`MatProgressSpinnerModule` where no longer needed), dead CSS classes, and update this plan (`docs/ui-refactor-plan.md`) with final completion status.

