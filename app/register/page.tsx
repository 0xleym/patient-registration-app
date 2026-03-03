"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
    <div className="container py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Register New Patient</CardTitle>
          <CardDescription>
            Enter the patient&apos;s information to register them in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
