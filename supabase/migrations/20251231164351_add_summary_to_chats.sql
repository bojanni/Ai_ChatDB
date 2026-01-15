/*
  # Add Summary Field to Chats

  1. Changes
    - Add `summary` column to `chats` table to store AI-generated summaries
    - Column is optional (nullable) since existing chats won't have summaries

  2. Notes
    - Existing chats will have NULL summaries until users generate them
    - Summary can be regenerated at any time
*/

-- Add summary column to chats table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'summary'
  ) THEN
    ALTER TABLE chats ADD COLUMN summary text;
  END IF;
END $$;