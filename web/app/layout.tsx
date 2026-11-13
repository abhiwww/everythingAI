import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Everyday AI Concierge',
  description: 'AI-powered personal assistant for everyday services in Bengaluru',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
