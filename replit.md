# TravelHub — Agent Portal

A modern travel agency portal built with React + Vite + TypeScript + shadcn/ui.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router DOM v6
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand (global stores for rates & packages)
- **Data fetching**: TanStack Query v5
- **PDF**: jsPDF + jsPDF-AutoTable

## Project Structure

```
src/
  App.tsx                     # Root with providers & routes
  index.css                   # Design tokens & global styles
  components/
    AppSidebar.tsx            # Custom narrow icon-only sidebar
    DashboardLayout.tsx       # Page shell (sidebar + white card)
    CurrencyTicker.tsx        # Exchange rate ticker (header)
    CurrencyExchangeCard.tsx  # Rate card (dashboard)
    PdfPreviewDialog.tsx      # PDF export dialog
  pages/
    Index.tsx / Dashboard.tsx # Main dashboard
    Calculator.tsx            # Trip package price builder
    Packages.tsx              # Package manager (CRUD)
    ProgressTracker.tsx       # Booking status pipeline
    Auth.tsx                  # Login / register
    NotFound.tsx
  features/
    calculator/               # Calculator logic & hook
    packages/                 # Package store, repo, form
  store/
    ratesStore.ts             # Zustand: exchange rates
    packagesStore.ts          # Zustand: packages list
  lib/
    exchangeRates.ts          # Rate fetch/mock logic
    generatePdf.ts            # PDF generation
    utils.ts                  # Tailwind cn helper
```

## Design System

- **Color scheme**: Dark navy outer background (`hsl(231 35% 13%)`), white content card, pink primary (`hsl(344 70% 75%)`)
- **Sidebar**: Custom narrow (72px) icon-only dark sidebar — no shadcn Sidebar component
- **Content card**: White `rounded-3xl` card with `content-light` CSS class to reset variables to light mode
- **Theme**: Pink/rose accent (#f4a5b5 range) for active states, buttons, and highlights

## Key CSS Classes

- `.gradient-primary` — pink gradient (primary brand color)
- `.shadow-glow` — pink glow shadow
- `.content-light` — resets CSS variables to light mode (used on white card)
- `.transition-smooth` — smooth cubic-bezier transition

## Running the App

The `Start application` workflow runs `npm run dev` on port 5000.
