/*
  # Add AI Provider Settings

  1. Changes to Tables
    - `user_profile`
      - Add `ai_provider` (text) - AI provider type: 'openai', 'ollama', or 'lmstudio'
      - Add `ai_endpoint` (text) - Custom endpoint URL for local AI providers
      - Add `ai_model` (text) - Model name to use (e.g., 'gpt-4', 'llama2', etc.)

  2. Notes
    - Default provider is 'openai' for backward compatibility
    - Endpoint is only required for 'ollama' and 'lmstudio' providers
    - Model name allows users to specify which model to use
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'ai_provider'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN ai_provider text DEFAULT 'openai';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'ai_endpoint'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN ai_endpoint text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile' AND column_name = 'ai_model'
  ) THEN
    ALTER TABLE user_profile ADD COLUMN ai_model text DEFAULT 'gpt-4';
  END IF;
END $$;
