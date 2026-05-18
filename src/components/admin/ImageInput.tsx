import { useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadImageAsWebp } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
  className?: string;
  previewClassName?: string;
};

/**
 * Image field with URL input + device upload.
 * Uploaded files are auto-converted to WebP and stored in the `site-assets` bucket.
 */
export function ImageInput({
  value,
  onChange,
  folder = "uploads",
  placeholder = "https://...  or upload",
  className,
  previewClassName,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadImageAsWebp(file, folder);
      onChange(url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-medium hover:border-primary/40 hover:bg-secondary disabled:opacity-60"
          title="Upload from device (auto-converted to WebP)"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {busy ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
            alt=""
            className={cn(
              "h-16 w-16 rounded-lg border border-border object-cover",
              previewClassName,
            )}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow"
            aria-label="Clear image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
