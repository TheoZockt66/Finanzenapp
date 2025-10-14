'use client';


import { useBudgets } from '../../hooks/useBudgets';
import type { FinanzenBudget } from '../../lib/types';
import { useState } from 'react';
import { Container, Title, Text, Card, Stack, Group, Button, Progress, Modal, TextInput, NumberInput, Select, Textarea, Badge, ActionIcon } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconTargetArrow } from '@tabler/icons-react';

const colorOptions = [
  { value: 'blue', label: 'Blau' },
  { value: 'green', label: 'Grün' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Rot' },
  { value: 'purple', label: 'Lila' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'pink', label: 'Pink' },
  { value: 'yellow', label: 'Gelb' },
  { value: 'teal', label: 'Türkis' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'lime', label: 'Limette' },
  { value: 'grape', label: 'Traube' }
];
type BudgetFormState = {
  id: string;
  name: string;
  amount: number;
  spent: number;
  carryover: number;
  reset_day: number;
  category_id: string;
  farbe: string;
  beschreibung: string;
};

const INITIAL_BUDGET_FORM: BudgetFormState = {
  id: '',
  name: '',
  amount: 0,
  spent: 0,
  carryover: 0,
  reset_day: 1,
  category_id: '',
  farbe: 'blue',
  beschreibung: ''
};

const mapFormToBudgetPayload = (form: BudgetFormState) => ({
  name: form.name.trim(),
  amount: Number.isFinite(form.amount) ? form.amount : 0,
  spent: Number.isFinite(form.spent) ? form.spent : 0,
  carryover: Number.isFinite(form.carryover) ? form.carryover : 0,
  reset_day: form.reset_day ? Math.min(Math.max(form.reset_day, 1), 31) : null,
  category_id: form.category_id ? form.category_id : null
});


export default function BudgetPage() {
  const { budgets, loading, error, addBudget, editBudget, removeBudget, refresh } = useBudgets();

  // Aggregated values for the summary cards
  const totalBudget = budgets.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCarryover = budgets.reduce((sum, item) => sum + (item.carryover || 0), 0);
  const totalSpent = budgets.reduce((sum, item) => sum + (item.spent || 0), 0);

  const totalVerfuegbar = totalBudget + totalCarryover - totalSpent;

  // Handlers
  const handleAddBudget = () => {
    setBudgetForm({ ...INITIAL_BUDGET_FORM });
    setFormError(null);
    setIsSaving(false);
    setEditingBudget(false);
    setModalOpened(true);
  };

  const handleEditBudget = (budget: FinanzenBudget) => {
    setBudgetForm({
      id: budget.id,
      name: budget.name,
      amount: budget.amount ?? 0,
      spent: budget.spent ?? 0,
      carryover: budget.carryover ?? 0,
      reset_day: budget.reset_day ?? 1,
      category_id: budget.category_id ?? '',
      farbe: 'blue',
      beschreibung: '',
    });
    setFormError(null);
    setIsSaving(false);
    setEditingBudget(true);
    setModalOpened(true);
  };

  const handleSaveBudget = async () => {
    if (!budgetForm.name.trim() || budgetForm.amount <= 0) {
      setFormError('Bitte gib einen Namen und einen Betrag > 0 ein.');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    const payload = mapFormToBudgetPayload(budgetForm);

    try {
      if (editingBudget) {
        await editBudget(budgetForm.id, payload);
      } else {
        await addBudget({
          ...payload,
          period: 'monthly',
          is_active: true,
          auto_reset: true
        });
      }

      setModalOpened(false);
      setBudgetForm({ ...INITIAL_BUDGET_FORM });
      setEditingBudget(false);
      await refresh();
    } catch (err) {
      console.error('Fehler beim Speichern des Budgets:', err);
      setFormError('Speichern fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    await removeBudget(id);
    await refresh();
  };

  const getProgressColor = (spent: number, amount: number) => {
    const percentage = (spent / amount) * 100;
    if (percentage > 100) return 'red';
    if (percentage > 80) return 'yellow';
    return 'green';
  };

  const getDaysUntilReset = (reset_day: number) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let resetDate = new Date(currentYear, currentMonth, reset_day);
    if (resetDate <= today) {
      resetDate = new Date(currentYear, currentMonth + 1, reset_day);
    }
    const diffTime = resetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // State for modal and form
  const [modalOpened, setModalOpened] = useState(false);
  const [budgetForm, setBudgetForm] = useState<BudgetFormState>({ ...INITIAL_BUDGET_FORM });
  const [editingBudget, setEditingBudget] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);


  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={1}>Budgets</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAddBudget}>
            Budget hinzufügen
          </Button>
        </Group>

        <Group grow>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Gesamt Budget</Text>
              <IconTargetArrow size={20} color="var(--mantine-color-blue-6)" />
            </Group>
            <Text size="xl" fw={700} c="blue">€{totalBudget.toFixed(2)}</Text>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Ausgegeben</Text>
              <IconTargetArrow size={20} color="var(--mantine-color-red-6)" />
            </Group>
            <Text size="xl" fw={700} c="red">€{totalSpent.toFixed(2)}</Text>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Gesamt Übertrag</Text>
              <IconTargetArrow size={20} color="var(--mantine-color-cyan-6)" />
            </Group>
            <Text size="xl" fw={700} c="cyan">€{totalCarryover.toFixed(2)}</Text>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Verfügbar</Text>
              <IconTargetArrow size={20} color="var(--mantine-color-green-6)" />
            </Group>
            <Text size="xl" fw={700} c={totalVerfuegbar >= 0 ? 'green' : 'red'}>€{totalVerfuegbar.toFixed(2)}</Text>
          </Card>
        </Group>


        <Stack gap="md">
          {loading && budgets.length === 0 && (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Text c="dimmed" ta="center">
                Budgets werden geladen...
              </Text>
            </Card>
          )}

          {error && (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Group justify="space-between" align="center">
                <Text c="red">{error}</Text>
                <Button variant="light" size="xs" onClick={refresh}>
                  Erneut versuchen
                </Button>
              </Group>
            </Card>
          )}

          {budgets.map((budget) => {
            const verfuegbarGesamt = (budget.amount || 0) + (budget.carryover || 0);
            const verfuegbarUebrig = verfuegbarGesamt - (budget.spent || 0);
            const percentage = ((budget.spent || 0) / verfuegbarGesamt) * 100;
            const daysUntilReset = getDaysUntilReset(budget.reset_day ?? 1);
            return (
              <Card key={budget.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap="md">
                      <Badge color={'blue'} size="lg" variant="outline" radius="xl" style={{ minWidth: '120px' }}>
                        {budget.name?.toUpperCase()}
                      </Badge>
                      <Text size="sm" c="dimmed">
                        Reset am {budget.reset_day}. des Monats
                        {daysUntilReset > 0 && ` (in ${daysUntilReset} ${daysUntilReset === 1 ? 'Tag' : 'Tagen'})`}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <ActionIcon color="blue" variant="light" onClick={() => handleEditBudget(budget)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon color="red" variant="light" onClick={() => handleDeleteBudget(budget.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  {/* Description not available in FinanzenBudget, skip rendering */}

                  {/* Budget-Details mit Übertrag */}
                  <Group justify="space-between">
                    <Stack gap={4}>
                      <Text size="sm">
                        <Text component="span" fw={500}>Budget: €{(budget.amount || 0).toFixed(2)}</Text>
                      </Text>
                      {budget.carryover > 0 && (
                        <Text size="sm" c="blue">
                          <Text component="span" fw={500}>+ Übertrag: €{budget.carryover.toFixed(2)}</Text>
                        </Text>
                      )}
                      <Text size="sm" c="dimmed">
                        Ausgegeben: €{(budget.spent || 0).toFixed(2)}
                      </Text>
                    </Stack>
                    <Stack gap={4} align="flex-end">
                      <Text size="lg" fw={700} c={verfuegbarUebrig >= 0 ? 'green' : 'red'}>
                        €{verfuegbarUebrig.toFixed(2)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        verfügbar
                      </Text>
                      {budget.carryover > 0 && (
                        <Badge size="xs" color="blue" variant="light">
                          {budget.spent <= budget.carryover 
                            ? `Aus Übertrag: €${budget.spent.toFixed(2)}`
                            : `€${(budget.spent - budget.carryover).toFixed(2)} vom Budget`
                          }
                        </Badge>
                      )}
                    </Stack>
                  </Group>

                  <Progress
                    value={Math.min(percentage, 100)}
                    color={getProgressColor(budget.spent || 0, verfuegbarGesamt)}
                    size="lg"
                    radius="xl"
                  />
                </Stack>
              </Card>
            );
          })}

          {budgets.length === 0 && !loading && (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Text c="dimmed" ta="center">
                Noch keine Budgets vorhanden. Erstelle dein erstes Budget!
              </Text>
            </Card>
          )}
        </Stack>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingBudget ? 'Budget bearbeiten' : 'Neues Budget erstellen'}
        size="lg"
      >
        <Stack gap="md">
          {formError && (
            <Text c="red" size="sm">
              {formError}
            </Text>
          )}
          <TextInput
            label="Budget-Name"
            placeholder="z.B. Lebensmittel, Freizeit, etc."
            value={budgetForm.name}
            onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
            required
          />
          <NumberInput
            label="Budget-Betrag"
            placeholder="0.00"
            value={budgetForm.amount}
            onChange={(val) => setBudgetForm({ ...budgetForm, amount: Number(val) })}
            min={0}
            decimalScale={2}
            prefix="€"
            required
          />
          <NumberInput
            label="Bereits ausgegeben"
            placeholder="0.00"
            value={budgetForm.spent}
            onChange={(val) => setBudgetForm({ ...budgetForm, spent: Number(val) })}
            min={0}
            decimalScale={2}
            prefix="€"
          />
          <NumberInput
            label="Übertrag aus vorherigem Zeitraum"
            placeholder="0.00"
            value={budgetForm.carryover}
            onChange={(val) => setBudgetForm({ ...budgetForm, carryover: Number(val) })}
            min={0}
            decimalScale={2}
            prefix="€"
            description="Geld, das vom vorherigen Budget-Zeitraum übrig geblieben ist"
          />
          <NumberInput
            label="Reset-Tag (Tag des Monats)"
            placeholder="1"
            value={budgetForm.reset_day}
            onChange={(val) => setBudgetForm({ ...budgetForm, reset_day: Number(val) })}
            min={1}
            max={31}
            description="An welchem Tag des Monats soll das Budget zurückgesetzt werden?"
            required
          />
          <Select
            label="Farbe"
            placeholder="Wähle eine Farbe"
            value={budgetForm.farbe}
            onChange={(val) => setBudgetForm({ ...budgetForm, farbe: val || 'blue' })}
            data={colorOptions}
            renderOption={({ option }) => (
              <Group gap="xs">
                <Badge color={option.value} variant="filled" size="lg" style={{ minWidth: '60px' }}>
                  {option.value}
                </Badge>
                <Text>{option.label}</Text>
              </Group>
            )}
            required
          />
          <Textarea
            label="Beschreibung"
            placeholder="Optional: Wofür ist dieses Budget gedacht?"
            value={budgetForm.beschreibung}
            onChange={(e) => setBudgetForm({ ...budgetForm, beschreibung: e.target.value })}
            minRows={3}
            maxRows={5}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveBudget} loading={isSaving} disabled={isSaving}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
