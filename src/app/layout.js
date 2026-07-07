import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: 'LUSL MIS | Limkokwing MIS Sierra Leone',
  description: 'Advanced Institutional Management System',
}

import { ConvexClientProvider } from '../components/ConvexClientProvider'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased selection:bg-purple-500/30">
      <body className={`${jakarta.className} bg-[#EBE4F4] text-slate-800 min-h-screen`} suppressHydrationWarning>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  )
}
