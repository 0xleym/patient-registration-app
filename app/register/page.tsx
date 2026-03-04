"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useDatabase } from "@/lib/database-provider";
import { PatientForm, PatientFormValues } from "@/components/patient-form";

export default function RegisterPage() {
  const { executeQuery, isLoading: dbLoading, initialized, syncDatabase } = useDatabase();
  const router = useRouter();

  useEffect(() => {
    const handleDatabaseUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.table === "patients" || !customEvent.detail?.table) {
        try {
          await syncDatabase();
        } catch (error) {
          console.error("Error during automatic sync:", error);
        }
      }
    };

    window.addEventListener("database-updated", handleDatabaseUpdate);

    return () => {
      window.removeEventListener("database-updated", handleDatabaseUpdate);
    };
  }, [syncDatabase]);

  async function onSubmit(data: PatientFormValues) {
    if (!initialized) {
      toast.error("Database Error", {
        description: "Database is not initialized. Please refresh the page.",
      });
      return;
    }

    try {
      const formattedDate = format(data.dateOfBirth, "yyyy-MM-dd");

      await executeQuery(
        `INSERT INTO patients (
          first_name,
          last_name,
          date_of_birth,
          gender,
          email,
          phone,
          address,
          medical_history
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.firstName,
          data.lastName,
          formattedDate,
          data.gender,
          data.email || "",
          data.phone || "",
          data.address || "",
          data.medicalHistory || "",
        ]
      );

      toast.success("Patient Registered", {
        description: "The patient has been successfully registered.",
      });

      router.push("/records");
    } catch (error) {
      console.error("Error registering patient:", error);
      toast.error("Registration Failed", {
        description:
          "There was an error registering the patient. Please try again.",
      });
    }
  }

  return (
    <div className="container py-10 max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <Link href="/records">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Records
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Register New Patient</h1>
        <p className="text-muted-foreground mt-1">
          Enter the patient&apos;s information to register them in the system.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <PatientForm
            onSubmit={onSubmit}
            submitLabel="Register Patient"
            submittingLabel="Registering..."
            isDbLoading={dbLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
