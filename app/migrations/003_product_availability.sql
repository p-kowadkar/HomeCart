-- Migration 003: product availability classification
-- Adds availability_breadth + preferred_store_types to scans and list_items so the
-- map can rank stores by product needs (mainstream vs specialty) rather than only cuisine.

alter table public.scans
  add column if not exists availability_breadth text,
  add column if not exists preferred_store_types text[] default '{}';

alter table public.list_items
  add column if not exists availability_breadth text,
  add column if not exists preferred_store_types text[] default '{}';
