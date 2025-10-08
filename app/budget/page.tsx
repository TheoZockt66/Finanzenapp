'use client';

import { Container, Title, Text, Card, Stack, Group, Button, Progress, Modal, TextInput, NumberInput, Select, Textarea, Badge, ActionIcon } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconTargetArrow } from '@tabler/icons-react';
import { useState } from 'react';

interface BudgetItem {
  id: string;
  name: string;
  betrag: number;
  ausgegeben: number;
  resetTag: number;
  farbe: string;
  beschreibung: string;
}

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

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([
    { 
      id: '1', 
      name: 'Lebensmittel', 
      betrag: 400, 
      ausgegeben: 285.50, 
      resetTag: 1, 
      farbe: 'green',
      beschreibung: 'Monatliches Budget für Lebensmittel und Haushaltswaren'
    },
    { 
      id: '2', 
      name: 'Freizeit & Unterhaltung', 
      betrag: 200, 
      ausgegeben: 145, 
      resetTag: 1, 
      farbe: 'purple',
      beschreibung: 'Kino, Konzerte, Hobbys und andere Freizeitaktivitäten'
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

  const [modalOpened, setModalOpened] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ 
    id: '', 
    name: '', 
    betrag: 0, 
    ausgegeben: 0, 
    resetTag: 1, 
    farbe: 'blue',
    beschreibung: '' 
  });
  const [editingBudget, setEditingBudget] = useState(false);

  const totalBudget = budgets.reduce((sum, item) => sum + item.betrag, 0);
  const totalAusgegeben = budgets.reduce((sum, item) => sum + item.ausgegeben, 0);
  const totalUebrig = totalBudget - totalAusgegeben;

  const handleAddBudget = () => {
    setBudgetForm({ id: '', name: '', betrag: 0, ausgegeben: 0, resetTag: 1, farbe: 'blue', beschreibung: '' });
    setEditingBudget(false);
    setModalOpened(true);
  };

  const handleEditBudget = (budget: BudgetItem) => {
    setBudgetForm(budget);
    setEditingBudget(true);
    setModalOpened(true);
  };

  const handleSaveBudget = () => {
    if (!budgetForm.name || budgetForm.betrag <= 0) return;
    if (editingBudget) {
      setBudgets(budgets.map(b => b.id === budgetForm.id ? budgetForm : b));
    } else {
      setBudgets([...budgets, { ...budgetForm, id: Date.now().toString() }]);
    }
    setModalOpened(false);
  };

  const handleDeleteBudget = (id: string) => {
    setBudgets(budgets.filter(b => b.id !== id));
  };

  const getProgressColor = (ausgegeben: number, betrag: number) => {
    const percentage = (ausgegeben / betrag) * 100;
    if (percentage > 100) return 'red';
    if (percentage > 80) return 'yellow';
    return 'green';
  };

  const getDaysUntilReset = (resetTag: number) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let resetDate = new Date(currentYear, currentMonth, resetTag);
    if (resetDate <= today) {
      resetDate = new Date(currentYear, currentMonth + 1, resetTag);
    }
    const diffTime = resetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
            <Text size="xl" fw={700} c="red">€{totalAusgegeben.toFixed(2)}</Text>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">Übrig</Text>
              <IconTargetArrow size={20} color="var(--mantine-color-green-6)" />
            </Group>
            <Text size="xl" fw={700} c={totalUebrig >= 0 ? 'green' : 'red'}>€{totalUebrig.toFixed(2)}</Text>
          </Card>
        </Group>

        <Stack gap="md">
          {budgets.map((budget) => {
            const percentage = (budget.ausgegeben / budget.betrag) * 100;
            const uebrig = budget.betrag - budget.ausgegeben;
            const daysUntilReset = getDaysUntilReset(budget.resetTag);
            
            return (
              <Card key={budget.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Group gap="md">
                      <Badge color={budget.farbe} size="lg" variant="outline" radius="xl" style={{ minWidth: '120px' }}>
                        {budget.name.toUpperCase()}
                      </Badge>
                      <Text size="sm" c="dimmed">
                        Reset am {budget.resetTag}. des Monats
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

                  {budget.beschreibung && (
                    <Text size="sm" c="dimmed" fs="italic">
                      {budget.beschreibung}
                    </Text>
                  )}

                  <Group justify="space-between">
                    <Text size="sm">
                      <Text component="span" fw={500}>€{budget.ausgegeben.toFixed(2)}</Text>
                      <Text component="span" c="dimmed"> von €{budget.betrag.toFixed(2)}</Text>
                    </Text>
                    <Text size="sm" c={uebrig >= 0 ? 'green' : 'red'} fw={500}>
                      {uebrig >= 0 ? '+' : ''}€{uebrig.toFixed(2)} übrig
                    </Text>
                  </Group>

                  <Progress
                    value={percentage}
                    color={getProgressColor(budget.ausgegeben, budget.betrag)}
                    size="lg"
                    radius="xl"
                  />
                </Stack>
              </Card>
            );
          })}

          {budgets.length === 0 && (
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
            value={budgetForm.betrag}
            onChange={(val) => setBudgetForm({ ...budgetForm, betrag: Number(val) })}
            min={0}
            decimalScale={2}
            prefix="€"
            required
          />
          <NumberInput
            label="Bereits ausgegeben"
            placeholder="0.00"
            value={budgetForm.ausgegeben}
            onChange={(val) => setBudgetForm({ ...budgetForm, ausgegeben: Number(val) })}
            min={0}
            decimalScale={2}
            prefix="€"
          />
          <NumberInput
            label="Reset-Tag (Tag des Monats)"
            placeholder="1"
            value={budgetForm.resetTag}
            onChange={(val) => setBudgetForm({ ...budgetForm, resetTag: Number(val) })}
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
            <Button onClick={handleSaveBudget}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
