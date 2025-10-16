'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Menu,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  Collapse,
  SegmentedControl,
  Grid,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAdjustments,
  IconChevronDown,
  IconFilterOff,
  IconPencil,
  IconPlus,
  IconTrash,
  IconTrendingUp,
  IconTrendingDown,
  IconCalculator,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useBudgets } from '../../hooks/useBudgets';
import { useTransactions } from '../../hooks/useTransactions';
import { useTransactionCategories } from '../../hooks/useTransactionCategories';
import type { FinanzenTransaction, FinanzenTransactionCategory } from '../../lib/types';

dayjs.locale('de');

type TransactionFormState = {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  budgetId: string;
  description: string;
  date: Date;
};

type FilterState = {
  type: '' | 'income' | 'expense';
  categoryId: string;
  budgetId: string;
  timeframe: TimeframeOption;
  dateRange: [Date | null, Date | null];
  minAmount?: number;
  maxAmount?: number;
  search: string;
};

type TimeframeOption = 'all' | 'this_month' | 'last_month' | 'last_30_days' | 'custom';

const TRANSACTION_TYPES = [
  { value: 'income', label: 'Einnahme' },
  { value: 'expense', label: 'Ausgabe' },
];

const TIMEFRAME_OPTIONS: { value: TimeframeOption; label: string }[] = [
  { value: 'this_month', label: 'Aktueller Monat' },
  { value: 'last_month', label: 'Letzter Monat' },
  { value: 'last_30_days', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamter Zeitraum' },
  { value: 'custom', label: 'Benutzerdefiniert' },
];

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

const INITIAL_FILTERS: FilterState = {
  type: '',
  categoryId: '',
  budgetId: '',
  timeframe: 'this_month',
  dateRange: [dayjs().startOf('month').toDate(), dayjs().endOf('month').toDate()],
  minAmount: undefined,
  maxAmount: undefined,
  search: '',
};

const INITIAL_FORM: TransactionFormState = {
  type: 'expense',
  amount: 0,
  categoryId: '',
  budgetId: '',
  description: '',
  date: new Date(),
};

const formatCurrency = (value: number) => `EUR ${value.toFixed(2)}`;

const computeTimeframeRange = (timeframe: TimeframeOption): [Date | null, Date | null] => {
  switch (timeframe) {
    case 'this_month':
      return [dayjs().startOf('month').toDate(), dayjs().endOf('month').toDate()];
    case 'last_month': {
      const start = dayjs().subtract(1, 'month').startOf('month');
      return [start.toDate(), start.endOf('month').toDate()];
    }
    case 'last_30_days':
      return [dayjs().subtract(30, 'day').startOf('day').toDate(), dayjs().endOf('day').toDate()];
    case 'all':
      return [null, null];
    case 'custom':
    default:
      return [null, null];
  }
};

export default function TransactionsPage() {
  const {
    transactions,
    loading: transactionsLoading,
    refreshing: transactionsRefreshing,
    error: transactionsError,
    addTransaction,
    editTransaction,
    removeTransaction,
    refresh: refreshTransactions,
  } = useTransactions();
  const {
    categories,
    loading: categoriesLoading,
    refreshing: categoriesRefreshing,
    error: categoriesError,
    addCategory,
    editCategory,
    removeCategory,
    refresh: refreshCategories,
  } = useTransactionCategories();
  const {
    budgets,
    loading: budgetsLoading,
    refreshing: budgetsRefreshing,
    error: budgetsError,
    refresh: refreshBudgets,
  } = useBudgets();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [transactionModalOpened, transactionModalHandlers] = useDisclosure(false);
  const [categoryModalOpened, categoryModalHandlers] = useDisclosure(false);
  const [formState, setFormState] = useState<TransactionFormState>(INITIAL_FORM);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<{ id?: string; name: string; color: string }>({
    id: undefined,
    name: '',
    color: 'blue',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Update date range when timeframe changes (except custom)
  useEffect(() => {
    if (filters.timeframe !== 'custom') {
      setFilters((prev) => ({
        ...prev,
        dateRange: computeTimeframeRange(prev.timeframe),
      }));
    }
  }, [filters.timeframe]);

  const categoryData = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
        color: category.color,
      })),
    [categories],
  );

  const budgetData = useMemo(
    () =>
      budgets.map((budget) => ({
        value: budget.id,
        label: budget.name,
        color: budget.color ?? 'gray',
      })),
    [budgets],
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filters.type && transaction.type !== filters.type) {
        return false;
      }
      if (filters.categoryId && transaction.category_id !== filters.categoryId) {
        return false;
      }
      if (filters.budgetId && transaction.budget_id !== filters.budgetId) {
        return false;
      }
      const date = dayjs(transaction.transaction_date);
      if (filters.dateRange[0] && date.isBefore(dayjs(filters.dateRange[0]).startOf('day'))) {
        return false;
      }
      if (filters.dateRange[1] && date.isAfter(dayjs(filters.dateRange[1]).endOf('day'))) {
        return false;
      }
      if (filters.minAmount && transaction.amount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount && transaction.amount > filters.maxAmount) {
        return false;
      }
      if (
        filters.search &&
        !transaction.description?.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        const amount = transaction.amount ?? 0;
        if (transaction.type === 'income') {
          acc.income += amount;
        } else {
          acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [filteredTransactions]);
  const incomeCount = useMemo(
    () => filteredTransactions.filter((transaction) => transaction.type === 'income').length,
    [filteredTransactions],
  );
  const expenseCount = filteredTransactions.length - incomeCount;

  const netBalance = totals.income - totals.expense;
  const totalAbsoluteAmount = filteredTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount ?? 0),
    0,
  );
  const averageTransactionAmount = filteredTransactions.length
    ? totalAbsoluteAmount / filteredTransactions.length
    : 0;
  const { topExpenseCatName, topExpenseCatColor } = useMemo(() => {
    const totalsByCategory = new Map<string, { name: string; color?: string; total: number }>();
    filteredTransactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return;
      const key = transaction.category_id ?? 'none';
      const category = categories.find((item) => item.id === transaction.category_id);
      const existing =
        totalsByCategory.get(key) ?? {
          name: category?.name ?? 'Ohne Kategorie',
          color: category?.color,
          total: 0,
        };
      existing.total += transaction.amount ?? 0;
      totalsByCategory.set(key, existing);
    });

    const values = Array.from(totalsByCategory.values());
    if (values.length === 0) {
      return { topExpenseCatName: 'Keine Kategorie', topExpenseCatColor: 'violet' };
    }
    const top = values.reduce((acc, cur) => (acc.total > cur.total ? acc : cur));
    return { topExpenseCatName: top.name ?? 'Keine Kategorie', topExpenseCatColor: top.color ?? 'violet' };
  }, [filteredTransactions, categories]);

  const timeframeSegments = TIMEFRAME_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const advancedFiltersActive = Boolean(filters.minAmount || filters.maxAmount || filters.search);

  const handleOpenCreateTransaction = () => {
    setFormState({
      ...INITIAL_FORM,
      categoryId: categoryData[0]?.value ?? '',
      budgetId: budgetData[0]?.value ?? '',
    });
    transactionModalHandlers.open();
  };

  const handleOpenEditTransaction = (transaction: FinanzenTransaction) => {
    setFormState({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount ?? 0,
      categoryId: transaction.category_id ?? '',
      budgetId: transaction.budget_id ?? '',
      description: transaction.description ?? '',
      date: dayjs(transaction.transaction_date).toDate(),
    });
    transactionModalHandlers.open();
  };

  const handleSaveTransaction = async () => {
    if (!formState.categoryId || !formState.budgetId) {
      return;
    }
    if (formState.amount <= 0) {
      return;
    }
    setSavingTransaction(true);
    const payload: Partial<FinanzenTransaction> = {
      amount: formState.amount,
      description: formState.description.trim(),
      type: formState.type,
      category_id: formState.categoryId,
      budget_id: formState.budgetId,
      transaction_date: dayjs(formState.date).format('YYYY-MM-DD'),
      is_recurring: false,
    };
    try {
        console.log('Saving transaction payload:', { id: formState.id, payload });
        let result = null;
        if (formState.id) {
          result = await editTransaction(formState.id, payload);
          showNotification({ title: 'Transaktion aktualisiert', message: 'Die Transaktion wurde gespeichert.', color: 'green' });
        } else {
          result = await addTransaction(payload);
          showNotification({ title: 'Transaktion erstellt', message: 'Die Transaktion wurde angelegt.', color: 'green' });
        }
        await refreshTransactions();
        await refreshBudgets();
        transactionModalHandlers.close();
        console.log('Save result:', result);
    } catch (err) {
        console.error('Transaktion speichern fehlgeschlagen:', err);
        showNotification({ title: 'Fehler', message: 'Transaktion konnte nicht gespeichert werden.', color: 'red' });
    } finally {
      setSavingTransaction(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const ok = await removeTransaction(transactionId);
      if (ok) {
        showNotification({ title: 'Transaktion gelöscht', message: 'Die Transaktion wurde entfernt.', color: 'green' });
      } else {
        showNotification({ title: 'Fehler', message: 'Transaktion konnte nicht gelöscht werden.', color: 'red' });
      }
      await refreshTransactions();
      await refreshBudgets();
    } catch (err) {
      console.error('Transaktion loeschen fehlgeschlagen:', err);
      showNotification({ title: 'Fehler', message: 'Transaktion konnte nicht gelöscht werden.', color: 'red' });
    }
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleOpenCreateCategory = () => {
    setCategoryDraft({ id: undefined, name: '', color: 'blue' });
    categoryModalHandlers.open();
  };

  const handleOpenEditCategory = (category: FinanzenTransactionCategory) => {
    setCategoryDraft({ id: category.id, name: category.name, color: category.color });
    categoryModalHandlers.open();
  };

  const handleSaveCategory = async () => {
    if (!categoryDraft.name.trim()) {
      return;
    }
    setSavingCategory(true);
    try {
      if (categoryDraft.id) {
        await editCategory(categoryDraft.id, {
          name: categoryDraft.name.trim(),
          color: categoryDraft.color,
        });
      } else {
        await addCategory({ name: categoryDraft.name.trim(), color: categoryDraft.color });
      }
      await refreshCategories();
      categoryModalHandlers.close();
    } catch (err) {
      console.error('Kategorie speichern fehlgeschlagen:', err);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await removeCategory(categoryId);
      await refreshCategories();
    } catch (err) {
      console.error('Kategorie loeschen fehlgeschlagen:', err);
    }
  };

  const isLoading = transactionsLoading || categoriesLoading || budgetsLoading;
  const isRefreshing =
    !isLoading && (transactionsRefreshing || categoriesRefreshing || budgetsRefreshing);
  const errorMessages = [transactionsError, categoriesError, budgetsError].filter(
    (message): message is string => Boolean(message),
  );
  const hiddenTransactions = transactions.length - filteredTransactions.length;

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={1}>Transaktionen</Title>
            <Text c="dimmed">
              Erstelle, filtere und analysiere deine Einnahmen und Ausgaben. Kategorien lassen sich komplett verwalten.
            </Text>
          </Stack>
          <Group gap="sm">
            <Button variant="light" leftSection={<IconAdjustments size={16} />} onClick={handleOpenCreateCategory}>
              Kategorien verwalten
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateTransaction}>
              Transaktion erfassen
            </Button>
          </Group>
        </Group>

  <Card withBorder p="lg" radius="md" shadow="sm">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group gap="sm" align="center">
                <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                  <IconAdjustments size={18} />
                </ThemeIcon>
                <Stack gap={2} justify="center">
                  <Text fw={600}>Transaktionsfilter</Text>
                  <Text size="sm" c="dimmed">
                    Waehle Zeitraum, Kategorien und verfeinere deine Ansicht.
                  </Text>
                </Stack>
              </Group>
              <Group gap="xs">
                <Tooltip label="Erweiterte Filter ein- oder ausblenden" withArrow>
                  <Button
                    variant={showAdvancedFilters || advancedFiltersActive ? 'filled' : 'light'}
                    color="blue"
                    onClick={() => setShowAdvancedFilters((prev) => !prev)}
                  >
                    {showAdvancedFilters ? 'Weniger Filter' : 'Weitere Filter'}
                  </Button>
                </Tooltip>
                <Button variant="subtle" leftSection={<IconFilterOff size={16} />} onClick={handleResetFilters}>
                  Zuruecksetzen
                </Button>
              </Group>
            </Group>

            <Stack gap="md">
              <SegmentedControl
                fullWidth
                value={filters.timeframe}
                data={timeframeSegments}
                onChange={(value) => {
                  const nextValue = (value as TimeframeOption) ?? 'all';
                  setFilters((prev) => ({
                    ...prev,
                    timeframe: nextValue,
                    dateRange: nextValue === 'custom' ? prev.dateRange : computeTimeframeRange(nextValue),
                  }));
                }}
              />

              {filters.timeframe === 'custom' ? (
                <DatePickerInput
                  type="range"
                  label="Zeitraum"
                  value={filters.dateRange}
                  onChange={(range) => setFilters((prev) => ({ ...prev, dateRange: range }))}
                  allowSingleDateInRange
                  locale="de"
                />
              ) : null}

              <Grid gutter="md">
                <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                  <Select
                    label="Typ"
                    data={TRANSACTION_TYPES}
                    value={filters.type}
                    onChange={(value) =>
                      setFilters((prev) => ({ ...prev, type: (value as FilterState['type']) ?? '' }))
                    }
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                  <Select
                    label="Kategorie"
                    data={categoryData}
                    value={filters.categoryId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, categoryId: value ?? '' }))}
                    searchable
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                  <Select
                    label="Budget"
                    data={budgetData}
                    value={filters.budgetId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, budgetId: value ?? '' }))}
                    searchable
                    clearable
                  />
                </Grid.Col>
              </Grid>

              <Collapse in={showAdvancedFilters}>
                <Grid gutter="md" mt="xs">
                  <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                        <NumberInput
                          label="Mindestbetrag"
                          value={filters.minAmount}
                          onChange={(value) =>
                            // NumberInput onChange can pass string in some cases; coerce to number or undefined
                            setFilters((prev) => ({ ...prev, minAmount: value == null ? undefined : Number(value) }))
                          }
                          prefix="EUR "
                          decimalScale={2}
                        />
                      </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                    <NumberInput
                      label="Hoechstbetrag"
                      value={filters.maxAmount}
                      onChange={(value) =>
                        setFilters((prev) => ({ ...prev, maxAmount: value == null ? undefined : Number(value) }))
                      }
                      prefix="EUR "
                      decimalScale={2}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4, lg: 6 }}>
                    <TextInput
                      label="Suche in Beschreibung"
                      placeholder="z. B. Einkaufen"
                      value={filters.search}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, search: event.currentTarget.value }))
                      }
                    />
                  </Grid.Col>
                </Grid>
              </Collapse>
            </Stack>
          </Stack>
        </Card>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Card
              p="lg"
              radius="lg"
              style={{
                background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-blue-4))',
                color: 'white',
              }}
            >
              <Stack gap="xs">
                <Text size="sm" style={{ opacity: 0.75 }}>
                  Saldo
                </Text>
                <Text size="xl" fw={700}>
                  {formatCurrency(netBalance)}
                </Text>
                <Text size="xs" style={{ opacity: 0.75 }}>
                  Nach allen Filtern berechnet
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Card withBorder p="lg" radius="lg">
              <Stack gap="xs">
                <Group gap="xs" justify="space-between">
                  <ThemeIcon variant="light" color="green" radius="md">
                    <IconTrendingUp size={18} />
                  </ThemeIcon>
                  <Badge variant="light" color="green">
                    {incomeCount} Buchungen
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Einnahmen
                </Text>
                <Text size="lg" fw={700} c="green">
                  {formatCurrency(totals.income)}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Card withBorder p="lg" radius="lg">
              <Stack gap="xs">
                <Group gap="xs" justify="space-between">
                  <ThemeIcon variant="light" color="red" radius="md">
                    <IconTrendingDown size={18} />
                  </ThemeIcon>
                  <Badge variant="light" color="red">
                    {expenseCount} Buchungen
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Ausgaben
                </Text>
                <Text size="lg" fw={700} c="red">
                  {formatCurrency(totals.expense)}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
            <Card withBorder p="lg" radius="lg">
              <Stack gap="xs">
                <Group gap="xs" justify="space-between">
                  <ThemeIcon variant="light" color="violet" radius="md">
                    <IconCalculator size={18} />
                  </ThemeIcon>
                          <Badge variant="light" color={topExpenseCatColor}>
                            {topExpenseCatName}
                          </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Durchschnitt / Transaktion
                </Text>
                <Text size="lg" fw={700} c="violet">
                  {formatCurrency(averageTransactionAmount)}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {errorMessages.length > 0 ? (
          <Paper withBorder p="lg">
            <Stack gap="xs">
              {errorMessages.map((message, index) => (
                <Text key={index} c="red">
                  {message}
                </Text>
              ))}
            </Stack>
          </Paper>
        ) : null}

        <Paper withBorder>
          <Box p="md">
            <Group justify="space-between" mb="md">
              <Group gap="sm" align="center">
                <Text fw={600}>
                  {filteredTransactions.length} Transaktionen
                </Text>
                {isRefreshing ? (
                  <Badge color="blue" variant="light" size="sm">
                    Aktualisiere...
                  </Badge>
                ) : null}
              </Group>
              <Text size="sm" c="dimmed">
                {hiddenTransactions > 0
                  ? `${hiddenTransactions} ${
                      hiddenTransactions === 1 ? 'Eintrag' : 'Eintraege'
                    } ausgeblendet`
                  : `${filteredTransactions.length} von ${transactions.length} sichtbar`}
              </Text>
            </Group>

            <Divider mb="md" />

            {isLoading ? (
              <Text c="dimmed">Lade Daten...</Text>
            ) : filteredTransactions.length === 0 ? (
              <Text c="dimmed" ta="center" py="lg">
                Keine Transaktionen im gewaehlten Zeitraum.
              </Text>
            ) : (
              <>
                {isRefreshing ? (
                  <Text c="dimmed" size="sm" mb="sm">
                    Aktualisiere Daten im Hintergrund...
                  </Text>
                ) : null}
                <ScrollArea.Autosize mah={480} offsetScrollbars>
                  <Table striped highlightOnHover withTableBorder withColumnBorders>
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
                      {filteredTransactions.map((transaction) => {
                        const category = categories.find((item) => item.id === transaction.category_id);
                        const budget = budgets.find((item) => item.id === transaction.budget_id);
                        return (
                          <Table.Tr key={transaction.id}>
                            <Table.Td>{dayjs(transaction.transaction_date).format('DD.MM.YYYY')}</Table.Td>
                            <Table.Td>
                              <Badge color={transaction.type === 'income' ? 'green' : 'red'} variant="light">
                                {transaction.type === 'income' ? 'Einnahme' : 'Ausgabe'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Badge color={category?.color ?? 'gray'} variant="filled">
                                  {category?.name ?? 'Unbekannt'}
                                </Badge>
                              </Group>
                            </Table.Td>
                            <Table.Td>{budget?.name ?? 'Ohne Budget'}</Table.Td>
                            <Table.Td>{transaction.description ?? '-'}</Table.Td>
                            <Table.Td ta="right" fw={600} c={transaction.type === 'income' ? 'green' : 'red'}>
                              {formatCurrency(transaction.amount ?? 0)}
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
                                    onClick={() => handleOpenEditTransaction(transaction)}
                                  >
                                    Bearbeiten
                                  </Menu.Item>
                                  <Menu.Item
                                    color="red"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => handleDeleteTransaction(transaction.id)}
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
              </>
            )}
          </Box>
        </Paper>
      </Stack>

      {/* Transaction Modal */}
      <Modal
        opened={transactionModalOpened}
        onClose={transactionModalHandlers.close}
        title={formState.id ? 'Transaktion bearbeiten' : 'Transaktion erfassen'}
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Typ"
            data={TRANSACTION_TYPES}
            value={formState.type}
            onChange={(value) =>
              setFormState((prev) => ({ ...prev, type: (value as TransactionFormState['type']) ?? 'expense' }))
            }
            required
          />
          <NumberInput
            label="Betrag"
            value={formState.amount}
            onChange={(value) => setFormState((prev) => ({ ...prev, amount: Number(value) || 0 }))}
            min={0}
            step={5}
            decimalScale={2}
            prefix="EUR "
            required
          />
          <Select
            label="Kategorie"
            data={categoryData}
            value={formState.categoryId}
            onChange={(value) => setFormState((prev) => ({ ...prev, categoryId: value ?? '' }))}
            searchable
            required
          />
          <Select
            label="Budget"
            data={budgetData}
            value={formState.budgetId}
            onChange={(value) => setFormState((prev) => ({ ...prev, budgetId: value ?? '' }))}
            searchable
            required
          />
          <TextInput
            label="Beschreibung"
            placeholder="Kurzbeschreibung"
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.currentTarget.value }))}
          />
          <DatePickerInput
            label="Datum"
            value={formState.date}
            onChange={(date) => setFormState((prev) => ({ ...prev, date: date ?? new Date() }))}
            required
            locale="de"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={transactionModalHandlers.close}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveTransaction} loading={savingTransaction}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Category Modal */}
      <Modal
        opened={categoryModalOpened}
        onClose={categoryModalHandlers.close}
        title={categoryDraft.id ? 'Kategorie bearbeiten' : 'Kategorie anlegen'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            value={categoryDraft.name}
            onChange={(event) => setCategoryDraft((prev) => ({ ...prev, name: event.currentTarget.value }))}
            required
          />
          <Select
            label="Farbe"
            data={COLOR_OPTIONS}
            value={categoryDraft.color}
            onChange={(value) => setCategoryDraft((prev) => ({ ...prev, color: value ?? 'blue' }))}
            required
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={categoryModalHandlers.close}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveCategory} loading={savingCategory}>
              Speichern
            </Button>
          </Group>
        </Stack>

        <Divider my="lg" label="Bestehende Kategorien" />
        <Stack gap="sm">
          {categories.map((category) => (
            <Group key={category.id} justify="space-between">
              <Group gap="xs">
                <Badge color={category.color} variant="filled">
                  {category.name}
                </Badge>
                {category.is_default ? (
                  <Badge size="xs" variant="light">
                    Standard
                  </Badge>
                ) : null}
              </Group>
              <Group gap="xs">
                <ActionIcon variant="subtle" onClick={() => handleOpenEditCategory(category)}>
                  <IconPencil size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => handleDeleteCategory(category.id)}
                  title="Loeschen"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
        </Stack>
      </Modal>
    </Container>
  );
}
