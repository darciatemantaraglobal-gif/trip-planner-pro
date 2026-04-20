# IGH Tour — Travel Management App

Aplikasi manajemen trip Umrah & Haji berbasis React + Vite + TypeScript + shadcn/ui.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router DOM v6
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand (global stores, semua persisted ke localStorage)
- **Data fetching**: TanStack Query v5
- **PDF**: jsPDF + jsPDF-AutoTable
- **OCR**: tesseract.js (client-side MRZ passport scan)
- **PWA**: vite-plugin-pwa (offline support, installable)
- **Exchange Rates**: Frankfurter API (free, no key) via Vite proxy

## Fitur Utama (7 feature milestone)

1. **Real-time Kurs (T001)** — `src/lib/exchangeRates.ts`, `src/store/ratesStore.ts`
   - Frankfurter API (IDR→USD,SAR), cache 5 menit, markup/buffer slider 0-5%
   - Live ticker di header DashboardLayout (dengan refresh button)
   - Proxy `/api/frankfurter` untuk dev (bypass CORS localhost)

2. **PWA Readiness (T002)** — `vite.config.ts`
   - vite-plugin-pwa: manifest, service worker, offline cache, installable

3. **Gamified Progress Tracker (T003)** — `src/pages/ProgressTracker.tsx`, `src/pages/JamaahProfile.tsx`
   - Per jamaah: step Terdaftar → Dokumen → Pembayaran → Disetujui → Siap Berangkat
   - Progress bar + ring visual per trip di ProgressTracker
   - Summary card: Total Jamaah, Siap Berangkat, Progres Rata-rata
   - Progress card di JamaahProfile (6 step badges)
   - Status paket (PackageTrackerSection) digabung dalam satu halaman

4. **PDF Branding & Live Preview (T004)** — `src/pages/PdfGenerator.tsx`
   - Live Preview HTML dengan font Montserrat (Google Fonts) via iframe srcDoc
   - Toggle show/hide preview, update real-time setiap ketik form

5. **OCR Passport Scan (T005)** — `src/lib/ocrPassport.ts`, `src/pages/JamaahProfile.tsx`
   - Tesseract.js MRZ parsing: nama, nomor paspor, tanggal lahir, gender
   - Tombol "Scan Paspor (OCR)" di edit mode JamaahProfile
   - Progress % saat scanning

6. **Agent Self-Login / RBAC (T006)** — `src/store/authStore.ts`, `src/pages/Login.tsx`
   - Default: admin/admin123 (superadmin)
   - localStorage-based auth dengan SHA-256 hash
   - Zustand authStore dengan roles: superadmin/agent
   - RequireAuth guard di App.tsx
   - Login utama hanya memakai halaman `/login` agar tidak dobel dengan splash overlay
   - Settings tab "Agen" untuk tambah/hapus agen (superadmin only)

7. **Real-time Sync Simulation (T007)** — `src/lib/syncBus.ts`
   - BroadcastChannel API untuk sync antar tab browser
   - Tanpa Supabase (Supabase tidak tersedia di free tier)

8. **Detail Paket Terpisah + Kalkulator + OCR Jamaah** — `src/pages/Packages.tsx`, `src/pages/PackageDetail.tsx`
   - Setiap card paket di `/packages` membuka detail sendiri di `/packages/:id`
   - Detail paket punya kalkulator biaya per paket yang tersimpan di localStorage dan bisa menyimpan total ke paket
   - Detail paket punya daftar jamaah terpisah per paket dengan tambah jamaah via OCR paspor

## Project Structure

```
src/
  App.tsx                     # Root dengan providers, routes, RequireAuth guard
  index.css                   # Design tokens & global styles
  components/
    AppSidebar.tsx            # Sidebar navigasi
    DashboardLayout.tsx       # Shell: sidebar + rates ticker + user info + logout
    SplashScreen.tsx          # Branded splash screen
    PdfPreviewDialog.tsx      # Dialog PDF export
  pages/
    Login.tsx                 # Halaman login (username + password)
    Index.tsx                 # Mounts Dashboard
    Dashboard.tsx             # Grid trip cards (tambah/hapus trip)
    TripDetail.tsx            # List jamaah per trip
    JamaahProfile.tsx         # Profil jamaah: photo, OCR scan, gamified progress, dokumen
    Calculator.tsx            # Kalkulator harga paket + offer table
    Packages.tsx              # CRUD paket
    ProgressTracker.tsx       # Progress per jamaah per trip + status paket
    PdfGenerator.tsx          # PDF generator dengan live preview Montserrat
    Settings.tsx              # Settings: Kurs, Agen, Tampilan, Regional, dll
    NotFound.tsx
  features/
    calculator/               # Calculator logic & hook
    packages/                 # Package store, repo, form
    pdfTemplate/              # Template editor untuk PDF branding
    trips/
      tripsRepo.ts            # CRUD trips/jamaah/docs (localStorage)
  store/
    authStore.ts              # Auth + RBAC (login, logout, addAgent, removeAgent)
    ratesStore.ts             # Exchange rates + markup
    packagesStore.ts          # Packages list
    tripsStore.ts             # Trips + jamaah + documents
  lib/
    exchangeRates.ts          # Fetch Frankfurter API + cache + fallback
    generatePdf.ts            # PDF generation (jsPDF)
    ocrPassport.ts            # OCR MRZ passport parsing (tesseract.js)
    syncBus.ts                # BroadcastChannel sync antar tab
    appearance.ts             # Persistent appearance settings
    utils.ts                  # cn helper
```

## Routes

| Path | Page |
|------|------|
| `/login` | Halaman login |
| `/` | Dashboard — Trip cards |
| `/trips/:id` | TripDetail — Jamaah list |
| `/trips/:id/jamaah/:jamaahId` | JamaahProfile — Profil + OCR + progress + dokumen |
| `/calculator` | Kalkulator harga |
| `/packages` | Package manager |
| `/packages/:id` | Detail paket — kalkulator paket + jamaah OCR |
| `/progress` | Progress tracker per jamaah & paket |
| `/pdf-generator` | PDF generator + live preview |
| `/settings` | Pengaturan app (kurs, agen, tampilan) |

## Data Model (localStorage)

- **Trip**: id, name, destination, startDate, endDate, emoji, createdAt
- **Jamaah**: id, tripId, name, phone, birthDate, passportNumber, gender, photoDataUrl, createdAt
- **JamaahDoc**: id, jamaahId, category (passport|visa|ticket|medical|other), label, fileName, fileType, dataUrl (base64), createdAt
- **AuthUser**: username, displayName, role (superadmin|agent), agentId

## Design System

- **Brand**: Orange gradient (#f97316 → #ea580c), warm background
- **Cards**: rounded-2xl/3xl white cards dengan border subtle
- **Sidebar**: Dark narrow sidebar + white content area
- **Mobile**: Bottom nav 6 items, compact layout
- **Font PDF**: Montserrat via Google Fonts (live preview iframe + jsPDF helvetica fallback)

## Default Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: superadmin
