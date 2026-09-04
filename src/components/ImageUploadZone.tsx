import React, { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, X, Check, Sparkles, Loader2, Camera } from "lucide-react";
import { processImageFile } from "../utils/imageUtils";

interface ImageUploadZoneProps {
  currentImage: string;
  onImageSelected: (dataUrl: string) => void;
  onClearImage: () => void;
  title?: string;
  subtitle?: string;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  currentImage,
  onImageSelected,
  onClearImage,
  title = "Upload Profile Photo from Gallery",
  subtitle = "Drag & drop an image here or click to browse your device gallery",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (JPEG, PNG, WebP, etc.).");
      return;
    }

    try {
      setIsProcessing(true);
      const optimizedDataUrl = await processImageFile(file, 800, 0.85);
      onImageSelected(optimizedDataUrl);
    } catch (err: any) {
      setUploadError(err.message || "Failed to process the chosen image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
    // Reset value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="profile-picture-file-input"
        accept="image/*"
        onChange={onFileInputChange}
        className="hidden"
      />

      {uploadError && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-400">
          {uploadError}
        </div>
      )}

      {currentImage ? (
        /* Preview state when an image is currently chosen */
        <div className="p-4 rounded-2xl border border-[#F1F2F6] dark:border-[#282B34] bg-[#F8F9FA] dark:bg-[#1E2028] flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-xs border-2 border-white dark:border-[#282B34] bg-[#FFE8CC] dark:bg-[#38230D] flex-shrink-0">
              <img
                src={currentImage}
                alt="Selected Profile"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={triggerPicker}>
                <Camera className="w-5 h-5 text-white drop-shadow" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F1F2F6] truncate">
                  Custom Picture Set
                </span>
                <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                Displayed on your committee portal & public ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              id="change-profile-photo-btn"
              onClick={triggerPicker}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#252833] hover:bg-gray-50 dark:hover:bg-[#2E3342] border border-[#F1F2F6] dark:border-[#2E323D] rounded-xl shadow-2xs transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              id="remove-profile-photo-btn"
              onClick={onClearImage}
              title="Remove profile image"
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Drag & Drop zone */
        <div
          id="profile-upload-dropzone"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={triggerPicker}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
            isDragging
              ? "border-[#FF9933] bg-[#FFF9F2] dark:bg-[#2E1E0F]/50 scale-[1.01]"
              : "border-[#E2E8F0] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#1A1C22]/80 hover:bg-[#FFFBF5] dark:hover:bg-[#20232B] hover:border-[#FF9933]/60"
          }`}
        >
          {isProcessing ? (
            <div className="py-3 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-[#FF9933] animate-spin" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Optimizing image from gallery...
              </span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#22252D] border border-[#F1F2F6] dark:border-[#2E323D] shadow-xs flex items-center justify-center text-[#FF9933] mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F1F2F6] block mb-1">
                {title}
              </span>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed mb-3">
                {subtitle}
              </p>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF9933] hover:bg-[#F28B24] text-white text-[11px] font-bold rounded-xl shadow-xs transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>Browse Gallery / Files</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
