import { Container, Title, Text, Card, Group, Stack } from '@mantine/core';
import { IconWallet, IconTrendingUp, IconCalendar, IconSettings } from '@tabler/icons-react';

export default function HomePage() {
  return (
    <Container size="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="md">Dashboard</Title>
          <Text size="lg" c="dimmed">
            Willkommen in deinem Haushaltsbuch! Hier hast du einen Überblick über deine Finanzen.
          </Text>
        </div>

        <Group grow>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Gesamtvermögen</Text>
              <IconWallet size={24} />
            </Group>
            <Text size="xl" fw={700} c="green">
              €5,420.50
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Monatliche Ausgaben</Text>
              <IconTrendingUp size={24} />
            </Group>
            <Text size="xl" fw={700} c="red">
              €1,234.67
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Budget verwendet</Text>
              <IconCalendar size={24} />
            </Group>
            <Text size="xl" fw={700} c="yellow">
              68%
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>Kategorien</Text>
              <IconSettings size={24} />
            </Group>
            <Text size="xl" fw={700}>
              12
            </Text>
          </Card>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Letzte Transaktionen</Title>
          <Text c="dimmed">
            Hier würden deine letzten Transaktionen angezeigt werden. 
            Nutze die Navigation oben, um zu den verschiedenen Bereichen zu gelangen.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
}
