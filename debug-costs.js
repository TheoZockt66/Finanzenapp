// Debug-Script fÃ¼r Kostenberechnung in der Finanzenapp
async function debugCostCalculation(supabase) {
  try {
    console.log('ðŸ” Debug: Kostenberechnung analysieren...\n');
    
    // Bekannte User-ID aus den Daten
    const userId = "919226ed-717c-4fc1-8fc5-f8d4a3c5764b";
    console.log(`ðŸŽ¯ Analysiere Daten fÃ¼r User-ID: ${userId}\n`);
    
    // PrÃ¼fe direkt die Kostenpositionen ohne KostenplÃ¤ne
    console.log('ðŸ” PrÃ¼fe alle Kostenpositionen direkt...');
    const { data: allCostItems, error: allItemsError } = await supabase
      .from('finanzen_cost_items')
      .select(`
        *,
        finanzen_cost_categories (
          id,
          name,
          color
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (allItemsError) {
      console.error('âŒ Fehler beim Laden der Kostenpositionen:', allItemsError.message);
    } else {
      console.log(`âœ… Gefunden: ${allCostItems.length} Kostenpositionen`);
      
      if (allCostItems.length > 0) {
        console.log('\nðŸ“Š Kostenpositionen-Analyse:');
        console.log('=' .repeat(100));
        console.log('Name'.padEnd(25) + 'Kosten'.padEnd(12) + 'Menge'.padEnd(8) + 'Jahr'.padEnd(12) + 'Monat'.padEnd(12) + 'Plan-ID'.padEnd(20) + 'Kategorie-ID');
        console.log('-'.repeat(100));
        
        let totalYearly = 0;
        let totalMonthly = 0;
        const planGroups = new Map();
        
        allCostItems.forEach((item, index) => {
          const cost = parseFloat(item.estimated_cost) || 0;
          const quantity = parseInt(item.quantity) || 1;
          const yearlyItemCost = cost * quantity;
          const monthlyItemCost = yearlyItemCost / 12;
          
          totalYearly += yearlyItemCost;
          totalMonthly += monthlyItemCost;
          
          // Gruppiere nach Plan-ID
          if (!planGroups.has(item.cost_plan_id)) {
            planGroups.set(item.cost_plan_id, []);
          }
          planGroups.get(item.cost_plan_id).push(item);
          
          const categoryName = item.finanzen_cost_categories?.name || 'Unbekannt';
          
          console.log(`${(index + 1 + '. ' + item.name).padEnd(25)}${cost.toFixed(2).padEnd(12)}${quantity.toString().padEnd(8)}${yearlyItemCost.toFixed(2).padEnd(12)}${monthlyItemCost.toFixed(2).padEnd(12)}${item.cost_plan_id.substring(0,8)+'...'.padEnd(20)}${categoryName}`);
        });
        
        console.log('-'.repeat(100));
        console.log(`SUMME:`.padEnd(25) + ''.padEnd(12) + ''.padEnd(8) + `${totalYearly.toFixed(2)}`.padEnd(12) + `${totalMonthly.toFixed(2)}`.padEnd(12));
        console.log('='.repeat(100));
        
        console.log(`\nðŸ’¡ Plan-Gruppierung:`);
        planGroups.forEach((items, planId) => {
          console.log(`   Plan ${planId.substring(0,8)}...: ${items.length} Positionen`);
        });
        
        // Vergleiche mit der UI-Anzeige
        if (Math.abs(totalMonthly - 2183.20) < 0.01) {
          console.log(`\nðŸŽ¯ GEFUNDEN! Diese Kostenpositionen ergeben die 2183.20 â‚¬ in der UI!`);
        } else {
          console.log(`\nðŸ¤” Monatliche Summe: ${totalMonthly.toFixed(2)} â‚¬ != 2183.20 â‚¬ (UI-Anzeige)`);
          console.log(`   Differenz: ${(2183.20 - totalMonthly).toFixed(2)} â‚¬`);
        }
      }
    }
    
    // Hole alle KostenplÃ¤ne fÃ¼r diesen User
    console.log('\nðŸ“‹ Lade alle KostenplÃ¤ne fÃ¼r diesen User...');
    const { data: costPlans, error: plansError } = await supabase
      .from('finanzen_cost_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (plansError) {
      console.error('âŒ Fehler beim Laden der KostenplÃ¤ne:', plansError.message);
      return;
    }
    
    console.log(`âœ… Gefunden: ${costPlans.length} KostenplÃ¤ne`);
    costPlans.forEach((plan, index) => {
      console.log(`  ${index + 1}. ${plan.name} (ID: ${plan.id})`);
    });
    
    // Analysiere jeden Plan
    for (const plan of costPlans) {
      console.log(`\nðŸ”¬ Analysiere Plan: "${plan.name}"`);
      console.log(`ðŸ“… Erstellt: ${plan.created_at}`);
      
      // Hole alle Kostenpositionen fÃ¼r diesen Plan
      const { data: costItems, error: itemsError } = await supabase
        .from('finanzen_cost_items')
        .select(`
          *,
          finanzen_cost_categories (
            id,
            name,
            color
          )
        `)
        .eq('cost_plan_id', plan.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      
      if (itemsError) {
        console.error(`âŒ Fehler beim Laden der Kostenpositionen fÃ¼r Plan "${plan.name}":`, itemsError.message);
        continue;
      }
      
      console.log(`ðŸ“Š Kostenpositionen: ${costItems.length}`);
      
      let totalYearly = 0;
      let totalMonthly = 0;
      
      if (costItems.length === 0) {
        console.log('  ðŸ’­ Keine Kostenpositionen in diesem Plan');
      } else {
        console.log('\n  ðŸ“ Detailanalyse der Kostenpositionen:');
        console.log('  ' + '='.repeat(80));
        console.log('  Name'.padEnd(25) + 'Kosten'.padEnd(12) + 'HÃ¤ufigkeit'.padEnd(12) + 'Jahr'.padEnd(12) + 'Monat'.padEnd(12) + 'Kategorie');
        console.log('  ' + '-'.repeat(80));
        
        costItems.forEach((item, index) => {
          const cost = parseFloat(item.estimated_cost) || 0;
          const quantity = parseInt(item.quantity) || 1;
          const yearlyItemCost = cost * quantity;
          const monthlyItemCost = yearlyItemCost / 12;
          
          totalYearly += yearlyItemCost;
          totalMonthly += monthlyItemCost;
          
          const categoryName = item.finanzen_cost_categories?.name || 'Unbekannt';
          
          console.log(`  ${(index + 1 + '. ' + item.name).padEnd(25)}${cost.toFixed(2).padEnd(12)}${quantity + 'x'.padEnd(12)}${yearlyItemCost.toFixed(2).padEnd(12)}${monthlyItemCost.toFixed(2).padEnd(12)}${categoryName}`);
          
          // ZusÃ¤tzliche Debug-Infos
          if (item.notes) {
            console.log(`    ðŸ’¬ Notiz: ${item.notes}`);
          }
        });
        
        console.log('  ' + '-'.repeat(80));
        console.log(`  SUMME:`.padEnd(25) + ''.padEnd(12) + ''.padEnd(12) + `${totalYearly.toFixed(2)}`.padEnd(12) + `${totalMonthly.toFixed(2)}`.padEnd(12));
        console.log('  ' + '='.repeat(80));
      }
      
      console.log(`\nðŸ’° Plan-Zusammenfassung "${plan.name}":`);
      console.log(`   JÃ¤hrliche Kosten: ${totalYearly.toFixed(2)} â‚¬`);
      console.log(`   Monatliche Kosten: ${totalMonthly.toFixed(2)} â‚¬`);
      
      // Vergleiche mit der UI-Anzeige
      if (Math.abs(totalMonthly - 2183.20) < 0.01) {
        console.log(`   ðŸŽ¯ DIESER PLAN zeigt die 2183.20 â‚¬ in der UI!`);
      }
    }
    
    // Hole auch Einkommensquellen zum Vergleich fÃ¼r diesen User
    console.log(`\nðŸ’µ Einkommensquellen-Analyse fÃ¼r User ${userId}:`);
    const { data: incomeSources, error: incomeError } = await supabase
      .from('finanzen_income_sources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (incomeError) {
      console.error('âŒ Fehler beim Laden der Einkommensquellen:', incomeError.message);
    } else {
      console.log(`ðŸ“Š Einkommensquellen: ${incomeSources.length}`);
      
      let totalMonthlyIncome = 0;
      
      if (incomeSources.length === 0) {
        console.log('  ðŸ’­ Keine Einkommensquellen vorhanden');
      } else {
        console.log('\n  ðŸ“ Detailanalyse der Einkommensquellen:');
        console.log('  ' + '='.repeat(70));
        console.log('  Name'.padEnd(25) + 'Betrag'.padEnd(12) + 'HÃ¤ufigkeit'.padEnd(15) + 'Monatlich');
        console.log('  ' + '-'.repeat(70));
        
        incomeSources.forEach((source, index) => {
          const amount = parseFloat(source.amount) || 0;
          let monthlyAmount = 0;
          
          switch (source.frequency) {
            case 'weekly':
              monthlyAmount = amount * 52 / 12;
              break;
            case 'monthly':
              monthlyAmount = amount;
              break;
            case 'yearly':
              monthlyAmount = amount / 12;
              break;
            case 'one-time':
              monthlyAmount = amount / 12; // Annahme: Ã¼ber ein Jahr verteilt
              break;
            default:
              monthlyAmount = amount;
          }
          
          totalMonthlyIncome += monthlyAmount;
          
          console.log(`  ${(index + 1 + '. ' + source.name).padEnd(25)}${amount.toFixed(2).padEnd(12)}${source.frequency.padEnd(15)}${monthlyAmount.toFixed(2)}`);
        });
        
        console.log('  ' + '-'.repeat(70));
        console.log(`  SUMME:`.padEnd(25) + ''.padEnd(12) + ''.padEnd(15) + `${totalMonthlyIncome.toFixed(2)}`);
        console.log('  ' + '='.repeat(70));
      }
      
      console.log(`\nðŸ’° Einkommen-Zusammenfassung:`);
      console.log(`   Monatliches Einkommen: ${totalMonthlyIncome.toFixed(2)} â‚¬`);
      
      // Vergleiche mit der UI-Anzeige
      if (Math.abs(totalMonthlyIncome - 1094.00) < 0.01) {
        console.log(`   ðŸŽ¯ DIESE SUMME entspricht den 1094.00 â‚¬ in der UI!`);
      }
    }
    
    console.log(`\nðŸ” Fazit:`);
    console.log(`   Die Kostenberechnung basiert auf:`);
    console.log(`   Formel: (Kosten pro Vorgang Ã— HÃ¤ufigkeit pro Jahr) Ã· 12 = Monatliche Kosten`);
    console.log(`   `);
    if (costPlans.length === 0) {
      console.log(`   âš ï¸ PROBLEM: Keine KostenplÃ¤ne in der Datenbank gefunden!`);
      console.log(`   Die UI zeigt aber trotzdem Werte an. MÃ¶gliche Ursachen:`);
      console.log(`   1. Frontend zeigt Demo-/Test-Daten`);
      console.log(`   2. Daten sind in einem anderen User-Account`);
      console.log(`   3. Cache/LocalStorage wird verwendet`);
      console.log(`   4. RLS (Row Level Security) blockiert den Zugriff`);
      
      // Teste RLS
      console.log(`\nðŸ”’ Teste Row Level Security...`);
      
      // Versuche mit Admin-Rechten
      console.log(`   Teste direkten Tabellenzugriff:`);
      
      const { data: directPlans, error: directError } = await supabase
        .from('finanzen_cost_plans')
        .select('id, name, user_id, created_at')
        .limit(10);
        
      if (directError) {
        console.log(`   âŒ Direkter Zugriff fehlgeschlagen: ${directError.message}`);
        if (directError.code === '42P01') {
          console.log(`   ðŸ’¡ Tabelle existiert nicht! Schema muss ausgefÃ¼hrt werden.`);
        }
      } else {
        console.log(`   âœ… Direkter Zugriff erfolgreich: ${directPlans.length} PlÃ¤ne gefunden`);
        directPlans.forEach((plan, index) => {
          console.log(`     ${index + 1}. ${plan.name} (User: ${plan.user_id}, ID: ${plan.id})`);
        });
      }
    } else {
      console.log(`   ÃœberprÃ¼fe in der obigen Tabelle:`);
      console.log(`   1. Sind die KostenbetrÃ¤ge korrekt?`);
      console.log(`   2. Sind die HÃ¤ufigkeiten pro Jahr richtig?`);
      console.log(`   3. Gibt es doppelte EintrÃ¤ge?`);
      console.log(`   4. Sind alle Kostenpositionen relevant?`);
    }
    
  } catch (error) {
    console.error('ðŸ’¥ Fehler bei der Debug-Analyse:', error.message);
  }
}

async function createSupabaseClient() {
  const [{ createClient }, dotenvModule] = await Promise.all([
    import('@supabase/supabase-js'),
    import('dotenv'),
  ]);

  const configureDotenv =
    typeof dotenvModule.config === 'function'
      ? dotenvModule.config
      : typeof dotenvModule.default?.config === 'function'
        ? dotenvModule.default.config
        : null;

  if (configureDotenv) {
    configureDotenv({ path: '.env.local' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase-Credentials nicht gefunden!');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function main() {
  console.log('ðŸš€ Starte Kosten-Debug-Analyse...\n');
  const supabase = await createSupabaseClient();
  await debugCostCalculation(supabase);
}

main().catch((error) => {
  console.error('Fehler bei der Kosten-Debug-Analyse:', error);
  process.exit(1);
});
