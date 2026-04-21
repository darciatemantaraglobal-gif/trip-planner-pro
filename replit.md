# IGH Tour — Travel Management App

Aplikasi manajemen trip Umrah & Haji berbasis React + Vite + TypeScript + shadcn/ui.

## Calculator — Batch Update (Completed)
- `effectiveRates` — kurs override per-form (localRateSAR/localRateUSD), fallback ke rates store
- `toIDR` menggunakan effectiveRates
- `komisiFee` ditambahkan ke perPaxItemsIDR (×pax) dan pdfCosts
- Rates strip jadi editable inline: input per currency, tombol ↩ reset ke Pengaturan
- F&B toggle di setiap hotel section ("Include/Exclude F&B") — state fbMakkah/fbMadinah
- Hotel label di pdfCosts diannot dengan "· incl. F&B" jika aktif
- Komisi Fee field di Biaya Per Pax (NumInputWithCurrency)
- Transport: custom airline text input muncul saat jenis === "custom"
- pdfCosts transport label gunakan customJenis jika custom

## Halaman Catatan (Completed)
- `src/pages/Notes.tsx` — CRUD notes, warna card picker, search, salin, Rapihkan AI
- Storage: `localStorage` key `travelhub.notes.v1`
- "Rapihkan AI" — coba `window.ai.generateText` jika tersedia, fallback ke `smartFormat()` (regex: bullet normalization, kapitalisasi, tanda baca)
- Route `/notes` di App.tsx, nav item "Catatan" (StickyNote icon) di Tools group AppSidebar + bottomNavItems DashboardLayout

## Dialog Redesign (Completed)
Semua popup dialog telah didesain ulang dengan sistem desain yang konsisten:
- `src/components/ui/alert-dialog.tsx` — base compact (max-w-sm, rounded-2xl)
- `src/pages/Dashboard.tsx` — AddTripDialog (2-column grid, h-8 inputs)
- `src/pages/TripDetail.tsx` — AddJamaahDialog (compact, OCR+photo row)
- `src/pages/PackageDetail.tsx` — AddJamaahWithOcrDialog (compact)
- `src/features/packages/PackageFormDialog.tsx` — cover banner, emoji picker, profit preview
- `src/components/BulkOcrDialog.tsx` — 3-phase stepper (upload→scan→review)
- `src/components/PdfPreviewDialog.tsx` — template preview + default layout
- `src/pages/Settings.tsx` — PIN Setup Dialog (compact max-w-xs)

**Design system**: h-8/h-9 inputs, text-[10px] uppercase labels, rounded-xl/2xl, orange gradient `linear-gradient(135deg,#f97316,#ea580c)` primary actions, Montserrat font.

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
   - Mode kurs: Live Otomatis atau Manual Lapangan, tersimpan di localStorage dan dipakai semua kalkulator

2. **PWA Readiness (T002)** — `vite.config.ts`
   - vite-plugin-pwa: manifest, service worker, offline cache, installable
   - Mobile/PWA viewport dikunci ke skala 1, memakai `viewport-fit=cover`, touch target minimal 44px, dan input 16px untuk mencegah auto-zoom saat app atau popup/dialog dibuka

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
   - Login utama hanya memakai halaman `/login` dengan desain splash-style agar tidak dobel dengan splash overlay
   - Settings tab "Agen" untuk tambah/hapus agen (superadmin only)

7. **Real-time Sync Simulation (T007)** — `src/lib/syncBus.ts`
   - BroadcastChannel API untuk sync antar tab browser
   - Tanpa Supabase (Supabase tidak tersedia di free tier)

8. **Detail Paket Terpisah + Kalkulator + OCR Jamaah** — `src/pages/Packages.tsx`, `src/pages/PackageDetail.tsx`
   - Setiap card paket di `/packages` membuka detail sendiri di `/packages/:id`
   - Detail paket punya kalkulator biaya per paket yang tersimpan di localStorage dan bisa menyimpan total ke paket
   - Detail paket punya daftar jamaah terpisah per paket dengan tambah jamaah via OCR paspor
   - Package card di `/packages` memakai gaya Executive Summary: status/countdown, okupansi dari `travelhub.jamaah.v2`, financial snapshot dari `travelhub.package.calculations.v1`, info logistik, dan shortcut Kalkulasi/Jemaah/OCR tanpa memicu klik card utama

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
    Packages.tsx              # CRUD paket + Executive Summary package cards
    PackageDetail.tsx         # Detail paket + tab calculator/jamaah + OCR shortcut
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
    regionalStore.ts          # Regional settings: language, timezone, currency, dateFormat (persisted localStorage)
  lib/
    exchangeRates.ts          # Fetch Frankfurter API + cache + fallback
    generatePdf.ts            # PDF generation (jsPDF)
    ocrPassport.ts            # OCR MRZ passport parsing (tesseract.js)
    syncBus.ts                # BroadcastChannel sync antar tab
    appearance.ts             # Persistent appearance settings
    regional.ts               # useRegional() hook + formatCurrency / formatDate helpers (regional-aware)
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
| `/packages/:id?tab=calculator` | Detail paket langsung tab kalkulator |
| `/packages/:id?tab=jamaah` | Detail paket langsung tab jamaah |
| `/packages/:id?tab=jamaah&ocr=1` | Detail paket langsung buka dialog tambah jamaah OCR |
| `/progress` | Progress tracker per jamaah & paket |
| `/pdf-generator` | PDF generator + live preview |
| `/settings` | Pengaturan app (kurs, agen, tampilan) |

## Data Model (localStorage)

- **Trip**: id, name, destination, startDate, endDate, emoji, createdAt
- **Jamaah**: id, tripId, name, phone, birthDate, passportNumber, gender, photoDataUrl, createdAt
- **JamaahDoc**: id, jamaahId, category (passport|visa|ticket|medical|other), label, fileName, fileType, dataUrl (base64), createdAt
- **AuthUser**: username, displayName, role (superadmin|agent), agentId
- **PackageCalculation**: tersimpan di `travelhub.package.calculations.v1` per packageId untuk HPP, margin, dan final price paket

## Design System

- **Brand**: Orange gradient (#f97316 → #ea580c), warm background
- **Cards**: rounded-2xl/3xl white cards dengan border subtle
- **Sidebar**: Dark narrow sidebar + white content area
- **Mobile**: Bottom nav 6 items, compact layout
- **Font PDF & Package Summary**: Montserrat via Google Fonts (global import + live preview iframe) dengan jsPDF helvetica fallback

## Default Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: superadmin
