'use client';

import { useState, useMemo } from 'react';
import { 
  Container, 
  Title, 
  Paper, 
  TextInput, 
  Select, 
  Button, 
  Group, 
  Table, 
  Badge, 
  ActionIcon, 
  Text, 
  NumberInput,
  Grid,
  Card,
  Stack,
  Collapse,
  Divider,
  Box,
  Modal,
  SimpleGrid,
  Flex,
  ScrollArea,
  Menu,
  rem
} from '@mantine/core';
import { DatePickerInput, DateInput } from '@mantine/dates';
import { IconPlus, IconTrash, IconEdit, IconFilter, IconFilterOff, IconSearch, IconDotsVertical, IconTrendingUp, IconTrendingDown, IconCalendar, IconReceipt } from '@tabler/icons-react';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudgets } from '../../hooks/useBudgets';
import { useTransactionCategories } from '../../hooks/useTransactionCategories';
import type { FinanzenTransactionCategory, FinanzenBudget } from '../../lib/types';

dayjs.extend(customParseFormat);
dayjs.locale('de');

interface Transaction {
  id: string;
  typ: 'Einnahme' | 'Ausgabe';
  kategorie: string;
  kategorieId?: string | null;
  budget: string;
  budgetId?: string | null;
  betrag: number;
  beschreibung: string;
  datum: Date;
}

interface BudgetItem {
  id: string;
  name: string;
  betrag: number;
  ausgegeben: number;
  resetTag: number;
  farbe: string;
  beschreibung: string;
}

interface FilterState {
  typ: string;
  kategorieId: string;
  budgetId: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  minBetrag: number | undefined;
  maxBetrag: number | undefined;
  searchText: string;
}

interface TransactionFormState {
  typ: 'Einnahme' | 'Ausgabe';
  kategorieId: string;
  budgetId: string;
  betrag: number;
  beschreibung: string;
  datum: Date;
}

export default function TransactionsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const {
    transactions: transactionRecords,
    loading: transactionsLoading,
    addTransaction,
    editTransaction,
    removeTransaction,
  } = useTransactions();

  const {
    budgets: budgetRecords,
    loading: budgetsLoading,
    refresh: refreshBudgets,
  } = useBudgets();

  const {
    categories,
    loading: categoriesLoading,
  } = useTransactionCategories();

  const isLoadingData = transactionsLoading || budgetsLoading || categoriesLoading;

  const categoryById = useMemo(() => {
    const map = new Map<string, FinanzenTransactionCategory>();
    categories.forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [categories]);

  const budgetById = useMemo(() => {
    const map = new Map<string, FinanzenBudget>();
    budgetRecords.forEach((budget) => {
      map.set(budget.id, budget);
    });
    return map;
  }, [budgetRecords]);

  const budgets: BudgetItem[] = useMemo(() => {
    return budgetRecords.map((budget) => ({
      id: budget.id,
      name: budget.name,
      betrag: Number(budget.amount ?? 0),
      ausgegeben: Number(budget.spent ?? 0),
      resetTag: budget.reset_day ?? 1,
      farbe: budget.category_id ? categoryById.get(budget.category_id)?.color ?? 'blue' : 'blue',
      beschreibung: '',
    }));
  }, [budgetRecords, categoryById]);

  const transactions = useMemo<Transaction[]>(() => {
    return transactionRecords.map((transaction) => {
      const categoryInfo = transaction.category_id ? categoryById.get(transaction.category_id) : undefined;
      const budgetInfo = transaction.budget_id ? budgetById.get(transaction.budget_id) : undefined;

      return {
        id: transaction.id,
        typ: transaction.type === 'income' ? 'Einnahme' : 'Ausgabe',
        kategorie: categoryInfo?.name ?? (transaction.category_id ? 'Unbekannte Kategorie' : 'Keine Kategorie'),
        kategorieId: transaction.category_id,
        budget: budgetInfo?.name ?? (transaction.budget_id ? 'Unbekanntes Budget' : 'Kein Budget'),
        budgetId: transaction.budget_id,
        betrag: Number(transaction.amount ?? 0),
        beschreibung: transaction.description ?? '',
        datum: transaction.transaction_date ? dayjs(transaction.transaction_date).toDate() : new Date(),
      };
    });
  }, [transactionRecords, categoryById, budgetById]);

  const kategorieOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
        color: category.color || 'gray',
      })),
    [categories]
  );

  const budgetFilterOptions = useMemo(
    () =>
      budgets.map((budget) => ({
        value: budget.id,
        label: budget.name,
      })),
    [budgets]
  );

  const budgetFormOptions = useMemo(
    () =>
      budgets.map((budget) => ({
        value: budget.id,
        label: `${budget.name} (${(budget.betrag - budget.ausgegeben).toFixed(0)}€ verfügbar)`,
      })),
    [budgets]
  );

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    typ: '',
    kategorieId: '',
    budgetId: '',
    dateFrom: null,
    dateTo: null,
    minBetrag: undefined,
    maxBetrag: undefined,
    searchText: ''
  });

  // Form State
  const [opened, { open, close }] = useDisclosure(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);

  // Form Fields
  const [formData, setFormData] = useState<TransactionFormState>({
    typ: 'Ausgabe',
    kategorieId: '',
    budgetId: '',
    betrag: 0,
    beschreibung: '',
    datum: new Date()
  });

  // Helper Funktionen
  const getCategoryColor = (categoryId?: string | null) => {
    if (!categoryId) return 'gray';
    return categoryById.get(categoryId)?.color || 'gray';
  };

  const getBudgetInfo = (budgetId?: string | null) => {
    if (!budgetId) {
      return undefined;
    }
    return budgets.find((budget) => budget.id === budgetId);
  };

  // Filter-Funktionen
  const applyFilters = (transaction: Transaction) => {
    if (filters.typ && transaction.typ !== filters.typ) return false;
    if (filters.kategorieId && transaction.kategorieId !== filters.kategorieId) return false;
    if (filters.budgetId && transaction.budgetId !== filters.budgetId) return false;
    if (filters.dateFrom && dayjs(transaction.datum).isBefore(dayjs(filters.dateFrom))) return false;
    if (filters.dateTo && dayjs(transaction.datum).isAfter(dayjs(filters.dateTo))) return false;
    if (filters.minBetrag && transaction.betrag < filters.minBetrag) return false;
    if (filters.maxBetrag && transaction.betrag > filters.maxBetrag) return false;
    if (filters.searchText && !transaction.beschreibung.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
    return true;
  };

  const clearFilters = () => {
    setFilters({
      typ: '',
      kategorieId: '',
      budgetId: '',
      dateFrom: null,
      dateTo: null,
      minBetrag: undefined,
      maxBetrag: undefined,
      searchText: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.typ || filters.kategorieId || filters.budgetId || filters.dateFrom || 
           filters.dateTo || filters.minBetrag || filters.maxBetrag || filters.searchText;
  };

  const filteredTransactions = transactions.filter(applyFilters);

  // Form Handling
  const resetForm = () => {
    setFormData({
      typ: 'Ausgabe',
      kategorieId: '',
      budgetId: '',
      betrag: 0,
      beschreibung: '',
      datum: new Date()
    });
  };

  const openAddForm = () => {
    setEditingTransaction(null);
    resetForm();
    open();
  };

  const openEditForm = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      typ: transaction.typ,
      kategorieId: transaction.kategorieId ?? '',
      budgetId: transaction.budgetId ?? '',
      betrag: transaction.betrag,
      beschreibung: transaction.beschreibung,
      datum: transaction.datum
    });
    open();
  };

  const handleSubmit = async () => {
    if (!formData.beschreibung || formData.betrag <= 0) {
      notifications.show({
        title: 'Unvollständige Angaben',
        message: 'Bitte fülle alle Pflichtfelder aus.',
        color: 'orange',
      });
      return;
    }

    if (!formData.kategorieId || !formData.budgetId) {
      notifications.show({
        title: 'Auswahl erforderlich',
        message: 'Bitte wähle eine Kategorie und ein Budget aus.',
        color: 'orange',
      });
      return;
    }



    const payload = {
      amount: formData.betrag,
      description: formData.beschreibung,
      type: formData.typ === 'Einnahme' ? 'income' : 'expense',
      category_id: formData.kategorieId || null,
      budget_id: formData.budgetId || null,
      transaction_date: dayjs(formData.datum).format('YYYY-MM-DD'),
      is_recurring: false,
    };

    try {
      setIsSubmitting(true);

      if (editingTransaction) {
        await editTransaction(editingTransaction.id, payload);
        notifications.show({
          title: 'Transaktion aktualisiert',
          message: 'Die Transaktion wurde erfolgreich angepasst.',
          color: 'green',
        });
      } else {
        await addTransaction(payload);
        notifications.show({
          title: 'Transaktion erstellt',
          message: 'Die neue Transaktion wurde gespeichert.',
          color: 'green',
        });
      }

      await refreshBudgets();
      resetForm();
      close();
    } catch (error) {
      console.error('Fehler beim Speichern der Transaktion:', error);
      notifications.show({
        title: 'Fehler beim Speichern',
        message: 'Die Transaktion konnte nicht gespeichert werden.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const success = await removeTransaction(id);
      if (!success) {
        throw new Error('Transaktion konnte nicht gelöscht werden');
      }
      await refreshBudgets();
      notifications.show({
        title: 'Transaktion gelöscht',
        message: 'Die Transaktion wurde erfolgreich entfernt.',
        color: 'green',
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Transaktion:', error);
      notifications.show({
        title: 'Fehler beim Löschen',
        message: 'Die Transaktion konnte nicht gelöscht werden.',
        color: 'red',
      });
    }
  };

  // Mobile Transaction Card Component
  const MobileTransactionCard = ({ transaction }: { transaction: Transaction }) => (
    <Card
      padding="md"
      radius="md"
      withBorder
      style={{
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onClick={() => openEditForm(transaction)}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap="xs">
              <Badge 
                color={transaction.typ === 'Einnahme' ? 'green' : 'red'} 
                variant="light"
                size="sm"
                leftSection={
                  transaction.typ === 'Einnahme' ? 
                  <IconTrendingUp size={12} /> : 
                  <IconTrendingDown size={12} />
                }
              >
                {transaction.typ}
              </Badge>
              <Badge 
                color={getCategoryColor(transaction.kategorieId)} 
                variant="dot"
                size="sm"
              >
                {transaction.kategorie}
              </Badge>
            </Group>
            <Text fw={500} size="sm" lineClamp={2}>
              {transaction.beschreibung}
            </Text>
            <Group gap="xs">
              <IconCalendar size={14} style={{ opacity: 0.6 }} />
              <Text size="xs" c="dimmed">
                {dayjs(transaction.datum).format('DD.MM.YYYY')}
              </Text>
              <Text size="xs" c="dimmed">•</Text>
              <Text size="xs" c="dimmed">
                {transaction.budget || 'Kein Budget'}
              </Text>
            </Group>
          </Stack>
          
          <Stack gap="xs" align="flex-end">
            <Text 
              fw={700} 
              size="lg"
              c={transaction.typ === 'Einnahme' ? 'green' : 'red'}
            >
              {transaction.typ === 'Einnahme' ? '+' : '-'}€{transaction.betrag.toFixed(2)}
            </Text>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon 
                  variant="subtle" 
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item 
                  leftSection={<IconEdit size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditForm(transaction);
                  }}
                >
                  Bearbeiten
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTransaction(transaction.id);
                  }}
                >
                  Löschen
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Stack>
        </Group>
      </Stack>
    </Card>
  );

  // Statistiken
  const totalEinnahmen = filteredTransactions
    .filter(t => t.typ === 'Einnahme')
    .reduce((sum, t) => sum + t.betrag, 0);

  const totalAusgaben = filteredTransactions
    .filter(t => t.typ === 'Ausgabe')
    .reduce((sum, t) => sum + t.betrag, 0);

  const saldo = totalEinnahmen - totalAusgaben;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Flex justify="space-between" align="center" gap="md" wrap="wrap">
          <Title order={1} size={isMobile ? "h2" : "h1"}>Transaktionen</Title>
          {!isMobile && (
            <Button 
              leftSection={<IconPlus size={16} />} 
              onClick={openAddForm}
              disabled={isLoadingData}
              size="sm"
            >
              Neue Transaktion
            </Button>
          )}
        </Flex>

        {/* Filter-Bereich */}
        <Paper p={isMobile ? "sm" : "md"} withBorder>
          <Group justify="space-between" align="center" mb={filtersOpened ? "md" : 0}>
            <Group>
              <IconFilter size={20} />
              <Text fw={500} size={isMobile ? "sm" : "md"}>Filter</Text>
              {hasActiveFilters() && (
                <Badge color="blue" size="sm">
                  {Object.values(filters).filter(v => v !== '' && v !== null && v !== undefined).length}
                </Badge>
              )}
            </Group>
            <Group gap={isMobile ? "xs" : "sm"}>
              <Button 
                variant="light" 
                leftSection={<IconFilter size={16} />}
                onClick={toggleFilters}
                size={isMobile ? "xs" : "sm"}
              >
                {filtersOpened ? 'Ausblenden' : 'Filter'}
              </Button>
              {hasActiveFilters() && (
                <Button 
                  variant="outline" 
                  color="red"
                  leftSection={<IconFilterOff size={16} />}
                  onClick={clearFilters}
                  size={isMobile ? "xs" : "sm"}
                >
                  {isMobile ? 'Reset' : 'Zurücksetzen'}
                </Button>
              )}
            </Group>
          </Group>

          <Collapse in={filtersOpened}>
            <Divider mb="md" />
            {isMobile ? (
              // Mobile Filter Layout
              <Stack gap="md">
                <TextInput
                  label="Suchtext"
                  placeholder="Beschreibung durchsuchen..."
                  leftSection={<IconSearch size={16} />}
                  value={filters.searchText}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                  size="md"
                />
                <SimpleGrid cols={2} spacing="md">
                  <Select
                    label="Typ"
                    placeholder="Alle"
                    data={[
                      { value: 'Einnahme', label: 'Einnahme' },
                      { value: 'Ausgabe', label: 'Ausgabe' }
                    ]}
                    value={filters.typ}
                    onChange={(value) => setFilters(prev => ({ ...prev, typ: value || '' }))}
                    clearable
                    size="md"
                  />
                  <Select
                    label="Kategorie"
                    placeholder="Alle"
                    data={kategorieOptions}
                    value={filters.kategorieId}
                    onChange={(value) => setFilters(prev => ({ ...prev, kategorieId: value || '' }))}
                    clearable
                    size="md"
                  />
                </SimpleGrid>
                <Select
                  label="Budget"
                  placeholder="Alle Budgets"
                  data={budgetFilterOptions}
                  value={filters.budgetId}
                  onChange={(value) => setFilters(prev => ({ ...prev, budgetId: value || '' }))}
                  clearable
                  size="md"
                />
                <SimpleGrid cols={2} spacing="md">
                  <DatePickerInput
                    label="Von"
                    placeholder="Startdatum"
                    value={filters.dateFrom}
                    onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
                    valueFormat="DD.MM.YY"
                    locale="de"
                    firstDayOfWeek={1}
                    clearable
                    size="md"
                  />
                  <DatePickerInput
                    label="Bis"
                    placeholder="Enddatum"
                    value={filters.dateTo}
                    onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
                    valueFormat="DD.MM.YY"
                    locale="de"
                    firstDayOfWeek={1}
                    clearable
                    size="md"
                  />
                </SimpleGrid>
              </Stack>
            ) : (
              // Desktop Filter Layout
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <TextInput
                    label="Suchtext"
                    placeholder="Beschreibung durchsuchen..."
                    leftSection={<IconSearch size={16} />}
                    value={filters.searchText}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Typ"
                    placeholder="Alle Typen"
                    data={[
                      { value: 'Einnahme', label: 'Einnahme' },
                      { value: 'Ausgabe', label: 'Ausgabe' }
                    ]}
                    value={filters.typ}
                    onChange={(value) => setFilters(prev => ({ ...prev, typ: value || '' }))}
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Kategorie"
                    placeholder="Alle Kategorien"
                    data={kategorieOptions}
                    value={filters.kategorieId}
                    onChange={(value) => setFilters(prev => ({ ...prev, kategorieId: value || '' }))}
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Budget"
                    placeholder="Alle Budgets"
                    data={budgetFilterOptions}
                    value={filters.budgetId}
                    onChange={(value) => setFilters(prev => ({ ...prev, budgetId: value || '' }))}
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <DatePickerInput
                    label="Von Datum"
                    placeholder="Startdatum wählen"
                    value={filters.dateFrom}
                    onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
                    valueFormat="DD.MM.YYYY"
                    locale="de"
                    firstDayOfWeek={1}
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <DatePickerInput
                    label="Bis Datum"
                    placeholder="Enddatum wählen"
                    value={filters.dateTo}
                    onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
                    valueFormat="DD.MM.YYYY"
                    locale="de"
                    firstDayOfWeek={1}
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <NumberInput
                    label="Min. Betrag"
                    placeholder="0,00"
                    decimalScale={2}
                    fixedDecimalScale
                    prefix="€"
                    value={filters.minBetrag}
                    onChange={(value) => setFilters(prev => ({ ...prev, minBetrag: typeof value === 'number' ? value : undefined }))}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <NumberInput
                    label="Max. Betrag"
                    placeholder="1000,00"
                    decimalScale={2}
                    fixedDecimalScale
                    prefix="€"
                    value={filters.maxBetrag}
                    onChange={(value) => setFilters(prev => ({ ...prev, maxBetrag: typeof value === 'number' ? value : undefined }))}
                  />
                </Grid.Col>
              </Grid>
            )}
          </Collapse>
        </Paper>

        {/* Statistik-Karten */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Card padding="lg" withBorder>
            <Stack gap={4} align="center">
              <IconTrendingUp size={24} style={{ color: 'var(--mantine-color-green-6)' }} />
              <Text size="xs" c="dimmed" ta="center">Einnahmen</Text>
              <Text size={isMobile ? "lg" : "xl"} fw={700} c="green" ta="center">
                €{totalEinnahmen.toFixed(2)}
              </Text>
            </Stack>
          </Card>
          <Card padding="lg" withBorder>
            <Stack gap={4} align="center">
              <IconTrendingDown size={24} style={{ color: 'var(--mantine-color-red-6)' }} />
              <Text size="xs" c="dimmed" ta="center">Ausgaben</Text>
              <Text size={isMobile ? "lg" : "xl"} fw={700} c="red" ta="center">
                €{totalAusgaben.toFixed(2)}
              </Text>
            </Stack>
          </Card>
          <Card padding="lg" withBorder>
            <Stack gap={4} align="center">
              <IconReceipt size={24} style={{ color: saldo >= 0 ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-red-6)' }} />
              <Text size="xs" c="dimmed" ta="center">Saldo</Text>
              <Text size={isMobile ? "lg" : "xl"} fw={700} c={saldo >= 0 ? 'green' : 'red'} ta="center">
                €{saldo.toFixed(2)}
              </Text>
            </Stack>
          </Card>
          <Card padding="lg" withBorder>
            <Stack gap={4} align="center">
              <IconCalendar size={24} style={{ color: 'var(--mantine-color-blue-6)' }} />
              <Text size="xs" c="dimmed" ta="center">Anzahl</Text>
              <Text size={isMobile ? "lg" : "xl"} fw={700} ta="center">
                {filteredTransactions.length}
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Transaktions-Anzeige */}
        <Paper withBorder>
          <Box p="md">
            <Group justify="space-between" align="center" mb="md">
              <Text fw={500}>
                Transaktionen ({filteredTransactions.length})
              </Text>
              {hasActiveFilters() && (
                <Text size="sm" c="dimmed">
                  Gefilterte Ergebnisse von {transactions.length} Transaktionen
                </Text>
              )}
            </Group>
            
            {filteredTransactions.length === 0 ? (
              <Stack align="center" py="xl" gap="md">
                <IconReceipt size={48} style={{ opacity: 0.3 }} />
                <Text ta="center" c="dimmed">
                  {hasActiveFilters() ? 'Keine Transaktionen gefunden, die den Filterkriterien entsprechen.' : 'Noch keine Transaktionen vorhanden.'}
                </Text>
                {!hasActiveFilters() && (
                  <Button leftSection={<IconPlus size={16} />} onClick={openAddForm} disabled={isLoadingData}>
                    Erste Transaktion hinzufügen
                  </Button>
                )}
              </Stack>
            ) : (
              <>
                {/* Mobile View */}
                {isMobile ? (
                  <Stack gap="sm">
                    {filteredTransactions.map((transaction) => (
                      <MobileTransactionCard key={transaction.id} transaction={transaction} />
                    ))}
                    {filteredTransactions.length > 10 && (
                      <Group justify="center" mt="md">
                        <Text size="sm" c="dimmed">
                          {filteredTransactions.length} Transaktionen angezeigt
                        </Text>
                      </Group>
                    )}
                  </Stack>
                ) : (
                  /* Desktop Table View */
                  <ScrollArea>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Datum</Table.Th>
                          <Table.Th>Typ</Table.Th>
                          <Table.Th>Kategorie</Table.Th>
                          <Table.Th>Budget</Table.Th>
                          <Table.Th>Beschreibung</Table.Th>
                          <Table.Th>Betrag</Table.Th>
                          <Table.Th>Aktionen</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredTransactions.map((transaction) => (
                          <Table.Tr key={transaction.id}>
                            <Table.Td>
                              {dayjs(transaction.datum).format('DD.MM.YYYY')}
                            </Table.Td>
                            <Table.Td>
                              <Badge 
                                color={transaction.typ === 'Einnahme' ? 'green' : 'red'} 
                                variant="light"
                              >
                                {transaction.typ}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Badge 
                                color={getCategoryColor(transaction.kategorieId)} 
                                variant="light"
                              >
                                {transaction.kategorie}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Badge 
                                color={getBudgetInfo(transaction.budgetId)?.farbe || 'gray'} 
                                variant="outline"
                              >
                                {transaction.budget || 'Kein Budget'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text lineClamp={2}>{transaction.beschreibung}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text 
                                fw={500} 
                                c={transaction.typ === 'Einnahme' ? 'green' : 'red'}
                              >
                                {transaction.typ === 'Einnahme' ? '+' : '-'}€{transaction.betrag.toFixed(2)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon 
                                  variant="light" 
                                  size="sm"
                                  onClick={() => openEditForm(transaction)}
                                >
                                  <IconEdit size={14} />
                                </ActionIcon>
                                <ActionIcon 
                                  variant="light" 
                                  color="red" 
                                  size="sm"
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </>
            )}
          </Box>
        </Paper>

        {/* Transaktions-Formular Modal */}
        <Modal
          opened={opened}
          onClose={close}
          title={editingTransaction ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
          size={isMobile ? "100%" : "md"}
          fullScreen={isMobile}
          styles={{
            header: {
              paddingBottom: rem(10),
            },
            title: {
              fontWeight: 700,
              fontSize: rem(18),
            }
          }}
        >
          <Stack gap={isMobile ? "lg" : "md"}>
            <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">
              <Select
                label="Typ"
                placeholder="Typ auswählen"
                data={[
                  { value: 'Einnahme', label: '💰 Einnahme' },
                  { value: 'Ausgabe', label: '💸 Ausgabe' }
                ]}
                value={formData.typ}
                onChange={(value) => setFormData(prev => ({ ...prev, typ: value as 'Einnahme' | 'Ausgabe' }))}
                required
                size={isMobile ? "md" : "sm"}
              />

              <NumberInput
                label="Betrag"
                placeholder="0,00"
                decimalScale={2}
                fixedDecimalScale
                prefix="€"
                value={formData.betrag}
                onChange={(value) => setFormData(prev => ({ ...prev, betrag: typeof value === 'number' ? value : 0 }))}
                required
                min={0.01}
                size={isMobile ? "md" : "sm"}
              />
            </SimpleGrid>

            <Select
              label="Kategorie"
              placeholder="Kategorie auswählen"
              data={kategorieOptions}
              value={formData.kategorieId}
              onChange={(value) => setFormData(prev => ({ ...prev, kategorieId: value || '' }))}
              required
              size={isMobile ? "md" : "sm"}
            />

            <Select
              label="Budget"
              placeholder="Budget auswählen"
              data={budgetFormOptions}
              value={formData.budgetId}
              onChange={(value) => setFormData(prev => ({ ...prev, budgetId: value || '' }))}
              required
              size={isMobile ? "md" : "sm"}
            />

            <TextInput
              label="Beschreibung"
              placeholder="Kurze Beschreibung der Transaktion"
              value={formData.beschreibung}
              onChange={(e) => setFormData(prev => ({ ...prev, beschreibung: e.target.value }))}
              required
              size={isMobile ? "md" : "sm"}
            />

            <DateInput
              label="Datum"
              placeholder="Datum auswählen"
              value={formData.datum}
              onChange={(value) => setFormData(prev => ({ ...prev, datum: value || new Date() }))}
              valueFormat="DD.MM.YYYY"
              locale="de"
              firstDayOfWeek={1}
              clearable
              required
              size={isMobile ? "md" : "sm"}
            />

            <Group justify="flex-end" mt="md" gap={isMobile ? "md" : "sm"}>
              <Button 
                variant="outline" 
                onClick={close}
                disabled={isSubmitting}
                size={isMobile ? "md" : "sm"}
                style={{ flex: isMobile ? 1 : 'none' }}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                size={isMobile ? "md" : "sm"}
                style={{ flex: isMobile ? 1 : 'none' }}
              >
                {editingTransaction ? 'Aktualisieren' : 'Hinzufügen'}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <ActionIcon
          size={56}
          radius="xl"
          variant="filled"
          color="blue"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
          disabled={isLoadingData}
          onClick={openAddForm}
        >
          <IconPlus size={24} />
        </ActionIcon>
      )}
    </Container>
  );
}
