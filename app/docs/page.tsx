import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function DocsPage() {
  return (
    <div className="container py-10 max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground">
          Learn how to use the Patient Registration App.
        </p>
      </div>

      {/* About */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">About</h2>
            <p className="text-muted-foreground mt-1">
              A frontend-only patient registration system powered by PGlite
            </p>
          </div>
          <p className="text-sm leading-relaxed">
            This application is a frontend-only patient registration system
            that uses PGlite for data storage. All data is stored locally in
            your browser and persists across page refreshes. The application
            also supports usage in multiple browser tabs simultaneously.
          </p>

          <div>
            <h3 className="text-sm font-semibold mb-2">Key Features</h3>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Register, edit, and delete patient records
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Search and filter patient records
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Import and export data (CSV/JSON)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Run custom SQL queries on patient data
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Data persistence across page refreshes
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                Multi-tab support with real-time sync
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Guides */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Guides</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border rounded-lg px-4 mb-3">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              How to Register a Patient
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pt-1 pb-4">
              <p className="mb-3">To register a new patient:</p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>
                  Navigate to the &quot;Register&quot; page from the navigation menu
                </li>
                <li>
                  Fill out the required fields (First Name, Last Name, Date of
                  Birth, Gender)
                </li>
                <li>Optionally add contact information and medical history</li>
                <li>
                  Click the &quot;Register Patient&quot; button to save the patient record
                </li>
              </ol>
              <p className="mt-3">
                After successful registration, you will be redirected to the
                Records page where you can see the newly added patient.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border rounded-lg px-4 mb-3">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              Viewing and Managing Patient Records
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pt-1 pb-4">
              <p className="mb-3">
                The Records page displays all registered patients in a table.
                You can:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Search for patients by name, email, or phone number</li>
                <li>Click on a patient row to view their full details</li>
                <li>Edit or delete a patient from the detail page</li>
                <li>Export all patient data as CSV or JSON</li>
                <li>Import patient data from a CSV or JSON file</li>
              </ul>
              <p className="mt-3">
                Records are automatically updated if changes are made in
                another tab.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border rounded-lg px-4 mb-3">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              Using the SQL Query Interface
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pt-1 pb-4">
              <p className="mb-3">
                The SQL Query interface allows you to run custom SQL queries
                against the patient database:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mb-4">
                <li>Enter your SQL query in the text area</li>
                <li>Click &quot;Run Query&quot; or press Ctrl+Enter to execute</li>
                <li>Results will be displayed in a table below</li>
              </ul>
              <p className="font-medium text-foreground mb-2">Example queries:</p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
                <code>
                  {`-- Get all patients
SELECT * FROM patients;

-- Get patients registered in the last 7 days
SELECT * FROM patients
WHERE created_at > (CURRENT_TIMESTAMP - INTERVAL '7 days');

-- Count patients by gender
SELECT gender, COUNT(*) as count
FROM patients GROUP BY gender;`}
                </code>
              </pre>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border rounded-lg px-4 mb-3">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              Database Schema
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pt-1 pb-4">
              <p className="mb-3">
                The patient database has the following schema:
              </p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
                <code>
                  {`CREATE TABLE patients (
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
)`}
                </code>
              </pre>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border rounded-lg px-4 mb-3">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              Technical Information
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pt-1 pb-4">
              <p className="mb-3">This application is built with:</p>
              <ul className="list-disc pl-5 space-y-1.5 mb-3">
                <li><span className="font-medium text-foreground">Next.js</span> — React framework</li>
                <li><span className="font-medium text-foreground">Tailwind CSS</span> — Styling</li>
                <li><span className="font-medium text-foreground">shadcn/ui</span> — UI components</li>
                <li><span className="font-medium text-foreground">PGlite</span> — Client-side PostgreSQL database</li>
                <li><span className="font-medium text-foreground">BroadcastChannel API</span> — Multi-tab synchronization</li>
                <li><span className="font-medium text-foreground">PapaParse</span> — CSV import/export</li>
              </ul>
              <p>
                All data is stored locally in your browser using PGlite, which
                provides a PostgreSQL-compatible database that runs entirely in
                the browser via WebAssembly.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
