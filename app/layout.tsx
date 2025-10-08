import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Haushaltsbuch",
  description: "Dein persönliches Haushaltsbuch",
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
      </head>
      <body suppressHydrationWarning>
        <MantineProvider defaultColorScheme="dark">
          <DatesProvider settings={{ locale: 'de', firstDayOfWeek: 1 }}>
            <Header />
            <main style={{ paddingTop: '6rem', padding: '6rem 2rem 2rem 2rem' }}>
              {children}
            </main>
            <Notifications />
          </DatesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
