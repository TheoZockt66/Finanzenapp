#  Haushaltsbuch - Personal Finance Manager

Eine moderne, benutzerfreundliche Haushaltsbudget-Anwendung, entwickelt mit Next.js 15 und Mantine v7.

##  Funktionen

###  Dashboard
- Übersicht über finanzielle Kennzahlen
- Schnellzugriff auf alle Hauptfunktionen
- Moderne glassmorphe Benutzeroberfläche

###  Budget-Verwaltung
- Erstellen und verwalten mehrerer Budgets
- Farbcodierte Fortschrittsanzeige
- Automatische Zurücksetzung nach konfigurierten Zeiträumen
- Detaillierte Ausgabenverfolgung

###  Transaktionen
- Vollständige CRUD-Operationen für Transaktionen
- Kategorisierung mit farbkodierten Labels
- Budget-Zuordnung für bessere Übersicht
- Deutsche Datumsformatierung
- Suchfunktion und Filteroptionen

###  Kostenübersicht
- Multi-Plan-System (Hauptplan, Optimistisch, Pessimistisch)
- Dynamische Kategorien mit Farbkodierung
- Einnahmen- und Ausgabenverfolgung
- Monatliche Berechnungen und Gewinn-/Verlust-Analyse
- Frequenz-basierte Kostenverwaltung

###  Konto-Einstellungen
- Umfassende Benutzerprofilierung
- Benachrichtigungseinstellungen
- Theme-Anpassung (Hell/Dunkel)
- Datenexport und -import
- Sicherheitseinstellungen

##  Technologie-Stack

- **Framework**: Next.js 15.5.3 mit App Router
- **UI-Bibliothek**: Mantine v7.13.2
- **Sprache**: TypeScript
- **Datum-Handling**: dayjs v1.11.18 mit deutscher Lokalisierung
- **Icons**: @tabler/icons-react v3.35.0
- **Styling**: Mantine CSS-in-JS mit glassmorphen Effekten

##  Installation & Setup

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn

### Schritt-für-Schritt Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd haushaltsbuch
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

4. **Anwendung öffnen**
   Öffnen Sie [http://localhost:3000](http://localhost:3000) in Ihrem Browser

##  Projektstruktur

```
haushaltsbuch/
 app/                    # Next.js App Router
    layout.tsx         # Root Layout mit Mantine Provider
    page.tsx          # Dashboard-Startseite
    budget/           # Budget-Verwaltung
    transactions/     # Transaktions-Management
    costs/           # Kostenübersicht
    account/         # Benutzereinstellungen
 components/
    layout/
        Header.tsx    # Glassmorphe Navigation
 package.json
 README.md
```

##  Design-Prinzipien

### Glassmorphismus
- Moderne, transparente UI-Elemente
- Backdrop-Filter für Tiefeneffekte
- Subtile Schatten und Übergänge

### Responsive Design
- Mobile-first Ansatz
- Adaptive Layouts für alle Bildschirmgrößen
- Touch-optimierte Interaktionen

### Deutsche Lokalisierung
- Vollständig deutsche Benutzeroberfläche
- Lokalisierte Datumsformate
- Deutsche Währungsformatierung

##  Hauptkomponenten

### Dashboard (`app/page.tsx`)
Zentrale Übersicht mit finanziellen Kennzahlen in einer modernen Card-basierten Darstellung.

### Budget-Verwaltung (`app/budget/page.tsx`)
Vollständiges CRUD-System für Budgets mit:
- Fortschrittsbalken mit dynamischer Farbkodierung
- Konfigurierbare Zurücksetzungsintervalle
- Detaillierte Ausgabenverfolgung

### Transaktions-Management (`app/transactions/page.tsx`)
Umfassendes System zur Verwaltung von Einnahmen und Ausgaben:
- DateInput mit deutscher Lokalisierung
- Kategorisierung und Budget-Zuordnung
- Suchbare und sortierbare Tabellendarstellung

### Kostenübersicht (`app/costs/page.tsx`)
Multi-Plan-System für verschiedene Finanzszenarien:
- Dynamische Kategorieerstellung
- Frequenz-basierte Berechnungen
- Plan-Vergleichsfunktionen

### Konto-Einstellungen (`app/account/page.tsx`)
Umfassende Benutzerverwaltung mit Tabs für:
- Profilverwaltung
- Benachrichtigungseinstellungen
- Theme-Anpassung
- Datenmanagement
- Sicherheitsoptionen

##  Verfügbare Scripts

- `npm run dev` - Entwicklungsserver starten
- `npm run build` - Produktions-Build erstellen
- `npm run start` - Produktionsserver starten
- `npm run lint` - ESLint-Prüfung ausführen

##  Entwicklung

### Code-Stil
- TypeScript für Typsicherheit
- ESLint für Code-Qualität
- Funktionale React-Komponenten mit Hooks
- Konsistente Komponentenstruktur

### State Management
- Lokaler State mit React Hooks
- Mantine-eigene Form-Hooks
- Keine externen State-Management-Bibliotheken erforderlich

##  Lizenz

Dieses Projekt ist für den persönlichen Gebrauch entwickelt.

##  Danksagungen

- [Next.js](https://nextjs.org/) für das großartige React-Framework
- [Mantine](https://mantine.dev/) für die umfassende UI-Komponentenbibliothek
- [Tabler Icons](https://tabler-icons.io/) für die schönen Icons
- [dayjs](https://day.js.org/) für die Datums-Manipulation

---

**Entwickelt mit  für bessere Finanzverwaltung**
