-- Add image support to existing Mohammad Baby Shop categories.
-- Run once in Supabase Dashboard > SQL Editor.
alter table public.categories
add column if not exists image_url text;
