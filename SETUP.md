# Finanzenapp - Setup Anleitung

## Datenbank bereits eingerichtet ✅

Die Datenbank ist bereits vollständig eingerichtet mit folgenden Tabellen:
- `finanzen_transaction_categories` - Kategorien für Transaktionen  
- `finanzen_budgets` - Budgets mit Carryover-Funktionalität
- `finanzen_transactions` - Alle Einnahmen und Ausgaben
- `finanzen_cost_plans` - Kostenpläne für verschiedene Szenarien
- `finanzen_cost_categories` - Kategorien innerhalb eines Kostenplans
- `finanzen_cost_items` - Einzelne Kostenpunkte in einer Kategorie
- `finanzen_income_sources` - Einkommensquellen (Gehalt, etc.)
- `finanzen_budget_resets` - Historie der Budget-Resets

## Next.js App bereits implementiert ✅

Die Finanzenapp ist bereits vollständig implementiert mit:
- ✅ Supabase Client (lib/supabase.ts)
- ✅ TypeScript Types (lib/types.ts) 
- ✅ Authentication Context (contexts/AuthContext.tsx)
- ✅ Login/Register Components (components/auth/)
- ✅ Protected Routes mit Login-Schutz
- ✅ Header mit User-Menu
- ✅ Mobile-responsive Design

## Nächste Schritte

### 1. Environment Variables setzen

Du musst nur noch deine Supabase-Credentials in einer `.env.local` Datei setzen:

```bash
# Erstelle .env.local basierend auf .env.example
cp .env.example .env.local
```

Dann fülle die Werte aus:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. App starten

```bash
npm run dev
```

Die App läuft dann auf http://localhost:3000

### 3. Erste Schritte in der App

1. **Registrierung**: Gehe zu `/auth` und erstelle einen Account
2. **Automatische Setup**: Beim ersten Login werden automatisch 8 Standard-Kategorien erstellt
3. **Erste Transaktion**: Füge deine erste Einnahme/Ausgabe hinzu
4. **Budget erstellen**: Setze dein erstes Budget in der Budget-Sektion

## Features

### ✅ Bereits implementiert:
- **Authentifizierung**: Login/Register mit Supabase Auth
- **Geschützte Routen**: Nur angemeldete User können die App nutzen
- **Auto-Setup**: Standard-Kategorien werden automatisch erstellt
- **Mobile-First**: Responsive Design für alle Geräte
- **PWA-Ready**: App funktioniert auch offline (teilweise)

### 🚧 Nächste Implementierung:
- **Echte Datenbank-Integration**: CRUD-Operationen für Transaktionen
- **Budget-Management**: Erstellen und verwalten von Budgets
- **Dashboard mit echten Daten**: Live-Statistiken aus der Datenbank
- **Kategorien-Management**: Eigene Kategorien hinzufügen/bearbeiten
- **Import/Export**: CSV-Import für bestehende Daten

## Datenbank Features

- **Row Level Security (RLS)**: Jeder User sieht nur seine eigenen Daten
- **Automatische Triggers**: Budget-Synchronisation bei Transaktionen
- **Views für Analytics**: Monatsübersichten und Budget-Auslastung
- **Carryover-System**: Nicht verbrauchtes Budget wird übertragen
- **Kostenplanung**: Plane größere Anschaffungen im Voraus

Die Datenbank ist production-ready und vollständig konfiguriert!