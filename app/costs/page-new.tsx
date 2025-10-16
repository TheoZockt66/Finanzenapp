'use client';

import { Container, Title, Text, Card, Stack, Table, Badge, Group, Button, TextInput, NumberInput, Modal, ActionIcon, Select, Tabs, LoadingOverlay } from '@mantine/core';
import { useState, useEffect, useMemo } from 'react';
import { IconPlus, IconEdit, IconTrash, IconCategory, IconGripVertical } from '@tabler/icons-react';
import { useCostPlans, type CostPlanWithDetails, type IncomeSourceWithMonthly } from '../../hooks/useCostPlans';
import { useAuth } from '../../contexts/AuthContext';
import type { FinanzenCostItem, FinanzenCostCategory } from '../../lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Table Row Component
interface SortableRowProps {
  id: string;
  item: FinanzenCostItem;
  category: FinanzenCostCategory | undefined;
  onEdit: (item: FinanzenCostItem) => void;
  onDelete: (id: string) => void;
}

function SortableRow({ id, item, category, onEdit, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const yearlyItemCost = item.estimated_cost * item.quantity;
  const monthlyItemCost = yearlyItemCost / 12;

  return (
    <Table.Tr ref={setNodeRef} style={style} {...attributes}>
      <Table.Td>
        <Group gap="sm">
          <ActionIcon 
            variant="subtle" 
            size="sm" 
            style={{ cursor: 'grab' }}
            {...listeners}
          >
            <IconGripVertical size={14} />
          </ActionIcon>
          {item.name}
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={category?.color || 'gray'}>
          {category?.name || 'Unbekannt'}
        </Badge>
      </Table.Td>
      <Table.Td>{yearlyItemCost.toFixed(2)} €</Table.Td>
      <Table.Td>{item.quantity}x pro Jahr</Table.Td>
      <Table.Td>{monthlyItemCost.toFixed(2)} €</Table.Td>
      <Table.Td>
        <Group gap="sm">
          <ActionIcon variant="subtle" size="sm" onClick={() => onEdit(item)}>
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onDelete(item.id)}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
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

const frequencyOptions = [
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' },
  { value: 'one-time', label: 'Einmalig' }
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
    addCostItem,
    editCostItem,
    removeCostItem,
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
    frequency_per_year: 1, 
    description: '',
    category_id: '',
    cost_plan_id: ''
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
    description: '',
    cost_plan_id: ''
  });
  const [editingIncome, setEditingIncome] = useState(false);

  const [planForm, setPlanForm] = useState({ id: '', name: '', description: '' });
  const [editingPlan, setEditingPlan] = useState(false);

  // Drag & Drop state and sensors
  const [sortedCostItems, setSortedCostItems] = useState<FinanzenCostItem[]>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set initial active plan
  if (!activePlanId && costPlans.length > 0) {
    setActivePlanId(costPlans[0].id);
  }

  const activePlan = costPlans.find(p => p.id === activePlanId) || costPlans[0];
  const costItems = useMemo(() => activePlan?.costItems || [], [activePlan?.costItems]);
  const categories = activePlan?.categories || [];

  // Update sorted items when costItems change
  useEffect(() => {
    setSortedCostItems(costItems);
  }, [costItems]);

  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSortedCostItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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

  // Calculation helpers
  const totalIncome = incomeSources.reduce((sum, source) => sum + source.monthlyAmount, 0);
  const totalCosts = sortedCostItems.reduce((sum, item) => {
    const yearlyItemCost = item.estimated_cost * item.quantity; // quantity stores frequency_per_year
    const monthlyItemCost = yearlyItemCost / 12;
    return sum + monthlyItemCost;
  }, 0);
  const balance = totalIncome - totalCosts;

  // Plan management
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

  // Category management
  const handleAddCategory = () => {
    setCategoryForm({ id: '', name: '', color: 'blue' });
    setEditingCategory(false);
    setCategoryModalOpened(true);
  };

  const handleEditCategory = (category: FinanzenCostCategory) => {
    setCategoryForm({ id: category.id, name: category.name, color: category.color });
    setEditingCategory(true);
    setCategoryModalOpened(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !activePlanId) return;
    
    if (editingCategory) {
      const success = await editCostCategory(categoryForm.id, categoryForm.name, categoryForm.color);
      if (success) setCategoryModalOpened(false);
    } else {
      const success = await addCostCategory(activePlanId, categoryForm.name, categoryForm.color);
      if (success) setCategoryModalOpened(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!activePlanId) return;
    await removeCostCategory(activePlanId, categoryId);
  };

  // Income management
  const handleAddIncome = () => {
    if (!activePlanId) return;
    setIncomeForm({ 
      id: '', 
      name: '', 
      amount: 0, 
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      description: '',
      cost_plan_id: activePlanId
    });
    setEditingIncome(false);
    setIncomeModalOpened(true);
  };

  const handleEditIncome = (item: IncomeSourceWithMonthly) => {
    setIncomeForm({ 
      id: item.id, 
      name: item.name, 
      amount: item.amount, 
      frequency: item.frequency,
      start_date: item.start_date,
      end_date: item.end_date || '',
      description: item.description || '',
      cost_plan_id: item.cost_plan_id || activePlanId
    });
    setEditingIncome(true);
    setIncomeModalOpened(true);
  };

  const handleSaveIncome = async () => {
    const planId = incomeForm.cost_plan_id || activePlanId;
    if (!incomeForm.name || incomeForm.amount <= 0 || !planId) return;
    
    if (editingIncome) {
      const success = await editIncomeSource(incomeForm.id, planId, {
        name: incomeForm.name,
        amount: incomeForm.amount,
        frequency: incomeForm.frequency,
        start_date: incomeForm.start_date,
        end_date: incomeForm.end_date || undefined,
        description: incomeForm.description
      });
      if (success) setIncomeModalOpened(false);
    } else {
      const success = await addIncomeSource(planId, {
        name: incomeForm.name,
        amount: incomeForm.amount,
        frequency: incomeForm.frequency,
        start_date: incomeForm.start_date,
        end_date: incomeForm.end_date || undefined,
        description: incomeForm.description
      });
      if (success) setIncomeModalOpened(false);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    await removeIncomeSource(id);
  };

  // Cost management
  const handleAddCost = (categoryId?: string) => {
    setCostForm({
      id: '',
      name: '',
      estimated_cost: 0,
      frequency_per_year: 1,
      description: '',
      category_id: categoryId || '',
      cost_plan_id: activePlanId
    });
    setEditingCost(false);
    setCostModalOpened(true);
  };

  const handleEditCost = (item: FinanzenCostItem) => {
    setCostForm({
      id: item.id,
      name: item.name,
      estimated_cost: item.estimated_cost,
      frequency_per_year: item.quantity, // quantity stores frequency_per_year
      description: item.notes || '',
      category_id: item.cost_category_id,
      cost_plan_id: activePlanId
    });
    setEditingCost(true);
    setCostModalOpened(true);
  };

  const handleSaveCost = async () => {
    if (!costForm.name || costForm.estimated_cost <= 0 || !costForm.category_id || !activePlanId) return;
    
    if (editingCost) {
      const success = await editCostItem(costForm.id, activePlanId, {
        name: costForm.name,
        estimated_cost: costForm.estimated_cost,
        quantity: costForm.frequency_per_year, // store frequency_per_year in quantity field
        unit: '', // not used anymore
        notes: costForm.description,
        priority: 'medium' // default value for backward compatibility
      });
      if (success) setCostModalOpened(false);
    } else {
      const success = await addCostItem(activePlanId, costForm.category_id, {
        name: costForm.name,
        estimated_cost: costForm.estimated_cost,
        quantity: costForm.frequency_per_year, // store frequency_per_year in quantity field
        unit: '', // not used anymore
        notes: costForm.description,
        priority: 'medium' // default value for backward compatibility
      });
      if (success) setCostModalOpened(false);
    }
  };

  const handleDeleteCost = async (id: string) => {
    if (!activePlanId) return;
    await removeCostItem(activePlanId, id);
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Kostenplanung</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleAddPlan}>
          Neuer Plan
        </Button>
      </Group>

      {costPlans.length === 0 ? (
        <Card>
          <Text ta="center" c="dimmed">
            Noch keine Kostenpläne vorhanden. Erstelle deinen ersten Plan!
          </Text>
        </Card>
      ) : (
        <>
          <Card mb="xl">
            <Group justify="space-between" mb="md">
              <Text fw={500}>Aktiver Plan</Text>
              <Group>
                <Select
                  value={activePlanId}
                  onChange={(value) => setActivePlanId(value || '')}
                  data={costPlans.map(plan => ({ value: plan.id, label: plan.name }))}
                  placeholder="Plan auswählen"
                />
                {activePlan && (
                  <>
                    <ActionIcon variant="subtle" onClick={() => handleEditPlan(activePlan)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeletePlan(activePlan.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </>
                )}
              </Group>
            </Group>
            
            {activePlan && (
              <Stack gap="sm">
                <Text><strong>Name:</strong> {activePlan.name}</Text>
                {activePlan.description && (
                  <Text><strong>Beschreibung:</strong> {activePlan.description}</Text>
                )}
                <Group>
                  <Text c="green"><strong>Einkommen:</strong> {totalIncome.toFixed(2)} €</Text>
                  <Text c="red"><strong>Kosten:</strong> {totalCosts.toFixed(2)} €</Text>
                  <Text c={balance >= 0 ? 'green' : 'red'}>
                    <strong>Bilanz:</strong> {balance.toFixed(2)} €
                  </Text>
                </Group>
              </Stack>
            )}
          </Card>

          <Tabs defaultValue="costs">
            <Tabs.List>
              <Tabs.Tab value="costs">Kosten</Tabs.Tab>
              <Tabs.Tab value="categories">Kategorien</Tabs.Tab>
              <Tabs.Tab value="income">Einkommen</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="costs" pt="md">
              <Card>
                <Group justify="space-between" mb="md">
                  <Title order={3}>Kostenpositionen</Title>
                  <Button leftSection={<IconPlus size={16} />} onClick={() => handleAddCost()}>
                    Neue Kostenposition
                  </Button>
                </Group>
                
                {sortedCostItems.length === 0 ? (
                  <Text ta="center" c="dimmed">Noch keine Kostenpositionen vorhanden</Text>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Kategorie</Table.Th>
                          <Table.Th>Kosten/Jahr</Table.Th>
                          <Table.Th>Häufigkeit</Table.Th>
                          <Table.Th>Monatlich</Table.Th>
                          <Table.Th>Aktionen</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        <SortableContext
                          items={sortedCostItems.map(item => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {sortedCostItems.map((item) => (
                            <SortableRow
                              key={item.id}
                              id={item.id}
                              item={item}
                              category={categories.find(cat => cat.id === item.cost_category_id)}
                              onEdit={handleEditCost}
                              onDelete={handleDeleteCost}
                            />
                          ))}
                        </SortableContext>
                      </Table.Tbody>
                    </Table>
                  </DndContext>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="categories" pt="md">
              <Card>
                <Group justify="space-between" mb="md">
                  <Title order={3}>Kategorien</Title>
                  <Button leftSection={<IconCategory size={16} />} onClick={handleAddCategory}>
                    Neue Kategorie
                  </Button>
                </Group>
                
                {categories.length === 0 ? (
                  <Text ta="center" c="dimmed">Noch keine Kategorien vorhanden</Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Farbe</Table.Th>
                        <Table.Th>Aktionen</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {categories.map((category) => (
                        <Table.Tr key={category.id}>
                          <Table.Td>{category.name}</Table.Td>
                          <Table.Td>
                            <Badge color={category.color}>{category.color}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="sm">
                              <ActionIcon variant="subtle" size="sm" onClick={() => handleEditCategory(category)}>
                                <IconEdit size={14} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="income" pt="md">
              <Card>
                <Group justify="space-between" mb="md">
                  <Title order={3}>Einkommensquellen</Title>
                  <Button leftSection={<IconPlus size={16} />} onClick={handleAddIncome} disabled={!activePlanId}>
                    Neue Einkommensquelle
                  </Button>
                </Group>
                
                {incomeSources.length === 0 ? (
                  <Text ta="center" c="dimmed">Noch keine Einkommensquellen vorhanden</Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Betrag</Table.Th>
                        <Table.Th>Häufigkeit</Table.Th>
                        <Table.Th>Monatlich</Table.Th>
                        <Table.Th>Aktionen</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {incomeSources.map((source) => (
                        <Table.Tr key={source.id}>
                          <Table.Td>{source.name}</Table.Td>
                          <Table.Td>{source.amount.toFixed(2)} €</Table.Td>
                          <Table.Td>
                            <Badge>
                              {source.frequency === 'weekly' ? 'Wöchentlich' :
                               source.frequency === 'monthly' ? 'Monatlich' :
                               source.frequency === 'yearly' ? 'Jährlich' : 'Einmalig'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{source.monthlyAmount.toFixed(2)} €</Table.Td>
                          <Table.Td>
                            <Group gap="sm">
                              <ActionIcon variant="subtle" size="sm" onClick={() => handleEditIncome(source)}>
                                <IconEdit size={14} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteIncome(source.id)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </Tabs.Panel>
          </Tabs>
        </>
      )}

      {/* Plan Modal */}
      <Modal opened={planModalOpened} onClose={() => setPlanModalOpened(false)} title={editingPlan ? "Plan bearbeiten" : "Neuer Plan"}>
        <Stack>
          <TextInput
            label="Name"
            value={planForm.name}
            onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <TextInput
            label="Beschreibung"
            value={planForm.description}
            onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setPlanModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSavePlan}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Category Modal */}
      <Modal opened={categoryModalOpened} onClose={() => setCategoryModalOpened(false)} title={editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}>
        <Stack>
          <TextInput
            label="Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Select
            label="Farbe"
            value={categoryForm.color}
            onChange={(value) => setCategoryForm(prev => ({ ...prev, color: value || 'blue' }))}
            data={colorOptions}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setCategoryModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSaveCategory}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Income Modal */}
      <Modal opened={incomeModalOpened} onClose={() => setIncomeModalOpened(false)} title={editingIncome ? "Einkommensquelle bearbeiten" : "Neue Einkommensquelle"}>
        <Stack>
          <TextInput
            label="Name"
            value={incomeForm.name}
            onChange={(e) => setIncomeForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <NumberInput
            label="Betrag"
            value={incomeForm.amount}
            onChange={(value) => setIncomeForm(prev => ({ ...prev, amount: Number(value) || 0 }))}
            min={0}
            step={0.01}
            decimalScale={2}
            required
          />
          <Select
            label="Häufigkeit"
            value={incomeForm.frequency}
            onChange={(value) => setIncomeForm(prev => ({ ...prev, frequency: (value as 'weekly' | 'monthly' | 'yearly' | 'one-time') || 'monthly' }))}
            data={frequencyOptions}
            required
          />
          <Select
            label="Plan"
            value={incomeForm.cost_plan_id || activePlanId}
            onChange={(value) => setIncomeForm(prev => ({ ...prev, cost_plan_id: value || '' }))}
            data={costPlans.map(plan => ({ value: plan.id, label: plan.name }))}
            required
          />
          <TextInput
            label="Startdatum"
            type="date"
            value={incomeForm.start_date}
            onChange={(e) => setIncomeForm(prev => ({ ...prev, start_date: e.target.value }))}
            required
          />
          <TextInput
            label="Enddatum (optional)"
            type="date"
            value={incomeForm.end_date}
            onChange={(e) => setIncomeForm(prev => ({ ...prev, end_date: e.target.value }))}
          />
          <TextInput
            label="Beschreibung"
            value={incomeForm.description}
            onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setIncomeModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSaveIncome} disabled={!incomeForm.name || incomeForm.amount <= 0 || !(incomeForm.cost_plan_id || activePlanId)}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Cost Item Modal */}
      <Modal opened={costModalOpened} onClose={() => setCostModalOpened(false)} title={editingCost ? "Kostenposition bearbeiten" : "Neue Kostenposition"}>
        <Stack>
          <TextInput
            label="Name"
            value={costForm.name}
            onChange={(e) => setCostForm(prev => ({ ...prev, name: e.target.value }))}
            required
            placeholder="z.B. Netflix, Versicherung, Miete"
          />
          <NumberInput
            label="Kosten pro Vorgang"
            value={costForm.estimated_cost}
            onChange={(value) => setCostForm(prev => ({ ...prev, estimated_cost: Number(value) || 0 }))}
            min={0}
            step={0.01}
            decimalScale={2}
            required
            placeholder="Betrag in Euro"
            rightSection="€"
          />
          <NumberInput
            label="Häufigkeit pro Jahr"
            value={costForm.frequency_per_year}
            onChange={(value) => setCostForm(prev => ({ ...prev, frequency_per_year: Number(value) || 1 }))}
            min={1}
            max={365}
            required
            placeholder="Wie oft pro Jahr fällt diese Kostenstelle an?"
            description="z.B. 12 für monatlich, 4 für quartalsweise, 1 für jährlich"
          />
          <Select
            label="Kategorie"
            value={costForm.category_id}
            onChange={(value) => setCostForm(prev => ({ ...prev, category_id: value || '' }))}
            data={categories.map(cat => ({ value: cat.id, label: cat.name }))}
            required
          />
          <TextInput
            label="Beschreibung (optional)"
            value={costForm.description}
            onChange={(e) => setCostForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Zusätzliche Informationen zu dieser Kostenstelle"
          />
          
          {/* Kostenvorschau */}
          {costForm.estimated_cost > 0 && costForm.frequency_per_year > 0 && (
            <Card withBorder p="sm" bg="gray.0">
              <Text size="sm" fw={500} mb="xs">Kostenvorschau:</Text>
              <Group gap="lg">
                <div>
                  <Text size="xs" c="dimmed">Pro Jahr</Text>
                  <Text fw={500}>{(costForm.estimated_cost * costForm.frequency_per_year).toFixed(2)} €</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Pro Monat</Text>
                  <Text fw={500}>{((costForm.estimated_cost * costForm.frequency_per_year) / 12).toFixed(2)} €</Text>
                </div>
              </Group>
            </Card>
          )}
          
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setCostModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSaveCost}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
