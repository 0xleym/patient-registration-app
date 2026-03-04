"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Search, RefreshCw, Upload, FileJson, FileSpreadsheet, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDatabase } from "@/lib/database-provider";
import { exportToCSV, exportToJSON } from "@/lib/export-utils";
import { ImportDialog } from "@/components/import-dialog";

type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export default function RecordsPage() {
  const {
    executeQuery,
    isLoading: dbLoading,
    initialized,
    syncDatabase,
  } = useDatabase();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const handleExport = async (format: "csv" | "json") => {
    if (!initialized) return;

    setIsExporting(true);
    try {
      const results = await executeQuery(`
        SELECT id, first_name, last_name, date_of_birth, gender, email, phone, address, medical_history, created_at
        FROM patients
        ORDER BY id
      `);

      if (results.length === 0) {
        toast("No Data", {
          description: "There are no patients to export.",
        });
        return;
      }

      if (format === "csv") {
        exportToCSV(results);
      } else {
        exportToJSON(results);
      }

      toast.success("Export Complete", {
        description: `Exported ${results.length} patient${results.length !== 1 ? "s" : ""} as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export Failed", {
        description: "Failed to export patient data. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const loadPatients = async () => {
    if (!initialized) return;

    try {
      setIsLoading(true);
      const results = await executeQuery(`
        SELECT id, first_name, last_name, date_of_birth, gender, email, phone, created_at
        FROM patients
        ORDER BY created_at DESC
      `);
      setPatients(results);
    } catch (error) {
      console.error("Error loading patients:", error);
      toast.error("Error", {
        description: "Failed to load patient records.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncDatabase();
      await loadPatients();
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
    if (initialized) {
      loadPatients();
    }

    const handleDatabaseUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;

      if (
        customEvent.detail?.table === "patients" ||
        !customEvent.detail?.table
      ) {
        handleSync();
      }
    };

    window.addEventListener("database-updated", handleDatabaseUpdate);

    return () => {
      window.removeEventListener("database-updated", handleDatabaseUpdate);
    };
  }, [executeQuery, initialized]);

  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;
    return (
      patient.first_name.toLowerCase().includes(searchLower) ||
      patient.last_name.toLowerCase().includes(searchLower) ||
      (`${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchLower)) ||
      (patient.email?.toLowerCase().includes(searchLower) ?? false) ||
      (patient.phone?.includes(searchTerm.trim()) ?? false)
    );
  });

  if (dbLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Patient Records</h1>
          <p className="text-muted-foreground">
            {patients.length > 0
              ? `${patients.length} patient${patients.length !== 1 ? "s" : ""} registered`
              : "View and manage all registered patients"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <FileJson className="mr-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ImportDialog
            executeQuery={executeQuery}
            initialized={initialized}
            onImportComplete={loadPatients}
          />
          <Link href="/register">
            <Button size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Register New
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name, email, or phone..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full rounded bg-muted animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              {patients.length === 0 ? (
                <>
                  <h3 className="font-semibold text-lg">No patients yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Get started by registering your first patient.
                  </p>
                  <Link href="/register">
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register Your First Patient
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-lg">No results found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your search term.
                  </p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <TableCell className="font-medium">
                      {patient.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(patient.date_of_birth), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="capitalize">
                      {patient.gender.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patient.email || patient.phone || "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(patient.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
