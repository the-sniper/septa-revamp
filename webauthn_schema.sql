-- Enable RLS
alter table if exists public.users enable row level security;
alter table if exists public.authenticators enable row level security;
alter table if exists public.user_secrets enable row level security;

-- Users table (simple, just for linking)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Authenticators table (stores WebAuthn credentials)
create table if not exists public.authenticators (
  credential_id text primary key,
  credential_public_key text not null,
  counter bigint not null,
  credential_device_type text not null,
  credential_backed_up boolean not null,
  transports text[] default null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User Secrets (Encrypted SEPTA credentials)
create table if not exists public.user_secrets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  encrypted_data text not null, -- Stores the JSON string of {username, password}
  iv text not null, -- Initialization vector for decryption
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Policies (Open for now as this is a personal app, but good practice)
create policy "Allow public access for demo" on public.users for all using (true);
create policy "Allow public access for demo" on public.authenticators for all using (true);
create policy "Allow public access for demo" on public.user_secrets for all using (true);
