import { uploadSiteImage } from "@/lib/image-upload.functions";

export type UploadResult = {
  url: string;
  srcset: string | null;
  widths: number[];
};

const MAX_BYTES = 15 * 1024 * 1024;
const QUALITY = 0.82;

function extensionFor(contentType: string, fileName: string) {
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/svg+xml") return "svg";
  return (
    fileName
      .split(".")
      .pop()
      ?.replace(/[^a-zA-Z0-9]/g, "") || "bin"
  );
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/**
 * Encode an image File to WebP in the browser using canvas while preserving
 * the uploaded pixel dimensions. Falls back to the original file if encoding
 * is not supported (e.g. SVG/GIF or canvas WebP unavailable).
 */
async function encodeToWebp(file: File): Promise<{ blob: Blob; ext: string; contentType: string }> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return {
      blob: file,
      ext: file.type === "image/svg+xml" ? "svg" : "gif",
      contentType: file.type,
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load image"));
      el.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, img.width, img.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", QUALITY),
    );

    if (!blob) {
      // WebP not supported — keep original
      return { blob: file, ext: file.name.split(".").pop() || "bin", contentType: file.type };
    }
    return { blob, ext: "webp", contentType: "image/webp" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadImageWithVariants(
  file: File,
  folder = "uploads",
): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Image too large (max 15 MB).");

  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").slice(0, 64) || "uploads";
  const { blob, ext, contentType } = await encodeToWebp(file);
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.[^.]+$/, "");
  const fileName = `${cleanName || "image"}.${ext || extensionFor(contentType, file.name)}`;
  const { url } = await uploadSiteImage({
    data: { folder: safeFolder, fileName, contentType, base64: await blobToBase64(blob) },
  });

  return { url, srcset: null, widths: [] };
}

export async function uploadImageAsWebp(file: File, folder = "uploads"): Promise<string> {
  const r = await uploadImageWithVariants(file, folder);
  return r.url;
}
