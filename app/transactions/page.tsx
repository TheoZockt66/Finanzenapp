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
  Modal
} from '@mantine/core';
import { DatePickerInput, DateInput } from '@mantine/dates';
import { IconPlus, IconTrash, IconEdit, IconFilter, IconFilterOff, IconSearch } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
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
  };

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
        <Group justify="space-between" align="center">
          <Title order={1}>Transaktionen</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAddForm}>
            Neue Transaktion
          </Button>
        </Group>

        {/* Filter-Bereich */}
        <Paper p="md" withBorder>
          <Group justify="space-between" align="center" mb={filtersOpened ? "md" : 0}>
            <Group>
              <IconFilter size={20} />
              <Text fw={500}>Filter</Text>
              {hasActiveFilters() && (
                <Badge color="blue" size="sm">
                  {Object.values(filters).filter(v => v !== '' && v !== null && v !== undefined).length} aktiv
                </Badge>
              )}
            </Group>
            <Group>
              <Button 
                variant="light" 
                leftSection={<IconFilter size={16} />}
                onClick={toggleFilters}
              >
                {filtersOpened ? 'Filter ausblenden' : 'Filter anzeigen'}
              </Button>
              {hasActiveFilters() && (
                <Button 
                  variant="outline" 
                  color="red"
                  leftSection={<IconFilterOff size={16} />}
                  onClick={clearFilters}
                >
                  Zuruecksetzen
                </Button>
              )}
            </Group>
          </Group>

          <Collapse in={filtersOpened}>
            <Divider mb="md" />
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
                  prefix="EUR "
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
                  prefix="EUR "
                  value={filters.maxBetrag}
                  onChange={(value) => setFilters(prev => ({ ...prev, maxBetrag: typeof value === 'number' ? value : undefined }))}
                />
              </Grid.Col>
            </Grid>
          </Collapse>
        </Paper>

        {/* Statistik-Karten */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card padding="lg" withBorder>
              <Text size="sm" c="dimmed" mb={5}>Gesamte Einnahmen</Text>
              <Text size="xl" fw={700} c="green">EUR {totalEinnahmen.toFixed(2)}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card padding="lg" withBorder>
              <Text size="sm" c="dimmed" mb={5}>Gesamte Ausgaben</Text>
              <Text size="xl" fw={700} c="red">EUR {totalAusgaben.toFixed(2)}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card padding="lg" withBorder>
              <Text size="sm" c="dimmed" mb={5}>Saldo</Text>
              <Text size="xl" fw={700} c={saldo >= 0 ? 'green' : 'red'}>
                EUR {saldo.toFixed(2)}
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card padding="lg" withBorder>
              <Text size="sm" c="dimmed" mb={5}>Anzahl Transaktionen</Text>
              <Text size="xl" fw={700}>{filteredTransactions.length}</Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Transaktions-Tabelle */}
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
              <Text ta="center" c="dimmed" py="xl">
                {hasActiveFilters() ? 'Keine Transaktionen gefunden, die den Filterkriterien entsprechen.' : 'Noch keine Transaktionen vorhanden.'}
              </Text>
            ) : (
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
                      <Table.Td>{transaction.beschreibung}</Table.Td>
                      <Table.Td>
                        <Text 
                          fw={500} 
                          c={transaction.typ === 'Einnahme' ? 'green' : 'red'}
                        >
                          {transaction.typ === 'Einnahme' ? '+' : '-'}EUR {transaction.betrag.toFixed(2)}
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
            )}
          </Box>
        </Paper>

        {/* Transaktions-Formular Modal */}
        <Modal
          opened={opened}
          onClose={close}
          title={editingTransaction ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
          size="md"
        >
          <Stack gap="md">
            <Select
              label="Typ"
              placeholder="Typ auswaehlen"
              data={[
                { value: 'Einnahme', label: 'Einnahme' },
                { value: 'Ausgabe', label: 'Ausgabe' }
              ]}
              value={formData.typ}
              onChange={(value) => setFormData(prev => ({ ...prev, typ: value as 'Einnahme' | 'Ausgabe' }))}
              required
            />

            <Select
              label="Kategorie"
              placeholder="Kategorie auswaehlen"
              data={kategorieOptions}
              value={formData.kategorie}
              onChange={(value) => setFormData(prev => ({ ...prev, kategorie: value || '' }))}
              required
            />

            <Select
              label="Budget"
              placeholder="Budget auswaehlen"
              data={budgets.map(b => ({ value: b.name, label: b.name }))}
              value={formData.budget}
              onChange={(value) => setFormData(prev => ({ ...prev, budget: value || '' }))}
              required
            />

            <NumberInput
              label="Betrag"
              placeholder="0,00"
              decimalScale={2}
              fixedDecimalScale
              prefix="EUR "
              value={formData.betrag}
              onChange={(value) => setFormData(prev => ({ ...prev, betrag: typeof value === 'number' ? value : 0 }))}
              required
              min={0.01}
            />

            <TextInput
              label="Beschreibung"
              placeholder="Kurze Beschreibung der Transaktion"
              value={formData.beschreibung}
              onChange={(e) => setFormData(prev => ({ ...prev, beschreibung: e.target.value }))}
              required
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
            />

            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={close}>
                Abbrechen
              </Button>
              <Button onClick={handleSubmit}>
                {editingTransaction ? 'Aktualisieren' : 'Hinzufuegen'}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
