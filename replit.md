# TravelHub — Agent Portal

A modern travel agency portal built with React + Vite + TypeScript + shadcn/ui.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router DOM v6
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand (global stores, all persisted to localStorage)
- **Data fetching**: TanStack Query v5
- **PDF**: jsPDF + jsPDF-AutoTable

## Project Structure

```
src/
  App.tsx                     # Root with providers & routes
  index.css                   # Design tokens & global styles
  components/
    AppSidebar.tsx            # White sidebar 228px with icons + full labels (TripLove style)
    DashboardLayout.tsx       # Page shell (sidebar + white floating card)
    CurrencyTicker.tsx        # Exchange rate ticker (header)
    CurrencyExchangeCard.tsx  # Rate card (dashboard)
    PdfPreviewDialog.tsx      # PDF export dialog
  pages/
    Index.tsx                 # Mounts Dashboard inside DashboardLayout
    Dashboard.tsx             # Trip package cards grid (add/delete trips)
    TripDetail.tsx            # Jamaah list for a trip (add/delete jamaah)
    JamaahProfile.tsx         # Jamaah profile with photo + document uploads
    Calculator.tsx            # Trip package price builder (with PDF export)
    Packages.tsx              # Package manager (CRUD)
    ProgressTracker.tsx       # Booking status pipeline
    Auth.tsx                  # Login / register
    NotFound.tsx
  features/
    calculator/               # Calculator logic & hook
    packages/                 # Package store, repo, form
    trips/
      tripsRepo.ts            # CRUD for trips, jamaah, docs (localStorage)
  store/
    ratesStore.ts             # Zustand: exchange rates
    packagesStore.ts          # Zustand: packages list
    tripsStore.ts             # Zustand: trips + jamaah + documents
  lib/
    exchangeRates.ts          # Rate fetch/mock logic
    generatePdf.ts            # PDF generation
    utils.ts                  # Tailwind cn helper
```

## Routes

| Path | Page |
|------|------|
| `/` | Dashboard — Trip cards grid |
| `/trips/:id` | TripDetail — Jamaah list |
| `/trips/:id/jamaah/:jamaahId` | JamaahProfile — Profile + documents |
| `/calculator` | Trip cost calculator |
| `/packages` | Package manager |
| `/progress` | Progress tracker |
| `/auth` | Login/register |

## Data Model (localStorage)

- **Trip**: id, name, destination, startDate, endDate, emoji, createdAt
- **Jamaah**: id, tripId, name, phone, birthDate, passportNumber, gender, photoDataUrl, createdAt
- **JamaahDoc**: id, jamaahId, category (passport|visa|ticket|medical|other), label, fileName, fileType, dataUrl (base64), createdAt

Documents are stored as base64 in localStorage (max ~5 MB per file).

## Design System

- **Color scheme**: Dark navy outer background, white content card, pink primary (hsl 344 70% 75%)
- **Sidebar**: Custom narrow 72px icon-only dark sidebar
- **Content card**: White `rounded-3xl` with `content-light` CSS class (resets variables to light mode)
- **Theme**: Pink/rose accent for active states, buttons, highlights
- **Mobile layout**: Compact spacing, shorter header/bottom navigation, smaller cards and controls under 640px

## Key CSS Classes

- `.gradient-primary` — pink gradient (brand color)
- `.shadow-glow` — pink glow shadow
- `.content-light` — resets CSS vars to light mode inside white card
- `.transition-smooth` — smooth cubic-bezier transition
