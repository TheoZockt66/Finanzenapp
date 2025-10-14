'use client';

import { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Divider,
  Alert,
  Box
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import { getEnvironmentInfo } from '../../lib/supabase';

interface AuthFormProps {
  type: 'login' | 'register';
  onToggle: () => void;
}

export function AuthForm({ type, onToggle }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const envInfo = getEnvironmentInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maw={420} mx="auto">
      {/* Environment Warning für Development */}
      {envInfo.isDevelopment && !envInfo.hasValidConfig && (
        <Alert
          variant="light"
          color="yellow"
          title="Development Modus"
          icon={<IconInfoCircle />}
          mb="md"
        >
          <Text size="sm">
            Demo-Modus aktiv. Bitte setze deine Supabase-Credentials in der .env.local Datei.
          </Text>
        </Alert>
      )}

      <Paper radius="md" p="xl" withBorder>
        <Title ta="center" mb="md" order={2}>
          {type === 'login' ? 'Willkommen zurück!' : 'Konto erstellen'}
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          {type === 'login' 
            ? 'Melde dich an, um deine Finanzen zu verwalten'
            : 'Erstelle ein kostenloses Konto'
          }
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack>
            {type === 'register' && (
              <TextInput
                label="Anzeigename"
                placeholder="Dein Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                radius="md"
              />
            )}

            <TextInput
              required
              label="E-Mail"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              radius="md"
              type="email"
            />

            <PasswordInput
              required
              label="Passwort"
              placeholder="Dein Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              radius="md"
              minLength={6}
            />

            <Button
              type="submit"
              radius="xl"
              size="md"
              loading={loading}
              disabled={!envInfo.hasValidConfig}
              fullWidth
            >
              {type === 'login' ? 'Anmelden' : 'Registrieren'}
            </Button>
          </Stack>
        </form>

        <Divider label="oder" labelPosition="center" my="lg" />

        <Text c="dimmed" size="sm" ta="center">
          {type === 'login' ? 'Noch kein Konto?' : 'Bereits ein Konto?'}{' '}
          <Anchor size="sm" component="button" onClick={onToggle}>
            {type === 'login' ? 'Registrieren' : 'Anmelden'}
          </Anchor>
        </Text>

        {/* Environment Info im Development */}
        {envInfo.isDevelopment && (
          <Box mt="xl" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 'var(--mantine-radius-sm)' }}>
            <Text size="xs" c="dimmed" ta="center">
              {envInfo.environment} • {envInfo.hostname}
              {!envInfo.hasValidConfig && ' • Demo-Modus'}
            </Text>
          </Box>
        )}
      </Paper>
    </Box>
  );
}