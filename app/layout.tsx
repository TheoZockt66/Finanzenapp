import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { Header } from '../components/layout/Header';
import React from "react";
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'dayjs/locale/de';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1b1e' }
  ],
}

export const metadata: Metadata = {
  title: "Haushaltsbuch",
  description: "Dein persönliches Haushaltsbuch",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Haushaltsbuch'
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Haushaltsbuch" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1a1b1e" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body suppressHydrationWarning>
        <MantineProvider defaultColorScheme="dark">
          <DatesProvider settings={{ locale: 'de', firstDayOfWeek: 1 }}>
            <Header />
            <main style={{ 
              paddingTop: '5rem', 
              padding: '5rem 1rem 2rem 1rem',
              minHeight: '100vh'
            }}>
              {children}
            </main>
            <Notifications />
          </DatesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
