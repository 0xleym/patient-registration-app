"use client";

import { useEffect, useCallback } from "react";
import { useDatabase } from "@/lib/database-provider";
import { toast } from "sonner";

type DatabaseSyncOptions = {
  /** Table name to filter sync events for. If not set, syncs on all table events. */
  table?: string;
  /** Callback to run after a successful sync (e.g., reload data). */
  onSync?: () => void | Promise<void>;
};

/**
 * Hook that listens for cross-tab database update events and automatically
 * syncs the local PGlite instance. Consolidates the repeated pattern used
 * across the home, records, and query pages.
 */
export function useDatabaseSync({ table, onSync }: DatabaseSyncOptions = {}) {
  const { syncDatabase, initialized } = useDatabase();

  const handleSync = useCallback(async () => {
    try {
      await syncDatabase();
      await onSync?.();
    } catch (error) {
      console.error("Error during automatic sync:", error);
      toast.error("Sync Failed", {
        description: "Failed to synchronize data. Please refresh the page.",
      });
    }
  }, [syncDatabase, onSync]);

  useEffect(() => {
    if (!initialized) return;

    const handleDatabaseUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventTable = customEvent.detail?.table;

      // Sync if no table filter is set, or if the event matches the filter
      if (!table || eventTable === table || !eventTable) {
        handleSync();
      }
    };

    window.addEventListener("database-updated", handleDatabaseUpdate);

    return () => {
      window.removeEventListener("database-updated", handleDatabaseUpdate);
    };
  }, [initialized, table, handleSync]);

  return { handleSync };
}
