-- Migration: Add payment_method to events table
-- Date: 2025-10-14
-- Description: Adds payment_method column to support 'venue' or 'bank_transfer' payment types

-- Add payment_method column
ALTER TABLE public.events
ADD COLUMN payment_method character varying(20) DEFAULT 'venue' NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.events.payment_method IS 'Payment method: ''venue'' for paying at till, ''bank_transfer'' for bank transfer';

-- Update existing events to have 'venue' as default
UPDATE public.events
SET payment_method = 'venue'
WHERE payment_method IS NULL;

-- Optional: Add check constraint to ensure only valid values
ALTER TABLE public.events
ADD CONSTRAINT events_payment_method_check
CHECK (payment_method IN ('venue', 'bank_transfer'));
