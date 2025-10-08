'use client';

import { Container, Title, Text, Card, Stack, Group, Button, TextInput, NumberInput, PasswordInput, Avatar, Badge, Switch, Select, Tabs } from '@mantine/core';
import { useState } from 'react';
import { IconUser, IconSettings, IconBell, IconPalette, IconDatabase, IconShield, IconDownload, IconUpload, IconTrash } from '@tabler/icons-react';

export default function AccountPage() {
  const [userProfile, setUserProfile] = useState({
    name: 'Max Mustermann',
    email: 'max.mustermann@email.com',
    avatar: '',
    monthlyBudget: 2500,
    currency: 'EUR'
  });

  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    transactionReminders: false,
    weeklyReports: true,
    monthlyReports: true
  });

  const [theme, setTheme] = useState({
    colorScheme: 'auto',
    primaryColor: 'blue',
    compactMode: false
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [exportSettings, setExportSettings] = useState({
    format: 'csv',
    dateRange: 'all',
    includeCategories: true,
    includeBudgets: true
  });

  const handleProfileUpdate = () => {
    // Hier würde normalerweise ein API-Call stattfinden
    console.log('Profil aktualisiert:', userProfile);
  };

  const handlePasswordChange = () => {
    if (passwords.new !== passwords.confirm) {
      alert('Neue Passwörter stimmen nicht überein');
      return;
    }
    if (passwords.new.length < 8) {
      alert('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    // Hier würde normalerweise ein API-Call stattfinden
    console.log('Passwort geändert');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  const handleExportData = () => {
    // Hier würde normalerweise der Export stattfinden
    console.log('Daten exportiert:', exportSettings);
  };

  const handleImportData = () => {
    // Hier würde normalerweise der Import-Dialog geöffnet
    console.log('Import-Dialog öffnen');
  };

  const handleDeleteAccount = () => {
    if (confirm('Sind Sie sicher, dass Sie Ihr Konto löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      // Hier würde normalerweise die Konto-Löschung stattfinden
      console.log('Konto gelöscht');
    }
  };

  const colorOptions = [
    { value: 'blue', label: 'Blau' },
    { value: 'green', label: 'Grün' },
    { value: 'orange', label: 'Orange' },
    { value: 'red', label: 'Rot' },
    { value: 'purple', label: 'Lila' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'pink', label: 'Pink' },
    { value: 'teal', label: 'Türkis' }
  ];

  const currencyOptions = [
    { value: 'EUR', label: '€ Euro' },
    { value: 'USD', label: '$ US-Dollar' },
    { value: 'GBP', label: ' Britisches Pfund' },
    { value: 'CHF', label: 'CHF Schweizer Franken' }
  ];

  const exportFormatOptions = [
    { value: 'csv', label: 'CSV (Excel)' },
    { value: 'json', label: 'JSON' },
    { value: 'pdf', label: 'PDF-Bericht' }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'Alle Daten' },
    { value: 'current-year', label: 'Aktuelles Jahr' },
    { value: 'last-year', label: 'Letztes Jahr' },
    { value: 'last-3-months', label: 'Letzte 3 Monate' },
    { value: 'last-month', label: 'Letzter Monat' }
  ];

  return (
    <Container size="lg">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={1}>Konto-Einstellungen</Title>
          <Badge size="lg" variant="light" color="blue">
            Premium Account
          </Badge>
        </Group>

        <Tabs defaultValue="profile">
          <Tabs.List>
            <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
              Profil
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
              Einstellungen
            </Tabs.Tab>
            <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
              Benachrichtigungen
            </Tabs.Tab>
            <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
              Erscheinungsbild
            </Tabs.Tab>
            <Tabs.Tab value="data" leftSection={<IconDatabase size={16} />}>
              Daten
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
              Sicherheit
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="profile" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="md">
                <Group>
                  <Avatar size="xl" color="blue">
                    {userProfile.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                  <Stack gap="xs">
                    <Title order={3}>{userProfile.name}</Title>
                    <Text c="dimmed">{userProfile.email}</Text>
                    <Badge color="green" variant="light">Aktiv seit März 2024</Badge>
                  </Stack>
                </Group>

                <TextInput
                  label="Name"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                />

                <TextInput
                  label="E-Mail"
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                />

                <NumberInput
                  label="Monatliches Budget"
                  value={userProfile.monthlyBudget}
                  onChange={(val) => setUserProfile({ ...userProfile, monthlyBudget: Number(val) })}
                  prefix="€"
                  min={0}
                  description="Ihr Haupt-Budget für monatliche Ausgaben"
                />

                <Select
                  label="Währung"
                  value={userProfile.currency}
                  onChange={(val) => setUserProfile({ ...userProfile, currency: val || 'EUR' })}
                  data={currencyOptions}
                />

                <Group justify="flex-end">
                  <Button onClick={handleProfileUpdate}>Profil aktualisieren</Button>
                </Group>
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="xl">
            <Stack gap="lg">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Allgemeine Einstellungen</Title>
                <Stack gap="md">
                  <Switch
                    label="Automatische Backups"
                    description="Erstellt täglich automatische Sicherungen Ihrer Daten"
                    checked={true}
                    onChange={() => {}}
                  />
                  <Switch
                    label="Erweiterte Funktionen"
                    description="Aktiviert erweiterte Analyse- und Berichtsfunktionen"
                    checked={true}
                    onChange={() => {}}
                  />
                  <Switch
                    label="Offline-Modus"
                    description="Ermöglicht die Nutzung ohne Internetverbindung"
                    checked={false}
                    onChange={() => {}}
                  />
                </Stack>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Datenschutz</Title>
                <Stack gap="md">
                  <Switch
                    label="Anonyme Nutzungsstatistiken"
                    description="Hilft uns dabei, die App zu verbessern"
                    checked={false}
                    onChange={() => {}}
                  />
                  <Switch
                    label="Crash-Reports senden"
                    description="Sendet automatisch Fehlerberichte zur Verbesserung"
                    checked={true}
                    onChange={() => {}}
                  />
                </Stack>
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="notifications" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={4} mb="md">Benachrichtigungseinstellungen</Title>
              <Stack gap="md">
                <Switch
                  label="Budget-Warnungen"
                  description="Benachrichtigung bei Überschreitung von Budget-Grenzen"
                  checked={notifications.budgetAlerts}
                  onChange={(e) => setNotifications({ ...notifications, budgetAlerts: e.currentTarget.checked })}
                />
                <Switch
                  label="Transaktions-Erinnerungen"
                  description="Erinnerungen für wiederkehrende Transaktionen"
                  checked={notifications.transactionReminders}
                  onChange={(e) => setNotifications({ ...notifications, transactionReminders: e.currentTarget.checked })}
                />
                <Switch
                  label="Wöchentliche Berichte"
                  description="Zusammenfassung Ihrer wöchentlichen Finanzen"
                  checked={notifications.weeklyReports}
                  onChange={(e) => setNotifications({ ...notifications, weeklyReports: e.currentTarget.checked })}
                />
                <Switch
                  label="Monatliche Berichte"
                  description="Detaillierte monatliche Finanzübersicht"
                  checked={notifications.monthlyReports}
                  onChange={(e) => setNotifications({ ...notifications, monthlyReports: e.currentTarget.checked })}
                />
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="appearance" pt="xl">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={4} mb="md">Design-Einstellungen</Title>
              <Stack gap="md">
                <Select
                  label="Farbschema"
                  value={theme.colorScheme}
                  onChange={(val) => setTheme({ ...theme, colorScheme: val || 'auto' })}
                  data={[
                    { value: 'auto', label: 'Automatisch (System)' },
                    { value: 'light', label: 'Hell' },
                    { value: 'dark', label: 'Dunkel' }
                  ]}
                />
                
                <Select
                  label="Primärfarbe"
                  value={theme.primaryColor}
                  onChange={(val) => setTheme({ ...theme, primaryColor: val || 'blue' })}
                  data={colorOptions}
                  renderOption={({ option }) => (
                    <Group gap="xs">
                      <Badge color={option.value} variant="filled" size="sm" />
                      <Text>{option.label}</Text>
                    </Group>
                  )}
                />

                <Switch
                  label="Kompakte Ansicht"
                  description="Reduziert Abstände für mehr Inhalt auf dem Bildschirm"
                  checked={theme.compactMode}
                  onChange={(e) => setTheme({ ...theme, compactMode: e.currentTarget.checked })}
                />
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="data" pt="xl">
            <Stack gap="lg">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Daten exportieren</Title>
                <Stack gap="md">
                  <Select
                    label="Format"
                    value={exportSettings.format}
                    onChange={(val) => setExportSettings({ ...exportSettings, format: val || 'csv' })}
                    data={exportFormatOptions}
                  />
                  
                  <Select
                    label="Zeitraum"
                    value={exportSettings.dateRange}
                    onChange={(val) => setExportSettings({ ...exportSettings, dateRange: val || 'all' })}
                    data={dateRangeOptions}
                  />

                  <Switch
                    label="Kategorien einschließen"
                    checked={exportSettings.includeCategories}
                    onChange={(e) => setExportSettings({ ...exportSettings, includeCategories: e.currentTarget.checked })}
                  />

                  <Switch
                    label="Budgets einschließen"
                    checked={exportSettings.includeBudgets}
                    onChange={(e) => setExportSettings({ ...exportSettings, includeBudgets: e.currentTarget.checked })}
                  />

                  <Button leftSection={<IconDownload size={16} />} onClick={handleExportData}>
                    Daten exportieren
                  </Button>
                </Stack>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Daten importieren</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Importieren Sie Ihre Finanzdaten aus anderen Anwendungen oder Backups.
                </Text>
                <Button leftSection={<IconUpload size={16} />} variant="light" onClick={handleImportData}>
                  Daten importieren
                </Button>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-6)' }}>
                <Title order={4} mb="md" c="red">Gefahrenzone</Title>
                <Text size="sm" c="dimmed" mb="md">
                  Das Löschen Ihres Kontos entfernt alle Ihre Daten permanent. Diese Aktion kann nicht rückgängig gemacht werden.
                </Text>
                <Button 
                  color="red" 
                  variant="outline" 
                  leftSection={<IconTrash size={16} />}
                  onClick={handleDeleteAccount}
                >
                  Konto löschen
                </Button>
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="security" pt="xl">
            <Stack gap="lg">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Passwort ändern</Title>
                <Stack gap="md">
                  <PasswordInput
                    label="Aktuelles Passwort"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    required
                  />
                  
                  <PasswordInput
                    label="Neues Passwort"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    description="Mindestens 8 Zeichen"
                    required
                  />
                  
                  <PasswordInput
                    label="Neues Passwort bestätigen"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    error={passwords.new !== passwords.confirm && passwords.confirm.length > 0 ? 'Passwörter stimmen nicht überein' : null}
                    required
                  />

                  <Button onClick={handlePasswordChange} disabled={!passwords.current || !passwords.new || passwords.new !== passwords.confirm}>
                    Passwort ändern
                  </Button>
                </Stack>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Sicherheitseinstellungen</Title>
                <Stack gap="md">
                  <Switch
                    label="Zwei-Faktor-Authentifizierung"
                    description="Zusätzliche Sicherheit durch SMS oder Authenticator-App"
                    checked={false}
                    onChange={() => {}}
                  />
                  <Switch
                    label="Login-Benachrichtigungen"
                    description="E-Mail bei Anmeldung von neuen Geräten"
                    checked={true}
                    onChange={() => {}}
                  />
                  <Switch
                    label="Session-Timeout"
                    description="Automatische Abmeldung nach Inaktivität"
                    checked={true}
                    onChange={() => {}}
                  />
                </Stack>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Aktive Sitzungen</Title>
                <Stack gap="sm">
                  <Group justify="space-between" p="sm" style={{ backgroundColor: 'var(--mantine-color-blue-1)', borderRadius: '8px' }}>
                    <Stack gap={0}>
                      <Text fw={500}>Windows PC - Chrome</Text>
                      <Text size="sm" c="dimmed">Aktuelle Sitzung  Deutschland</Text>
                    </Stack>
                    <Badge color="green" variant="light">Aktuell</Badge>
                  </Group>
                  
                  <Group justify="space-between" p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-1)', borderRadius: '8px' }}>
                    <Stack gap={0}>
                      <Text fw={500}>Android - App</Text>
                      <Text size="sm" c="dimmed">Vor 2 Stunden  Deutschland</Text>
                    </Stack>
                    <Button size="xs" variant="light" color="red">Abmelden</Button>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
