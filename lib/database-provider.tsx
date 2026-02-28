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
  executeQuery: (sql: string, params?: any[]) => Promise<any[]>;
  initialized: boolean;
  syncDatabase: () => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isLoading: true,
  executeQuery: async () => [],
  initialized: false,
  syncDatabase: async () => {},
});

const DB_DUMP_KEY = "patient_db_dump";
const DB_DUMP_TIMESTAMP_KEY = "patient_db_dump_timestamp";
const DB_LAST_ID_KEY = "patient_db_last_id";

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [channel] = useState(() => new BroadcastChannel("patient-db-channel"));
  const dbRef = useRef<Database | null>(null);
  const initializedRef = useRef(false);

  const dumpDatabase = async () => {
    if (!dbRef.current) return;

    const patients = await dbRef.current.query("SELECT * FROM patients");

    const maxId = patients.rows.reduce((max: number, patient: any) => {
      return Math.max(max, parseInt(patient.id, 10));
    }, 0);

    localStorage.setItem(DB_DUMP_KEY, JSON.stringify(patients.rows));
    localStorage.setItem(DB_DUMP_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(DB_LAST_ID_KEY, maxId.toString());
  };

  const restoreDatabase = async () => {
    if (!dbRef.current) return false;

    try {
      const dumpStr = localStorage.getItem(DB_DUMP_KEY);
      const lastIdStr = localStorage.getItem(DB_LAST_ID_KEY);

      if (!dumpStr || !lastIdStr) {
        console.log("Missing localStorage data, cannot restore database");
        return false;
      }

      let patients;
      try {
        patients = JSON.parse(dumpStr);
      } catch (parseError) {
        console.error("Error parsing localStorage data:", parseError);
        localStorage.removeItem(DB_DUMP_KEY);
        localStorage.removeItem(DB_DUMP_TIMESTAMP_KEY);
        localStorage.removeItem(DB_LAST_ID_KEY);
        return false;
      }

      await dbRef.current.query("BEGIN");

      try {
        await dbRef.current.query("DELETE FROM patients");

        for (const patient of patients) {
          await dbRef.current.query(
            `INSERT INTO patients (
              id, first_name, last_name, date_of_birth, gender, 
              email, phone, address, medical_history, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING`,
            [
              patient.id,
              patient.first_name,
              patient.last_name,
              patient.date_of_birth,
              patient.gender,
              patient.email,
              patient.phone,
              patient.address,
              patient.medical_history,
              patient.created_at,
            ]
          );
        }

        const lastId = lastIdStr || "0";
        const nextId = parseInt(lastId, 10) + 1;

        await dbRef.current.query(
          `SELECT setval('patients_id_seq', $1, false)`,
          [nextId]
        );

        await dbRef.current.query("COMMIT");
      } catch (txError) {
        await dbRef.current.query("ROLLBACK");
        throw txError;
      }

      return true;
    } catch (error) {
      console.error("Error restoring database:", error);
      return false;
    }
  };

  const syncDatabase = useCallback(async () => {
    if (!dbRef.current || !initializedRef.current) return;

    try {
      setIsLoading(true);

      const lastDumpTimestamp = localStorage.getItem(DB_DUMP_TIMESTAMP_KEY);

      if (lastDumpTimestamp) {
        const success = await restoreDatabase();
        if (success) {
          toast.success("Database Synced", {
            description: "Patient data has been synchronized with other tabs.",
          });
        }
      } else {
        await ensureLocalStorageData();
        await restoreDatabase();
      }
    } catch (error) {
      console.error("Error syncing database:", error);
      toast.error("Sync Error", {
        description: "Failed to synchronize database with other tabs.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureLocalStorageData = async () => {
    if (!dbRef.current) return;

    try {
      const dumpExists = localStorage.getItem(DB_DUMP_KEY);
      const timestampExists = localStorage.getItem(DB_DUMP_TIMESTAMP_KEY);
      const lastIdExists = localStorage.getItem(DB_LAST_ID_KEY);

      if (!dumpExists || !timestampExists || !lastIdExists) {
        const patients = await dbRef.current.query("SELECT * FROM patients");

        if (patients.rows.length > 0) {
          const maxId = patients.rows.reduce((max: number, patient: any) => {
            return Math.max(max, parseInt(patient.id));
          }, 0);

          localStorage.setItem(DB_DUMP_KEY, JSON.stringify(patients.rows));
          localStorage.setItem(DB_DUMP_TIMESTAMP_KEY, Date.now().toString());
          localStorage.setItem(DB_LAST_ID_KEY, maxId.toString());
        } else {
          console.log(
            "No patients in database, initializing empty localStorage"
          );
          localStorage.setItem(DB_DUMP_KEY, JSON.stringify([]));
          localStorage.setItem(DB_DUMP_TIMESTAMP_KEY, Date.now().toString());
          localStorage.setItem(DB_LAST_ID_KEY, "0");
        }
      }
    } catch (error) {
      console.error("Error ensuring localStorage data:", error);
    }
  };

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

        await restoreDatabase();
        await ensureLocalStorageData();

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

  useEffect(() => {
    channel.onmessage = async (message) => {
      if (message.type === "db-updated") {
        setTimeout(async () => {
          await syncDatabase();
          const event = new CustomEvent("database-updated", {
            detail: message.detail,
          });
          window.dispatchEvent(event);
        }, 300);
      }
    };
  }, [channel, syncDatabase]);

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

      if (actionType) {
        const tableMatch = sqlLower.match(
          /into\s+(\w+)|update\s+(\w+)|from\s+(\w+)/
        );
        const tableName = tableMatch
          ? tableMatch[1] || tableMatch[2] || tableMatch[3]
          : "unknown";

        try {
          await dumpDatabase();

          const message = {
            type: "db-updated",
            detail: {
              table: tableName,
              action: actionType,
              timestamp: new Date().getTime(),
            },
          };

          channel.postMessage(message);
        } catch (dumpError) {
          console.error(
            "Failed to dump database after mutation; skipping cross-tab broadcast:",
            dumpError
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
      value={{ db, isLoading, executeQuery, initialized, syncDatabase }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export const useDatabase = () => useContext(DatabaseContext);
