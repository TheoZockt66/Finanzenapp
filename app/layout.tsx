import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from '../contexts/AuthContext';
import { ConditionalLayout } from '../components/layout/ConditionalLayout';
import { FullscreenManager } from '../components/FullscreenManager';
import ErrorBoundary from '../components/ErrorBoundary';
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
  viewportFit: 'cover',
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
    statusBarStyle: 'black-translucent',
    title: 'Haushaltsbuch',
    startupImage: [
      {
        url: '/icon-512.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'mobile-web-app-status-bar-style': 'black-translucent',
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Haushaltsbuch" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-TileColor" content="#339af0" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#1a1b1e" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
      </head>
      <body suppressHydrationWarning>
        <FullscreenManager />
        <MantineProvider defaultColorScheme="dark">
          <DatesProvider settings={{ locale: 'de', firstDayOfWeek: 1 }}>
            <ErrorBoundary>
              <AuthProvider>
                <ConditionalLayout>
                  {children}
                </ConditionalLayout>
                <Notifications />
              </AuthProvider>
            </ErrorBoundary>
          </DatesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
