'use client';

import { useAuth } from '../contexts/AuthContext';
import { Container, Title, Text, Card, Group, Stack, SimpleGrid, Center, Loader, Button } from '@mantine/core';
import { IconWallet, IconTrendingUp, IconCalendar, IconSettings, IconLogin } from '@tabler/icons-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Container size="sm" h="50vh">
        <Center h="100%">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="xl">
          <div style={{ textAlign: 'center' }}>
            <Title order={1} mb="md">Willkommen bei deinem Haushaltsbuch!</Title>
            <Text size="lg" c="dimmed" mb="xl">
              Verwalte deine Finanzen einfach und übersichtlich. Melde dich an, um zu beginnen.
            </Text>
          </div>

          <Button
            component={Link}
            href="/auth"
            size="lg"
            leftSection={<IconLogin size={20} />}
          >
            Anmelden / Registrieren
          </Button>

          <SimpleGrid 
            cols={{ base: 1, xs: 2, md: 3 }} 
            spacing="md"
            mt="xl"
          >
            <Card 
              shadow="sm" 
              padding="lg" 
              radius="md" 
              withBorder
              style={{ textAlign: 'center' }}
            >
              <IconWallet size={32} style={{ margin: '0 auto 1rem' }} />
              <Title order={4} mb="xs">Budgetverwaltung</Title>
              <Text size="sm" c="dimmed">
                Setze Budgets und verfolge deine Ausgaben in verschiedenen Kategorien.
              </Text>
            </Card>

            <Card 
              shadow="sm" 
              padding="lg" 
              radius="md" 
              withBorder
              style={{ textAlign: 'center' }}
            >
              <IconTrendingUp size={32} style={{ margin: '0 auto 1rem' }} />
              <Title order={4} mb="xs">Transaktionen</Title>
              <Text size="sm" c="dimmed">
                Erfasse alle deine Einnahmen und Ausgaben einfach und schnell.
              </Text>
            </Card>

            <Card 
              shadow="sm" 
              padding="lg" 
              radius="md" 
              withBorder
              style={{ textAlign: 'center' }}
            >
              <IconCalendar size={32} style={{ margin: '0 auto 1rem' }} />
              <Title order={4} mb="xs">Kostenplanung</Title>
              <Text size="sm" c="dimmed">
                Plane größere Anschaffungen und behalte den Überblick über zukünftige Kosten.
              </Text>
            </Card>
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="md">Deschboard</Title>
          <Text size="lg" c="dimmed">
            Willkommen zurück, {user.email?.split('@')[0]}! Hier hast du einen Überblick über deine Finanzen.
          </Text>
        </div>

        <SimpleGrid 
          cols={{ base: 1, xs: 2, md: 4 }} 
          spacing="md"
          verticalSpacing="md"
        >
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder
            style={{ minHeight: '120px' }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">Gesamtvermögen</Text>
              <IconWallet size={24} />
            </Group>
            <Text size="xl" fw={700} c="green">
              €0.00
            </Text>
            <Text size="xs" c="dimmed">
              Beginne mit deiner ersten Transaktion
            </Text>
          </Card>

          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder
            style={{ minHeight: '120px' }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">Monatliche Ausgaben</Text>
              <IconTrendingUp size={24} />
            </Group>
            <Text size="xl" fw={700} c="red">
              €0.00
            </Text>
            <Text size="xs" c="dimmed">
              Noch keine Ausgaben erfasst
            </Text>
          </Card>

          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder
            style={{ minHeight: '120px' }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">Budget verwendet</Text>
              <IconCalendar size={24} />
            </Group>
            <Text size="xl" fw={700} c="yellow">
              0%
            </Text>
            <Text size="xs" c="dimmed">
              Erstelle dein erstes Budget
            </Text>
          </Card>

          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder
            style={{ minHeight: '120px' }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">Kategorien</Text>
              <IconSettings size={24} />
            </Group>
            <Text size="xl" fw={700}>
              8
            </Text>
            <Text size="xs" c="dimmed">
              Standard-Kategorien erstellt
            </Text>
          </Card>
        </SimpleGrid>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Erste Schritte</Title>
          <Text c="dimmed" mb="md">
            Beginne mit deinem Haushaltsbuch! Hier sind einige Dinge, die du als erstes tun könntest:
          </Text>
          <Group>
            <Button component={Link} href="/transactions" variant="light">
              Erste Transaktion hinzufügen
            </Button>
            <Button component={Link} href="/budget" variant="light">
              Budget erstellen
            </Button>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}
