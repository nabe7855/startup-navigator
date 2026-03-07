-- 日ごとのアドバイザーシフト用テーブル
create table if not exists public.advisor_daily_schedules (
    id uuid default gen_random_uuid() primary key,
    advisor_id uuid references public.profiles(id) on delete cascade not null,
    date date not null,
    start_time time not null,
    end_time time not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(advisor_id, date)
);

-- RLS (Row Level Security) の有効化
alter table public.advisor_daily_schedules enable row level security;

-- 全員（匿名ユーザーまたはログインユーザー）がシフトを参照可能
create policy "Anyone can select advisor daily schedules"
on public.advisor_daily_schedules for select
using (true);

-- アドバイザー本人のみが自分のシフトを登録・更新・削除可能
create policy "Advisors can insert their own schedules"
on public.advisor_daily_schedules for insert
with check ( auth.uid() = advisor_id );

create policy "Advisors can update their own schedules"
on public.advisor_daily_schedules for update
using ( auth.uid() = advisor_id );

create policy "Advisors can delete their own schedules"
on public.advisor_daily_schedules for delete
using ( auth.uid() = advisor_id );
