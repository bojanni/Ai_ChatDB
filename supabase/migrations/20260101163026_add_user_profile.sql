/*
  # Add User Profile Table

  1. New Tables
    - `user_profile`
      - `id` (uuid, primary key) - Profile identifier
      - `name` (text) - User's full name
      - `address` (text) - Street address
      - `city` (text) - City name
      - `country` (text) - Country name
      - `postal_code` (text) - Postal/ZIP code
      - `phone` (text) - Phone number
      - `email` (text) - Email address
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `user_profile` table
    - Add policy for anyone to read and update the single profile record
    
  3. Notes
    - This table stores a single user profile for the application
    - No authentication required as this is a personal knowledge base
*/

CREATE TABLE IF NOT EXISTS user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  country text DEFAULT '',
  postal_code text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to user profile"
  ON user_profile
  FOR ALL
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_profile LIMIT 1) THEN
    INSERT INTO user_profile (id) VALUES (gen_random_uuid());
  END IF;
END $$;
