import React, { useState, useEffect, useRef } from "react";
import { Profile } from "../types";
import { api } from "../api";
import {
  X,
  User,
  Image,
  AlignLeft,
  IndianRupee,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { ImageUploadZone } from "./ImageUploadZone";

interface ProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile;
  onSave: (updated: Partial<Profile>) => Promise<void>;
  onPasswordChanged?: () => void;
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
  onPasswordChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // Profile fields
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [capital, setCapital] = useState<string>("");
  const [imageSourceTab, setImageSourceTab] = useState<"upload" | "presets" | "url">("upload");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live username validation state
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [usernameStatusMsg, setUsernameStatusMsg] = useState<string | null>(null);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Change Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setUsername(currentProfile.username);
      setDisplayName(currentProfile.displayName);
      setBio(currentProfile.bio);
      setProfileImage(currentProfile.profileImage || "");
      setCapital(currentProfile.capital.toString());
    }
    setError(null);
    setPasswordError(null);
    setPasswordSuccess(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [currentProfile, isOpen]);

  if (!isOpen) return null;

  const handleUsernameChange = (raw: string) => {
    // Strip invalid characters immediately
    const clean = raw.replace(/[^A-Za-z0-9_-]/g, "");
    setUsername(clean);

    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);

    if (!clean) {
      setUsernameStatus("idle");
      setUsernameStatusMsg(null);
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus("invalid");
      setUsernameStatusMsg("Committee name must be at least 3 characters.");
      return;
    }
    if (clean.length > 40) {
      setUsernameStatus("invalid");
      setUsernameStatusMsg("Committee name must be 40 characters or fewer.");
      return;
    }

    // If same as current (case-insensitive), it's trivially available for this user
    if (clean.toLowerCase() === currentProfile.normalizedUsername) {
      setUsernameStatus("available");
      setUsernameStatusMsg("This is your current committee name.");
      return;
    }

    setUsernameStatus("checking");
    setUsernameStatusMsg(null);

    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api.checkUsernameAvailability(clean, currentProfile.userId);
        if (res.available) {
          setUsernameStatus("available");
          setUsernameStatusMsg("Username is available!");
        } else {
          setUsernameStatus("taken");
          setUsernameStatusMsg("This committee name is already taken.");
        }
      } catch (err: any) {
        setUsernameStatus("invalid");
        setUsernameStatusMsg(err.message || "Failed to check username availability.");
      }
    }, 600);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError("Committee name cannot be empty.");
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(cleanUsername)) {
      setError("Use only letters, numbers, hyphens (-), and underscores (_). Spaces and special characters are not allowed.");
      return;
    }

    if (cleanUsername.length < 3) {
      setError("Committee name must be at least 3 characters.");
      return;
    }

    if (cleanUsername.length > 40) {
      setError("Committee name must be 40 characters or fewer.");
      return;
    }

    if (usernameStatus === "taken") {
      setError(usernameStatusMsg || "This committee name is already taken.");
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("New password must be at least 8 characters long and contain both letters and numbers.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess("Password updated successfully! Logging out of sessions...");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        onClose();
        if (onPasswordChanged) {
          onPasswordChanged();
        } else {
          window.location.href = "/login";
        }
      }, 1200);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password. Please check your current password.");
    } finally {
      setIsChangingPassword(false);
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
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F1F2F6]">Committee Settings</h3>
            <p className="text-xs text-gray-400 dark:text-gray-400">
              Manage committee photo, identity, and account security
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

        {/* Modal Section Tabs */}
        <div className="flex border-b border-[#F1F2F6] dark:border-[#282B34] px-6 bg-[#F8F9FA] dark:bg-[#15171C]">
          <button
            type="button"
            id="tab-profile-identity"
            onClick={() => setActiveTab("profile")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "profile"
                ? "border-[#FF9933] text-[#FF9933] dark:text-[#FFB366]"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & Budget</span>
          </button>
          <button
            type="button"
            id="tab-change-password"
            onClick={() => setActiveTab("password")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "password"
                ? "border-[#FF9933] text-[#FF9933] dark:text-[#FFB366]"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Tab 1: Profile & Budget Form */}
        {activeTab === "profile" ? (
          <form onSubmit={handleSubmitProfile} className="p-6 space-y-4 overflow-y-auto">
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Committee Username / URL handle */}
            <div>
              <label htmlFor="edit-profile-username" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
                Committee Name / Public URL <span className="text-[#FF9933]">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-profile-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="ganesh_utsav"
                  maxLength={40}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    usernameStatus === "available"
                      ? "border-emerald-400 dark:border-emerald-600"
                      : usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "border-rose-400 dark:border-rose-600"
                      : "border-[#F1F2F6] dark:border-[#2E323D]"
                  } bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all`}
                />
              </div>
              {/* Helper hint */}
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Use only letters, numbers, - or _
              </p>
              {/* Live status badge */}
              {usernameStatus !== "idle" && (
                <p
                  className={`text-[11px] mt-1 font-semibold ${
                    usernameStatus === "available"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : usernameStatus === "checking"
                      ? "text-gray-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {usernameStatus === "checking"
                    ? "Checking availability..."
                    : usernameStatusMsg}
                </p>
              )}
              {/* Dynamic URL preview */}
              <p className="text-[11px] text-[#FF9933] mt-1 flex items-center gap-1 font-medium">
                <span>Public link:</span>
                <code className="bg-[#FFF9F2] dark:bg-[#2E1E0F] px-1.5 py-0.5 rounded text-[#FF9933] font-mono text-[10px] border border-[#FFE8CC] dark:border-[#543516]">
                  /{username.trim() || "committee"}
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

            {/* Profile Photo */}
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

              {imageSourceTab === "upload" && (
                <ImageUploadZone
                  currentImage={profileImage}
                  onImageSelected={(dataUrl) => setProfileImage(dataUrl)}
                  onClearImage={() => setProfileImage("")}
                  title="Select Profile Photo from Device Gallery"
                  subtitle="Drag & drop or tap to choose a photo from your gallery or files"
                />
              )}

              {imageSourceTab === "presets" && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Select a festive Ganesh idol photo:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_AVATARS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => setProfileImage(preset.url)}
                        className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                          profileImage === preset.url
                            ? "border-[#FF9933] ring-2 ring-[#FF9933]/30"
                            : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white py-0.5 px-1 truncate text-center">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
        ) : (
          /* Tab 2: Change Password Form (Authenticated) */
          <form onSubmit={handleChangePassword} className="p-6 space-y-4 overflow-y-auto">
            {passwordError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs p-3 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="p-3 bg-[#FFF9F2] dark:bg-[#2E1E0F] border border-[#FFE8CC] dark:border-[#543516] rounded-xl text-xs text-[#FF9933] dark:text-[#FFB366] flex items-start gap-2">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                For security, changing your password will invalidate all active sessions. You will need to log in again with your new password.
              </span>
            </div>

            {/* Current Password */}
            <div>
              <label
                htmlFor="current-password"
                className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
              >
                Current Password <span className="text-[#FF9933]">*</span>
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
              >
                New Password <span className="text-[#FF9933]">*</span>
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="confirm-new-password"
                className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
              >
                Confirm New Password <span className="text-[#FF9933]">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#15171C] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements Helper */}
            <div className="bg-[#F8F9FA] dark:bg-[#1E2028] p-3 rounded-xl space-y-1 text-[11px] border border-[#F1F2F6] dark:border-[#282B34]">
              <span className="font-bold text-gray-600 dark:text-gray-300 block mb-1">
                Password Requirements:
              </span>
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <span className={newPassword.length >= 8 ? "text-emerald-500 font-bold" : ""}>
                  {newPassword.length >= 8 ? "✓" : "•"}
                </span>
                <span>Minimum 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <span className={/[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword) ? "text-emerald-500 font-bold" : ""}>
                  {/[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword) ? "✓" : "•"}
                </span>
                <span>Must contain both letters and numbers</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <span className={confirmPassword && newPassword === confirmPassword ? "text-emerald-500 font-bold" : ""}>
                  {confirmPassword && newPassword === confirmPassword ? "✓" : "•"}
                </span>
                <span>Passwords match</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#F1F2F6] dark:border-[#282B34]">
              <button
                id="cancel-password-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#252833] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                id="change-password-submit-btn"
                type="submit"
                disabled={isChangingPassword}
                className="px-5 py-2.5 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {isChangingPassword ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
