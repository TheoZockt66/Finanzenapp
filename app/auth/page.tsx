'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Center, Loader } from '@mantine/core';
import { useAuth } from '../../contexts/AuthContext';
import { AuthContainer } from '../../components/auth/AuthContainer';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Container size="sm" h="100vh">
        <Center h="100%">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (user) {
    return (
      <Container size="sm" h="100vh">
        <Center h="100%">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--mantine-color-dark-8)'
    }}>
      <Container size="sm" py="xl">
        <AuthContainer />
      </Container>
    </div>
  );
}