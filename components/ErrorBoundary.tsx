'use client';

import React from 'react';
import { Container, Card, Text, Button, Stack, Alert } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log auth-related errors specifically
    if (error.message.includes('refresh_token_not_found') ||
        error.message.includes('Invalid Refresh Token') ||
        error.message.includes('AuthApiError')) {
      console.log('🔐 Auth error caught, user should re-login');
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isAuthError = this.state.error?.message?.includes('refresh_token_not_found') ||
                         this.state.error?.message?.includes('Invalid Refresh Token') ||
                         this.state.error?.message?.includes('AuthApiError');

      return (
        <Container size="md" py="xl">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack>
              <Alert 
                icon={<IconAlertTriangle size={16} />} 
                title="Ein Fehler ist aufgetreten" 
                color={isAuthError ? "yellow" : "red"}
              >
                {isAuthError ? (
                  <Text>
                    Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an, um fortzufahren.
                  </Text>
                ) : (
                  <Text>
                    Entschuldigung, es ist ein unerwarteter Fehler aufgetreten.
                  </Text>
                )}
              </Alert>

              {!isAuthError && this.state.error && (
                <Card bg="gray.1" p="sm">
                  <Text size="sm" c="dimmed" mb="xs">Technische Details:</Text>
                  <Text size="xs" ff="monospace" c="dimmed">
                    {this.state.error.message}
                  </Text>
                </Card>
              )}

              <Button 
                onClick={isAuthError ? () => window.location.href = '/auth' : this.handleReset}
                variant={isAuthError ? "filled" : "light"}
              >
                {isAuthError ? 'Zur Anmeldung' : 'Erneut versuchen'}
              </Button>

              {!isAuthError && (
                <Button 
                  variant="subtle" 
                  onClick={() => window.location.href = '/'}
                >
                  Zur Startseite
                </Button>
              )}
            </Stack>
          </Card>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;