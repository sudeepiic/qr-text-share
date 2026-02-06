import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QR Text Share - Share Text Between Devices',
  description: 'Instantly share text between your desktop and mobile devices using QR codes. No apps required.',
  keywords: ['QR code', 'text sharing', 'cross-device', 'mobile', 'desktop'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
