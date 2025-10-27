-- Migration: Rename allow_guest_editing to allow_guest_price_edit
-- This updates the column name to match the new permission structure

-- First, check if old column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'allow_guest_editing'
    ) THEN
        -- Rename the column
        ALTER TABLE events RENAME COLUMN allow_guest_editing TO allow_guest_price_edit;
        RAISE NOTICE 'Column renamed successfully: allow_guest_editing -> allow_guest_price_edit';
    ELSE
        RAISE NOTICE 'Column allow_guest_editing does not exist - migration may already be applied';
    END IF;
END $$;

-- Verify the result
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name LIKE '%guest%edit%'
ORDER BY column_name;
