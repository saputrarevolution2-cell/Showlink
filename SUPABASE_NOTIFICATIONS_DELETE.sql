-- ShowLink: allow each authenticated user to delete only their own notifications.
-- Run this once in Supabase SQL Editor.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_self_delete ON public.notifications;
CREATE POLICY notifications_self_delete
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
