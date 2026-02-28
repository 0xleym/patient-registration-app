"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDatabase } from "@/lib/database-provider";

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  dateOfBirth: z.date({
    required_error: "Date of birth is required",
  }),
  gender: z.string({
    required_error: "Please select a gender",
  }),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  medicalHistory: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CalendarField {
  value?: Date;
  onChange: (date: Date) => void;
}

interface CalendarWithDropdownsProps {
  field: CalendarField;
}

const CalendarWithDropdowns = ({ field }: CalendarWithDropdownsProps) => {
  const [date, setDate] = useState<Date>(field.value || new Date());
  const [month, setMonth] = useState<number>(
    field.value ? field.value.getMonth() : new Date().getMonth()
  );
  const [year, setYear] = useState<number>(
    field.value ? field.value.getFullYear() : new Date().getFullYear()
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1899 },
    (_, i) => currentYear - i
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handleYearChange = (selectedYear: string) => {
    const newYear = parseInt(selectedYear);
    setYear(newYear);

    const newDate = new Date(date);
    newDate.setFullYear(newYear);
    setDate(newDate);
  };

  const handleMonthChange = (selectedMonth: string) => {
    const newMonth = parseInt(selectedMonth);
    setMonth(newMonth);

    const newDate = new Date(date);
    newDate.setMonth(newMonth);
    setDate(newDate);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setMonth(selectedDate.getMonth());
      setYear(selectedDate.getFullYear());
      field.onChange(selectedDate);
    }
  };

  return (
    <div className="flex flex-col space-y-2 p-3">
      <div className="flex space-x-2">
        <div className="w-1/2">
          <Select value={month.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((monthName, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-1/2">
          <Select value={year.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="h-56 overflow-y-auto">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Calendar
        mode="single"
        selected={field.value}
        onSelect={handleDateSelect}
        month={new Date(year, month)}
        onMonthChange={(date: Date) => {
          setMonth(date.getMonth());
          setYear(date.getFullYear());
        }}
        disabled={(date: Date) =>
          date > new Date() || date < new Date("1900-01-01")
        }
        initialFocus
      />
    </div>
  );
};

export default function RegisterPage() {
  const { executeQuery, isLoading: dbLoading, initialized, syncDatabase } = useDatabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleDatabaseUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.table === "patients" || !customEvent.detail?.table) {
        try {
          await syncDatabase();
          console.log("Database synced automatically from registration page");
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      medicalHistory: "",
    },
  });

  async function onSubmit(data: FormValues) {
    if (!initialized) {
      toast.error("Database Error", {
        description: "Database is not initialized. Please refresh the page.",
      });
      return;
    }

    setIsSubmitting(true);

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

      form.reset();

      router.push("/records");
    } catch (error) {
      console.error("Error registering patient:", error);
      toast.error("Registration Failed", {
        description:
          "There was an error registering the patient. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Register New Patient</CardTitle>
          <CardDescription>
            Enter the patient's information to register them in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarWithDropdowns field={field} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">
                            Prefer not to say
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main St, City, State, ZIP"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical History</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any relevant medical history..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Patient"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
