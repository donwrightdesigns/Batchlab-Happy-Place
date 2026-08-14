import type {Metadata} from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'BatchLab Photo Engine',
  description: 'Batch Image Processing & Enhancement Engine with Memory and AI Studio',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="bg-[#F8F9FA] text-[#1A1C1E] font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
