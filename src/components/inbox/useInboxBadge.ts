"use client";

import { useAuth } from "@/hooks/useAuth";
import { useInbox } from "./InboxProvider";

/** Number shown on the bell and the inbox menu item: requests waiting for this account + unread notifications. */
export function useInboxBadge() {
  const { user } = useAuth();
  const { count } = useInbox();
  return { available: Boolean(user), count };
}
