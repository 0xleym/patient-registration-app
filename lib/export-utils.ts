import Papa from "papaparse";

type PatientExportRow = {
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

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getExportFilename(extension: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `patients-export-${date}.${extension}`;
}

export function exportToCSV(rows: PatientExportRow[]) {
  const csv = Papa.unparse(rows, {
    quotes: true,
    header: true,
  });
  downloadFile(csv, getExportFilename("csv"), "text/csv;charset=utf-8;");
}

export function exportToJSON(rows: PatientExportRow[]) {
  const json = JSON.stringify(rows, null, 2);
  downloadFile(json, getExportFilename("json"), "application/json;charset=utf-8;");
}
