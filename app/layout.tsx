import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tika',
  description: '티켓 기반 칸반 보드',
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="ko">
    <body>{children}</body>
  </html>
);

export default RootLayout;
