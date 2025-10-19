'use client';

import { useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  Modal,
  NumberInput,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconDotsVertical,
  IconEdit,
  IconPigMoney,
  IconPlus,
  IconTargetArrow,
  IconTrash,
  IconTrendingUp,
} from '@tabler/icons-react';
import { useBudgets } from '../../hooks/useBudgets';
import type { FinanzenBudget } from '../../lib/types';

type BudgetFormState = {
  id: string;
  name: string;
  amount: number;
  color: string;
  resetDay: number;
  categoryId: string;
};

type FilterOption = 'all' | 'healthy' | 'warning' | 'over';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'blue' },
  { value: 'green', label: 'green' },
  { value: 'orange', label: 'orange' },
  { value: 'red', label: 'red' },
  { value: 'purple', label: 'purple' },
  { value: 'cyan', label: 'cyan' },
  { value: 'pink', label: 'pink' },
  { value: 'yellow', label: 'yellow' },
  { value: 'teal', label: 'teal' },
  { value: 'indigo', label: 'indigo' },
  { value: 'lime', label: 'lime' },
  { value: 'grape', label: 'grape' },
];

const INITIAL_FORM: BudgetFormState = {
  id: '',
  name: '',
  amount: 0,
  color: 'blue',
  resetDay: 1,
  categoryId: '',
};

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'healthy', label: 'Im Rahmen' },
  { value: 'warning', label: 'Nahe Limit' },
  { value: 'over', label: 'Ueberzogen' },
];

const formatCurrency = (value: number) =>
  `EUR ${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const mapFormToPayload = (form: BudgetFormState) => ({
  name: form.name.trim(),
  amount: Number.isFinite(form.amount) ? form.amount : 0,
  color: form.color,
  reset_day: Number.isFinite(form.resetDay)
    ? Math.min(Math.max(Math.round(form.resetDay), 1), 31)
    : undefined,
  category_id: form.categoryId ? form.categoryId : undefined,
});

const toFormState = (budget: FinanzenBudget): BudgetFormState => ({
  id: budget.id,
  name: budget.name,
  amount: budget.amount ?? 0,
  color: budget.color ?? 'blue',
  resetDay: budget.reset_day ?? 1,
  categoryId: budget.category_id ?? '',
});

export default function BudgetPage() {
  const { budgets, loading, error, addBudget, editBudget, removeBudget, refresh } = useBudgets();

  const [modalOpened, setModalOpened] = useState(false);
  const [formState, setFormState] = useState<BudgetFormState>(INITIAL_FORM);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [search, setSearch] = useState('');

  const totals = useMemo(() => {
    const totalAmount = budgets.reduce((acc, budget) => acc + (budget.amount || 0), 0);
    const totalCarryover = budgets.reduce((acc, budget) => acc + (budget.carryover || 0), 0);
    const totalSpent = budgets.reduce((acc, budget) => acc + (budget.spent || 0), 0);
    const totalAvailable = totalAmount + totalCarryover - totalSpent;
    return { totalAmount, totalCarryover, totalSpent, totalAvailable };
  }, [budgets]);

  const filteredBudgets = useMemo(() => {
    return budgets
      .filter((budget) => {
        if (!search.trim()) return true;
        const query = search.toLowerCase();
        return (
          budget.name.toLowerCase().includes(query) ||
          (budget.category_id ?? '').toLowerCase().includes(query)
        );
      })
      .filter((budget) => {
        const spent = budget.spent ?? 0;
        const amount = budget.amount ?? 0;
        const percent = amount > 0 ? (spent / amount) * 100 : 0;

        switch (filter) {
          case 'healthy':
            return percent < 80;
          case 'warning':
            return percent >= 80 && percent < 100;
          case 'over':
            return percent >= 100;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const percentA = (a.spent ?? 0) / Math.max(a.amount ?? 1, 1);
        const percentB = (b.spent ?? 0) / Math.max(b.amount ?? 1, 1);
        return percentB - percentA;
      });
  }, [budgets, filter, search]);

  const openCreateModal = () => {
    setFormState(INITIAL_FORM);
    setEditingBudgetId(null);
    setFormError(null);
    setModalOpened(true);
  };

  const openEditModal = (budget: FinanzenBudget) => {
    setFormState(toFormState(budget));
    setEditingBudgetId(budget.id);
    setFormError(null);
    setModalOpened(true);
  };

  const resetForm = () => {
    setModalOpened(false);
    setSaving(false);
    setFormError(null);
    setFormState(INITIAL_FORM);
    setEditingBudgetId(null);
  };

  const handleSave = async () => {
    if (!formState.name.trim()) {
      setFormError('Bitte gib einen Namen ein.');
      return;
    }
    if (formState.amount <= 0) {
      setFormError('Der Budget-Betrag muss groesser als 0 sein.');
      return;
    }

    setSaving(true);
    setFormError(null);
    const payload = mapFormToPayload(formState);

    try {
      if (editingBudgetId) {
        await editBudget(editingBudgetId, payload);
        notifications.show({
          title: 'Budget aktualisiert',
          message: 'Dein Budget wurde aktualisiert.',
          color: 'green',
        });
      } else {
        await addBudget(payload);
        notifications.show({
          title: 'Budget erstellt',
          message: 'Neues Budget angelegt.',
          color: 'green',
        });
      }
      await refresh();
      resetForm();
    } catch (err) {
      console.error('Budget save failed', err);
      setSaving(false);
      setFormError('Speichern nicht moeglich. Bitte versuche es erneut.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeBudget(id);
      notifications.show({
        title: 'Budget geloescht',
        message: 'Das Budget wurde entfernt.',
        color: 'green',
      });
      await refresh();
    } catch (err) {
      console.error('Delete budget failed', err);
      notifications.show({
        title: 'Fehler',
        message: 'Budget konnte nicht geloescht werden.',
        color: 'red',
      });
    }
  };

  const renderStatusBadge = (budget: FinanzenBudget) => {
    const spent = budget.spent ?? 0;
    const amount = Math.max(budget.amount ?? 0, 1);
    const percent = (spent / amount) * 100;

    if (percent >= 100) {
      return (
        <Badge color="red" variant="light" size="sm">
          Ueberzogen
        </Badge>
      );
    }
    if (percent >= 80) {
      return (
        <Badge color="yellow" variant="light" size="sm">
          Nahe Limit
        </Badge>
      );
    }
    return (
      <Badge color="green" variant="light" size="sm">
        Im Rahmen
      </Badge>
    );
  };

  const renderBudgetCard = (budget: FinanzenBudget) => {
    const amount = budget.amount ?? 0;
    const spent = budget.spent ?? 0;
    const carryover = budget.carryover ?? 0;
    const available = amount + carryover - spent;
    const percent = amount > 0 ? Math.min((spent / amount) * 100, 999) : 0;
    const color = percent >= 100 ? 'red' : percent >= 80 ? 'yellow' : budget.color ?? 'blue';

    return (
      <Card key={budget.id} withBorder radius="lg" padding="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm" align="flex-start">
              <ThemeIcon color={budget.color ?? 'blue'} variant="light" radius="md" size="lg">
                <IconPigMoney size={18} />
              </ThemeIcon>
              <Stack gap={4}>
                <Group gap="xs">
                  <Text fw={600}>{budget.name}</Text>
                  {renderStatusBadge(budget)}
                </Group>
                <Group gap="sm">
                  <Text size="sm" c="dimmed">
                    {formatCurrency(amount)} Budget
                  </Text>
                  {carryover > 0 ? (
                    <Text size="sm" c="dimmed">
                      + Uebertrag {formatCurrency(carryover)}
                    </Text>
                  ) : null}
                </Group>
                <Text size="sm" c={available >= 0 ? 'green' : 'red'}>
                  Verfuegbar: {formatCurrency(available)}
                </Text>
                {budget.reset_day ? (
                  <Text size="xs" c="dimmed">
                    Reset am {budget.reset_day}. Tag des Monats
                  </Text>
                ) : null}
              </Stack>
            </Group>
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                aria-label="Budget bearbeiten"
                onClick={() => openEditModal(budget)}
              >
                <IconEdit size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label="Budget loeschen"
                onClick={() => handleDelete(budget.id)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>

          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Ausgaben
              </Text>
              <Text size="sm" fw={500}>
                {formatCurrency(spent)} / {formatCurrency(amount)}
              </Text>
            </Group>
            <Progress value={percent} color={color} radius="xl" />
          </Stack>
        </Stack>
      </Card>
    );
  };

  return (
    <Container size="xl" py="lg">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>Budgets</Title>
            <Text c="dimmed">
              Plane deine Ausgaben, beobachte kritische Bereiche und halte deine Ziele im Auge.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Budget erstellen
          </Button>
        </Group>

        <Card withBorder padding="xl" radius="lg">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            <Card withBorder padding="md" radius="md">
              <Group justify="space-between">
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Gesamtbudget
                  </Text>
                  <Text fw={600}>{formatCurrency(totals.totalAmount)}</Text>
                </Stack>
                <ThemeIcon color="blue" variant="light" radius="md">
                  <IconPigMoney size={18} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                Summe aller Budgetrahmen.
              </Text>
            </Card>

            <Card withBorder padding="md" radius="md">
              <Group justify="space-between">
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Bisher ausgegeben
                  </Text>
                  <Text fw={600}>{formatCurrency(totals.totalSpent)}</Text>
                </Stack>
                <ThemeIcon color="red" variant="light" radius="md">
                  <IconTrendingUp size={18} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                Erfasste Ausgaben innerhalb der Budgets.
              </Text>
            </Card>

            <Card withBorder padding="md" radius="md">
              <Group justify="space-between">
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Verfuegbar
                  </Text>
                  <Text fw={600}>{formatCurrency(totals.totalAvailable)}</Text>
                </Stack>
                <ThemeIcon color="teal" variant="light" radius="md">
                  <IconTargetArrow size={18} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                Budget abzüglich Ausgaben und Ruecklagen.
              </Text>
            </Card>

            <Card withBorder padding="md" radius="md">
              <Group justify="space-between">
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Uebertraege
                  </Text>
                  <Text fw={600}>{formatCurrency(totals.totalCarryover)}</Text>
                </Stack>
                <ThemeIcon color="violet" variant="light" radius="md">
                  <IconDotsVertical size={18} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                Nicht genutzte Mittel aus Vormonaten.
              </Text>
            </Card>
          </SimpleGrid>
        </Card>

        <Card withBorder padding="lg" radius="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <SegmentedControl
                  value={filter}
                  onChange={(value) => setFilter(value as FilterOption)}
                  data={FILTER_OPTIONS}
                />
              </Group>
              <TextInput
                placeholder="Suche nach Namen oder Kategorie"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                w={{ base: '100%', sm: 260 }}
              />
            </Group>

            {error ? (
              <Card withBorder padding="md">
                <Text c="red" size="sm">
                  Fehler beim Laden der Budgets:{' '}
                  {typeof error === 'string' ? error : error.message ?? 'Unbekannter Fehler'}
                </Text>
              </Card>
            ) : null}

            {loading ? (
              <Center py="xl">
                <Text c="dimmed">Budgets werden geladen...</Text>
              </Center>
            ) : filteredBudgets.length === 0 ? (
              <Card withBorder p="xl" radius="md">
                <Stack gap="sm" align="center">
                  <Text fw={600}>Keine Budgets gefunden</Text>
                  <Text c="dimmed" size="sm" ta="center">
                    Passe die Filter an oder erstelle ein neues Budget.
                  </Text>
                </Stack>
              </Card>
            ) : (
              <Grid gutter="xl">
                {filteredBudgets.map((budget) => (
                  <Grid.Col key={budget.id} span={{ base: 12, sm: 6, lg: 4 }}>
                    {renderBudgetCard(budget)}
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Stack>
        </Card>

      </Stack>

      <Modal
        opened={modalOpened}
        onClose={resetForm}
        title={editingBudgetId ? 'Budget bearbeiten' : 'Neues Budget erstellen'}
        size="lg"
        radius="md"
        centered
      >
        <Stack gap="md">
          {formError ? (
            <Text size="sm" c="red">
              {formError}
            </Text>
          ) : null}

          <TextInput
            label="Name"
            placeholder="z. B. Lebensmittel"
            value={formState.name}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setFormState((prev) => ({ ...prev, name: value }));
            }}
            required
          />

          <NumberInput
            label="Budget-Betrag"
            value={formState.amount}
            onChange={(value) => setFormState((prev) => ({ ...prev, amount: Number(value) || 0 }))}
            min={0}
            decimalScale={2}
            step={5}
            prefix="EUR "
            required
          />

          <NumberInput
            label="Reset-Tag (Tag im Monat)"
            value={formState.resetDay}
            onChange={(value) => setFormState((prev) => ({ ...prev, resetDay: Number(value) || 1 }))}
            min={1}
            max={31}
            required
          />

          <Select
            label="Farbe"
            value={formState.color}
            onChange={(value) => setFormState((prev) => ({ ...prev, color: value ?? 'blue' }))}
            data={COLOR_OPTIONS}
            nothingFoundMessage="Keine Farbe gefunden"
            required
          />

          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="light" onClick={resetForm} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
