# 🏥 MediFlow Web Portal — Enterprise Clinical EHR & HIS Client

<div align="center">

[![Angular 22](https://img.shields.io/badge/Angular-22.1-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular Signals](https://img.shields.io/badge/State-Angular%20Signals-E03C31?style=for-the-badge)](https://angular.dev/guide/signals)
[![Zoneless](https://img.shields.io/badge/Performance-Zoneless%20CD-43A047?style=for-the-badge)](https://angular.dev/guide/experimental/zoneless)
[![NgRx SignalStore](https://img.shields.io/badge/Store-NgRx%20SignalStore-BA68C8?style=for-the-badge&logo=ngrx&logoColor=white)](https://ngrx.io/guide/signals/signal-store)
[![Angular Material](https://img.shields.io/badge/UI-Angular%20Material%2022-3F51B5?style=for-the-badge&logo=materialdesign&logoColor=white)](https://material.angular.io/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest%20(25%2F25%20Pass)-FCC72B?style=for-the-badge&logo=vitest&logoColor=black)](https://vitest.dev/)
[![Deep Dark Blue](https://img.shields.io/badge/Theme-Deep%20Dark%20Blue-0ea5e9?style=for-the-badge)](src/styles/_tokens.scss)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-0288D1?style=for-the-badge)](https://www.w3.org/WAI/WCAG21/quickref/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Medical-Grade, High-Performance Single Page Application (SPA) for Healthcare Professionals.</b>
  <br />
  Featuring <b>Zoneless Change Detection</b>, <b>Angular 22 Signals</b>, <b>NgRx SignalStore</b>, and <b>Deep Dark Blue (Midnight Slate) Theme</b>.
</p>

</div>

---

## 📋 Table of Contents
1. [Executive Overview](#-executive-overview)
2. [Dual Theme System (Deep Dark Blue & Light)](#-dual-theme-system-deep-dark-blue--light)
3. [9 Dedicated Role Dashboards Showcase](#-9-dedicated-role-dashboards-showcase)
4. [The 4 Core Enterprise UI Design Patterns](#-the-4-core-enterprise-ui-design-patterns)
5. [Frontend Architecture & State Management](#-frontend-architecture--state-management)
6. [Component & Directory Structure](#-component--directory-structure)
7. [Getting Started & Local Development](#-getting-started--local-development)
8. [Automated Testing with Vitest](#-automated-testing-with-vitest)
9. [Companion Backend API](#-companion-backend-api)

---

## 🌟 Executive Overview

**MediFlow Web Portal** is the official web client for the MediFlow Healthcare Information System. Built specifically for hospital staff and clinical specialists, it delivers a clutter-free, responsive, high-contrast, and fast interface across desktop and tablet form factors.

### Architecture Highlights
- **100% Standalone Angular 22:** Zero `NgModule` overhead; every component, directive, and pipe is standalone with direct dependency imports.
- **Zoneless Change Detection:** Employs `provideExperimentalZonelessChangeDetection()` for instantaneous UI rendering, minimal memory consumption, and zero zone.js monkey-patching.
- **Signal-Based Reactivity:** All view bindings and asynchronous states are driven by reactive Signals (`signal()`, `computed()`, and `effect()`).
- **NgRx SignalStore:** Enterprise-scale declarative state management with composable features (`withState`, `withComputed`, `withMethods`).
- **Real-Time SignalR WebSockets:** Live streaming of triage status transitions, critical panic lab values, emergency radiology orders, and cashier invoices.

---

## 🎨 Dual Theme System (Deep Dark Blue & Light)

MediFlow features full theme switching between a medical-grade **Clean Light Theme** and a sleek **Deep Dark Blue (Midnight Slate)** theme:

### Deep Dark Blue Theme Tokens
- **Canvas Base:** `#0a0f1d` (Rich Midnight)
- **Layer 1 Surface (Sidebars, Toolbars):** `#0f172a` (Slate Dark Blue)
- **Layer 2 Container (Cards, Tables, Modals):** `#17233f` (Deep Midnight Container)
- **High-Contrast Accents:** `#38bdf8` (Medical Sky Blue)
- **Crisp Borders:** `#1e3a5f` (Subtle Blue-Tinted Borders)
- *Strictly avoids muddy grays, dark browns, or washed-out tones.*

### Side-by-Side Theme Previews

| Clinical View | Light Mode | Deep Dark Blue Mode |
|---|---|---|
| **Doctor Cockpit** | <img src="screenshots/roles/doctor/01_clinical_cockpit_light.png" width="400" /> | <img src="screenshots/roles/doctor/01_clinical_cockpit_dark.png" width="400" /> |
| **Nurse Triage Desk** | <img src="screenshots/roles/nurse/01_nurse_dashboard_light_mode.png" width="400" /> | <img src="screenshots/roles/nurse/03_nurse_dashboard_dark_mode.png" width="400" /> |
| **Admin Cockpit** | <img src="screenshots/roles/admin/01-admin-dashboard-overview-light.png" width="400" /> | <img src="screenshots/roles/admin/02-admin-dashboard-overview-dark.png" width="400" /> |
| **Financial Cockpit** | <img src="screenshots/roles/accountant/01_financial_cockpit_dashboard_light.png" width="400" /> | <img src="screenshots/roles/accountant/01_financial_cockpit_dashboard_dark.png" width="400" /> |
| **PIS Pharmacy Cockpit** | <img src="screenshots/roles/pharmacist/01_dispensary_cockpit_light.png" width="400" /> | <img src="screenshots/roles/pharmacist/01_dispensary_cockpit_dark.png" width="400" /> |
| **LIMS Lab Cockpit** | <img src="screenshots/roles/lab-technician/01_lims_cockpit_dashboard_light.png" width="400" /> | <img src="screenshots/roles/lab-technician/01_lims_cockpit_dashboard_dark.png" width="400" /> |
| **RIS Radiology Worklist**| <img src="screenshots/roles/radiologist/02_radiology_dashboard_worklist_and_equipment_light.png" width="400" /> | <img src="screenshots/roles/radiologist/01_radiology_dashboard_cockpit_dark.png" width="400" /> |
| **Receptionist Arrival Desk**| <img src="screenshots/roles/receptionist/01_receptionist_dashboard_light.png" width="400" /> | <img src="screenshots/roles/receptionist/02_receptionist_dashboard_dark.png" width="400" /> |

---

## 🖥️ 9 Dedicated Role Dashboards Showcase

Every healthcare role in MediFlow has a bespoke, database-backed operational cockpit with zero placeholder widgets:

### 1. Medical Doctor
- **Real-Time Patient Consultation Queue:** Shows waiting, in-consultation, and completed patients with triage acuity flags.
- **SOAP Clinical Encounter Documentation:** Fast tabbed entry for Subjective, Objective, Assessment, and Plan notes.
- **Integrated Diagnostic Orders:** One-click generation of laboratory panels and diagnostic imaging requisitions.

<div align="center">
  <img src="screenshots/roles/doctor/03_soap_encounter_modal_top_light.png" alt="Doctor SOAP Encounter Documentation" width="95%" />
</div>

---

### 2. Clinical Nurse
- **Emergency Severity Index (ESI) Triage:** Visual classification with color-coded severity badges (Resuscitation, Emergent, Urgent, Non-Urgent).
- **Live Vital Signs Telemetry:** Systolic/Diastolic BP, Heart Rate, SpO2, Respiratory Rate, and Temperature with threshold validation.

<div align="center">
  <img src="screenshots/roles/nurse/02_nurse_dashboard_triage_modal_light.png" alt="Nurse Triage Assessment Modal" width="95%" />
</div>

---

### 3. Hospital Administration & Governance
- **Multi-Role Shift Rostering:** Calendar grid for scheduling and clock-in auditing across all medical departments.
- **PBAC Security Matrix:** Visual configuration of role policies and duty coverage delegations.
- **Immutable HIPAA Audit Trail:** Real-time stream of all electronic protected health information (ePHI) access events.

<div align="center">
  <img src="screenshots/roles/admin/07-admin-pbac-permission-matrix-doctor-light.png" alt="Admin PBAC Permission Matrix" width="48%" />
  <img src="screenshots/roles/admin/13-admin-multi-role-shift-rostering-dark.png" alt="Admin Multi-Role Rostering" width="48%" />
</div>

---

### 4. Financial Accountant
- **Accounts Receivable & Payable:** Aging ledgers, payment settlement modals, and supplier invoice registration.
- **Electronic Insurance Clearinghouse:** Batch claim submission, pre-authorization codes, and remittance reconciliations.
- **Payroll & Commission Disbursements:** Doctor consultation fees and staff payroll execution.

<div align="center">
  <img src="screenshots/roles/accountant/02_invoices_and_ar_ledger_light.png" alt="Accountant AR Ledger" width="48%" />
  <img src="screenshots/roles/accountant/05_insurance_claims_clearinghouse_light.png" alt="Insurance Claims Clearinghouse" width="48%" />
</div>

---

### 5. Dispensary Pharmacist
- **Live Prescription Queue:** Real-time dispensing feed populated directly from doctor SOAP sign-offs.
- **Drug Formulary Catalog:** Safety stock thresholds, automated reorder alerts, and batch expiry dates.
- **Schedule II Controlled Substances Audit:** Dual-signature dispensing verification and digital audit trails.

<div align="center">
  <img src="screenshots/roles/pharmacist/02_prescription_orders_queue_dark.png" alt="Pharmacist Prescription Queue" width="48%" />
  <img src="screenshots/roles/pharmacist/07_drug_formulary_catalog_light.png" alt="Pharmacist Drug Formulary" width="48%" />
</div>

---

### 6. Laboratory Technician
- **Specimen Accessioning:** Unique barcode generation and specimen collection tracking.
- **Diagnostic Analyzer Worklist:** Automated test panels (CBC, Comprehensive Metabolic, Lipid Profile).
- **Panic Value Alerts:** Immediate visual flags when critical clinical delta-checks fail.

<div align="center">
  <img src="screenshots/roles/lab-technician/02_diagnostic_worklist_grid_dark.png" alt="LIMS Diagnostic Worklist" width="95%" />
</div>

---

### 7. Diagnostic Radiologist
- **Modality Worklist (MWL):** Real-time queue for X-Ray, CT, MRI, and Ultrasound suites.
- **Web-PACS Workstation:** Embedded DICOM viewer with window leveling, zoom, pan, and measurement tools.
- **Structured Radiological Reports:** BIRADS/RECIST standard reporting templates with digital signature sign-off.

<div align="center">
  <img src="screenshots/roles/radiologist/07_web_pacs_dicom_viewer_workstation.png" alt="Web-PACS DICOM Workstation" width="95%" />
</div>

---

### 8. Front-Desk Receptionist
- **Arrivals & Queue Desk:** Walk-in registration, check-in queue tickets, and doctor assignment.
- **Master Patient Index (MPI):** Fast lookup by National ID, phone number, or MRN with insurance status check.
- **Cashier Invoicing & Payments:** Shift drawer balancing, cash float reconciliation, and PDF receipts.

<div align="center">
  <img src="screenshots/roles/receptionist/03_arrivals_and_queue_desk_light.png" alt="Receptionist Arrivals Desk" width="48%" />
  <img src="screenshots/roles/receptionist/05_book_appointment_consultation_form_light.png" alt="Appointment Booking Form" width="48%" />
</div>

---

### 9. Patient Portal
- **Personal Health Record (PHR):** Secure access to diagnosis history, doctor consultation notes, and vitals timeline.
- **Prescription Refills & Lab Reports:** Instant PDF download of certified laboratory results and medication regimens.

<div align="center">
  <img src="screenshots/roles/patient/01_dashboard_light.png" alt="Patient Portal" width="95%" />
</div>

---

## 📐 The 4 Core Enterprise UI Design Patterns

MediFlow strictly enforces 4 foundational UI design patterns:

### 1. Skeleton Loaders (`<app-skeleton>`)
Replaces generic spinning wheels with content-shaped shimmering placeholders:
- Variants: `text`, `row`, `card`, `avatar`, and `table`.
- Shimmer animation: Subtle, CSS `@keyframes` with accessible contrast matching the current theme.

### 2. Semantic Color System
Color conveys clinical and financial state, never mere decoration:
- **Success / Positive (`#2e7d32`):** Completed, Paid, Checked-In, Normal Vitals.
- **Warning / Attention (`#ed6c02`):** Scheduled, Partially Paid, Low Stock, Abnormal Delta.
- **Danger / Critical (`#c62828`):** Cancelled, Unpaid, Out of Stock, Panic Lab Value, Resuscitation Acuity.
- **Info / Neutral (`#0288d1`):** In-Consultation, Informational badges.

### 3. Clutter-Free Ergonomic Workflows
- **Modern Sidebar:** Crisp active pill indicator, subtle hover states, brand emblem, and role badge.
- **Eliminated Distractions:** Zero decorative hero banners, unneeded gradients, or redundant icons.
- **Consistent Page Layouts:** Every screen features an accessible `<app-page-header>` with clear actions.

### 4. WCAG 2.1 AA Accessibility
- **Full Keyboard Navigation:** Logical tab sequences across all data tables, filters, and modal dialogues.
- **Visible Focus Rings:** High-visibility focus rings on all interactive elements.
- **Screen Reader Support:** Semantic HTML (`<main>`, `<nav>`, `<h1>`), explicit `aria-label` tags, and `aria-live="polite"` snackbar announcements.

---

## 🏛️ Frontend Architecture & State Management

```mermaid
flowchart TD
    subgraph UI["Component Layer (Standalone)"]
        Dashboard["Role-Specific Dashboards"]
        ClinicalComponents["EMR, Triage, PIS, LIMS, RIS Views"]
        SharedPrimitives["app-skeleton, app-status-chip, app-page-header"]
    end

    subgraph State["Reactive State Layer (NgRx SignalStore)"]
        AuthStore["AuthStore (User, Role, Token)"]
        ClinicStore["ClinicStore (Metrics, Queues, Appointments)"]
        LabStore["LabStore (Specimens, Analyzers)"]
        ThemeStore["ThemeService (Light / Deep Dark Blue)"]
    end

    subgraph Services["Core Infrastructure Services"]
        HttpService["ApiClient (JWT Bearer Interceptor)"]
        SignalrService["SignalrService (WSS Real-Time Streams)"]
        NotificationService["NotificationService (MatSnackBar)"]
    end

    subgraph Backend["MediFlow Backend API"]
        API["ASP.NET Core 10 Web API (:5041)"]
        Hubs["SignalR Hubs (:5041/hubs)"]
    end

    UI --> State
    State --> Services
    Services <-->|REST HTTP| API
    Services <-->|WebSockets| Hubs
```

---

## 📂 Component & Directory Structure

```
clinic-client/
├── screenshots/                     # 📸 High-resolution UI screenshots across all 9 roles
│   └── roles/                       # (admin, doctor, nurse, receptionist, pharmacist, accountant, ...)
├── src/
│   ├── app/
│   │   ├── core/                    # Core singleton services, guards, and interceptors
│   │   │   ├── auth/                # JWT authentication service & storage
│   │   │   ├── guards/              # RoleGuard & AuthGuard
│   │   │   ├── interceptors/        # JwtInterceptor, ErrorInterceptor
│   │   │   ├── real-time/           # SignalrService for live clinical queues
│   │   │   └── theme/               # ThemeService (Deep Dark Blue & Light)
│   │   ├── features/                # 9 Clinical & Operational feature modules
│   │   │   ├── appointments/        # Booking, doctor schedules, waitlists
│   │   │   ├── billing/             # Invoices, cashier drawer, insurance claims
│   │   │   ├── consultations/       # SOAP encounters, EMR clinical notes
│   │   │   ├── dashboard/           # 9 Role-specific high-density dashboards
│   │   │   ├── lab/                 # LIMS accessioning & test worklist
│   │   │   ├── patients/            # Master Patient Index (MPI) & registration
│   │   │   ├── pharmacy/            # PIS dispensing & drug formulary
│   │   │   ├── radiology/           # RIS modality worklist & DICOM viewer
│   │   │   ├── triage/              # Emergency nurse triage desk & vitals
│   │   │   └── user-management/     # Staff directory, PBAC matrix, rostering
│   │   ├── shared/                  # Reusable UI components & design primitives
│   │   │   ├── skeleton/            # <app-skeleton> loading shimmer
│   │   │   ├── status-chip/         # <app-status-chip> semantic status badges
│   │   │   ├── empty-state/         # <app-empty-state> zero-data placeholders
│   │   │   └── page-header/         # <app-page-header> standardized header bar
│   │   └── shell/                   # Application layout shell (Sidebar, Topbar)
│   ├── assets/                      # Static branding and icons
│   ├── environments/                # Environment configs (development, production)
│   └── styles/                      # Global SCSS tokens and Angular Material theme
│       ├── _tokens.scss             # Deep Dark Blue & Light CSS custom properties
│       └── _material-theme.scss     # Angular Material M3 overrides
├── vitest.config.ts                 # Vitest runner configuration
├── angular.json                     # Angular CLI build configuration
└── package.json                     # Dependencies & scripts
```

---

## 🚀 Getting Started & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v22.x LTS or higher)
- [npm](https://www.npmjs.com/) (v10.x or higher)
- Running instance of the [MediFlow Backend API](https://github.com/Merdikai/ClinicManagementSystem) on `http://localhost:5041`

### Step 1: Clone Repository
```bash
git clone https://github.com/Merdikai/Clinic-client.git
cd Clinic-client
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Local Development Server
```bash
npm start
```
The application will launch at `http://localhost:4200/`.

---

## 🧪 Automated Testing with Vitest

MediFlow Web Client uses [Vitest](https://vitest.dev/) for high-speed unit and component testing:

```
Test Files: 17 passed (17)
Tests:      25 passed (25)
Duration:   Clean execution with zero failures
```

### Run Test Suite
```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Build Production Bundle
```bash
npm run build
```
Compiled, optimized artifacts are generated in the `dist/` directory.

---

## 🔗 Companion Backend API

This client connects to the **MediFlow Enterprise Backend API**:
- **Backend Repository:** [Merdikai/ClinicManagementSystem](https://github.com/Merdikai/ClinicManagementSystem)
- **Technology:** .NET 10, PostgreSQL 17, MediatR CQRS, EF Core, SignalR WebSockets

---

<div align="center">
  <sub>Engineered for clinical precision, performance, and healthcare excellence.</sub>
</div>
