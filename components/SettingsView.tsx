
import React, { useState, useRef, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { Shield, Key, AlertCircle, CheckCircle, Save, Camera, User, Trash2, Loader2, MapPin, BadgeCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface SettingsViewProps {
  user: UserProfile;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  // Profile state
  const [displayName, setDisplayName] = useState(user.displayName);
  const [cityPincode, setCityPincode] = useState(user.pincode_city || '');
  
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(user.displayName);
    setCityPincode(user.pincode_city || '');
  }, [user.displayName, user.pincode_city]);

  const handleUpdateProfileData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileMessage({ type: 'error', text: 'Display name cannot be empty.' });
      return;
    }

    setProfileLoading(true);
    setProfileMessage(null);

    try {
      // 1. Update Firestore Profile
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        pincode_city: cityPincode.trim()
      });

      // 2. Update Firebase Auth Profile for consistency
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { 
          displayName: displayName.trim() 
        });
      }

      setProfileMessage({ type: 'success', text: 'Identity information persisted successfully.' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (error: any) {
      console.error("Profile Persistence Error:", error);
      setProfileMessage({ type: 'error', text: error.message || 'Governance error: Data persistence failed.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPass.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) return;

      const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
      await reauthenticateWithCredential(currentUser, credential);
      
      await updatePassword(currentUser, newPass);
      
      setMessage({ type: 'success', text: 'Security credentials updated.' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setMessage(null), 4000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Credential update failed. Verify current password.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("Asset rejection: Image size exceeds 1MB threshold.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, "users", user.uid), {
          photoURL: base64String
        });
        setProfileMessage({ type: 'success', text: 'Avatar asset updated.' });
        setTimeout(() => setProfileMessage(null), 3000);
      } catch (err) {
        console.error("Asset persistence failed:", err);
        setProfileMessage({ type: 'error', text: 'Failed to save profile asset.' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = async () => {
    if (!confirm("Remove clinical profile avatar?")) return;
    setUploading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: ""
      });
      setProfileMessage({ type: 'success', text: 'Avatar asset removed.' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err) {
      console.error("Asset removal failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 transition-colors font-medium";

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black dark:text-white tracking-tight">Account Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your clinical security and identity preferences</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
          <BadgeCheck className="w-4 h-4" /> SECURE SESSION
        </div>
      </div>

      {/* Profile Identity Section */}
      <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <User className="w-64 h-64" />
        </div>

        <div className="flex items-center gap-3 mb-10 relative z-10">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
            <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-black dark:text-white tracking-tight">Profile Identity</h3>
        </div>

        {profileMessage && (
          <div className={`mb-8 p-5 rounded-2xl flex items-center gap-4 animate-fadeIn relative z-10 ${
            profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/30' : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30'
          }`}>
            {profileMessage.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <p className="text-sm font-bold">{profileMessage.text}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-10 mb-10 pb-10 border-b border-slate-100 dark:border-slate-700/50 relative z-10">
          <div className="relative">
            <div className="w-36 h-36 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-4xl font-black text-slate-300 overflow-hidden ring-4 ring-slate-100 dark:ring-slate-700 shadow-inner group">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              ) : (
                <span className="opacity-40">{user.displayName.charAt(0)}</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 transition-all transform hover:scale-110 active:scale-95"
              title="Change Asset"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              className="hidden" 
              accept="image/*" 
            />
          </div>

          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Account</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{user.displayName}</p>
              <p className="text-sm text-slate-500 font-medium font-mono">{user.email}</p>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-900/30"
              >
                Change Avatar
              </button>
              {user.photoURL && (
                <button 
                  onClick={removePhoto}
                  className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-900/30 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfileData} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name / Alias</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your full name" 
                  className={`${inputClasses} pl-12 border-slate-100 dark:border-slate-700`} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Geographic Indicator</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  value={cityPincode}
                  onChange={e => setCityPincode(e.target.value)}
                  placeholder="e.g. London, EC1A 1BB" 
                  className={`${inputClasses} pl-12 border-slate-100 dark:border-slate-700`} 
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={profileLoading}
              className="px-10 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-500/10 active:scale-95"
            >
              {profileLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save className="w-5 h-5" /> PERSIST CHANGES</>}
            </button>
          </div>
        </form>
      </div>

      {/* Security Section */}
      <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Key className="w-64 h-64" />
        </div>

        <div className="flex items-center gap-3 mb-10 relative z-10">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-black dark:text-white tracking-tight">Security Credentials</h3>
        </div>

        {message && (
          <div className={`mb-8 p-5 rounded-2xl flex items-center gap-4 animate-fadeIn relative z-10 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/30' : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-8 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verify Current Credential</label>
            <input 
              type="password" 
              required
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              placeholder="Enter current password" 
              className={`${inputClasses} border-slate-100 dark:border-slate-700`} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target New Credential</label>
              <input 
                type="password" 
                required
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Entropy: Min 6 chars" 
                className={`${inputClasses} border-slate-100 dark:border-slate-700`} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Target</label>
              <input 
                type="password" 
                required
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Re-enter to verify" 
                className={`${inputClasses} border-slate-100 dark:border-slate-700`} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <><Shield className="w-5 h-5" /> ROTATE SECURITY KEY</>}
          </button>
        </form>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-4 text-slate-600 dark:text-slate-400">
           <Shield className="w-6 h-6" />
           <h3 className="text-lg font-black tracking-tight">Audit & Privacy Compliance</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 opacity-80 leading-relaxed font-medium">
          Metadata changes are logged for system integrity. PHRE uses end-to-end clinical data protection. Identity modifications are reflected across all clinical consultations instantly.
        </p>
      </div>
    </div>
  );
};
