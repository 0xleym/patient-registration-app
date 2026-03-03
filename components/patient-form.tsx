"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";

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

export const patientFormSchema = z.object({
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

export type PatientFormValues = z.infer<typeof patientFormSchema>;

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

  useEffect(() => {
    const newDate = field.value || new Date();
    setDate(newDate);
    setMonth(newDate.getMonth());
    setYear(newDate.getFullYear());
  }, [field.value]);

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

  const handleYearChange = useCallback(
    (selectedYear: string) => {
      const newYear = parseInt(selectedYear, 10);
      setYear(newYear);

      const daysInMonth = new Date(newYear, month + 1, 0).getDate();
      const clampedDay = Math.min(date.getDate(), daysInMonth);
      const newDate = new Date(newYear, month, clampedDay);
      setDate(newDate);
      field.onChange(newDate);
    },
    [date, month, field]
  );

  const handleMonthChange = useCallback(
    (selectedMonth: string) => {
      const newMonth = parseInt(selectedMonth, 10);
      setMonth(newMonth);

      const daysInMonth = new Date(year, newMonth + 1, 0).getDate();
      const clampedDay = Math.min(date.getDate(), daysInMonth);
      const newDate = new Date(year, newMonth, clampedDay);
      setDate(newDate);
      field.onChange(newDate);
    },
    [date, year, field]
  );

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

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (data: PatientFormValues) => Promise<void>;
  submitLabel?: string;
  submittingLabel?: string;
  isDbLoading?: boolean;
}

export function PatientForm({
  defaultValues,
  onSubmit,
  submitLabel = "Register Patient",
  submittingLabel = "Registering...",
  isDbLoading = false,
}: PatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      dateOfBirth: defaultValues?.dateOfBirth,
      gender: defaultValues?.gender ?? undefined,
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      address: defaultValues?.address ?? "",
      medicalHistory: defaultValues?.medicalHistory ?? "",
    },
  });

  // Reset form when defaultValues change (e.g., when patient data loads)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        firstName: defaultValues.firstName ?? "",
        lastName: defaultValues.lastName ?? "",
        dateOfBirth: defaultValues.dateOfBirth,
        gender: defaultValues.gender ?? undefined,
        email: defaultValues.email ?? "",
        phone: defaultValues.phone ?? "",
        address: defaultValues.address ?? "",
        medicalHistory: defaultValues.medicalHistory ?? "",
      });
    }
  }, [defaultValues, form]);

  async function handleSubmit(data: PatientFormValues) {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      // Only reset if no defaultValues (i.e., registration mode)
      if (!defaultValues) {
        form.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDbLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Initializing database...</p>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                  value={field.value}
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
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  );
}
