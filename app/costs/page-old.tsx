'use client';

import { Container, Title, Text, Card, Stack, Table, Badge, Group, Button, TextInput, NumberInput, Modal, ActionIcon, Select, Tabs, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';
import { IconPlus, IconEdit, IconTrash, IconCategory, IconLayoutGrid } from '@tabler/icons-react';
import { useCostPlans, type CostPlanWithDetails, type IncomeSourceWithMonthly } from '../../hooks/useCostPlans';
import { useAuth } from '../../contexts/AuthContext';

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

export default function CostsPage() {
  const { user } = useAuth();
  const {
    costPlans,
    incomeSources,
    loading,
    error,
    addCostPlan,
    editCostPlan,
    removeCostPlan,
    addCostCategory,
    editCostCategory,
    removeCostCategory,
    addIncomeSource,
    editIncomeSource,
    removeIncomeSource
  } = useCostPlans();

  const [activePlanId, setActivePlanId] = useState<string>('');

  const [costModalOpened, setCostModalOpened] = useState(false);
  const [categoryModalOpened, setCategoryModalOpened] = useState(false);
  const [incomeModalOpened, setIncomeModalOpened] = useState(false);
  const [planModalOpened, setPlanModalOpened] = useState(false);

  const [costForm, setCostForm] = useState({ 
    id: '', 
    name: '', 
    estimated_cost: 0, 
    quantity: 1, 
    unit: '', 
    priority: 'medium' as 'low' | 'medium' | 'high',
    category_id: '',
    notes: ''
  });
  const [editingCost, setEditingCost] = useState(false);

  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', color: 'blue' });
  const [editingCategory, setEditingCategory] = useState(false);

  const [incomeForm, setIncomeForm] = useState({ 
    id: '', 
    name: '', 
    amount: 0, 
    frequency: 'monthly' as 'weekly' | 'monthly' | 'yearly' | 'one-time',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    description: ''
  });
  const [editingIncome, setEditingIncome] = useState(false);

  const [planForm, setPlanForm] = useState({ id: '', name: '', description: '' });
  const [editingPlan, setEditingPlan] = useState(false);

  // Set initial active plan
  if (!activePlanId && costPlans.length > 0) {
    setActivePlanId(costPlans[0].id);
  }

  const activePlan = costPlans.find(p => p.id === activePlanId) || costPlans[0];
  const costs = activePlan?.costItems || [];
  const categories = activePlan?.categories || [];

  // Loading and error states
  if (loading) {
    return (
      <Container size="xl" py="xl">
        <LoadingOverlay visible={true} overlayProps={{ radius: "sm", blur: 2 }} />
        <Title order={1} mb="xl">Kostenplanung</Title>
        <Text>Lade Kostenpläne...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Title order={1} mb="xl">Kostenplanung</Title>
        <Text c="red">{error}</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="xl" py="xl">
        <Title order={1} mb="xl">Kostenplanung</Title>
        <Text>Bitte melde dich an, um deine Kostenpläne zu verwalten.</Text>
      </Container>
    );
  }

  const handleAddPlan = () => {
    setPlanForm({ id: '', name: '', description: '' });
    setEditingPlan(false);
    setPlanModalOpened(true);
  };

  const handleEditPlan = (plan: CostPlanWithDetails) => {
    setPlanForm({ id: plan.id, name: plan.name, description: plan.description || '' });
    setEditingPlan(true);
    setPlanModalOpened(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name) return;
    
    if (editingPlan) {
      const success = await editCostPlan(planForm.id, planForm.name, planForm.description);
      if (success) setPlanModalOpened(false);
    } else {
      const newPlan = await addCostPlan(planForm.name, planForm.description);
      if (newPlan) {
        setActivePlanId(newPlan.id);
        setPlanModalOpened(false);
      }
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (costPlans.length <= 1) return;
    const success = await removeCostPlan(id);
    if (success && activePlanId === id) {
      setActivePlanId(costPlans[0].id);
    }
  };

  const handleAddCategory = () => {
    setCategoryForm({ id: '', name: '', color: 'blue' });
    setEditingCategory(false);
    setCategoryModalOpened(true);
  };

  const handleEditCategory = (category: any) => {
    setCategoryForm({ id: category.id, name: category.name, color: category.color });
    setEditingCategory(true);
    setCategoryModalOpened(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name) return;
    if (editingCategory) {
      updatePlan(activePlanId, {
        categories: categories.map(cat => cat.id === categoryForm.id ? categoryForm : cat)
      });
    } else {
      updatePlan(activePlanId, {
        categories: [...categories, { ...categoryForm, id: Date.now().toString() }]
      });
    }
    setCategoryModalOpened(false);
  };

  const handleDeleteCategory = (id: string) => {
    const categoryToDelete = categories.find(cat => cat.id === id);
    if (categoryToDelete) {
      updatePlan(activePlanId, {
        costs: costs.filter(cost => cost.category !== categoryToDelete.name),
        categories: categories.filter(cat => cat.id !== id)
      });
    }
  };

  const handleAddCost = (categoryName: string) => {
    setCostForm({ id: '', name: '', kosten: 0, frequenz: 1, category: categoryName });
    setEditingCost(false);
    setCostModalOpened(true);
  };

  const handleEditCost = (item: CostItem) => {
    setCostForm(item);
    setEditingCost(true);
    setCostModalOpened(true);
  };

  const handleSaveCost = () => {
    if (!costForm.name || costForm.kosten <= 0 || !costForm.category) return;
    const betragProMonat = costForm.kosten / costForm.frequenz;
    const newItem = { ...costForm, betragProMonat };

    if (editingCost) {
      updatePlan(activePlanId, {
        costs: costs.map(item => item.id === newItem.id ? newItem : item)
      });
    } else {
      updatePlan(activePlanId, {
        costs: [...costs, { ...newItem, id: Date.now().toString() }]
      });
    }
    setCostModalOpened(false);
  };

  const handleDeleteCost = (id: string) => {
    updatePlan(activePlanId, {
      costs: costs.filter(item => item.id !== id)
    });
  };

  const handleAddIncome = () => {
    setIncomeForm({ id: '', name: '', betrag: 0, frequenz: 1, betragProMonat: 0 });
    setEditingIncome(false);
    setIncomeModalOpened(true);
  };

  const handleEditIncome = (item: IncomeItem) => {
    setIncomeForm(item);
    setEditingIncome(true);
    setIncomeModalOpened(true);
  };

  const handleSaveIncome = () => {
    if (!incomeForm.name || incomeForm.betrag <= 0) return;
    const betragProMonat = incomeForm.betrag / incomeForm.frequenz;
    const newItem = { ...incomeForm, betragProMonat };

    if (editingIncome) {
      updatePlan(activePlanId, {
        income: income.map(item => item.id === newItem.id ? newItem : item)
      });
    } else {
      updatePlan(activePlanId, {
        income: [...income, { ...newItem, id: Date.now().toString() }]
      });
    }
    setIncomeModalOpened(false);
  };

  const handleDeleteIncome = (id: string) => {
    updatePlan(activePlanId, {
      income: income.filter(item => item.id !== id)
    });
  };

  const getCostsForCategory = (categoryName: string) => {
    return costs.filter(cost => cost.category === categoryName);
  };

  const getTotalForCategory = (categoryName: string) => {
    return getCostsForCategory(categoryName).reduce((sum, cost) => sum + cost.betragProMonat, 0);
  };

  const gesamtEinnahmen = income.reduce((sum, item) => sum + item.betragProMonat, 0);
  const gesamtKosten = costs.reduce((sum, item) => sum + item.betragProMonat, 0);
  const gewinn = gesamtEinnahmen - gesamtKosten;

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={1}>Kostenübersicht</Title>
          <Group gap="xs">
            <Button leftSection={<IconLayoutGrid size={16} />} onClick={handleAddPlan} variant="light">
              Neuer Plan
            </Button>
            <Button leftSection={<IconCategory size={16} />} onClick={handleAddCategory}>
              Neue Kategorie
            </Button>
          </Group>
        </Group>

        <Group justify="space-between" align="center" mb="md">
          <Group>
            <Title order={2}>Kostenpläne</Title>
            {costPlans.length > 1 && (
              <Badge variant="light" color="blue">
                {costPlans.length} Pläne
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            <Button 
              leftSection={<IconPlus size={16} />} 
              onClick={handleAddCategory}
              size="sm"
            >
              Neue Kategorie
            </Button>
            {costPlans.length > 1 && activePlanId && (
              <>
                <ActionIcon
                  size="lg"
                  variant="subtle"
                  color="blue"
                  onClick={() => {
                    const activePlan = costPlans.find(p => p.id === activePlanId);
                    if (activePlan) handleEditPlan(activePlan);
                  }}
                  title="Plan bearbeiten"
                >
                  <IconEdit size={18} />
                </ActionIcon>
                <ActionIcon
                  size="lg"
                  variant="subtle"
                  color="red"
                  onClick={() => handleDeletePlan(activePlanId)}
                  title="Plan löschen"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </>
            )}
          </Group>
        </Group>

        <Tabs value={activePlanId} onChange={(value) => setActivePlanId(value || '1')}>
          <Tabs.List mb="lg">
            {costPlans.map((plan) => (
              <Tabs.Tab key={plan.id} value={plan.id}>
                {plan.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {costPlans.map((plan) => (
            <Tabs.Panel key={plan.id} value={plan.id} pt="xl">
              <Stack gap="xl">
                <Group grow>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Text size="sm" c="dimmed">Gehalt (Monat)</Text>
                    <Text size="xl" fw={700} c="green">€{gesamtEinnahmen.toFixed(2)}</Text>
                  </Card>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Text size="sm" c="dimmed">Kosten (Monat)</Text>
                    <Text size="xl" fw={700} c="red">€{gesamtKosten.toFixed(2)}</Text>
                  </Card>
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Text size="sm" c="dimmed">Gewinn</Text>
                    <Text size="xl" fw={700} c={gewinn >= 0 ? 'green' : 'red'}>€{gewinn.toFixed(2)}</Text>
                  </Card>
                </Group>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="md">
                    <Title order={3}>Gehälter</Title>
                    <Button size="sm" onClick={handleAddIncome}>Gehalt hinzufügen</Button>
                  </Group>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Betrag</Table.Th>
                        <Table.Th>Frequenz</Table.Th>
                        <Table.Th>Betrag pro Monat</Table.Th>
                        <Table.Th>Aktionen</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {income.map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td>{item.name}</Table.Td>
                          <Table.Td>€{item.betrag.toFixed(2)}</Table.Td>
                          <Table.Td>{item.frequenz}x/Monat</Table.Td>
                          <Table.Td>€{item.betragProMonat.toFixed(2)}</Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon color="blue" variant="light" onClick={() => handleEditIncome(item)}>
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon color="red" variant="light" onClick={() => handleDeleteIncome(item.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Card>

                {categories.map((category) => {
                  const categoryCosts = getCostsForCategory(category.name);
                  return (
                    <Card key={category.id} shadow="sm" padding="lg" radius="md" withBorder>
                      <Group justify="space-between" mb="md">
                        <Group gap="md">
                          <Badge color={category.color} size="xl" variant="filled">
                            {category.name}
                          </Badge>
                          <Text size="lg" fw={500}>
                            Total: €{getTotalForCategory(category.name).toFixed(2)}/Monat
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <Button size="sm" onClick={() => handleAddCost(category.name)}>
                            Kosten hinzufügen
                          </Button>
                          <ActionIcon 
                            color="blue" 
                            variant="light" 
                            onClick={() => handleEditCategory(category)}
                            size="lg"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon 
                            color="red" 
                            variant="light" 
                            onClick={() => handleDeleteCategory(category.id)}
                            size="lg"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>

                      <Table highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Kosten</Table.Th>
                            <Table.Th>Frequenz</Table.Th>
                            <Table.Th>Betrag pro Monat</Table.Th>
                            <Table.Th>Aktionen</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {categoryCosts.length > 0 ? (
                            categoryCosts.map((item) => (
                              <Table.Tr key={item.id}>
                                <Table.Td>{item.name}</Table.Td>
                                <Table.Td>€{item.kosten}</Table.Td>
                                <Table.Td>
                                  {item.frequenz === 1 ? 'Monatlich' : 
                                   item.frequenz === 12 ? 'Jährlich' : 
                                   `${item.frequenz}x pro Jahr`}
                                </Table.Td>
                                <Table.Td>€{item.betragProMonat.toFixed(2)}</Table.Td>
                                <Table.Td>
                                  <Group gap="xs">
                                    <ActionIcon color="blue" variant="light" onClick={() => handleEditCost(item)}>
                                      <IconEdit size={16} />
                                    </ActionIcon>
                                    <ActionIcon color="red" variant="light" onClick={() => handleDeleteCost(item.id)}>
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))
                          ) : (
                            <Table.Tr>
                              <Table.Td colSpan={5}>
                                <Text c="dimmed" ta="center">Keine Kosten in dieser Kategorie</Text>
                              </Table.Td>
                            </Table.Tr>
                          )}
                        </Table.Tbody>
                      </Table>
                    </Card>
                  );
                })}

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={3} mb="md">Zusammenfassung</Title>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={700} size="lg">Gesamte Einnahmen:</Text>
                      <Text fw={700} size="lg" c="green">€{gesamtEinnahmen.toFixed(2)}</Text>
                    </Group>
                    {categories.map((category) => (
                      <Group key={category.id} justify="space-between">
                        <Text>{category.name}:</Text>
                        <Text fw={700} c="red">-€{getTotalForCategory(category.name).toFixed(2)}</Text>
                      </Group>
                    ))}
                    <Group justify="space-between" pt="md" style={{ borderTop: '2px solid var(--mantine-color-gray-3)' }}>
                      <Text fw={700} size="xl">Gewinn:</Text>
                      <Text fw={700} size="xl" c="blue">€{gewinn.toFixed(2)}</Text>
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            </Tabs.Panel>
          ))}
        </Tabs>
      </Stack>

      {/* Modals */}
      <Modal opened={planModalOpened} onClose={() => setPlanModalOpened(false)} title={editingPlan ? 'Plan bearbeiten' : 'Neuen Plan erstellen'}>
        <Stack gap="md">
          <TextInput
            label="Plan-Name"
            placeholder="z.B. Optimistisch, Pessimistisch"
            value={planForm.name}
            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setPlanModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSavePlan}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={categoryModalOpened} onClose={() => setCategoryModalOpened(false)} title={editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie erstellen'}>
        <Stack gap="md">
          <TextInput
            label="Kategorie-Name"
            placeholder="z.B. Wohnen, Transport"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            required
          />
          <Select
            label="Farbe"
            placeholder="Wähle eine Farbe"
            value={categoryForm.color}
            onChange={(val) => setCategoryForm({ ...categoryForm, color: val || 'blue' })}
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
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setCategoryModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSaveCategory}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={costModalOpened} onClose={() => setCostModalOpened(false)} title={editingCost ? 'Kosten bearbeiten' : 'Neue Kosten hinzufügen'}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="z.B. Netflix, Miete"
            value={costForm.name}
            onChange={(e) => setCostForm({ ...costForm, name: e.target.value })}
            required
          />
          <NumberInput
            label="Kosten"
            placeholder="0.00"
            value={costForm.kosten}
            onChange={(val) => setCostForm({ ...costForm, kosten: Number(val) })}
            min={0}
            decimalScale={2}
            prefix="€"
            required
          />
          <NumberInput
            label="Frequenz"
            placeholder="Wie oft pro Jahr?"
            value={costForm.frequenz}
            onChange={(val) => setCostForm({ ...costForm, frequenz: Number(val) })}
            min={1}
            max={12}
            description="1 = monatlich, 12 = jährlich"
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setCostModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSaveCost}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={incomeModalOpened} onClose={() => setIncomeModalOpened(false)} title={editingIncome ? 'Gehalt bearbeiten' : 'Neues Gehalt hinzufügen'}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="z.B. Hauptjob, Nebenjob"
            value={incomeForm.name}
            onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })}
            required
          />
          <NumberInput
            label="Betrag"
            placeholder="0.00"
            value={incomeForm.betrag}
            onChange={(val) => setIncomeForm({ ...incomeForm, betrag: Number(val) })}
            min={0}
            decimalScale={2}
            prefix="€"
            required
          />
          <NumberInput
            label="Frequenz"
            placeholder="Wie oft pro Monat?"
            value={incomeForm.frequenz}
            onChange={(val) => setIncomeForm({ ...incomeForm, frequenz: Number(val) })}
            min={1}
            max={12}
            description="1 = einmal pro Monat, 2 = zweimal pro Monat, etc."
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setIncomeModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSaveIncome}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
