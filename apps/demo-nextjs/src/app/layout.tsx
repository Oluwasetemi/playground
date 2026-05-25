import type { Metadata } from 'next'
import './globals.css'
import '@setemiojo/playground-react/styles'

export const metadata: Metadata = {
  title: 'Playground — Next.js Demo',
  description: 'Code playground embedded in a Next.js app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
