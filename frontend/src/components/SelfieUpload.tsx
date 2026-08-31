import { useRef } from "react";
import { Camera, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SelfieUploadProps {
  selfieFile: File | null;
  onSelect: (file: File | null) => void;
}

export function SelfieUpload({ selfieFile, onSelect }: SelfieUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3 rounded-md border border-ink-border bg-ink-raised/50 p-2.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            onSelect(files[0]);
          }
        }}
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink border border-ink-border text-slate-400">
        {selfieFile ? (
          <ImageIcon className="h-4 w-4 text-accent" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium text-slate-200">
          {selfieFile ? selfieFile.name : "Optional: Attach Live Selfie"}
        </p>
        <p className="font-mono text-[10px] text-slate-500">
          {selfieFile
            ? `${(selfieFile.size / 1024).toFixed(1)} KB`
            : "For Siamese biometric verification"}
        </p>
      </div>

      {selfieFile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            onSelect(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="h-7 w-7 text-slate-400 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="h-7 text-[11px]"
        >
          Browse
        </Button>
      )}
    </div>
  );
}
