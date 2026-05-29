import type { Metadata } from 'next'
import '@setemiojo/playground-react/styles'
import './globals.css'

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
