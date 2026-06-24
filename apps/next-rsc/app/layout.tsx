import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'effract · Next.js RSC',
  description: 'React Effect Components, streamed as React Server Components.',
};

export default function RootLayout({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
