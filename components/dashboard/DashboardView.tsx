'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Menu,
  Progress,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendar,
  IconChartPie,
  IconChevronDown,
  IconClock,
  IconCurrencyEuro,
  IconPencil,
  IconPlus,
  IconTargetArrow,
  IconTrendingUp,
  IconTrash,
} from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import dayjs from 'dayjs';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudgets } from '../../hooks/useBudgets';
import { useTransactionCategories } from '../../hooks/useTransactionCategories';

type TimeframeOption = 'this_month' | 'last_month' | 'last_30_days' | 'all';

const TIMEFRAME_OPTIONS: { value: TimeframeOption; label: string }[] = [
  { value: 'this_month', label: 'Aktueller Monat' },
  { value: 'last_month', label: 'Letzter Monat' },
  { value: 'last_30_days', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Alle' },
];

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(value ?? 0);
}

function formatNumber(value: number) {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DashboardView() {
  const { transactions, loading: txLoading, refresh: refreshTx, removeTransaction } = useTransactions();
  const { budgets, loading: budgetsLoading, refresh: refreshBudgets } = useBudgets();
  const { categories, loading: categoriesLoading } = useTransactionCategories();

  const [timeframe, setTimeframe] = useState<TimeframeOption>('this_month');

  const loading = txLoading || budgetsLoading || categoriesLoading;

  useEffect(() => {
    void refreshTx();
    void refreshBudgets();
  }, [refreshTx, refreshBudgets]);

  const timeframeLabel = useMemo(
    () => TIMEFRAME_OPTIONS.find((option) => option.value === timeframe)?.label ?? 'Alle',
    [timeframe],
  );

  const filteredTransactions = useMemo(() => {
    const now = dayjs();
    return transactions.filter((transaction) => {
      const date = dayjs(transaction.transaction_date);
      switch (timeframe) {
        case 'this_month':
          return date.isSame(now, 'month');
        case 'last_month':
          return date.isSame(now.subtract(1, 'month'), 'month');
        case 'last_30_days':
          return date.isAfter(now.subtract(30, 'day'));
        case 'all':
        default:
          return true;
      }
    });
  }, [transactions, timeframe]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount ?? 0;
        } else {
          acc.expense += transaction.amount ?? 0;
        }
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [filteredTransactions]);

  const balance = totals.income - totals.expense;

  const recentTransactions = useMemo(() => filteredTransactions.slice(0, 8), [filteredTransactions]);

  const categoryStats = useMemo(() => {
    if (!filteredTransactions.length) return [];

    const map = new Map<
      string,
      { amount: number; categoryId: string | null; type: 'income' | 'expense' }
    >();

    filteredTransactions.forEach((transaction) => {
      const key = transaction.category_id ?? 'uncategorized';
      const existing = map.get(key);
      if (existing) {
        existing.amount += transaction.amount ?? 0;
      } else {
        map.set(key, {
          amount: transaction.amount ?? 0,
          categoryId: transaction.category_id ?? null,
          type: transaction.type,
        });
      }
    });

    return Array.from(map.values())
      .filter((item) => item.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  const budgetSummary = useMemo(() => {
    if (!budgets.length) {
      return {
        totalAllocated: 0,
        totalSpent: 0,
        overspent: 0,
        averageUtilisation: 0,
      };
    }

    const totalAllocated = budgets.reduce((acc, budget) => acc + (budget.amount ?? 0), 0);
    const totalSpent = budgets.reduce((acc, budget) => acc + (budget.spent ?? 0), 0);
    const overspent = budgets.filter((budget) => (budget.spent ?? 0) > (budget.amount ?? 0)).length;
    const averageUtilisation =
      totalAllocated > 0 ? Math.min((totalSpent / totalAllocated) * 100, 999) : 0;

    return {
      totalAllocated,
      totalSpent,
      overspent,
      averageUtilisation,
    };
  }, [budgets]);

  const handleDelete = async (id: string) => {
    try {
      const success = await removeTransaction(id);
      if (success) {
        showNotification({
          title: 'Geloescht',
          message: 'Transaktion wurde entfernt.',
          color: 'green',
        });
        void refreshTx();
        void refreshBudgets();
      } else {
        showNotification({
          title: 'Fehler',
          message: 'Transaktion konnte nicht geloescht werden.',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Delete transaction failed', error);
      showNotification({
        title: 'Fehler',
        message: 'Transaktion konnte nicht geloescht werden.',
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="lg">
        <Center h={320}>
          <Stack gap="sm" align="center">
            <Loader size="lg" />
            <Text c="dimmed">Dashboard wird geladen...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={2}>Finanzuebersicht</Title>
            <Text c="dimmed">
              Schneller Einblick in deine Einnahmen, Ausgaben und Budgets ({timeframeLabel}).
            </Text>
          </Stack>
          <Stack gap="sm" align="flex-end">
            <SegmentedControl
              value={timeframe}
              onChange={(value) => setTimeframe(value as TimeframeOption)}
              data={TIMEFRAME_OPTIONS}
              size="sm"
            />
            <Group gap="sm">
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => (window.location.href = '/transactions')}
              >
                Neue Transaktion
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                variant="light"
                onClick={() => (window.location.href = '/costs')}
              >
                Neuer Plan
              </Button>
            </Group>
          </Stack>
        </Group>

        <Card radius="lg" padding="xl" withBorder>
          <Stack gap="lg">
            <Group justify="space-between" align="center">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  Nettobilanz
                </Text>
                <Group gap="xs" align="baseline">
                  <ThemeIcon size={28} color={balance >= 0 ? 'green' : 'red'} variant="light">
                    {balance >= 0 ? <IconArrowUpRight size={18} /> : <IconArrowDownRight size={18} />}
                  </ThemeIcon>
                  <Text size="xl" fw={700} c={balance >= 0 ? 'green' : 'red'}>
                    {formatCurrency(balance)}
                  </Text>
                </Group>
              </Stack>
              <Badge size="lg" variant="light" color="blue" rightSection={<IconClock size={14} />}>
                {timeframeLabel}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
              <Card withBorder radius="md" padding="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">
                      Gesamteinnahmen
                    </Text>
                    <Text size="lg" fw={600}>
                      {formatCurrency(totals.income)}
                    </Text>
                  </Stack>
                  <ThemeIcon color="teal" variant="light" radius="md">
                    <IconCurrencyEuro size={18} />
                  </ThemeIcon>
                </Group>
                <Text size="xs" c="dimmed" mt="sm">
                  Alle verbuchten Einnahmen im ausgewaehlten Zeitraum.
                </Text>
              </Card>

              <Card withBorder radius="md" padding="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">
                      Gesamtausgaben
                    </Text>
                    <Text size="lg" fw={600}>
                      {formatCurrency(totals.expense)}
                    </Text>
                  </Stack>
                  <ThemeIcon color="red" variant="light" radius="md">
                    <IconTrendingUp size={18} />
                  </ThemeIcon>
                </Group>
                <Text size="xs" c="dimmed" mt="sm">
                  Alle Ausgaben, die deine Budgets beeinflussen.
                </Text>
              </Card>

              <Card withBorder radius="md" padding="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">
                      Budgets gesamt
                    </Text>
                    <Text size="lg" fw={600}>
                      {budgets.length}
                    </Text>
                  </Stack>
                  <ThemeIcon color="blue" variant="light" radius="md">
                    <IconChartPie size={18} />
                  </ThemeIcon>
                </Group>
                <Text size="xs" c="dimmed" mt="sm">
                  {formatCurrency(budgetSummary.totalAllocated)} verplant,{' '}
                  {formatCurrency(budgetSummary.totalSpent)} ausgegeben.
                </Text>
              </Card>

              <Card withBorder radius="md" padding="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text size="xs" c="dimmed">
                      Durchschnittliche Auslastung
                    </Text>
                    <Text size="lg" fw={600}>
                      {budgetSummary.averageUtilisation.toFixed(0)}%
                    </Text>
                  </Stack>
                  <ThemeIcon color="violet" variant="light" radius="md">
                    <IconTargetArrow size={18} />
                  </ThemeIcon>
                </Group>
                <Text size="xs" c="dimmed" mt="sm">
                  {budgetSummary.overspent} Budget(s) sind ueberzogen.
                </Text>
              </Card>
            </SimpleGrid>
          </Stack>
        </Card>

        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card withBorder radius="lg" padding="xl">
              <Group justify="space-between" align="center" mb="md">
                <div>
                  <Text fw={600}>Budgetstatus</Text>
                  <Text size="sm" c="dimmed">
                    Verfolge, welche Budgets kurz vor dem Limit stehen.
                  </Text>
                </div>
                <Button variant="subtle" size="xs" onClick={() => (window.location.href = '/budget')}>
                  Alle Budgets
                </Button>
              </Group>

              {budgets.length === 0 ? (
                <Text c="dimmed" size="sm">
                  Noch keine Budgets angelegt.
                </Text>
              ) : (
                <Stack gap="sm">
                  {budgets
                    .slice()
                    .sort(
                      (a, b) =>
                        (b.spent ?? 0) / Math.max(b.amount ?? 1, 1) -
                        (a.spent ?? 0) / Math.max(a.amount ?? 1, 1),
                    )
                    .slice(0, 5)
                    .map((budget) => {
                      const spent = budget.spent ?? 0;
                      const amount = budget.amount ?? 0;
                      const percent = amount > 0 ? Math.min((spent / amount) * 100, 999) : 0;
                      const color = percent >= 100 ? 'red' : percent >= 80 ? 'yellow' : 'blue';

                      return (
                        <Card key={budget.id} withBorder padding="md" radius="md">
                          <Group justify="space-between" align="flex-start">
                            <Stack gap={4}>
                              <Group gap="xs">
                                <Text fw={600}>{budget.name}</Text>
                                {percent >= 100 && (
                                  <Badge color="red" size="xs" variant="light">
                                    Ueberzogen
                                  </Badge>
                                )}
                              </Group>
                              <Text size="xs" c="dimmed">
                                {formatCurrency(spent)} von {formatCurrency(amount)}
                              </Text>
                            </Stack>
                            <Text fw={600} size="sm">
                              {percent.toFixed(0)}%
                            </Text>
                          </Group>
                          <Progress value={percent} mt="sm" color={color} />
                        </Card>
                      );
                    })}
                </Stack>
              )}

              <Anchor
                component="button"
                size="sm"
                mt="lg"
                onClick={() => (window.location.href = '/costs')}
              >
                Kostenplanung oeffnen
              </Anchor>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card withBorder radius="lg" padding="xl">
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <div>
                    <Text fw={600}>Top Ausgabenkategorien</Text>
                    <Text size="sm" c="dimmed">
                      Die groessten Kostenstellen im gewaehlten Zeitraum.
                    </Text>
                  </div>
                  <ThemeIcon variant="light" color="orange" radius="md">
                    <IconCalendar size={18} />
                  </ThemeIcon>
                </Group>

                {categoryStats.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Es gibt noch keine Ausgaben fuer diese Auswertung.
                  </Text>
                ) : (
                  <Stack gap="sm">
                    {categoryStats.map((item) => {
                      const category = categories.find((cat) => cat.id === item.categoryId);
                      const amount = item.amount ?? 0;
                      const percent =
                        totals.expense > 0 ? Math.min((amount / totals.expense) * 100, 100) : 0;

                      return (
                        <Card key={item.categoryId ?? 'uncategorized'} withBorder padding="md" radius="md">
                          <Group justify="space-between" align="flex-start">
                            <Group gap="sm" align="center">
                              <ThemeIcon
                                color={category?.color ?? 'gray'}
                                variant="light"
                                radius="md"
                              >
                                <IconChartPie size={16} />
                              </ThemeIcon>
                              <Stack gap={2}>
                                <Text fw={600}>{category?.name ?? 'Ohne Kategorie'}</Text>
                                <Text size="xs" c="dimmed">
                                  {formatCurrency(amount)}
                                </Text>
                              </Stack>
                            </Group>
                            <Badge variant="light" color="gray">
                              {percent.toFixed(0)}%
                            </Badge>
                          </Group>
                          <Progress value={percent} mt="sm" color={category?.color ?? 'gray'} />
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        <Card withBorder radius="lg" padding="xl">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600}>Letzte Transaktionen</Text>
                <Text size="sm" c="dimmed">
                  Schneller Zugriff auf die juengsten Einnahmen und Ausgaben.
                </Text>
              </div>
              <Button variant="subtle" size="sm" onClick={() => (window.location.href = '/transactions')}>
                Alle anzeigen
              </Button>
            </Group>

            {recentTransactions.length === 0 ? (
              <Text c="dimmed" size="sm">
                Es wurden noch keine Transaktionen erfasst.
              </Text>
            ) : (
              <Box>
                <ScrollArea.Autosize mah={360} offsetScrollbars>
                  <Table highlightOnHover horizontalSpacing="md" verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Datum</Table.Th>
                        <Table.Th>Typ</Table.Th>
                        <Table.Th>Kategorie</Table.Th>
                        <Table.Th>Budget</Table.Th>
                        <Table.Th>Beschreibung</Table.Th>
                        <Table.Th ta="right">Betrag</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {recentTransactions.map((transaction) => {
                        const category = categories.find((item) => item.id === transaction.category_id);
                        const budget = budgets.find((item) => item.id === transaction.budget_id);
                        const isIncome = transaction.type === 'income';

                        return (
                          <Table.Tr key={transaction.id}>
                            <Table.Td>{dayjs(transaction.transaction_date).format('DD.MM.YYYY')}</Table.Td>
                            <Table.Td>
                              <Badge color={isIncome ? 'green' : 'red'} variant="light">
                                {isIncome ? 'Einnahme' : 'Ausgabe'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={category?.color ?? 'gray'} variant="filled">
                                {category?.name ?? 'Ohne Kategorie'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{budget?.name ?? 'Kein Budget'}</Table.Td>
                            <Table.Td>{transaction.description ?? '-'}</Table.Td>
                            <Table.Td ta="right" fw={600} c={isIncome ? 'green' : 'red'}>
                              {formatNumber(transaction.amount ?? 0)} EUR
                            </Table.Td>
                            <Table.Td>
                              <Menu withinPortal position="bottom-end">
                                <Menu.Target>
                                  <ActionIcon variant="subtle">
                                    <IconChevronDown size={16} />
                                  </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                  <Menu.Item
                                    leftSection={<IconPencil size={14} />}
                                    onClick={() => (window.location.href = `/transactions?edit=${transaction.id}`)}
                                  >
                                    Bearbeiten
                                  </Menu.Item>
                                  <Menu.Item
                                    color="red"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => handleDelete(transaction.id)}
                                  >
                                    Loeschen
                                  </Menu.Item>
                                </Menu.Dropdown>
                              </Menu>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </Box>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
