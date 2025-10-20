'use client';

import { useEffect, useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconAlertCircle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPigMoney,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useMediaQuery } from '@mantine/hooks';
import { useCredits } from '../../hooks/useCredits';
import type {
  CreateCreditLoanData,
  CreateCreditRepaymentData,
  FinanzenCreditLoanWithRepayments,
} from '../../lib/types';

type LoanRole = 'borrower' | 'lender';
type PaymentFrequency = 'monthly' | 'bi-monthly' | 'quarterly' | 'yearly';

const FREQUENCY_CONFIG: Record<
  PaymentFrequency,
  { label: string; periodsPerYear: number; monthsPerPeriod: number }
> = {
  monthly: { label: 'Monatlich', periodsPerYear: 12, monthsPerPeriod: 1 },
  'bi-monthly': { label: 'Alle 2 Monate', periodsPerYear: 6, monthsPerPeriod: 2 },
  quarterly: { label: 'Quartalsweise', periodsPerYear: 4, monthsPerPeriod: 3 },
  yearly: { label: 'Jaehrlich', periodsPerYear: 1, monthsPerPeriod: 12 },
};

type ScheduleEntry = {
  period: number;
  dueDate: string;
  payment: number;
  interest: number;
  principal: number;
  remaining: number;
};

type LoanViewRepayment = {
  id: string;
  amount: number;
  date: string;
  note?: string;
};

type LoanView = {
  id: string;
  title: string;
  role: LoanRole;
  principal: number;
  interestRate: number;
  termMonths: number;
  frequency: PaymentFrequency;
  startDate: string;
  description?: string;
  repayments: LoanViewRepayment[];
  createdAt: string;
};

type LoanFormState = {
  title: string;
  role: LoanRole;
  principal: number;
  interestRate: number;
  termMonths: number;
  frequency: PaymentFrequency;
  startDate: Date | null;
  description: string;
};

type FormErrors = Partial<Record<keyof LoanFormState, string>>;

type RepaymentFormState = {
  open: boolean;
  loanId: string | null;
  amount: number;
  date: Date | null;
  note: string;
  error?: string;
};

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

const numberFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const initialLoanForm: LoanFormState = {
  title: '',
  role: 'borrower',
  principal: 10000,
  interestRate: 3.5,
  termMonths: 36,
  frequency: 'monthly',
  startDate: new Date(),
  description: '',
};

const initialRepaymentForm: RepaymentFormState = {
  open: false,
  loanId: null,
  amount: 0,
  date: new Date(),
  note: '',
};

function formatCurrency(value: number) {
  if (Number.isNaN(value)) {
    return currencyFormatter.format(0);
  }
  return currencyFormatter.format(Number(value.toFixed(2)));
}

function formatNumber(value: number) {
  if (Number.isNaN(value)) {
    return numberFormatter.format(0);
  }
  return numberFormatter.format(Number(value.toFixed(2)));
}

function generateSchedule(loan: LoanView): ScheduleEntry[] {
  const config = FREQUENCY_CONFIG[loan.frequency];
  const ratePerPeriod = loan.interestRate > 0 ? (loan.interestRate / 100) / config.periodsPerYear : 0;
  const totalPeriods = Math.max(1, Math.round((loan.termMonths / 12) * config.periodsPerYear));
  const start = dayjs(loan.startDate);
  const schedule: ScheduleEntry[] = [];

  const plannedPayment =
    ratePerPeriod === 0
      ? loan.principal / totalPeriods
      : (loan.principal * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -totalPeriods));

  let remaining = loan.principal;

  for (let period = 1; period <= totalPeriods; period += 1) {
    const dueDate = start.add(config.monthsPerPeriod * (period - 1), 'month');
    const interest = ratePerPeriod === 0 ? 0 : remaining * ratePerPeriod;
    let principal = plannedPayment - interest;
    let payment = plannedPayment;

    if (period === totalPeriods) {
      principal = remaining;
      payment = principal + interest;
    }

    remaining = Math.max(0, remaining - principal);

    schedule.push({
      period,
      dueDate: dueDate.toISOString(),
      payment,
      interest,
      principal,
      remaining,
    });
  }

  return schedule;
}

function normalizeLoan(loan: FinanzenCreditLoanWithRepayments): LoanView {
  return {
    id: loan.id,
    title: loan.title,
    role: loan.role as LoanRole,
    principal: loan.principal,
    interestRate: loan.interest_rate,
    termMonths: loan.term_months,
    frequency: loan.frequency as PaymentFrequency,
    startDate: loan.start_date,
    description: loan.description ?? '',
    createdAt: loan.created_at,
    repayments: loan.repayments
      .slice()
      .sort((a, b) => (b.payment_date ?? '').localeCompare(a.payment_date ?? ''))
      .map((repayment) => ({
        id: repayment.id,
        amount: repayment.amount,
        date: repayment.payment_date,
        note: repayment.note ?? '',
      })),
  };
}
export default function KreditPage() {
  const {
    loans: creditLoans,
    loading,
    refreshing,
    error,
    addLoan,
    editLoan,
    removeLoan,
    addRepayment,
    removeRepayment,
  } = useCredits();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isLandscape = useMediaQuery('(max-width: 960px) and (max-height: 620px)');

  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanForm, setLoanForm] = useState<LoanFormState>(initialLoanForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [repaymentForm, setRepaymentForm] = useState<RepaymentFormState>(initialRepaymentForm);
  const [expandedLoans, setExpandedLoans] = useState<Record<string, boolean>>({});
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  const normalizedLoans = useMemo<LoanView[]>(
    () => creditLoans.map((loan) => normalizeLoan(loan)),
    [creditLoans],
  );

  useEffect(() => {
    if (normalizedLoans.length === 0) return;
    setExpandedLoans((prev) => {
      const next = { ...prev };
      let changed = false;
      normalizedLoans.forEach((loan) => {
        if (!(loan.id in next)) {
          next[loan.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [normalizedLoans]);

  const loansWithDerivedData = useMemo(() => {
    return normalizedLoans.map((loan) => {
      const schedule = generateSchedule(loan);
      const totalInterest = schedule.reduce((acc, entry) => acc + entry.interest, 0);
      const plannedTotal = schedule.reduce((acc, entry) => acc + entry.payment, 0);
      const totalRepayments = loan.repayments.reduce((acc, entry) => acc + entry.amount, 0);
      const principalProgress = loan.principal > 0 ? Math.min(totalRepayments / loan.principal, 1) : 0;
      const outstandingPrincipal = Math.max(0, loan.principal - totalRepayments);
      const outstandingPlanned = Math.max(0, loan.principal + totalInterest - totalRepayments);
      const nextInstallment = schedule.find((entry) =>
        dayjs(entry.dueDate).isAfter(dayjs().subtract(1, 'day')) && entry.remaining > 0,
      );
      const suggestedAmount = nextInstallment ? nextInstallment.payment : outstandingPrincipal;
      const status = totalRepayments >= loan.principal ? 'done' : 'active';

      return {
        loan,
        schedule,
        totalInterest,
        plannedTotal,
        totalRepayments,
        principalProgress,
        outstandingPrincipal,
        outstandingPlanned,
        nextInstallment,
        suggestedAmount,
        status,
      };
    });
  }, [normalizedLoans]);
  const handleOpenLoanModal = (loan?: LoanView) => {
    if (loan) {
      setLoanForm({
        title: loan.title,
        role: loan.role,
        principal: loan.principal,
        interestRate: loan.interestRate,
        termMonths: loan.termMonths,
        frequency: loan.frequency,
        startDate: dayjs(loan.startDate).toDate(),
        description: loan.description ?? '',
      });
      setEditingLoanId(loan.id);
    } else {
      setLoanForm({ ...initialLoanForm, startDate: new Date() });
      setEditingLoanId(null);
    }
    setFormErrors({});
    setLoanModalOpen(true);
  };

  const handleCreateLoan = async () => {
    const errors: FormErrors = {};

    if (!loanForm.title.trim()) {
      errors.title = 'Bitte einen Namen fuer den Kredit angeben.';
    }
    if (loanForm.principal <= 0) {
      errors.principal = 'Der Kreditbetrag muss groesser als 0 sein.';
    }
    if (loanForm.interestRate < 0) {
      errors.interestRate = 'Der Zinssatz darf nicht negativ sein.';
    }
    if (loanForm.termMonths <= 0) {
      errors.termMonths = 'Die Laufzeit muss groesser als 0 sein.';
    }
    if (!loanForm.startDate) {
      errors.startDate = 'Bitte ein Startdatum waehlen.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload: CreateCreditLoanData = {
      title: loanForm.title.trim(),
      role: loanForm.role,
      principal: Number(loanForm.principal),
      interest_rate: Number(loanForm.interestRate),
      term_months: Math.max(1, Math.trunc(loanForm.termMonths)),
      frequency: loanForm.frequency,
      start_date: (loanForm.startDate ?? new Date()).toISOString().split('T')[0],
      description: loanForm.description.trim() || undefined,
    };

    try {
      if (editingLoanId) {
        const updated = await editLoan(editingLoanId, payload);
        if (updated) {
          setExpandedLoans((prev) => ({ ...prev, [editingLoanId]: true }));
          notifications.show({
            title: 'Kredit aktualisiert',
            message: 'Die Kreditdaten wurden gespeichert.',
            color: 'green',
          });
        }
      } else {
        const created = await addLoan(payload);
        if (created) {
          notifications.show({
            title: 'Kredit gespeichert',
            message: 'Der Kredit wurde erfolgreich angelegt.',
            color: 'green',
          });
          setExpandedLoans((prev) => ({ ...prev, [created.id]: true }));
        }
      }
      setLoanModalOpen(false);
      setLoanForm({ ...initialLoanForm, startDate: new Date() });
      setFormErrors({});
      setEditingLoanId(null);
    } catch (err) {
      console.error('Create loan failed:', err);
      notifications.show({
        title: 'Fehler',
        message: 'Der Kredit konnte nicht gespeichert werden.',
        color: 'red',
      });
    }
  };

  const handleOpenRepaymentModal = (loanId: string) => {
    const derived = loansWithDerivedData.find((entry) => entry.loan.id === loanId);
    const defaultAmount =
      derived && derived.suggestedAmount > 0 ? Number(derived.suggestedAmount.toFixed(2)) : 0;

    setRepaymentForm({
      open: true,
      loanId,
      amount: defaultAmount,
      date: new Date(),
      note: '',
      error: undefined,
    });
  };

  const handleAddRepayment = async () => {
    if (!repaymentForm.loanId) {
      return;
    }

    if (!repaymentForm.date) {
      setRepaymentForm((prev) => ({ ...prev, error: 'Bitte ein Zahlungsdatum auswaehlen.' }));
      return;
    }

    if (repaymentForm.amount <= 0) {
      setRepaymentForm((prev) => ({ ...prev, error: 'Der Teilbetrag muss groesser als 0 sein.' }));
      return;
    }

    const payload: CreateCreditRepaymentData = {
      loan_id: repaymentForm.loanId,
      amount: Number(repaymentForm.amount),
      payment_date: repaymentForm.date.toISOString().split('T')[0],
      note: repaymentForm.note.trim() || undefined,
    };

    try {
      const created = await addRepayment(payload);
      if (created) {
        notifications.show({
          title: 'Teilzahlung gespeichert',
          message: 'Die Teilzahlung wurde erfasst.',
          color: 'green',
        });
        setRepaymentForm(initialRepaymentForm);
      }
    } catch (err) {
      console.error('Add repayment failed:', err);
      notifications.show({
        title: 'Fehler',
        message: 'Teilzahlung konnte nicht gespeichert werden.',
        color: 'red',
      });
    }
  };

  const handleRemoveRepayment = async (loanId: string, repaymentId: string) => {
    try {
      const success = await removeRepayment(loanId, repaymentId);
      if (success) {
        notifications.show({
          title: 'Teilzahlung entfernt',
          message: 'Die Teilzahlung wurde geloescht.',
          color: 'green',
        });
      }
    } catch (err) {
      console.error('Remove repayment failed:', err);
      notifications.show({
        title: 'Fehler',
        message: 'Teilzahlung konnte nicht entfernt werden.',
        color: 'red',
      });
    }
  };

  const closeRepaymentModal = () => {
    setRepaymentForm(initialRepaymentForm);
  };

  const handleDeleteLoan = async (loanId: string) => {
    try {
      const success = await removeLoan(loanId);
      if (success) {
        notifications.show({
          title: 'Kredit gelöscht',
          message: 'Der Kredit wurde entfernt.',
          color: 'green',
        });
      }
    } catch (err) {
      console.error('Delete loan failed:', err);
      notifications.show({
        title: 'Fehler',
        message: 'Kredit konnte nicht gelöscht werden.',
        color: 'red',
      });
    }
  };
  const roleBadge = (role: LoanRole) => {
    if (role === 'borrower') {
      return (
        <Badge color="red" variant="light">
          Ich nehme einen Kredit auf
        </Badge>
      );
    }
    return (
      <Badge color="teal" variant="light">
        Ich vergebe einen Kredit
      </Badge>
    );
  };

  const statusBadge = (status: 'done' | 'active') => {
    if (status === 'done') {
      return (
        <Badge color="green" leftSection={<IconCheck size={14} />} variant="light">
          Abgeschlossen
        </Badge>
      );
    }
    return (
      <Badge color="yellow" leftSection={<IconAlertCircle size={14} />} variant="light">
        Laufend
      </Badge>
    );
  };

  if (loading) {
    return (
      <Container size={isMobile ? '100%' : 'xl'} py="lg" px={isMobile ? 'sm' : undefined}>
        <Group justify="center" align="center" h={isLandscape ? 220 : 320}>
          <Loader size="lg" />
          <Text c="dimmed">Kredite werden geladen...</Text>
        </Group>
      </Container>
    );
  }
  return (
    <Container size={isMobile ? '100%' : 'xl'} py="lg" px={isMobile ? 'sm' : undefined}>
      <Stack gap={isMobile ? 'lg' : 'xl'}>
        <Group
          justify="space-between"
          align={isMobile ? 'stretch' : 'flex-start'}
          wrap={isMobile ? 'wrap' : 'nowrap'}
          gap="md"
        >
          <div style={{ flex: isMobile ? '1 1 100%' : undefined }}>
            <Title order={1}>Kredite</Title>
            <Text c="dimmed">
              Verwalte vergebene oder aufgenommene Kredite, plane Raten und erfasse Teilzahlungen.
            </Text>
          </div>
          <Stack
            direction={isMobile ? 'column' : 'row'}
            gap="sm"
            align={isMobile ? 'stretch' : 'flex-end'}
            style={{ flex: isMobile ? '1 1 100%' : undefined }}
          >
            {refreshing ? (
              <Badge color="blue" variant="light" w={isMobile ? '100%' : undefined}>
                Aktualisiere...
              </Badge>
            ) : null}
            <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenLoanModal()} fullWidth={isMobile}>
              Kredit anlegen
            </Button>
          </Stack>
        </Group>

        {error ? (
          <Card
            withBorder
            padding="md"
            radius="md"
            style={{ borderColor: 'var(--mantine-color-red-6)' }}
          >
            <Text c="red">{error}</Text>
          </Card>
        ) : null}

        {loansWithDerivedData.length === 0 ? (
          <Card withBorder padding="xl" radius="md">
            <Stack align="center" gap="md">
              <IconPigMoney size={48} stroke={1.5} />
              <Text fw={600}>Noch keine Kredite erfasst</Text>
              <Text c="dimmed" ta="center">
                Lege deinen ersten Kredit an, um einen Tilgungsplan zu berechnen und Zahlungen festzuhalten.
              </Text>
              <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenLoanModal()} fullWidth={isMobile}>
                Jetzt Kredit erstellen
              </Button>
            </Stack>
          </Card>
        ) : (
          <Stack gap="xl">
            {loansWithDerivedData.map(
              ({
                loan,
                schedule,
                totalInterest,
                plannedTotal,
                totalRepayments,
                principalProgress,
                outstandingPrincipal,
                outstandingPlanned,
                nextInstallment,
                suggestedAmount,
                status,
              }) => (
                <Card key={loan.id} withBorder padding="xl" radius="md">
                  <Stack gap="md">
                    <Group
                      justify="space-between"
                      align={isMobile ? 'stretch' : 'center'}
                      wrap={isMobile ? 'wrap' : 'nowrap'}
                      gap="sm"
                    >
                      <div>
                        <Group gap="sm">
                          <Title order={3}>{loan.title}</Title>
                          {roleBadge(loan.role)}
                          {statusBadge(status)}
                        </Group>
                        <Text size="sm" c="dimmed">
                          Erstellt am {dayjs(loan.createdAt).format('DD.MM.YYYY')}
                        </Text>
                      </div>
                      <Group gap="sm" justify={isMobile ? 'space-between' : 'flex-end'} wrap="wrap">
                        <Button
                          variant="light"
                          leftSection={<IconPlus size={16} />}
                          onClick={() => handleOpenRepaymentModal(loan.id)}
                          fullWidth={isMobile}
                        >
                          Teilzahlung erfassen
                        </Button>
                        <Button
                          variant="outline"
                          leftSection={<IconPencil size={16} />}
                          onClick={() => handleOpenLoanModal(loan)}
                          fullWidth={isMobile}
                        >
                          Kredit bearbeiten
                        </Button>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => void handleDeleteLoan(loan.id)}
                          title="Kredit löschen"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          onClick={() =>
                            setExpandedLoans((prev) => ({
                              ...prev,
                              [loan.id]: !(prev[loan.id] ?? true),
                            }))
                          }
                          title={expandedLoans[loan.id] ?? true ? 'Details einklappen' : 'Details anzeigen'}
                        >
                          {(expandedLoans[loan.id] ?? true) ? (
                            <IconChevronUp size={18} />
                          ) : (
                            <IconChevronDown size={18} />
                          )}
                        </ActionIcon>
                      </Group>
                    </Group>

                    {loan.description ? (
                      <Text size="sm" c="dimmed">
                        {loan.description}
                      </Text>
                    ) : null}

                    {expandedLoans[loan.id] ?? true ? (
                      <>
                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Text fw={600} size="sm">
                              Tilgungsfortschritt
                            </Text>
                            <Text size="sm" c="dimmed">
                              {formatNumber(principalProgress * 100)}%
                            </Text>
                          </Group>
                          <Progress value={principalProgress * 100} />
                        </Stack>

                        <Tabs defaultValue="overview" keepMounted={false}>
                          <Tabs.List grow>
                            <Tabs.Tab value="overview" leftSection={<IconPigMoney size={16} />}>
                              Ueberblick
                            </Tabs.Tab>
                            <Tabs.Tab value="schedule" leftSection={<IconCalendar size={16} />}>
                              Ratenplan
                            </Tabs.Tab>
                            <Tabs.Tab value="repayments" leftSection={<IconArrowUpRight size={16} />}>
                              Teilzahlungen
                            </Tabs.Tab>
                          </Tabs.List>

                        <Tabs.Panel value="overview" pt="md">
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={isMobile ? 'md' : 'lg'}>
                              <Card withBorder padding="md">
                                <Stack gap={4}>
                                  <Text size="sm" c="dimmed">
                                    Kreditsumme
                                  </Text>
                                  <Text fw={600}>{formatCurrency(loan.principal)}</Text>
                                </Stack>
                              </Card>

                              <Card withBorder padding="md">
                                <Stack gap={4}>
                                  <Text size="sm" c="dimmed">
                                    Zinssatz p.a.
                                  </Text>
                                  <Text fw={600}>{formatNumber(loan.interestRate)}%</Text>
                                </Stack>
                              </Card>

                              <Card withBorder padding="md">
                                <Stack gap={4}>
                                  <Text size="sm" c="dimmed">
                                    Laufzeit
                                  </Text>
                                  <Text fw={600}>{loan.termMonths} Monate</Text>
                                </Stack>
                              </Card>

                              <Card withBorder padding="md">
                                <Stack gap={4}>
                                  <Text size="sm" c="dimmed">
                                    Zahlungsrhythmus
                                  </Text>
                                  <Text fw={600}>{FREQUENCY_CONFIG[loan.frequency].label}</Text>
                                </Stack>
                              </Card>

                              <Card withBorder padding="md">
                                <Stack gap={4}>
                                  <Text size="sm" c="dimmed">
                                    Geplante Gesamtkosten
                                  </Text>
                                  <Text fw={600}>{formatCurrency(plannedTotal)}</Text>
                                  <Text size="xs" c="dimmed">
                                    Davon Zinsen: {formatCurrency(totalInterest)}
                                  </Text>
                                </Stack>
                              </Card>

                              <Card withBorder padding="md">
                                <Stack gap={4}>
                                  <Text size="sm" c="dimmed">
                                    Bisher gezahlt
                                  </Text>
                                  <Text fw={600}>{formatCurrency(totalRepayments)}</Text>
                                  <Text size="xs" c="dimmed">
                                    Offene Summe (Plan): {formatCurrency(outstandingPlanned)}
                                  </Text>
                                </Stack>
                              </Card>
                            </SimpleGrid>
                            <Divider my="lg" />

                            <Group align="flex-start" wrap="wrap" gap="md">
                              <Card withBorder padding="md" w="100%">
                                <Stack gap="xs">
                                  <Text size="sm" c="dimmed">
                                    Aktuelle Restschuld (ohne Zinsen)
                                  </Text>
                                  <Group align="baseline" gap="sm">
                                    <IconArrowDownRight size={18} color="var(--mantine-color-red-5)" />
                                    <Text fw={700} size="xl">
                                      {formatCurrency(outstandingPrincipal)}
                                    </Text>
                                  </Group>
                                  <Text size="sm" c="dimmed">
                                    Basierend auf bisher erfassten Teilzahlungen.
                                  </Text>
                                </Stack>
                              </Card>

                              <Card withBorder padding="md" w="100%">
                                <Stack gap="xs">
                                  <Text size="sm" c="dimmed">
                                    Naechste geplante Rate
                                  </Text>
                                  {nextInstallment ? (
                                    <>
                                      <Group align="baseline" gap="sm">
                                        <IconCalendar size={18} />
                                        <Text fw={600}>
                                          {dayjs(nextInstallment.dueDate).format('DD.MM.YYYY')}
                                        </Text>
                                      </Group>
                                      <Text fw={600}>{formatCurrency(nextInstallment.payment)}</Text>
                                      <Text size="xs" c="dimmed">
                                        Restschuld nach Rate: {formatCurrency(nextInstallment.remaining)}
                                      </Text>
                                    </>
                                  ) : (
                                    <Text fw={600}>Alle Raten beglichen.</Text>
                                  )}
                                </Stack>
                              </Card>
                            </Group>
                          </Tabs.Panel>

                          <Tabs.Panel value="schedule" pt="md">
                            <ScrollArea style={{ maxHeight: isLandscape ? 240 : 360 }}>
                              <Table highlightOnHover withColumnBorders striped>
                                <Table.Thead>
                                  <Table.Tr>
                                    <Table.Th>#</Table.Th>
                                    <Table.Th>Faellig am</Table.Th>
                                    <Table.Th>Rate</Table.Th>
                                    <Table.Th>Zinsen</Table.Th>
                                    <Table.Th>Tilgung</Table.Th>
                                    <Table.Th>Restschuld</Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {schedule.map((entry) => (
                                    <Table.Tr key={entry.period}>
                                      <Table.Td>{entry.period}</Table.Td>
                                      <Table.Td>{dayjs(entry.dueDate).format('DD.MM.YYYY')}</Table.Td>
                                      <Table.Td>{formatCurrency(entry.payment)}</Table.Td>
                                      <Table.Td>{formatCurrency(entry.interest)}</Table.Td>
                                      <Table.Td>{formatCurrency(entry.principal)}</Table.Td>
                                      <Table.Td>{formatCurrency(entry.remaining)}</Table.Td>
                                    </Table.Tr>
                                  ))}
                                </Table.Tbody>
                              </Table>
                            </ScrollArea>
                          </Tabs.Panel>

                          <Tabs.Panel value="repayments" pt="md">
                            <Stack gap="md">
                              <Group justify="space-between">
                                <Text fw={600}>Erfasste Teilzahlungen</Text>
                                <Button
                                  variant="light"
                                  leftSection={<IconPlus size={16} />}
                                  onClick={() => handleOpenRepaymentModal(loan.id)}
                                >
                                  Teilzahlung hinzufuegen
                                </Button>
                              </Group>

                              {loan.repayments.length === 0 ? (
                                <Card withBorder padding="md">
                                  <Group gap="sm">
                                    <IconArrowUpRight size={18} />
                                    <div>
                                      <Text fw={600}>Noch keine Teilzahlungen</Text>
                                      <Text size="sm" c="dimmed">
                                        Erfasse individuelle Zahlungen, um den Verlauf deines Kredits zu dokumentieren.
                                      </Text>
                                    </div>
                                  </Group>
                                </Card>
                              ) : (
                                <Stack gap="sm">
                                  {loan.repayments.map((repayment) => (
                                    <Card key={repayment.id} withBorder padding="md">
                                      <Group justify="space-between" align="center">
                                        <Stack gap={0}>
                                          <Group gap="sm">
                                            <IconArrowDownRight
                                              size={16}
                                              color="var(--mantine-color-green-5)"
                                            />
                                            <Text fw={600}>{formatCurrency(repayment.amount)}</Text>
                                          </Group>
                                          <Text size="sm" c="dimmed">
                                            am {dayjs(repayment.date).format('DD.MM.YYYY')}
                                          </Text>
                                          {repayment.note ? (
                                            <Text size="sm" c="dimmed">
                                              Notiz: {repayment.note}
                                            </Text>
                                          ) : null}
                                        </Stack>
                                        <ActionIcon
                                          variant="subtle"
                                          color="red"
                                          onClick={() => handleRemoveRepayment(loan.id, repayment.id)}
                                          title="Teilzahlung entfernen"
                                        >
                                          <IconTrash size={16} />
                                        </ActionIcon>
                                      </Group>
                                    </Card>
                                  ))}
                                </Stack>
                              )}
                            </Stack>
                          </Tabs.Panel>
                        </Tabs>
                      </>
                    ) : null}
                  </Stack>
                </Card>
              ),
            )}
          </Stack>
        )}
      </Stack>
      <Modal
        opened={loanModalOpen}
        onClose={() => {
          setLoanModalOpen(false);
          setFormErrors({});
          setEditingLoanId(null);
          setLoanForm({ ...initialLoanForm, startDate: new Date() });
        }}
        title={editingLoanId ? 'Kredit bearbeiten' : 'Neuen Kredit anlegen'}
        size="lg"
        fullScreen={isMobile}
        radius="md"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Bezeichnung"
            placeholder="z. B. Autokredit"
            value={loanForm.title}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setLoanForm((prev) => ({ ...prev, title: value }));
            }}
            error={formErrors.title}
            withAsterisk
          />

          <Group grow>
            <Select
              label="Rolle"
              data={[
                { value: 'borrower', label: 'Ich nehme einen Kredit auf' },
                { value: 'lender', label: 'Ich vergebe einen Kredit' },
              ]}
              value={loanForm.role}
              onChange={(value) => {
                if (!value) return;
                setLoanForm((prev) => ({ ...prev, role: value as LoanRole }));
              }}
            />
            <Select
              label="Zahlungsrhythmus"
              data={Object.entries(FREQUENCY_CONFIG).map(([value, config]) => ({
                value,
                label: `${config.label} (${config.periodsPerYear}x pro Jahr)`,
              }))}
              value={loanForm.frequency}
              onChange={(value) => {
                if (!value) return;
                setLoanForm((prev) => ({ ...prev, frequency: value as PaymentFrequency }));
              }}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Kreditsumme"
              value={loanForm.principal}
              min={0}
              step={500}
              precision={2}
              decimalSeparator=","
              thousandSeparator="."
              hideControls
              onChange={(value) =>
                setLoanForm((prev) => ({
                  ...prev,
                  principal: Number(value) || 0,
                }))
              }
              error={formErrors.principal}
              withAsterisk
            />
            <NumberInput
              label="Zinssatz (p.a.)"
              value={loanForm.interestRate}
              min={0}
              step={0.1}
              precision={2}
              decimalSeparator=","
              hideControls
              onChange={(value) =>
                setLoanForm((prev) => ({
                  ...prev,
                  interestRate: Number(value) || 0,
                }))
              }
              error={formErrors.interestRate}
              withAsterisk
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Laufzeit (Monate)"
              value={loanForm.termMonths}
              min={1}
              step={1}
              hideControls
              onChange={(value) =>
                setLoanForm((prev) => ({
                  ...prev,
                  termMonths: Math.max(1, Number(value) || 0),
                }))
              }
              error={formErrors.termMonths}
              withAsterisk
            />
            <DateInput
              label="Startdatum"
              value={loanForm.startDate}
              onChange={(value) => setLoanForm((prev) => ({ ...prev, startDate: value }))}
              valueFormat="DD.MM.YYYY"
              error={formErrors.startDate}
              withAsterisk
            />
          </Group>

          <Textarea
            label="Beschreibung (optional)"
            placeholder="Notizen, Sondertilgungen, Beteiligte Personen..."
            minRows={2}
            value={loanForm.description}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setLoanForm((prev) => ({
                ...prev,
                description: value,
              }));
            }}
          />

          <Button onClick={handleCreateLoan}>
            {editingLoanId ? 'Änderungen speichern' : 'Kredit speichern'}
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={repaymentForm.open}
        onClose={closeRepaymentModal}
        title="Teilzahlung erfassen"
        fullScreen={isMobile}
        radius="md"
        centered
      >
        <Stack gap="md">
          <NumberInput
            label="Betrag"
            value={repaymentForm.amount}
            min={0}
            precision={2}
            decimalSeparator=","
            thousandSeparator="."
            hideControls
            onChange={(value) =>
              setRepaymentForm((prev) => ({
                ...prev,
                amount: Number(value) || 0,
                error: undefined,
              }))
            }
            withAsterisk
          />

          <DateInput
            label="Zahlungsdatum"
            value={repaymentForm.date}
            onChange={(value) =>
              setRepaymentForm((prev) => ({
                ...prev,
                date: value,
                error: undefined,
              }))
            }
            valueFormat="DD.MM.YYYY"
            withAsterisk
          />

          <Textarea
            label="Notiz (optional)"
            placeholder="z. B. Sondertilgung, Vereinbarung mit Glaeubiger..."
            minRows={2}
            value={repaymentForm.note}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setRepaymentForm((prev) => ({
                ...prev,
                note: value,
              }));
            }}
          />

          {repaymentForm.error && (
            <Box>
              <Text size="sm" c="red">
                {repaymentForm.error}
              </Text>
            </Box>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={closeRepaymentModal}>
              Abbrechen
            </Button>
            <Button onClick={handleAddRepayment}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
