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
    <div className="flex items-start gap-4 py-4">
      <div className="rounded-lg bg-muted p-2 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm mt-0.5 font-medium">
          {value || <span className="text-muted-foreground italic font-normal">Not provided</span>}
        </p>
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
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-lg">Patient Not Found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              No patient exists with ID {patientId}.
            </p>
          </div>
          <Link href="/records">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Records
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = `${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase();

  return (
    <div className="container py-10 max-w-2xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/records">
          <Button variant="ghost" size="sm" className="-ml-2">
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

      {/* Patient Header */}
      {!isEditing && (
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Patient ID: {patient.id} &middot; Registered{" "}
              {format(new Date(patient.created_at), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
      )}

      {isEditing && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit Patient
          </h1>
          <p className="text-muted-foreground mt-1">
            Update {patient.first_name} {patient.last_name}&apos;s information below.
          </p>
        </div>
      )}

      {/* Content */}
      <Card>
        <CardContent className={isEditing ? "pt-6" : "p-0"}>
          {isEditing ? (
            <PatientForm
              defaultValues={getFormDefaults()}
              onSubmit={handleEdit}
              submitLabel="Save Changes"
              submittingLabel="Saving..."
            />
          ) : (
            <div className="divide-y">
              <div className="px-6">
                <DetailRow
                  icon={User}
                  label="Full Name"
                  value={`${patient.first_name} ${patient.last_name}`}
                />
              </div>
              <div className="px-6">
                <DetailRow
                  icon={Calendar}
                  label="Date of Birth"
                  value={format(new Date(patient.date_of_birth), "MMMM d, yyyy")}
                />
              </div>
              <div className="px-6">
                <DetailRow
                  icon={User}
                  label="Gender"
                  value={patient.gender.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                />
              </div>
              <div className="px-6">
                <DetailRow
                  icon={Mail}
                  label="Email"
                  value={patient.email}
                />
              </div>
              <div className="px-6">
                <DetailRow
                  icon={Phone}
                  label="Phone"
                  value={patient.phone}
                />
              </div>
              <div className="px-6">
                <DetailRow
                  icon={MapPin}
                  label="Address"
                  value={patient.address}
                />
              </div>
              <div className="px-6">
                <DetailRow
                  icon={FileText}
                  label="Medical History"
                  value={patient.medical_history}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
