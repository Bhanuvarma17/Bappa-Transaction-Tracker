import React, { useState, useEffect } from "react";
import { Profile } from "../types";
import { X, User, Image, AlignLeft, IndianRupee, AlertCircle, Sparkles, Link as LinkIcon } from "lucide-react";
import { ImageUploadZone } from "./ImageUploadZone";

interface ProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile;
  onSave: (updated: Partial<Profile>) => Promise<void>;
}

const PRESET_AVATARS = [
  {
    name: "Classic Ganesha",
    url: "https://images.unsplash.com/photo-1567591414240-e14f6b1eefb5?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Golden Murti",
    url: "https://images.unsplash.com/photo-1601614749326-1050e68d0d93?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Festive Aarti",
    url: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Eco Clay Idol",
    url: "https://images.unsplash.com/photo-1632733711679-529326f6db12?w=400&auto=format&fit=crop&q=80",
  },
];

export const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSave,
}) => {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [capital, setCapital] = useState<string>("" );
  const [imageSourceTab, setImageSourceTab] = useState<"upload" | "presets" | "url">("upload");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setUsername(currentProfile.username);
      setDisplayName(currentProfile.displayName);
      setBio(currentProfile.bio);
      setProfileImage(currentProfile.profileImage || "");
      setCapital(currentProfile.capital.toString());
    }
    setError(null);
  }, [currentProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Username / committee URL handle cannot be empty.");
      return;
    }

    if (!/^[a-zA-Z0-9 _-]+$/.test(cleanUsername)) {
      setError("Username can only contain letters, numbers, spaces, hyphens, and underscores.");
      return;
    }

    const numCapital = parseFloat(capital);
    if (isNaN(numCapital) || numCapital < 0) {
      setError("Please enter a valid capital budget amount (0 or higher).");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        bio: bio.trim(),
        profileImage: profileImage.trim(),
        capital: numCapital,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs">
      <div
        id="profile-editor-modal"
        className="bg-white dark:bg-[#1A1C22] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#F1F2F6] dark:border-[#282B34] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#FFFDFB] dark:bg-[#1E2028] border-b border-[#F1F2F6] dark:border-[#282B34] flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#FF9933] font-black block">
              Settings & Identity
            </span>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F1F2F6]">Edit Committee Profile</h3>
            <p className="text-xs text-gray-400 dark:text-gray-400">
              Manage committee photo, identity, and public festival page details
            </p>
          </div>
          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252833] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Committee Username / URL handle */}
          <div>
            <label htmlFor="edit-profile-username" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
              Committee Username / URL Handle <span className="text-[#FF9933]">*</span>
            </label>
            <div className="relative">
              <input
                id="edit-profile-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. SBVMB Youth"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
              />
            </div>
            <p className="text-[11px] text-[#FF9933] mt-1 flex items-center gap-1 font-medium">
              <span>Public link:</span>
              <code className="bg-[#FFF9F2] dark:bg-[#2E1E0F] px-1.5 py-0.5 rounded text-[#FF9933] font-mono text-[10px] border border-[#FFE8CC] dark:border-[#543516]">
                /{encodeURIComponent(username || "committee")}
              </code>
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="edit-profile-display-name" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
              Display Name (Official Banner Title)
            </label>
            <input
              id="edit-profile-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. SBVMB Youth Ganesh Utsav Committee"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
            />
          </div>

          {/* Capital Budget */}
          <div>
            <label htmlFor="edit-profile-capital" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
              Allocated Budget / Capital (₹) <span className="text-[#FF9933]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold font-mono text-xs">
                ₹
              </div>
              <input
                id="edit-profile-capital"
                type="number"
                min="0"
                step="any"
                required
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="100000"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Total fund collected from donations/chanda or committee contributions.
            </p>
          </div>

          {/* Profile Photo / Avatar - Local Files from Gallery & Presets */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
                Committee Profile Picture
              </label>

              {/* Source Tabs */}
              <div className="flex items-center bg-[#F8F9FA] dark:bg-[#15171C] p-0.5 rounded-lg border border-[#F1F2F6] dark:border-[#282B34] text-[10px]">
                <button
                  type="button"
                  onClick={() => setImageSourceTab("upload")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    imageSourceTab === "upload"
                      ? "bg-white dark:bg-[#252833] text-[#FF9933] shadow-2xs"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  Gallery / File
                </button>
                <button
                  type="button"
                  onClick={() => setImageSourceTab("presets")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    imageSourceTab === "presets"
                      ? "bg-white dark:bg-[#252833] text-[#FF9933] shadow-2xs"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  Festive Presets
                </button>
                <button
                  type="button"
                  onClick={() => setImageSourceTab("url")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    imageSourceTab === "url"
                      ? "bg-white dark:bg-[#252833] text-[#FF9933] shadow-2xs"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  URL
                </button>
              </div>
            </div>

            {/* Tab 1: Upload from local files / gallery */}
            {imageSourceTab === "upload" && (
              <ImageUploadZone
                currentImage={profileImage}
                onImageSelected={(dataUrl) => setProfileImage(dataUrl)}
                onClearImage={() => setProfileImage("")}
                title="Select Profile Photo from Device Gallery"
                subtitle="Drag & drop or tap to choose a photo from your gallery or files"
              />
            )}

            {/* Tab 2: Preset festive avatars */}
            {imageSourceTab === "presets" && (
              <div className="space-y-2">
                <span className="text-[11px] text-gray-400 dark:text-gray-400 font-bold block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF9933]" />
                  Select a festive Ganesh idol photo:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setProfileImage(preset.url)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                        profileImage === preset.url
                          ? "border-[#FF9933] ring-2 ring-[#FF9933]/20"
                          : "border-[#F1F2F6] dark:border-[#282B34] hover:border-[#FFE8CC] dark:hover:border-[#543516]"
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-14 object-cover rounded-lg"
                      />
                      <span className="block text-[9px] text-center truncate px-1 text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: External URL */}
            {imageSourceTab === "url" && (
              <div>
                <input
                  id="edit-profile-image-url"
                  type="url"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  placeholder="https://example.com/our-ganesh-idol.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
              </div>
            )}
          </div>

          {/* Short Bio */}
          <div>
            <label htmlFor="edit-profile-bio" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
              Short Bio / Pandal Location / Message
            </label>
            <textarea
              id="edit-profile-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell devotees about your 2026 pandal theme, timings, immersion date, or contact info..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#F1F2F6] dark:border-[#282B34]">
            <button
              id="cancel-profile-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#252833] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-profile-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {isSubmitting ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
