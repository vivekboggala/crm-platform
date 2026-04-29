"use client";
import React, { useState, useRef } from "react";
import { apiUpload } from "@/lib/api";
import type { CsvImportResult } from "@/lib/types";
import { showNotification } from "./NotificationToast";

interface CsvImporterProps {
  entity?: string;
  title?: string;
}

export default function CsvImporter({ entity: entityName, title }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!entityName) return null;

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      showNotification("Invalid file type", "Please upload a .csv file", "error");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file || !entityName) return;
    setImporting(true);
    setError(null);
    try {
      const res = await apiUpload("/import/csv", file, { entity: entityName });
      if (res.success) {
        const r = res.data as CsvImportResult;
        setResult(r);
        setFile(null);
        window.dispatchEvent(new CustomEvent(`refetch-${entityName}`));

        if (r.failed === 0) {
          showNotification("Import successful", `Successfully imported ${r.imported} ${entityName} records`, "success");
        } else if (r.imported > 0) {
          showNotification("Partial import", `Imported ${r.imported} records, ${r.failed} failed`, "warning");
        } else {
          showNotification("Import failed", `All ${r.failed} records failed validation`, "error");
        }
      } else {
        const errorMsg = (res as any).error || "Failed to import CSV";
        setError(errorMsg);
        showNotification("Import error", errorMsg, "error");
      }
    } catch (err: any) {
      setError(err.message);
      showNotification("System error", err.message, "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-title">{title || `Import ${entityName} from CSV`}</div>

      <div
        className={`csv-dropzone ${dragActive ? "active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="csv-dropzone-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        </div>
        <div className="csv-dropzone-text">
          {file ? (
            <strong>{file.name} ({(file.size / 1024).toFixed(1)} KB)</strong>
          ) : (
            <>Drop a CSV file here or <strong>click to browse</strong></>
          )}
        </div>
      </div>

      {error && <p className="form-error mt-4">{error}</p>}

      {file && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? "Importing..." : `Import to ${entityName}`}
          </button>
        </div>
      )}

      {result && (
        <div className="csv-results mt-4">
          <div className="flex gap-4">
            <span className="badge badge-success" style={{ padding: "8px 14px" }}>
              {result.imported} imported
            </span>
            {result.failed > 0 && (
              <span className="badge badge-danger" style={{ padding: "8px 14px" }}>
                {result.failed} failed
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 12, fontSize: "0.85rem", color: "#64748b" }}>
              {result.errors.slice(0, 5).map((err, i) => (
                <div key={i}>Row {err.row}: {err.message}</div>
              ))}
              {result.errors.length > 5 && (
                <div>...and {result.errors.length - 5} more errors</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
