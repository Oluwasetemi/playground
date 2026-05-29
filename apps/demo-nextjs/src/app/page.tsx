'use client'

import dynamic from 'next/dynamic'

// ssr: false prevents @webcontainer/api (and the entire playground import chain)
// from executing on the server, where browser globals are unavailable.
const PlaygroundClient = dynamic(() => import('./playground-client'), { ssr: false })

export default function Page() {
  return <PlaygroundClient />
}
