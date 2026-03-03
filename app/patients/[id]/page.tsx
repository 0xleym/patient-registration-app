"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDatabase } from "@/lib/database-provider";
import { PatientForm, PatientFormValues } from "@/components/patient-form";

type PatientRecord = {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  medical_history: string | null;
  created_at: string;
};

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm mt-0.5">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const {
    executeQuery,
    isLoading: dbLoading,
    initialized,
  } = useDatabase();

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadPatient = useCallback(async () => {
    if (!initialized) return;

    try {
      setIsLoading(true);
      const results = await executeQuery(
        "SELECT * FROM patients WHERE id = $1",
        [parseInt(patientId, 10)]
      );

      if (results.length === 0) {
        setPatient(null);
      } else {
        setPatient(results[0]);
      }
    } catch (error) {
      console.error("Error loading patient:", error);
      toast.error("Error", {
        description: "Failed to load patient details.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [initialized, executeQuery, patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  // Listen for cross-tab updates
  useEffect(() => {
    const handleDatabaseUpdate = () => {
      loadPatient();
    };

    window.addEventListener("database-updated", handleDatabaseUpdate);
    return () => {
      window.removeEventListener("database-updated", handleDatabaseUpdate);
    };
  }, [loadPatient]);

  async function handleEdit(data: PatientFormValues) {
    if (!initialized || !patient) return;

    try {
      const formattedDate = format(data.dateOfBirth, "yyyy-MM-dd");

      await executeQuery(
        `UPDATE patients SET
          first_name = $1,
          last_name = $2,
          date_of_birth = $3,
          gender = $4,
          email = $5,
          phone = $6,
          address = $7,
          medical_history = $8
        WHERE id = $9`,
        [
          data.firstName,
          data.lastName,
          formattedDate,
          data.gender,
          data.email || "",
          data.phone || "",
          data.address || "",
          data.medicalHistory || "",
          patient.id,
        ]
      );

      toast.success("Patient Updated", {
        description: "Patient details have been updated successfully.",
      });

      setIsEditing(false);
      await loadPatient();
    } catch (error) {
      console.error("Error updating patient:", error);
      toast.error("Update Failed", {
        description: "There was an error updating the patient. Please try again.",
      });
    }
  }

  async function handleDelete() {
    if (!initialized || !patient) return;

    setIsDeleting(true);
    try {
      await executeQuery("DELETE FROM patients WHERE id = $1", [patient.id]);

      toast.success("Patient Deleted", {
        description: `${patient.first_name} ${patient.last_name} has been removed.`,
      });

      router.push("/records");
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error("Delete Failed", {
        description: "There was an error deleting the patient. Please try again.",
      });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  // Convert DB record to form values
  function getFormDefaults(): Partial<PatientFormValues> | undefined {
    if (!patient) return undefined;
    return {
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: new Date(patient.date_of_birth),
      gender: patient.gender,
      email: patient.email || "",
      phone: patient.phone || "",
      address: patient.address || "",
      medicalHistory: patient.medical_history || "",
    };
  }

  if (dbLoading || isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Patient Not Found</CardTitle>
            <CardDescription>
              No patient exists with ID {patientId}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/records">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Records
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/records">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Records
            </Button>
          </Link>

          {!isEditing && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>

              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Patient</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete{" "}
                      <span className="font-semibold">
                        {patient.first_name} {patient.last_name}
                      </span>
                      ? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Patient"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing
                ? `Edit Patient: ${patient.first_name} ${patient.last_name}`
                : `${patient.first_name} ${patient.last_name}`}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? "Update the patient's information below."
                : `Patient ID: ${patient.id} — Registered ${format(new Date(patient.created_at), "MMMM d, yyyy")}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isEditing ? (
              <PatientForm
                defaultValues={getFormDefaults()}
                onSubmit={handleEdit}
                submitLabel="Save Changes"
                submittingLabel="Saving..."
              />
            ) : (
              <div className="space-y-1">
                <DetailRow
                  icon={User}
                  label="Full Name"
                  value={`${patient.first_name} ${patient.last_name}`}
                />
                <Separator />
                <DetailRow
                  icon={Calendar}
                  label="Date of Birth"
                  value={format(
                    new Date(patient.date_of_birth),
                    "MMMM d, yyyy"
                  )}
                />
                <Separator />
                <DetailRow
                  icon={User}
                  label="Gender"
                  value={
                    patient.gender
                      .replace("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  }
                />
                <Separator />
                <DetailRow
                  icon={Mail}
                  label="Email"
                  value={patient.email}
                />
                <Separator />
                <DetailRow
                  icon={Phone}
                  label="Phone"
                  value={patient.phone}
                />
                <Separator />
                <DetailRow
                  icon={MapPin}
                  label="Address"
                  value={patient.address}
                />
                <Separator />
                <DetailRow
                  icon={FileText}
                  label="Medical History"
                  value={patient.medical_history}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
