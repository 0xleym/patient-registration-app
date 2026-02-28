"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Loader2, Search, RefreshCw } from "lucide-react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDatabase } from "@/lib/database-provider";

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
      //   toast.success("Sync Complete", {
      //     description: "Patient data has been synchronized with other tabs.",
      //   });
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
        console.log("Reloading patients data...");
        handleSync();
      }
    };

    window.addEventListener("database-updated", handleDatabaseUpdate);

    return () => {
      window.removeEventListener("database-updated", handleDatabaseUpdate);
    };
  }, [executeQuery, initialized]);

  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.first_name.toLowerCase().includes(searchLower) ||
      patient.last_name.toLowerCase().includes(searchLower) ||
      (patient.email?.toLowerCase().includes(searchLower) ?? false) ||
      (patient.phone?.includes(searchTerm) ?? false)
    );
  });

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
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Patient Records</CardTitle>
              <CardDescription>
                View and manage all registered patients
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
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
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search patients..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Link href="/register">
                <Button>Register New</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No patients found</p>
              {patients.length > 0 && searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search term
                </p>
              )}
              {patients.length === 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    No patients have been registered yet
                  </p>
                  <Link href="/register">
                    <Button>Register Your First Patient</Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
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
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.id}
                      </TableCell>
                      <TableCell>
                        {patient.first_name} {patient.last_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(patient.date_of_birth), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="capitalize">
                        {patient.gender.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        {patient.email || patient.phone || "—"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(patient.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
