import { hydrateRoot } from 'react-dom/client'
import { ThemeProvider } from '@material-tailwind/react'
import { RemixBrowser } from '@remix-run/react'

hydrateRoot(
  document,
  <ThemeProvider>
    <RemixBrowser />
  </ThemeProvider>
)
