import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import SidebarWrapper from '@/components/SidebarWrapper' // <--- Import Wrapper

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hijab Ul Eman',
  description: 'Hijab Ul Eman Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex">
          {/* Use Wrapper here to auto-hide on login */}
          <SidebarWrapper />
          
          <div className="flex-1">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}