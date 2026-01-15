/*
  # Add Anonymous Access Policies
  
  1. Changes
    - Add RLS policies to allow anonymous users to read, insert, update, and delete chats and messages
    - This enables the app to work without authentication for demo purposes
    
  2. Security Notes
    - Anonymous users can manage all data (suitable for single-user or demo apps)
    - For production multi-user apps, authentication should be implemented
*/

-- RLS Policies for chats table (anonymous access)
CREATE POLICY "Anonymous users can view chats"
  ON chats FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can insert chats"
  ON chats FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update chats"
  ON chats FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete chats"
  ON chats FOR DELETE
  TO anon
  USING (true);

-- RLS Policies for messages table (anonymous access)
CREATE POLICY "Anonymous users can view messages"
  ON messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can insert messages"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update messages"
  ON messages FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete messages"
  ON messages FOR DELETE
  TO anon
  USING (true);

-- Make user_id nullable and optional since we're allowing anonymous access
ALTER TABLE chats ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE chats ALTER COLUMN user_id DROP DEFAULT;