import { hydrate } from 'react-dom'
import { ThemeProvider } from '@material-tailwind/react'
import { RemixBrowser } from '@remix-run/react'

hydrate(
  <ThemeProvider>
    <RemixBrowser />
  </ThemeProvider>,
  document
)
