'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { Center, Loader, Container } from '@mantine/core';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { loading } = useAuth();
  
  // Hide header on auth pages
  const isAuthPage = pathname?.startsWith('/auth');
  
  // Show loading spinner while auth is loading (except on auth pages)
  if (loading && !isAuthPage) {
    return (
      <>
        <Header />
        <main style={{ 
          paddingTop: '5rem', 
          padding: '5rem 1rem 2rem 1rem',
          minHeight: '100vh'
        }}>
          <Container size="sm" h="50vh">
            <Center h="100%">
              <Loader size="lg" />
            </Center>
          </Container>
        </main>
      </>
    );
  }
  
  // On auth pages: no header, special styling
  if (isAuthPage) {
    return (
      <main style={{ 
        padding: '0',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {children}
      </main>
    );
  }
  
  // Regular pages: always show header
  return (
    <>
      <Header />
      <main style={{ 
        paddingTop: '5rem', 
        padding: '5rem 1rem 2rem 1rem',
        minHeight: '100vh'
      }}>
        {children}
      </main>
    </>
  );
}