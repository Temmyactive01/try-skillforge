-- Add 'cancelled' to the assignment_status enum so cancelled assignments stay on record and can be restored by an admin.
ALTER TYPE public.assignment_status ADD VALUE IF NOT EXISTS 'cancelled';