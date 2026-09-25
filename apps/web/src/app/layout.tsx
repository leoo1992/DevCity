import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { StoreProvider } from '@/store/store';
import './globals.css';

const sans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'DevCity — Turn code into a city',
  description:
    'Explore GitHub repositories as interactive 3D cities. Folders become districts and files become buildings.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07090d',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={sans.variable + ' ' + mono.variable}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
