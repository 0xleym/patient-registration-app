"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { Download, FileUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REQUIRED_COLUMNS = ["first_name", "last_name", "date_of_birth", "gender"];
const ALL_COLUMNS = [
  "first_name",
  "last_name",
  "date_of_birth",
  "gender",
  "email",
  "phone",
  "address",
  "medical_history",
];

type ImportRow = Record<string, string>;

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ImportDialogProps {
  executeQuery: (sql: string, params?: any[]) => Promise<any[]>;
  initialized: boolean;
  onImportComplete: () => void;
}

function validateColumns(headers: string[]): { valid: boolean; missing: string[] } {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((col) => !normalizedHeaders.includes(col));
  return { valid: missing.length === 0, missing };
}

function normalizeRow(row: ImportRow): ImportRow {
  const normalized: ImportRow = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim().toLowerCase()] = value?.trim() ?? "";
  }
  return normalized;
}

export function ImportDialog({ executeQuery, initialized, onImportComplete }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setParsedRows([]);
    setHeaders([]);
    setFileName(null);
    setValidationError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  const parseCSV = (text: string) => {
    const result = Papa.parse<ImportRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (result.errors.length > 0) {
      const errorMessages = result.errors
        .slice(0, 3)
        .map((e) => e.message)
        .join("; ");
      setValidationError(`CSV parsing errors: ${errorMessages}`);
      return;
    }

    if (result.data.length === 0) {
      setValidationError("The file contains no data rows.");
      return;
    }

    const fileHeaders = result.meta.fields || [];
    const { valid, missing } = validateColumns(fileHeaders);

    if (!valid) {
      setValidationError(
        `Missing required columns: ${missing.join(", ")}. Required: ${REQUIRED_COLUMNS.join(", ")}`
      );
      return;
    }

    setHeaders(fileHeaders.filter((h) => ALL_COLUMNS.includes(h)));
    setParsedRows(result.data);
    setValidationError(null);
  };

  const parseJSON = (text: string) => {
    try {
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        setValidationError("JSON file must contain an array of patient objects.");
        return;
      }

      if (data.length === 0) {
        setValidationError("The file contains no data rows.");
        return;
      }

      const normalized = data.map(normalizeRow);
      const fileHeaders = Object.keys(normalized[0]);
      const { valid, missing } = validateColumns(fileHeaders);

      if (!valid) {
        setValidationError(
          `Missing required columns: ${missing.join(", ")}. Required: ${REQUIRED_COLUMNS.join(", ")}`
        );
        return;
      }

      setHeaders(fileHeaders.filter((h) => ALL_COLUMNS.includes(h)));
      setParsedRows(normalized);
      setValidationError(null);
    } catch {
      setValidationError("Invalid JSON format. Please check your file.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);
    setValidationError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      if (file.name.endsWith(".csv")) {
        parseCSV(text);
      } else if (file.name.endsWith(".json")) {
        parseJSON(text);
      } else {
        setValidationError("Unsupported file format. Please use .csv or .json files.");
      }
    };
    reader.onerror = () => {
      setValidationError("Failed to read the file. Please try again.");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!initialized || parsedRows.length === 0) return;

    setIsImporting(true);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      try {
        // Validate required fields have values
        for (const col of REQUIRED_COLUMNS) {
          if (!row[col] || row[col].trim() === "") {
            throw new Error(`Missing required field: ${col}`);
          }
        }

        await executeQuery(
          `INSERT INTO patients (
            first_name, last_name, date_of_birth, gender,
            email, phone, address, medical_history
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            row.first_name,
            row.last_name,
            row.date_of_birth,
            row.gender,
            row.email || "",
            row.phone || "",
            row.address || "",
            row.medical_history || "",
          ]
        );
        success++;
      } catch (error) {
        failed++;
        const msg = error instanceof Error ? error.message : "Unknown error";
        if (errors.length < 5) {
          errors.push(`Row ${i + 1}: ${msg}`);
        }
      }
    }

    setImportResult({ success, failed, errors });
    setIsImporting(false);

    if (success > 0) {
      onImportComplete();
      toast.success("Import Complete", {
        description: `Successfully imported ${success} patient${success !== 1 ? "s" : ""}.${
          failed > 0 ? ` ${failed} row${failed !== 1 ? "s" : ""} failed.` : ""
        }`,
      });
    } else {
      toast.error("Import Failed", {
        description: "No patients were imported. Check the error details below.",
      });
    }
  };

  const previewRows = parsedRows.slice(0, 5);
  const displayHeaders = headers.length > 0 ? headers : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Patients</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to bulk-import patient records. Required
            columns: {REQUIRED_COLUMNS.join(", ")}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File input */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            {fileName ? (
              <p className="text-sm">
                Selected: <span className="font-medium">{fileName}</span>
              </p>
            ) : (
              <div>
                <p className="text-sm font-medium">Click to select a file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .csv and .json files
                </p>
              </div>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{validationError}</p>
            </div>
          )}

          {/* Preview table */}
          {parsedRows.length > 0 && !validationError && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Preview ({Math.min(5, parsedRows.length)} of {parsedRows.length} rows):
              </p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {displayHeaders.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                          {REQUIRED_COLUMNS.includes(header) && (
                            <span className="text-destructive ml-0.5">*</span>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {displayHeaders.map((header) => (
                          <TableCell key={header} className="whitespace-nowrap max-w-[200px] truncate">
                            {row[header] || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  ...and {parsedRows.length - 5} more rows
                </p>
              )}
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div
              className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                importResult.failed === 0
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
              }`}
            >
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>
                  Imported {importResult.success} of {importResult.success + importResult.failed} records.
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.failed > importResult.errors.length && (
                      <li>...and {importResult.failed - importResult.errors.length} more errors</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {importResult ? "Close" : "Cancel"}
          </Button>
          {parsedRows.length > 0 && !validationError && !importResult && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${parsedRows.length} patient${parsedRows.length !== 1 ? "s" : ""}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
