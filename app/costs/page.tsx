'use client';

import { Container, Title, Text, Card, Stack, Table, Badge, Group, Button, TextInput, NumberInput, Modal, ActionIcon, Select, Tabs, LoadingOverlay } from '@mantine/core';
import { useState, useEffect, useMemo } from 'react';
import { IconPlus, IconEdit, IconTrash, IconCategory, IconGripVertical, IconCopy } from '@tabler/icons-react';
import { useCostPlans, type CostPlanWithDetails, type IncomeSourceWithMonthly } from '../../hooks/useCostPlans';
import { useAuth } from '../../contexts/AuthContext';
import type { FinanzenCostCategory } from '../../lib/types';
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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Tab Component
interface SortableTabProps {
  id: string;
  category: FinanzenCostCategory;
  isActive: boolean;
  onClick: () => void;
}

function SortableTab({ id, category, isActive, onClick }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
    zIndex: isDragging ? 1000 : 1,
    position: isDragging ? ('relative' as const) : ('static' as const),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      <Tabs.Tab 
        value={category.id} 
        style={{ 
          backgroundColor: isActive ? 'var(--mantine-color-blue-light)' : undefined,
          position: 'relative',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.2)' : undefined,
        }}
        onClick={onClick}
      >
        <Group gap="xs" align="center">
          <div
            {...listeners}
            style={{ 
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px',
              borderRadius: '4px',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <IconGripVertical size={12} color="var(--mantine-color-dimmed)" />
          </div>
          <Badge 
            color={category.color} 
            variant="light"
            style={{
              transition: 'transform 0.2s ease',
              transform: isDragging ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {category.name}
          </Badge>
        </Group>
      </Tabs.Tab>
    </div>
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
    refreshing,
    error,
    refresh,
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
  const [activeTab, setActiveTab] = useState<string>('income');

  // Drag & Drop state for sortable tabs
  const [sortedCategories, setSortedCategories] = useState<FinanzenCostCategory[]>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    description: '',
    cost_plan_id: ''
  });
  const [editingIncome, setEditingIncome] = useState(false);

  const [planForm, setPlanForm] = useState({ id: '', name: '', description: '' });
  const [editingPlan, setEditingPlan] = useState(false);

  // Set initial active plan
  if (!activePlanId && costPlans.length > 0) {
    setActivePlanId(costPlans[0].id);
  }

  const activePlan = costPlans.find(p => p.id === activePlanId) || costPlans[0];
  const costItems = activePlan?.costItems || [];
  const categories = useMemo(() => activePlan?.categories || [], [activePlan?.categories]);

  // Update sorted categories when categories change
  useEffect(() => {
    if (categories.length > 0) {
      // Try to load saved order from localStorage
      const savedOrder = localStorage.getItem(`tab-order-${activePlanId}`);
      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder);
          // Sort categories according to saved order
          const sortedByOrder = categories.sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
          setSortedCategories(sortedByOrder);
        } catch {
          // If parsing fails, use default order
          setSortedCategories(categories);
        }
      } else {
        // No saved order, use default
        setSortedCategories(categories);
      }
    } else {
      setSortedCategories([]);
    }
  }, [categories, activePlanId]);

  // Handle tab drag & drop
  const handleTabDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSortedCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save new order to localStorage
        if (activePlanId) {
          const orderIds = newOrder.map(item => item.id);
          localStorage.setItem(`tab-order-${activePlanId}`, JSON.stringify(orderIds));
        }
        
        return newOrder;
      });
    }
  };
  
  // Set initial active tab after categories are available
  if (!activeTab || (activeTab !== 'income' && activeTab !== 'add-category' && !categories.find(cat => cat.id === activeTab))) {
    if (categories.length > 0) {
      setActiveTab(categories[0].id);
    } else {
      setActiveTab('income');
    }
  }

  const fallbackPlanId = costPlans[0]?.id ?? '';
  const planIncomeSources = useMemo(
    () =>
      incomeSources.filter((source) => {
        if (source.cost_plan_id) {
          return source.cost_plan_id === activePlanId;
        }
        return fallbackPlanId && activePlanId === fallbackPlanId;
      }),
    [incomeSources, activePlanId, fallbackPlanId]
  );
  const unassignedIncomeSources = useMemo(
    () => incomeSources.filter((source) => !source.cost_plan_id),
    [incomeSources]
  );

  const isInitialLoading = loading && costPlans.length === 0 && incomeSources.length === 0;

  // Loading and error states
  if (isInitialLoading) {
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
  const totalIncome = planIncomeSources.reduce((sum, source) => sum + source.monthlyAmount, 0);
  
  const totalCosts = costItems.reduce((sum, item) => {
    // Berechne jährliche Kosten und teile durch 12 für monatliche Kosten
    const yearlyItemCost = item.estimated_cost * (item.quantity || 1);
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

  const handleCopyPlan = async (planToCopy: CostPlanWithDetails) => {
    try {
      
      // Erstelle den neuen Plan
      const newPlan = await addCostPlan(`${planToCopy.name} (Kopie)`, planToCopy.description);
      if (!newPlan) {
        console.error('❌ Failed to create new plan');
        return;
      }


      // Kopiere alle Kategorien sequenziell und sammle die Kategorie-Mappings
      const categoryMappings: Array<{oldId: string, newId: string, name: string}> = [];
      
      for (const category of planToCopy.categories) {
        const categorySuccess = await addCostCategory(newPlan.id, category.name, category.color);
        
        if (categorySuccess) {
          categoryMappings.push({
            oldId: category.id,
            newId: '', // Wird später gefüllt
            name: category.name
          });
        } else {
          console.error('❌ Failed to create category:', category.name);
        }
      }


      // Lade den neuen Plan direkt aus der Datenbank statt auf State zu warten
      
      // Import der Service-Funktion wenn nicht schon vorhanden
      const { getCostPlanWithDetails } = await import('../../lib/services/costPlanService');
      
      let updatedPlan: CostPlanWithDetails | null = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      // Versuche mehrmals den Plan zu laden
      while (!updatedPlan && attempts < maxAttempts) {
        attempts++;
        
        try {
          if (user?.id) {
            updatedPlan = await getCostPlanWithDetails(newPlan.id, user.id);
            if (updatedPlan) {
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      
      if (updatedPlan) {
        // Mappe die Kategorie-IDs
        for (const mapping of categoryMappings) {
          const newCategory = updatedPlan.categories.find(cat => cat.name === mapping.name);
          if (newCategory) {
            mapping.newId = newCategory.id;
          } else {
            console.error('❌ Could not find new category with name:', mapping.name);
          }
        }

        // Zeige Mapping-Ergebnisse
        // Kopiere alle Kostenpositionen        
        for (const item of planToCopy.costItems) {
          const categoryMapping = categoryMappings.find(m => m.oldId === item.cost_category_id);
          
          if (categoryMapping && categoryMapping.newId) {
            
            const itemSuccess = await addCostItem(newPlan.id, categoryMapping.newId, {
              name: item.name,
              estimated_cost: item.estimated_cost,
              quantity: item.quantity || 1,
              unit: item.unit || 'mal/Jahr',
              priority: item.priority || 'medium',
              notes: item.notes || ''
            });
            
            if (!itemSuccess) {
              console.error('❌ Failed to copy cost item:', item.name);
            }
          } else {
            console.error('❌ No category mapping found for item:', item.name);
            console.error('   Original category ID:', item.cost_category_id);
            console.error('   Available mappings:', categoryMappings.map(m => `${m.name}: ${m.oldId} -> ${m.newId}`));
          }
        }
        
      } else {
        console.error('❌ Could not find updated plan after refresh');
        
        // Versuche es noch einmal mit längerem Warten
        await new Promise(resolve => setTimeout(resolve, 3000));
        await refresh();
        
        const retryPlan = costPlans.find(p => p.id === newPlan.id);
        if (retryPlan) {
          // Hier könntest du den gleichen Code wie oben wiederholen
          // Aber für jetzt beenden wir mit einer Warnung
        } else {
          console.error('💥 Plan still not found after retry. Available plans:', costPlans.map(p => p.name));
        }
      }

      // Finale Datenaktualisierung und Aktivierung des neuen Plans
      await refresh();
      
      // Warte ein bisschen und prüfe ob der Plan jetzt im State ist
      await new Promise(resolve => setTimeout(resolve, 1000));
      const finalPlan = costPlans.find(p => p.id === newPlan.id);
      
      if (finalPlan) {
        setActivePlanId(newPlan.id);
      } else {
        await refresh();
        // Aktiviere trotzdem den Plan, auch wenn er noch nicht im State ist
        setActivePlanId(newPlan.id);
      }
      
      
    } catch (error) {
      console.error('💥 Error copying plan:', error);
    }
  };

  // Category management
  const handleAddCategory = () => {
    setCategoryForm({ id: '', name: '', color: 'blue' });
    setEditingCategory(false);
    setCategoryModalOpened(true);
  };

  const handleEditCategory = (category: typeof categories[0]) => {
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
      if (success) {
        setCategoryModalOpened(false);
        // Nach kurzer Verzögerung zur neuen Kategorie wechseln
        setTimeout(() => {
          const newCategory = categories.find(cat => cat.name === categoryForm.name);
          if (newCategory) {
            setActiveTab(newCategory.id);
          }
        }, 100);
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!activePlanId) return;
    await removeCostCategory(activePlanId, categoryId);
  };

  // Income management
  const handleAddIncome = () => {
    if (!activePlanId) {
      return;
    }
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
    if (!incomeForm.name || incomeForm.amount <= 0 || !incomeForm.cost_plan_id) return;
    
    if (editingIncome) {
      const success = await editIncomeSource(incomeForm.id, incomeForm.cost_plan_id, {
        name: incomeForm.name,
        amount: incomeForm.amount,
        frequency: incomeForm.frequency,
        start_date: incomeForm.start_date,
        end_date: incomeForm.end_date || undefined,
        description: incomeForm.description
      });
      if (success) setIncomeModalOpened(false);
    } else {
      const success = await addIncomeSource(incomeForm.cost_plan_id, {
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

  // Cost Item management
  const handleAddCost = (categoryId?: string) => {
    setCostForm({ 
      id: '', 
      name: '', 
      estimated_cost: 0, 
      frequency_per_year: 1, 
      description: '', 
      priority: 'medium',
      category_id: categoryId || '',
      notes: ''
    });
    setEditingCost(false);
    setCostModalOpened(true);
  };

  const handleEditCost = (item: typeof costItems[0]) => {
    setCostForm({ 
      id: item.id, 
      name: item.name, 
      estimated_cost: item.estimated_cost, 
      frequency_per_year: item.quantity || 1, // Nutze quantity als frequency_per_year für Rückwärtskompatibilität 
      description: item.notes || '', 
      priority: item.priority,
      category_id: item.cost_category_id,
      notes: item.notes || ''
    });
    setEditingCost(true);
    setCostModalOpened(true);
  };

  const handleSaveCost = async () => {
    if (!costForm.name || costForm.estimated_cost <= 0 || !costForm.category_id || !activePlanId) return;
    
    if (editingCost) {
      const success = await editCostItem(activePlanId, costForm.id, {
        name: costForm.name,
        estimated_cost: costForm.estimated_cost,
        quantity: costForm.frequency_per_year, // Speichere frequency_per_year als quantity
        unit: 'mal/Jahr', // Fixe Einheit
        priority: costForm.priority,
        notes: costForm.description || costForm.notes
      });
      if (success) setCostModalOpened(false);
    } else {
      const success = await addCostItem(activePlanId, costForm.category_id, {
        name: costForm.name,
        estimated_cost: costForm.estimated_cost,
        quantity: costForm.frequency_per_year, // Speichere frequency_per_year als quantity
        unit: 'mal/Jahr', // Fixe Einheit
        priority: costForm.priority,
        notes: costForm.description || costForm.notes
      });
      if (success) setCostModalOpened(false);
    }
  };

  const handleDeleteCost = async (itemId: string) => {
    if (!activePlanId) return;
    await removeCostItem(activePlanId, itemId);
  };

  const handleCopyCost = async (itemToCopy: typeof costItems[0]) => {
    if (!activePlanId) return;
    await addCostItem(activePlanId, itemToCopy.cost_category_id, {
      name: `${itemToCopy.name} (Kopie)`,
      estimated_cost: itemToCopy.estimated_cost,
      quantity: itemToCopy.quantity || 1,
      unit: itemToCopy.unit,
      priority: itemToCopy.priority,
      notes: itemToCopy.notes
    });
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
                    <ActionIcon variant="subtle" onClick={() => handleEditPlan(activePlan)} title="Plan bearbeiten">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="blue" onClick={() => handleCopyPlan(activePlan)} title="Plan kopieren">
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeletePlan(activePlan.id)} title="Plan löschen">
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

          <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'income')}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTabDragEnd}
            >
              <Tabs.List>
                {/* Fixed Income Tab */}
                <Tabs.Tab value="income">
                  Einkommen
                </Tabs.Tab>
                
                {/* Sortable Category Tabs */}
                <SortableContext
                  items={sortedCategories.map(category => category.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {sortedCategories.map((category) => (
                    <SortableTab
                      key={category.id}
                      id={category.id}
                      category={category}
                      isActive={activeTab === category.id}
                      onClick={() => setActiveTab(category.id)}
                    />
                  ))}
                </SortableContext>
                
                {/* Fixed Add Category Tab */}
                <Tabs.Tab value="add-category">
                  <IconPlus size={16} />
                </Tabs.Tab>
              </Tabs.List>
            </DndContext>

            {/* Income Tab */}
            <Tabs.Panel value="income" pt="md">
              <Card>
                <Group justify="space-between" mb="md" align="center">
                  <Title order={3}>Einkommensquellen</Title>
                  <Group gap="sm">
                    {refreshing ? (
                      <Badge color="blue" variant="light">
                        Aktualisiere...
                      </Badge>
                    ) : null}
                    <Button leftSection={<IconPlus size={16} />} onClick={handleAddIncome} disabled={!activePlanId}>
                      Neue Einkommensquelle
                    </Button>
                  </Group>
                </Group>
                
                {planIncomeSources.length === 0 ? (
                  <Stack gap="xs" align="center" py="lg">
                    <Text ta="center" c="dimmed">Noch keine Einkommensquellen vorhanden</Text>
                    {unassignedIncomeSources.length > 0 && activePlanId !== fallbackPlanId ? (
                      <Text size="sm" c="dimmed" ta="center">
                        {unassignedIncomeSources.length} Einnahme{unassignedIncomeSources.length === 1 ? '' : 'n'} sind noch keinem Plan zugeordnet.
                        Weise sie beim Bearbeiten einem Plan zu, damit sie hier erscheinen.
                      </Text>
                    ) : null}
                  </Stack>
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
                      {planIncomeSources.map((source) => (
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

            {/* Dynamic Category Tabs */}
            {sortedCategories.map((category) => {
              const categoryItems = costItems.filter(item => item.cost_category_id === category.id);
              const categoryTotal = categoryItems.reduce((sum, item) => {
                const yearlyItemCost = item.estimated_cost * (item.quantity || 1);
                const monthlyItemCost = yearlyItemCost / 12;
                return sum + monthlyItemCost;
              }, 0);
              
              return (
                <Tabs.Panel key={category.id} value={category.id} pt="md">
                  <Card>
                    <Group justify="space-between" mb="md">
                      <Group>
                        <Title order={3}>{category.name}</Title>
                        <Badge color={category.color}>
                          {categoryItems.length} Positionen • {categoryTotal.toFixed(2)} €/Monat
                        </Badge>
                      </Group>
                      <Group>
                        <Button leftSection={<IconPlus size={16} />} onClick={() => handleAddCost(category.id)}>
                          Neue Position
                        </Button>
                        <ActionIcon variant="subtle" onClick={() => handleEditCategory(category)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteCategory(category.id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                    
                    {categoryItems.length === 0 ? (
                      <Text ta="center" c="dimmed" py="xl">
                        Noch keine Kostenpositionen in dieser Kategorie.
                        <br />
                        <Button variant="light" onClick={() => handleAddCost(category.id)} mt="md">
                          Erste Position hinzufügen
                        </Button>
                      </Text>
                    ) : (
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Kosten/Jahr</Table.Th>
                            <Table.Th>Häufigkeit</Table.Th>
                            <Table.Th>Monatlich</Table.Th>
                            <Table.Th>Aktionen</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {categoryItems.map((item) => {
                            const yearlyItemCost = item.estimated_cost * (item.quantity || 1);
                            const monthlyItemCost = yearlyItemCost / 12;
                            return (
                              <Table.Tr key={item.id}>
                                <Table.Td>
                                  <div>
                                    <Text fw={500}>{item.name}</Text>
                                    {item.notes && (
                                      <Text size="sm" c="dimmed">{item.notes}</Text>
                                    )}
                                  </div>
                                </Table.Td>
                                <Table.Td>{yearlyItemCost.toFixed(2)} €</Table.Td>
                                <Table.Td>{item.quantity || 1}x pro Jahr</Table.Td>
                                <Table.Td>
                                  <Text fw={500}>
                                    {monthlyItemCost.toFixed(2)} €
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="sm">
                                    <ActionIcon variant="subtle" size="sm" onClick={() => handleEditCost(item)} title="Bearbeiten">
                                      <IconEdit size={14} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => handleCopyCost(item)} title="Kopieren">
                                      <IconCopy size={14} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteCost(item.id)} title="Löschen">
                                      <IconTrash size={14} />
                                    </ActionIcon>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Card>
                </Tabs.Panel>
              );
            })}

            {/* Add Category Tab */}
            <Tabs.Panel value="add-category" pt="md">
              <Card>
                <Stack align="center" py="xl">
                  <IconCategory size={48} style={{ opacity: 0.5 }} />
                  <Title order={3} ta="center">Neue Kategorie erstellen</Title>
                  <Text ta="center" c="dimmed">
                    Erstellen Sie eine neue Kategorie, um Ihre Kosten zu organisieren.
                  </Text>
                  <Button leftSection={<IconPlus size={16} />} onClick={handleAddCategory}>
                    Kategorie erstellen
                  </Button>
                </Stack>
              </Card>
            </Tabs.Panel>
          </Tabs>
        </>
      )}

      {/* Plan Modal */}
      <Modal 
        opened={planModalOpened} 
        onClose={() => setPlanModalOpened(false)} 
        title={editingPlan ? "Plan bearbeiten" : "Neuer Plan"}
        size="md"
        centered
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="z.B. Familienbudget 2025, Jahresplanung"
            value={planForm.name}
            onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
            required
            withAsterisk
          />
          <TextInput
            label="Beschreibung (optional)"
            placeholder="Kurze Beschreibung des Plans"
            value={planForm.description}
            onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setPlanModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSavePlan} disabled={!planForm.name}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Category Modal */}
      <Modal 
        opened={categoryModalOpened} 
        onClose={() => setCategoryModalOpened(false)} 
        title={editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
        size="md"
        centered
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="z.B. Lebensmittel, Transport, Unterhaltung"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
            required
            withAsterisk
          />
          <Select
            label="Farbe"
            value={categoryForm.color}
            onChange={(value) => setCategoryForm(prev => ({ ...prev, color: value || 'blue' }))}
            data={colorOptions}
            required
            withAsterisk
            description="Wählen Sie eine Farbe zur besseren Unterscheidung"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setCategoryModalOpened(false)}>Abbrechen</Button>
            <Button onClick={handleSaveCategory} disabled={!categoryForm.name}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Income Modal */}
      <Modal 
        opened={incomeModalOpened} 
        onClose={() => setIncomeModalOpened(false)} 
        title={editingIncome ? "Einkommensquelle bearbeiten" : "Neue Einkommensquelle"}
        size="md"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="z.B. Gehalt, Nebenjob, Rente"
            value={incomeForm.name}
            onChange={(e) => setIncomeForm(prev => ({ ...prev, name: e.target.value }))}
            required
            withAsterisk
          />
          
          <NumberInput
            label="Betrag"
            placeholder="Betrag in Euro"
            value={incomeForm.amount}
            onChange={(value) => setIncomeForm(prev => ({ ...prev, amount: Number(value) || 0 }))}
            min={0}
            step={0.01}
            decimalScale={2}
            required
            withAsterisk
            rightSection="€"
          />
          
          <Select
            label="Häufigkeit"
            value={incomeForm.frequency}
            onChange={(value) => setIncomeForm(prev => ({ ...prev, frequency: (value as 'weekly' | 'monthly' | 'yearly' | 'one-time') || 'monthly' }))}
            data={frequencyOptions}
            required
            withAsterisk
            description="Wie oft erhalten Sie dieses Einkommen?"
          />
          
          <Select
            label="Plan"
            value={incomeForm.cost_plan_id}
            onChange={(value) => setIncomeForm(prev => ({ ...prev, cost_plan_id: value || '' }))}
            data={costPlans.map(plan => ({ value: plan.id, label: plan.name }))}
            required
            withAsterisk
            description="Welchem Kostenplan soll dieses Einkommen zugeordnet werden?"
          />
          
          <TextInput
            label="Startdatum"
            type="date"
            value={incomeForm.start_date}
            onChange={(e) => setIncomeForm(prev => ({ ...prev, start_date: e.target.value }))}
            required
            withAsterisk
            description="Ab wann ist dieses Einkommen gültig?"
          />
          
          <TextInput
            label="Enddatum (optional)"
            type="date"
            value={incomeForm.end_date}
            onChange={(e) => setIncomeForm(prev => ({ ...prev, end_date: e.target.value }))}
            placeholder="tt.mm.jjjj"
            description="Lassen Sie dieses Feld leer, wenn das Einkommen unbefristet ist"
          />
          
          <TextInput
            label="Beschreibung (optional)"
            placeholder="Zusätzliche Informationen zu dieser Einkommensquelle"
            value={incomeForm.description}
            onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
          />
          
          {/* Einkommensvorschau */}
          {incomeForm.amount > 0 && (
            <Card withBorder p="md" bg="blue.0" style={{ borderColor: 'var(--mantine-color-blue-3)' }}>
              <Text size="sm" fw={600} c="blue.8" mb="sm">Einkommensvorschau:</Text>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Eingegeben:</Text>
                  <Text fw={600} c="blue.7" size="md">
                    {incomeForm.amount.toFixed(2)} € {
                      incomeForm.frequency === 'weekly' ? 'pro Woche' :
                      incomeForm.frequency === 'monthly' ? 'pro Monat' :
                      incomeForm.frequency === 'yearly' ? 'pro Jahr' : 'einmalig'
                    }
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Monatlich:</Text>
                  <Text fw={700} c="blue.8" size="lg">
                    {(() => {
                      switch (incomeForm.frequency) {
                        case 'weekly': return (incomeForm.amount * 52 / 12).toFixed(2);
                        case 'monthly': return incomeForm.amount.toFixed(2);
                        case 'yearly': return (incomeForm.amount / 12).toFixed(2);
                        case 'one-time': return (incomeForm.amount / 12).toFixed(2);
                        default: return incomeForm.amount.toFixed(2);
                      }
                    })()} €
                  </Text>
                </Group>
              </Stack>
            </Card>
          )}
          
          <Group justify="flex-end" mt="lg">
            <Button variant="light" onClick={() => setIncomeModalOpened(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveIncome} disabled={!incomeForm.name || incomeForm.amount <= 0 || !incomeForm.cost_plan_id}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Cost Item Modal */}
      <Modal 
        opened={costModalOpened} 
        onClose={() => setCostModalOpened(false)} 
        title={editingCost ? "Kostenposition bearbeiten" : "Neue Kostenposition"}
        size="md"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="z.B. Netflix, Versicherung, Miete"
            value={costForm.name}
            onChange={(e) => setCostForm(prev => ({ ...prev, name: e.target.value }))}
            required
            withAsterisk
          />
          
          <NumberInput
            label="Kosten pro Vorgang"
            placeholder="Betrag in Euro"
            value={costForm.estimated_cost}
            onChange={(value) => setCostForm(prev => ({ ...prev, estimated_cost: Number(value) || 0 }))}
            min={0}
            step={0.01}
            decimalScale={2}
            required
            withAsterisk
            rightSection="€"
          />
          
          <NumberInput
            label="Häufigkeit pro Jahr"
            placeholder="Anzahl"
            value={costForm.frequency_per_year}
            onChange={(value) => setCostForm(prev => ({ ...prev, frequency_per_year: Number(value) || 1 }))}
            min={1}
            max={365}
            required
            withAsterisk
            description="z.B. 12 für monatlich, 4 für quartalsweise, 1 für jährlich"
            hideControls={true}
          />
          
          <Select
            label="Kategorie"
            value={costForm.category_id}
            onChange={(value) => setCostForm(prev => ({ ...prev, category_id: value || '' }))}
            data={sortedCategories.map(cat => ({ value: cat.id, label: cat.name }))}
            required
            withAsterisk
            placeholder="Kategorie auswählen"
          />
          
          <TextInput
            label="Beschreibung (optional)"
            placeholder="Zusätzliche Informationen zu dieser Kostenstelle"
            value={costForm.description}
            onChange={(e) => setCostForm(prev => ({ ...prev, description: e.target.value }))}
          />
          
          {/* Kostenvorschau */}
          {costForm.estimated_cost > 0 && costForm.frequency_per_year > 0 && (
            <Card withBorder p="md" bg="red.0" style={{ borderColor: 'var(--mantine-color-red-3)' }}>
              <Text size="sm" fw={600} c="red.8" mb="sm">Kostenvorschau:</Text>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Kosten pro Jahr:</Text>
                  <Text fw={600} c="red.7" size="md">
                    {(costForm.estimated_cost * costForm.frequency_per_year).toFixed(2)} €
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Kosten pro Monat:</Text>
                  <Text fw={700} c="red.8" size="lg">
                    {((costForm.estimated_cost * costForm.frequency_per_year) / 12).toFixed(2)} €
                  </Text>
                </Group>
              </Stack>
            </Card>
          )}
          
          <Group justify="flex-end" mt="lg">
            <Button variant="light" onClick={() => setCostModalOpened(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSaveCost}
              disabled={!costForm.name || costForm.estimated_cost <= 0 || !costForm.category_id}
            >
              Speichern
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}


