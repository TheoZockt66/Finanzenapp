-- Entferne die Unique Constraint für Kostenplan-Namen
-- Die ID macht jeden Plan bereits eindeutig, Namen dürfen sich wiederholen

-- Schaue erst, welche Constraints existieren
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'finanzen_cost_plans' 
AND constraint_type = 'UNIQUE';

-- Entferne den Unique Constraint falls vorhanden
-- (Ersetze 'constraint_name' mit dem tatsächlichen Namen aus der obigen Abfrage)
DO $$ 
BEGIN
    -- Versuche den Constraint zu löschen falls er existiert
    BEGIN
        ALTER TABLE finanzen_cost_plans 
        DROP CONSTRAINT IF EXISTS finanzen_cost_plans_user_name_unique;
        RAISE NOTICE 'Unique constraint removed successfully';
    EXCEPTION
        WHEN undefined_object THEN
            RAISE NOTICE 'Constraint does not exist, nothing to remove';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error removing constraint: %', SQLERRM;
    END;
END $$;

-- Verifikation: Prüfe ob der Constraint entfernt wurde
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'finanzen_cost_plans' 
AND constraint_type = 'UNIQUE';

-- Falls der Constraint einen anderen Namen hat, benutze diese Abfrage:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'finanzen_cost_plans'::regclass;