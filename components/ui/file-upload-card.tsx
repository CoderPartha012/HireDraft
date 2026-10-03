"use client";
import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Upload,
  FileText,
  Check,
  Trash2,
  X,
} from "@/components/ui/material-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface UploadedFile {
  id: string;
  file: File;
  progress?: number;
  status: "selected" | "uploading" | "completed" | "error";
}
interface FileUploadCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  files: UploadedFile[];
  onFilesChange: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  onClose?: () => void;
  disabled?: boolean;
}
export const FileUploadCard = React.forwardRef<
  HTMLDivElement,
  FileUploadCardProps
>(
  (
    {
      className,
      files = [],
      onFilesChange,
      onFileRemove,
      onClose,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [error, setError] = React.useState("");
    const input = React.useRef<HTMLInputElement>(null);
    const depth = React.useRef(0);
    const hint = React.useId();
    const reducedMotion = useReducedMotion();
    function select(selected: File[]) {
      if (disabled || !selected.length) return;
      if (selected.length !== 1) {
        setError("Choose one resume at a time.");
        return;
      }
      const file = selected[0];
      if (!/\.(pdf|docx)$/i.test(file.name)) {
        setError("Choose a PDF or DOCX resume.");
        return;
      }
      if (!file.size) {
        setError("This file is empty. Choose another resume.");
        return;
      }
      if (file.size >= 5 * 1024 * 1024) {
        setError("Resume must be smaller than 5 MB.");
        return;
      }
      setError("");
      onFilesChange(selected);
    }
    return (
      <div
        ref={ref}
        className={cn(
          "w-full overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm",
          className,
        )}
        {...props}
      >
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Upload className="size-6 text-muted-foreground" />
                </span>
                <div>
                  <h3 className="text-base font-semibold">
                    Upload your resume
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bring your experience into your next draft.
                  </p>
                </div>
              </div>
              {onClose && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close upload card"
                  onClick={onClose}
                >
                  <X />
                </Button>
              )}
            </div>
            <div
              data-testid="resume-dropzone"
              onDragEnter={(event) => {
                event.preventDefault();
                if (!disabled && event.dataTransfer.types.includes("Files")) {
                  depth.current++;
                  setIsDragging(true);
                }
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                depth.current = Math.max(0, depth.current - 1);
                if (!depth.current) setIsDragging(false);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = disabled ? "none" : "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                depth.current = 0;
                setIsDragging(false);
                select(Array.from(event.dataTransfer.files));
              }}
              className={cn(
                "mt-5 flex flex-col items-center rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors",
                isDragging ? "border-primary bg-secondary" : "border-border",
                disabled && "opacity-60",
              )}
            >
              <input
                ref={input}
                type="file"
                accept=".pdf,.docx"
                aria-label="Resume file"
                aria-describedby={hint}
                disabled={disabled}
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  select(Array.from(event.target.files || []));
                  event.target.value = "";
                }}
              />
              <Upload className="mb-3 size-9 text-muted-foreground" />
              <p className="text-sm font-medium">
                Choose a file or drag &amp; drop it here.
              </p>
              <p
                id={hint}
                className="mt-2 text-xs leading-5 text-muted-foreground"
              >
                Text-based PDF or DOCX, smaller than 5 MB.
                <br />
                One resume at a time. No scanned documents.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                disabled={disabled}
                onClick={() => input.current?.click()}
              >
                Browse file
              </Button>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <AnimatePresence initial={false}>
            {files.map((item) => (
              <motion.div
                key={item.id}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                className="flex items-center gap-3 border-t p-5 sm:px-6"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    title={item.file.name}
                  >
                    {item.file.name}
                  </p>
                  <p
                    className="mt-1 text-xs text-muted-foreground"
                    role="status"
                  >
                    {item.file.size < 1024 * 1024
                      ? `${Math.max(1, Math.round(item.file.size / 1024))} KB`
                      : `${(item.file.size / 1024 / 1024).toFixed(1)} MB`}{" "}
                    &middot;{" "}
                    {item.status === "uploading"
                      ? "Reading resume..."
                      : item.status === "completed"
                        ? "Ready for review"
                        : item.status === "error"
                          ? "Could not read. Try again."
                          : "Ready to read"}
                  </p>
                  {item.status === "uploading" && (
                    <Progress
                      value={item.progress ?? null}
                      aria-label="Reading resume"
                      className="mt-2 h-1.5"
                    />
                  )}
                </div>
                {item.status === "completed" && (
                  <Check className="size-5 shrink-0" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => {
                    setError("");
                    onFileRemove(item.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  },
);
FileUploadCard.displayName = "FileUploadCard";
