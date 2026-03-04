"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { toast } from "sonner";
import { BroadcastChannel } from "broadcast-channel";

type Database = any;
type DatabaseContextType = {
  db: Database | null;
  isLoading: boolean;
  isSyncing: boolean;
  executeQuery: (sql: string, params?: any[]) => Promise<any[]>;
  initialized: boolean;
  syncDatabase: () => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isLoading: true,
  isSyncing: false,
  executeQuery: async () => [],
  initialized: false,
  syncDatabase: async () => {},
});

type BroadcastMessage = {
  type: "db-mutation";
  sql: string;
  params: any[];
  detail: {
    table: string;
    action: string;
    timestamp: number;
  };
};

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [channel] = useState(() => new BroadcastChannel("patient-db-channel"));
  const [isSyncing, setIsSyncing] = useState(false);
  const dbRef = useRef<Database | null>(null);
  const initializedRef = useRef(false);

  // syncDatabase is now a simple UI reload trigger.
  // PGlite's IndexedDB is the source of truth — no restore needed.
  const syncDatabase = useCallback(async () => {
    if (!dbRef.current || !initializedRef.current) return;

    try {
      setIsSyncing(true);
      // Dispatch event so UI components re-fetch their data from PGlite
      window.dispatchEvent(
        new CustomEvent("database-updated", {
          detail: { table: "patients", action: "sync", timestamp: Date.now() },
        })
      );
    } catch (error) {
      console.error("Error triggering sync:", error);
      toast.error("Sync Error", {
        description: "Failed to trigger data reload.",
      });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initialize PGlite — it reads from IndexedDB on its own
  useEffect(() => {
    async function initDatabase() {
      try {
        const { PGlite } = await import("@electric-sql/pglite");
        const pglite = new PGlite("idb://patient-db");
        setDb(pglite);
        dbRef.current = pglite;

        await pglite.query(`
          CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            date_of_birth DATE NOT NULL,
            gender TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            medical_history TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Set timezone to the user's local timezone so now(), CURRENT_TIMESTAMP,
        // and interval math all use local time instead of UTC
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await pglite.query(`SET timezone TO '${tz}'`);

        initializedRef.current = true;
        setInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize database:", error);
        toast.error("Database Error", {
          description:
            "Failed to initialize the database. Please refresh the page.",
        });
        setIsLoading(false);
      }
    }

    initDatabase();

    return () => {
      channel.close();
    };
  }, [channel]);

  // Listen for mutations from other tabs and replay them locally
  useEffect(() => {
    channel.onmessage = async (message: BroadcastMessage) => {
      if (message.type === "db-mutation" && dbRef.current && initializedRef.current) {
        try {
          await dbRef.current.query(message.sql, message.params);
          window.dispatchEvent(
            new CustomEvent("database-updated", {
              detail: message.detail,
            })
          );
        } catch (error) {
          console.error("Error replaying mutation from another tab:", error);
        }
      }
    };
  }, [channel]);

  const executeQuery = async (
    sql: string,
    params: any[] = []
  ): Promise<any[]> => {
    if (!dbRef.current) {
      throw new Error("Database not initialized");
    }

    try {
      const result = await dbRef.current.query(sql, params);

      const sqlLower = sql.trim().toLowerCase();
      let actionType = null;

      if (sqlLower.startsWith("insert")) {
        actionType = "insert";
      } else if (sqlLower.startsWith("update")) {
        actionType = "update";
      } else if (sqlLower.startsWith("delete")) {
        actionType = "delete";
      }

      // Broadcast the mutation to other tabs so they can replay it
      if (actionType) {
        const tableMatch = sqlLower.match(
          /into\s+(\w+)|update\s+(\w+)|from\s+(\w+)/
        );
        const tableName = tableMatch
          ? tableMatch[1] || tableMatch[2] || tableMatch[3]
          : "unknown";

        try {
          const message: BroadcastMessage = {
            type: "db-mutation",
            sql,
            params,
            detail: {
              table: tableName,
              action: actionType,
              timestamp: Date.now(),
            },
          };

          channel.postMessage(message);
        } catch (broadcastError) {
          console.error(
            "Failed to broadcast mutation to other tabs:",
            broadcastError
          );
        }
      }

      return result.rows;
    } catch (error) {
      console.error("Query execution error:", error);
      throw error;
    }
  };

  return (
    <DatabaseContext.Provider
      value={{ db, isLoading, isSyncing, executeQuery, initialized, syncDatabase }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export const useDatabase = () => useContext(DatabaseContext);
