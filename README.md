# Paginated Datatable

A modern React application featuring a paginated, selectable datatable built with [PrimeReact](https://primereact.org/). This project demonstrates advanced row selection logic, persistent selection state, and a clean, responsive UI for browsing data from API.

## Features

- **Paginated Table:** Browse artwork data with pagination controls.
- **Multi-Row Selection:** Select multiple rows across pages, with auto-selection and manual override.
- **Custom Selection Panel:** Overlay input for selecting a specific number of rows, distributed across pages.
- **Persistent Selection:** Selection state is saved in localStorage and restored on reload.
- **Responsive Design:** Optimized for desktop and mobile screens.
- **PrimeReact Components:** Uses DataTable, Paginator, OverlayPanel, and more.

## Technologies Used

- React 19
- TypeScript
- PrimeReact & PrimeIcons
- Vite

## Getting Started

### Installation
```bash
npm install
```

### Running the App
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
`
## How Row Selection Works
- Enter the number of rows to select in the overlay panel (click the chevron in the Title column header).
- The app auto-selects rows across pages, but manual selection overrides auto-selection for that page.
- Selection state is saved and restored automatically.

## API Reference
- Data is fetched from [Art Institute of Chicago API](https://api.artic.edu/docs/).