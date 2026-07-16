"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LuClipboard, LuImage, LuLoaderCircle, LuTriangleAlert, LuUpload, LuX } from "react-icons/lu";
import { requestImageUpload, uploadImageToSignedUrl } from "@/features/questions/services/images.service";
import { getApiErrorMessage } from "@/utils/api-error";

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg"];

function getImageFromClipboard(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;
  for (const item of items) {
    if (item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (cdnUrl: string) => void;
  templateId: string;
  userEmail: string;
}

export function ImageUploadModal({ isOpen, onClose, onUploaded, templateId, userEmail }: ImageUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setDragActive(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isUploading) handleClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isUploading, handleClose]);

  function readFileAsPreview(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreviewUrl(reader.result);
    };
    reader.onerror = () => setError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  }

  const validateAndSetFile = useCallback((file: File | null) => {
    setError(null);
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Please select a PNG or JPG image.");
      return;
    }
    if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
      setError(`Image must be smaller than ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setSelectedFile(file);
    readFileAsPreview(file);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handlePaste(event: ClipboardEvent) {
      const imageFile = getImageFromClipboard(event);
      if (!imageFile) return;
      event.preventDefault();
      validateAndSetFile(imageFile);
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, validateAndSetFile]);

  if (!isOpen) return null;

  async function handleConfirmUpload() {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const { signed_url, cdn_url } = await requestImageUpload({
        filename: selectedFile.name,
        template_id: templateId,
        uploaded_by: userEmail,
        content_type: selectedFile.type,
      });
      await uploadImageToSignedUrl(signed_url, selectedFile);
      onUploaded(cdn_url);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not upload image."));
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    validateAndSetFile(event.dataTransfer.files?.[0] ?? null);
  }

  const fileSizeLabel = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isUploading) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <LuImage size={17} />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Upload image</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close"
          >
            <LuX size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {!previewUrl ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
              disabled={isUploading}
              className={`flex min-h-[200px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition-all ${
                dragActive ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"
              } ${isUploading ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                <LuUpload size={20} className="text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Drop image here</h3>
              <p className="mt-1 text-xs text-slate-500">Click to browse or paste with Ctrl/Cmd + V</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">PNG, JPG</span>
                <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">Up to {MAX_FILE_SIZE_MB} MB</span>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
              />
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{selectedFile?.name}</p>
                </div>
                {fileSizeLabel ? (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                    {fileSizeLabel}
                  </span>
                ) : null}
              </div>
              <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Selected preview" className="max-h-[200px] w-auto max-w-full object-contain" />
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LuUpload size={14} />
                Change image
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
              <LuClipboard size={12} />
              Paste supported
            </span>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <LuTriangleAlert size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmUpload}
            disabled={!previewUrl || isUploading}
            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isUploading ? (
              <>
                <LuLoaderCircle size={14} className="animate-spin" />
                Uploading…
              </>
            ) : (
              "Insert Image"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
