"use client";

import * as React from "react";
import type { FieldValues } from "react-hook-form";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn, formatBytes } from "@/lib/utils";
import { uploadToCloudinary, type UploadedAsset } from "@/lib/cloudinary";
import { BaseFieldProps, RequiredMark } from "./field-context";

export interface MediaFieldProps<T extends FieldValues>
  extends BaseFieldProps<T> {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMb?: number;
  /** Cloudinary scope — { clientId, postId } passed to the signing endpoint. */
  clientId: string;
  postId?: string;
}

export function MediaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  accept = "image/*,video/*",
  multiple = true,
  maxFiles = 10,
  maxSizeMb = 200,
  clientId,
  postId,
  className,
}: MediaFieldProps<T>) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const assets: UploadedAsset[] = Array.isArray(field.value)
          ? field.value
          : [];

        const handleFiles = async (files: FileList | null) => {
          if (!files || files.length === 0) return;
          const list = Array.from(files).slice(0, maxFiles - assets.length);
          setUploading(true);
          try {
            const uploaded: UploadedAsset[] = [];
            for (const file of list) {
              if (file.size > maxSizeMb * 1024 * 1024) {
                toast.error(`${file.name} exceeds ${maxSizeMb}MB`);
                continue;
              }
              // Real call site to the signed Cloudinary upload flow.
              const asset = await uploadToCloudinary(file, { clientId, postId });
              uploaded.push(asset);
            }
            field.onChange(multiple ? [...assets, ...uploaded] : uploaded.slice(0, 1));
          } catch {
            toast.error("Upload failed. Check Cloudinary config.");
          } finally {
            setUploading(false);
          }
        };

        const remove = (publicId: string) =>
          field.onChange(assets.filter((a) => a.publicId !== publicId));

        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                <RequiredMark required={required} />
              </FormLabel>
            )}
            <FormControl>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-ring hover:text-primary",
                  )}
                >
                  {uploading ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <UploadCloud className="size-6" strokeWidth={1.6} />
                  )}
                  <span>
                    Drag files or <span className="font-semibold">browse</span>
                  </span>
                  <span className="text-[11px]">
                    Cloudinary signed upload · max {maxSizeMb}MB
                  </span>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept={accept}
                  multiple={multiple}
                  hidden
                  onChange={(e) => handleFiles(e.target.files)}
                />
                {assets.length > 0 && (
                  <ul className="grid grid-cols-3 gap-2">
                    {assets.map((a) => (
                      <li
                        key={a.publicId}
                        className="group relative overflow-hidden rounded-lg border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.secureUrl}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                          {formatBytes(a.bytes)}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(a.publicId)}
                          className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
