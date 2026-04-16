-- Create profiles table
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  name        text not null,
  phone       text,
  nickname    text,
  wing_brand  text,
  wing_name   text,
  wing_grade  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS 활성화
alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 회원가입 시 자동으로 profiles 행 생성하는 트리거
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
