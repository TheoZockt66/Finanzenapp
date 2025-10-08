'use client';

import { useState } from 'react';
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
  Anchor,
  Avatar,
  Menu,
  rem
} from '@mantine/core';
import { DatePickerInput, DateInput } from '@mantine/dates';
import { IconPlus, IconTrash, IconEdit, IconFilter, IconFilterOff, IconSearch, IconDotsVertical, IconTrendingUp, IconTrendingDown, IconCalendar, IconReceipt, IconSwipeLeft } from '@tabler/icons-react';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
dayjs.locale('de');

interface Transaction {
  id: string;
  typ: 'Einnahme' | 'Ausgabe';
  kategorie: string;
  budget: string;
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

const kategorieOptions = [
  { value: 'Lebensmittel', label: 'Lebensmittel', color: 'green' },
  { value: 'Transport', label: 'Transport', color: 'blue' },
  { value: 'Unterhaltung', label: 'Unterhaltung', color: 'orange' },
  { value: 'Gesundheit', label: 'Gesundheit', color: 'red' },
  { value: 'Bildung', label: 'Bildung', color: 'purple' },
  { value: 'Kleidung', label: 'Kleidung', color: 'pink' },
  { value: 'Haushalt', label: 'Haushalt', color: 'cyan' },
  { value: 'Sonstiges', label: 'Sonstiges', color: 'gray' }
];

interface FilterState {
  typ: string;
  kategorie: string;
  budget: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  minBetrag: number | undefined;
  maxBetrag: number | undefined;
  searchText: string;
}

export default function TransactionsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Budget State - synchronisiert mit Budget-Seite
  const [budgets, setBudgets] = useState<BudgetItem[]>([
    { 
      id: '1', 
      name: 'Lebensmittel', 
      betrag: 400, 
      ausgegeben: 285.50, 
      resetTag: 1, 
      farbe: 'green',
      beschreibung: 'Monatliches Budget fuer Lebensmittel'
    },
    { 
      id: '2', 
      name: 'Freizeit & Unterhaltung', 
      betrag: 200, 
      ausgegeben: 145, 
      resetTag: 1, 
      farbe: 'purple',
      beschreibung: 'Kino, Konzerte, Hobbys'
    },
    { 
      id: '3', 
      name: 'Kleidung', 
      betrag: 150, 
      ausgegeben: 89, 
      resetTag: 1, 
      farbe: 'pink',
      beschreibung: 'Kleidung, Schuhe und Accessoires'
    }
  ]);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      typ: 'Ausgabe',
      kategorie: 'Lebensmittel',
      budget: 'Lebensmittel',
      betrag: 45.60,
      beschreibung: 'Wocheneinkauf Supermarkt',
      datum: new Date('2024-01-15')
    },
    {
      id: '2',
      typ: 'Ausgabe',
      kategorie: 'Transport',
      budget: 'Lebensmittel',
      betrag: 12.80,
      beschreibung: 'Monatskarte oeffentliche Verkehrsmittel',
      datum: new Date('2024-01-14')
    },
    {
      id: '3',
      typ: 'Einnahme',
      kategorie: 'Sonstiges',
      budget: 'Lebensmittel',
      betrag: 50.00,
      beschreibung: 'Rueckerstattung',
      datum: new Date('2024-01-13')
    }
  ]);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    typ: '',
    kategorie: '',
    budget: '',
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
  const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
    typ: 'Ausgabe',
    kategorie: '',
    budget: '',
    betrag: 0,
    beschreibung: '',
    datum: new Date()
  });

  // Helper Funktionen
  const getCategoryColor = (kategorie: string) => {
    const category = kategorieOptions.find(k => k.value === kategorie);
    return category?.color || 'gray';
  };

  const getBudgetInfo = (budgetName: string) => {
    return budgets.find(b => b.name === budgetName);
  };

  // Funktion zum Aktualisieren des Budget-Ausgaben-Betrags
  const updateBudgetSpent = (budgetName: string, amount: number) => {
    setBudgets(prevBudgets => 
      prevBudgets.map(budget => 
        budget.name === budgetName
          ? { ...budget, ausgegeben: budget.ausgegeben + amount }
          : budget
      )
    );
  };

  // Filter-Funktionen
  const applyFilters = (transaction: Transaction) => {
    if (filters.typ && transaction.typ !== filters.typ) return false;
    if (filters.kategorie && transaction.kategorie !== filters.kategorie) return false;
    if (filters.budget && transaction.budget !== filters.budget) return false;
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
      kategorie: '',
      budget: '',
      dateFrom: null,
      dateTo: null,
      minBetrag: undefined,
      maxBetrag: undefined,
      searchText: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.typ || filters.kategorie || filters.budget || filters.dateFrom || 
           filters.dateTo || filters.minBetrag || filters.maxBetrag || filters.searchText;
  };

  const filteredTransactions = transactions.filter(applyFilters);

  // Form Handling
  const resetForm = () => {
    setFormData({
      typ: 'Ausgabe',
      kategorie: '',
      budget: '',
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
      kategorie: transaction.kategorie,
      budget: transaction.budget,
      betrag: transaction.betrag,
      beschreibung: transaction.beschreibung,
      datum: transaction.datum
    });
    open();
  };

  const handleSubmit = () => {
    if (!formData.kategorie || !formData.budget || !formData.beschreibung || formData.betrag <= 0) {
      return;
    }

    if (editingTransaction) {
      // Update existing transaction
      const oldTransaction = editingTransaction;
      const newTransaction = { ...formData, id: editingTransaction.id };

      setTransactions(transactions.map(t => 
        t.id === editingTransaction.id ? newTransaction : t
      ));

      // Budget-Synchronisation bei Aenderungen
      if (oldTransaction.typ === 'Ausgabe') {
        updateBudgetSpent(oldTransaction.budget, -oldTransaction.betrag);
      }
      if (newTransaction.typ === 'Ausgabe') {
        updateBudgetSpent(newTransaction.budget, newTransaction.betrag);
      }
    } else {
      // Add new transaction
      const newTransaction = {
        ...formData,
        id: Date.now().toString()
      };
      setTransactions([newTransaction, ...transactions]);
      
      // Budget synchronisieren bei Ausgaben
      if (formData.typ === 'Ausgabe') {
        updateBudgetSpent(formData.budget, formData.betrag);
      }
    }

    resetForm();
    close();
  };

  const handleDeleteTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction && transaction.typ === 'Ausgabe') {
      updateBudgetSpent(transaction.budget, -transaction.betrag);
    }
    setTransactions(transactions.filter(t => t.id !== id));
    
    notifications.show({
      title: 'Transaktion gelöscht',
      message: 'Die Transaktion wurde erfolgreich entfernt.',
      color: 'green',
    });
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
                color={getCategoryColor(transaction.kategorie)} 
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
                {transaction.budget}
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
                    value={filters.kategorie}
                    onChange={(value) => setFilters(prev => ({ ...prev, kategorie: value || '' }))}
                    clearable
                    size="md"
                  />
                </SimpleGrid>
                <Select
                  label="Budget"
                  placeholder="Alle Budgets"
                  data={budgets.map(b => ({ value: b.name, label: b.name }))}
                  value={filters.budget}
                  onChange={(value) => setFilters(prev => ({ ...prev, budget: value || '' }))}
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
                    value={filters.kategorie}
                    onChange={(value) => setFilters(prev => ({ ...prev, kategorie: value || '' }))}
                    clearable
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Select
                    label="Budget"
                    placeholder="Alle Budgets"
                    data={budgets.map(b => ({ value: b.name, label: b.name }))}
                    value={filters.budget}
                    onChange={(value) => setFilters(prev => ({ ...prev, budget: value || '' }))}
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
                  <Button leftSection={<IconPlus size={16} />} onClick={openAddForm}>
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
                                color={getCategoryColor(transaction.kategorie)} 
                                variant="light"
                              >
                                {transaction.kategorie}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Badge 
                                color={getBudgetInfo(transaction.budget)?.farbe || 'gray'} 
                                variant="outline"
                              >
                                {transaction.budget}
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
              data={kategorieOptions.map(cat => ({ 
                ...cat, 
                label: `${cat.label}` 
              }))}
              value={formData.kategorie}
              onChange={(value) => setFormData(prev => ({ ...prev, kategorie: value || '' }))}
              required
              size={isMobile ? "md" : "sm"}
            />

            <Select
              label="Budget"
              placeholder="Budget auswählen"
              data={budgets.map(b => ({ 
                value: b.name, 
                label: `${b.name} (${(b.betrag - b.ausgegeben).toFixed(0)}€ verfügbar)` 
              }))}
              value={formData.budget}
              onChange={(value) => setFormData(prev => ({ ...prev, budget: value || '' }))}
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
                size={isMobile ? "md" : "sm"}
                style={{ flex: isMobile ? 1 : 'none' }}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={handleSubmit}
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
          onClick={openAddForm}
        >
          <IconPlus size={24} />
        </ActionIcon>
      )}
    </Container>
  );
}
