import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import App from './App.jsx'

// One cache for the whole app (Jui, 2026-10-08 — decisions in todo.TODO).
// Pages override these per query with the presets in src/queries.js.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data is shown at once and always refetched behind it
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      // Atlas is slow enough that the default 3 retries with back-off would
      // keep "Loading…" up for ~10s before an error shows
      retry: 1,
      // Coming back from LINE shows fresh lists right away
      refetchOnWindowFocus: true,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Development only: the package leaves itself out of production builds */}
      <ReactQueryDevtools />
    </QueryClientProvider>
  </StrictMode>,
)
