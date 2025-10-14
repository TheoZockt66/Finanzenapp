// Test der Supabase-Verbindung fÃ¼r die Finanzenapp

async function testConnection(supabase) {
  try {
    console.log('\nðŸ“¡ Teste allgemeine Verbindung...');
    
    // Test 1: Basis-Verbindung
    const { data, error } = await supabase.from('finanzen_transaction_categories').select('count').limit(1);
    
    if (error) {
      console.log('âš ï¸ Fehler bei Tabellenzugriff:', error.message);
      
      // Falls Tabelle nicht existiert, ist das OK - bedeutet nur dass Schema noch nicht ausgefÃ¼hrt wurde
      if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
        console.log('ðŸ’¡ Finanzen-Tabellen existieren noch nicht - das ist normal wenn das Schema noch nicht ausgefÃ¼hrt wurde');
        
        // Teste Auth-Tabellen (sollten immer existieren)
        console.log('\nðŸ” Teste Auth-System...');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('âŒ Auth-Fehler:', authError.message);
          return false;
        } else {
          console.log('âœ… Auth-System funktioniert');
          console.log('Session:', authData.session ? 'Aktiv' : 'Keine aktive Session (normal)');
          return true;
        }
      } else {
        console.error('âŒ Unbekannter Datenbankfehler:', error);
        return false;
      }
    } else {
      console.log('âœ… Verbindung zu Finanzen-Tabellen erfolgreich');
      console.log('Daten:', data);
      return true;
    }
    
  } catch (error) {
    console.error('âŒ Verbindungsfehler:', error.message);
    return false;
  }
}

async function testDatabaseSchema(supabase) {
  try {
    console.log('\nðŸ“Š PrÃ¼fe Datenbankschema...');
    
    const tables = [
      'finanzen_transaction_categories',
      'finanzen_budgets', 
      'finanzen_transactions',
      'finanzen_cost_plans',
      'finanzen_income_sources'
    ];
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (error) {
          if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
            console.log(`âŒ Tabelle '${table}' existiert nicht`);
          } else {
            console.log(`âš ï¸ Tabelle '${table}': ${error.message}`);
          }
        } else {
          console.log(`âœ… Tabelle '${table}' existiert`);
        }
      } catch (err) {
        console.log(`âŒ Fehler bei Tabelle '${table}': ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('âŒ Schema-PrÃ¼fung fehlgeschlagen:', error.message);
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
    throw new Error('Supabase-Credentials nicht gefunden!');
  }

  return {
    supabase: createClient(supabaseUrl, supabaseKey),
    supabaseUrl,
    supabaseKey,
  };
}

async function main() {
  console.log('ðŸš€ Starte Supabase-Verbindungstest...\n');
  
  const { supabase, supabaseUrl, supabaseKey } = await createSupabaseClient();

  console.log('�Y"- Teste Supabase-Verbindung...');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NICHT GESETZT');

  const connectionOk = await testConnection(supabase);
  
  if (connectionOk) {
    await testDatabaseSchema(supabase);
    
    console.log('\nðŸ“‹ Zusammenfassung:');
    console.log('âœ… Supabase-Verbindung: Funktioniert');
    console.log('âœ… Authentication: VerfÃ¼gbar');
    console.log('ðŸ“„ Schema-Status: Wird getestet...');
    console.log('\nðŸ’¡ NÃ¤chste Schritte:');
    console.log('1. Falls Tabellen fehlen: database-schema-mit-prefix.sql in Supabase ausfÃ¼hren');
    console.log('2. Next.js App starten: npm run dev');
    console.log('3. App im Browser Ã¶ffnen: http://localhost:3000');
    
  } else {
    console.log('\nâŒ Verbindung fehlgeschlagen!');
    console.log('PrÃ¼fe deine Supabase-Credentials.');
  }
}

main().catch((error) => {
  console.error('Fehler beim Supabase-Verbindungstest:', error);
  process.exit(1);
});
