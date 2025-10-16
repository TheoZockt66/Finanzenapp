'use client';

import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Indicator,
  Modal,
  NumberInput,
  Progress,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconChartPie, IconEdit, IconGauge, IconPlus, IconTrash, IconWallet } from '@tabler/icons-react';
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

type BudgetFilter = 'all' | 'healthy' | 'overspent';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blau' },
  { value: 'green', label: 'Gruen' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Rot' },
  { value: 'purple', label: 'Lila' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'pink', label: 'Pink' },
  { value: 'yellow', label: 'Gelb' },
  { value: 'teal', label: 'Tuerkis' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'lime', label: 'Limette' },
  { value: 'grape', label: 'Traube' },
];

const INITIAL_FORM: BudgetFormState = {
  id: '',
  name: '',
  amount: 0,
  color: 'blue',
  resetDay: 1,
  categoryId: '',
};

const formatCurrency = (value: number) => `EUR ${value.toFixed(2)}`;

const mapFormToPayload = (form: BudgetFormState): Partial<FinanzenBudget> => {
  const hasValidResetDay = Number.isFinite(form.resetDay);
  return {
    name: form.name.trim(),
    amount: Number.isFinite(form.amount) ? form.amount : 0,
    color: form.color,
    reset_day: hasValidResetDay
      ? Math.min(Math.max(Math.round(form.resetDay), 1), 31)
      : undefined,
    category_id: form.categoryId ? form.categoryId : undefined,
  };
};

const toFormState = (budget: FinanzenBudget): BudgetFormState => ({
  id: budget.id,
  name: budget.name,
  amount: budget.amount ?? 0,
  color: budget.color ?? 'blue',
  resetDay: budget.reset_day ?? 1,
  categoryId: budget.category_id ?? '',
});

export default function BudgetPage() {
  const { budgets, loading, refreshing, error, addBudget, editBudget, removeBudget, refresh } = useBudgets();

  const [modalOpened, setModalOpened] = useState(false);
  const [formState, setFormState] = useState<BudgetFormState>(INITIAL_FORM);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<BudgetFilter>('all');

  const totals = useMemo(() => {
    const totalAmount = budgets.reduce((acc, budget) => acc + (budget.amount || 0), 0);
    const totalCarryover = budgets.reduce((acc, budget) => acc + (budget.carryover || 0), 0);
    const totalSpent = budgets.reduce((acc, budget) => acc + (budget.spent || 0), 0);
    const totalAvailable = totalAmount + totalCarryover - totalSpent;
    return { totalAmount, totalCarryover, totalSpent, totalAvailable };
  }, [budgets]);

  const metrics = useMemo(() => {
    if (budgets.length === 0) {
      return {
        budgetCount: 0,
        overspentCount: 0,
        averageUtilization: 0,
        bestBudget: null as null | { name: string; remaining: number; ratio: number; color?: string },
      };
    }

    let overspentCount = 0;
    let utilizationSum = 0;
    let utilizationDenominator = 0;
    let best: { name: string; remaining: number; ratio: number; color?: string } | null = null;

    budgets.forEach((budget) => {
      const totalAvailable = (budget.amount || 0) + (budget.carryover || 0);
      const spent = budget.spent || 0;
      const remaining = totalAvailable - spent;
      if (remaining < 0) {
        overspentCount += 1;
      }
      if (totalAvailable > 0) {
        const ratio = Math.min(spent / totalAvailable, 1);
        utilizationSum += ratio;
        utilizationDenominator += 1;
        const remainingRatio = remaining / totalAvailable;
        if (!best || remainingRatio > best.ratio) {
          best = {
            name: budget.name,
            remaining,
            ratio: remainingRatio,
            color: budget.color ?? 'blue',
          };
        }
      }
    });

    const averageUtilization =
      utilizationDenominator > 0 ? utilizationSum / utilizationDenominator : 0;

    return {
      budgetCount: budgets.length,
      overspentCount,
      averageUtilization,
      bestBudget: best,
    };
  }, [budgets]);

  const sortedBudgets = useMemo(() => {
    return [...budgets].sort((a, b) => {
      const totalA = (a.amount || 0) + (a.carryover || 0);
      const totalB = (b.amount || 0) + (b.carryover || 0);
      const remainingA = totalA - (a.spent || 0);
      const remainingB = totalB - (b.spent || 0);
      const ratioA = totalA > 0 ? remainingA / totalA : -Infinity;
      const ratioB = totalB > 0 ? remainingB / totalB : -Infinity;
      return ratioB - ratioA;
    });
  }, [budgets]);

  const filteredBudgets = useMemo(() => {
    return sortedBudgets.filter((budget) => {
      const totalAvailable = (budget.amount || 0) + (budget.carryover || 0);
      const remaining = totalAvailable - (budget.spent || 0);
      if (viewFilter === 'overspent') {
        return remaining < 0;
      }
      if (viewFilter === 'healthy') {
        return remaining >= 0;
      }
      return true;
    });
  }, [sortedBudgets, viewFilter]);

  const healthyBudgetCount = sortedBudgets.length - metrics.overspentCount;

  const filterSegments = useMemo(
    () => [
      { label: `Alle (${sortedBudgets.length})`, value: 'all' },
      { label: `Im Rahmen (${Math.max(healthyBudgetCount, 0)})`, value: 'healthy' },
      { label: `Ueberschritten (${metrics.overspentCount})`, value: 'overspent' },
    ],
    [sortedBudgets.length, healthyBudgetCount, metrics.overspentCount],
  );

  const filterDescription = useMemo(() => {
    switch (viewFilter) {
      case 'healthy':
        return 'Zeigt Budgets mit verbleibenden Mitteln.';
      case 'overspent':
        return 'Fokussiert Budgets, die ihr Limit ueberschritten haben.';
      default:
        return 'Alle aktiven Budgets im Ueberblick.';
    }
  }, [viewFilter]);

  const averageUtilizationPercent = Math.round(metrics.averageUtilization * 100);
  const bestBudget = metrics.bestBudget;
  const isLoadingEmpty = loading && budgets.length === 0;

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
      } else {
        await addBudget({
          ...payload,
          period: 'monthly',
          is_active: true,
          auto_reset: true,
        });
      }
      await refresh();
      setModalOpened(false);
      setFormState(INITIAL_FORM);
      setEditingBudgetId(null);
    } catch (err) {
      console.error('Budget speichern fehlgeschlagen:', err);
      setFormError('Speichern fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budgetId: string) => {
    try {
      await removeBudget(budgetId);
      await refresh();
    } catch (err) {
      console.error('Budget loeschen fehlgeschlagen:', err);
    }
  };

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Group gap="sm" align="center">
              <Title order={1}>Budgets</Title>
              {refreshing ? (
                <Badge color="blue" variant="light" size="sm">
                  Aktualisiere...
                </Badge>
              ) : null}
            </Group>
            <Text c="dimmed">
              Verwalte deine monatlichen Rahmen und behalte Ausgaben, Uebertraege und Restbudgets im Blick.
            </Text>
          </Stack>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Budget anlegen
          </Button>
        </Group>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6, xl: 3 }}>
            <Card
              padding="lg"
              radius="lg"
              style={{
                background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-blue-4))',
                color: 'white',
              }}
            >
              <Stack gap="xs">
                <ThemeIcon variant="white" color="blue" radius="lg" size="lg" style={{ alignSelf: 'flex-start' }}>
                  <IconChartPie size={18} />
                </ThemeIcon>
                <Text size="sm" style={{ opacity: 0.75 }}>
                  Verfuegbar
                </Text>
                <Text size="xl" fw={700}>
                  {formatCurrency(totals.totalAvailable)}
                </Text>
                <Text size="xs" style={{ opacity: 0.75 }}>
                  Nach Abzug aller Ausgaben und Uebertraege
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, xl: 3 }}>
            <Card withBorder padding="lg" radius="lg">
              <Stack gap="xs">
                <Group justify="space-between">
                  <ThemeIcon variant="light" color="blue" radius="md">
                    <IconWallet size={18} />
                  </ThemeIcon>
                  <Badge variant="light" color="blue">
                    {metrics.budgetCount} Budgets
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Gesamtbudget
                </Text>
                <Text size="lg" fw={700}>
                  {formatCurrency(totals.totalAmount)}
                </Text>
                <Text size="xs" c="dimmed">
                  Uebertraege: {formatCurrency(totals.totalCarryover)}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, xl: 3 }}>
            <Card withBorder padding="lg" radius="lg">
              <Stack gap="xs">
                <Group justify="space-between">
                  <ThemeIcon variant="light" color="violet" radius="md">
                    <IconGauge size={18} />
                  </ThemeIcon>
                  <Badge variant="light" color="violet">
                    {averageUtilizationPercent}%
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Durchschnittliche Nutzung
                </Text>
                <Text size="lg" fw={700} c="violet">
                  {averageUtilizationPercent}%
                </Text>
                <Text size="xs" c="dimmed">
                  Im Mittel genutzter Anteil des Budgets
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, xl: 3 }}>
            <Card withBorder padding="lg" radius="lg">
              <Stack gap="xs">
                <Group justify="space-between">
                  <ThemeIcon variant="light" color="red" radius="md">
                    <IconAlertTriangle size={18} />
                  </ThemeIcon>
                  <Badge variant="light" color="red">
                    {metrics.overspentCount}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Ueberschrittene Budgets
                </Text>
                <Text size="sm">
                  {metrics.overspentCount > 0
                    ? 'Bitte pruefe die Ausgaben und passe dein Budget an.'
                    : 'Alles im gruenen Bereich.'}
                </Text>
                <Text size="xs" c="dimmed">
                  {bestBudget
                    ? `Bester Rest: ${bestBudget.name} mit ${formatCurrency(bestBudget.remaining)}`
                    : 'Noch keine positiven Restbudgets.'}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {error ? (
          <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        ) : null}

        <Card withBorder radius="md" padding="lg">
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Text fw={600}>Budget-Uebersicht</Text>
                <Text size="sm" c="dimmed">
                  {filterDescription}
                </Text>
              </Stack>
              <SegmentedControl
                value={viewFilter}
                onChange={(value) => setViewFilter(value as BudgetFilter)}
                data={filterSegments}
              />
            </Group>

            <ScrollArea.Autosize mah={520} offsetScrollbars>
              <Stack gap="md">
                {isLoadingEmpty ? (
                  <Card withBorder radius="md" padding="xl">
                    <Text c="dimmed" ta="center">
                      Lade Budgets...
                    </Text>
                  </Card>
                ) : filteredBudgets.length === 0 ? (
                  <Card withBorder radius="md" padding="xl">
                    <Stack gap="xs" align="center">
                      <Text c="dimmed" ta="center">
                        Keine Budgets fuer diesen Filter vorhanden.
                      </Text>
                      {viewFilter !== 'all' ? (
                        <Button variant="light" size="xs" onClick={() => setViewFilter('all')}>
                          Alle Budgets anzeigen
                        </Button>
                      ) : null}
                    </Stack>
                  </Card>
                ) : (
                  filteredBudgets.map((budget) => {
                    const totalAvailable = (budget.amount || 0) + (budget.carryover || 0);
                    const spent = budget.spent || 0;
                    const remaining = totalAvailable - spent;
                    const utilizationPercent =
                      totalAvailable > 0 ? Math.min((spent / totalAvailable) * 100, 200) : 0;
                    const utilizationLabel = `${Math.round(utilizationPercent)}%`;
                    const isOverspent = remaining < 0;

                    return (
                      <Card key={budget.id} withBorder padding="lg" radius="md">
                        <Stack gap="md">
                          <Group justify="space-between" align="flex-start">
                            <Group gap="sm">
                              <Indicator
                                inline
                                disabled={!isOverspent}
                                color="red"
                                size={12}
                                offset={4}
                              >
                                <ThemeIcon variant="light" color={budget.color ?? 'blue'} radius="md" size="lg">
                                  <Text fw={700}>€</Text>
                                </ThemeIcon>
                              </Indicator>
                              <Stack gap={4}>
                                <Group gap="xs" align="center">
                                  <Text fw={600}>{budget.name}</Text>
                                  <Badge variant="light" color={budget.color ?? 'blue'}>
                                    {budget.color ?? 'blue'}
                                  </Badge>
                                </Group>
                                <Group gap="sm">
                                  <Text size="sm" c="dimmed">
                                    Budget: {formatCurrency(budget.amount || 0)}
                                  </Text>
                                  {budget.carryover > 0 ? (
                                    <Text size="sm" c="dimmed">
                                      Uebertrag: {formatCurrency(budget.carryover)}
                                    </Text>
                                  ) : null}
                                </Group>
                                <Group gap="sm">
                                  <Badge variant="outline" color={remaining >= 0 ? 'green' : 'red'}>
                                    Rest: {formatCurrency(remaining)}
                                  </Badge>
                                  <Text size="sm" c="dimmed">
                                    Verbraucht: {formatCurrency(spent)}
                                  </Text>
                                </Group>
                                {budget.reset_day ? (
                                  <Text size="xs" c="dimmed">
                                    Reset am {budget.reset_day}. Tag des Monats
                                  </Text>
                                ) : null}
                              </Stack>
                            </Group>
                            <Group gap="xs">
                              <Tooltip label="Budget bearbeiten" withArrow>
                                <ActionIcon variant="subtle" onClick={() => openEditModal(budget)} aria-label="Bearbeiten">
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Budget entfernen" withArrow>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => handleDelete(budget.id)}
                                  aria-label="Loeschen"
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Group>

                          <Tooltip label={`Auslastung: ${utilizationLabel}`} withArrow>
                            <Progress
                              value={Math.min(utilizationPercent, 150)}
                              color={budget.color ?? 'blue'}
                              radius="xl"
                            />
                          </Tooltip>
                        </Stack>
                      </Card>
                    );
                  })
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setFormError(null);
        }}
        title={editingBudgetId ? 'Budget bearbeiten' : 'Neues Budget erstellen'}
        size="lg"
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
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.currentTarget.value }))}
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
            <Button variant="light" onClick={() => setModalOpened(false)}>
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
