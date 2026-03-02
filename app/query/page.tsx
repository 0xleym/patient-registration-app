"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDatabase } from "@/lib/database-provider";

const BLOCKED_PATTERNS = [
  { pattern: /^\s*(drop)\s/i, label: "DROP" },
  { pattern: /^\s*(alter)\s/i, label: "ALTER" },
  { pattern: /^\s*(truncate)\s/i, label: "TRUNCATE" },
  { pattern: /^\s*(create)\s/i, label: "CREATE" },
];

const WARN_PATTERNS = [
  { pattern: /^\s*delete\s+from\s+\w+\s*;?\s*$/i, label: "DELETE without WHERE clause" },
  { pattern: /^\s*update\s+\w+\s+set\s+.*(?<!where\s.+)$/i, label: "UPDATE without WHERE clause" },
];

function validateQuery(sql: string): { allowed: boolean; warning: boolean; message: string } {
  const trimmed = sql.trim();

  for (const { pattern, label } of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        warning: false,
        message: `${label} statements are blocked in the query interface to protect the database schema.`,
      };
    }
  }

  for (const { pattern, label } of WARN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: true,
        warning: true,
        message: `This looks like a ${label}. This will affect all rows in the table.`,
      };
    }
  }

  return { allowed: true, warning: false, message: "" };
}

export default function QueryPage() {
  const {
    executeQuery,
    isLoading: dbLoading,
    initialized,
    syncDatabase,
  } = useDatabase();
  const [query, setQuery] = useState("SELECT * FROM patients LIMIT 10");
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string | null>(
    null
  );
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const executeCurrentQuery = useCallback(async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const queryResults = await executeQuery(query);
      setLastExecutedQuery(query);
      setResults(queryResults);

      if (queryResults.length === 0) {
        toast("Query Executed", {
          description: "Query executed successfully, but returned no results.",
        });
      }
    } catch (error) {
      console.error("Query execution error:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      setResults(null);

      toast.error("Query Error", {
        description: "There was an error executing your SQL query.",
      });
    } finally {
      setIsExecuting(false);
      setPendingConfirm(false);
    }
  }, [query, executeQuery]);

  async function runQuery() {
    if (!initialized) {
      toast.error("Database Error", {
        description: "Database is not initialized. Please refresh the page.",
      });
      return;
    }

    const validation = validateQuery(query);

    if (!validation.allowed) {
      setError(validation.message);
      toast.error("Query Blocked", {
        description: validation.message,
      });
      return;
    }

    if (validation.warning) {
      setPendingConfirm(true);
      toast.warning("Dangerous Query", {
        description: validation.message + " Click 'Confirm Execute' to proceed.",
      });
      return;
    }

    await executeCurrentQuery();
  }

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncDatabase();
      // Only re-execute if the last executed query was a safe read-only SELECT
      if (
        results &&
        lastExecutedQuery &&
        lastExecutedQuery.trim().toLowerCase().startsWith("select")
      ) {
        const queryResults = await executeQuery(lastExecutedQuery);
        setResults(queryResults);
      }
    } catch (error) {
      console.error("Error during manual sync:", error);
      toast.error("Sync Failed", {
        description: "Failed to synchronize data. Please try again.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleDatabaseUpdate = () => {
      handleSync();
    };

    window.addEventListener("database-updated", handleDatabaseUpdate);

    return () => {
      window.removeEventListener("database-updated", handleDatabaseUpdate);
    };
  }, [lastExecutedQuery, initialized, isExecuting]);

  if (dbLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Initializing database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SQL Query Interface</CardTitle>
              <CardDescription>
                Run custom SQL queries on the patient database
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSync}
              disabled={isSyncing}
              title="Sync with other tabs"
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here..."
            className="font-mono min-h-[150px]"
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {pendingConfirm && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setPendingConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={executeCurrentQuery}
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    "Confirm Execute"
                  )}
                </Button>
              </>
            )}
            {!pendingConfirm && (
              <Button onClick={runQuery} disabled={isExecuting}>
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Query
                  </>
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            <CardDescription>
              {results.length} {results.length === 1 ? "row" : "rows"} returned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(results[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((value: any, j) => (
                          <TableCell key={j}>
                            {value === null ? "NULL" : String(value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                Query executed successfully, but returned no results.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
