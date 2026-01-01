
import React, { useState, useEffect } from 'react';
import { 
  Users, Trash2, Edit3, Plus, Search, ShieldCheck, Mail, Clock, 
  Activity, HeartPulse, ShieldAlert, X, Save, UserPlus, CheckCircle, 
  FileText, Database, Filter, Trash, AlertCircle, Loader2, AlertTriangle, ShieldX
} from 'lucide-react';
import { db, auth } from '../services/firebase';
import { 
  collection, query, doc, deleteDoc, updateDoc, setDoc, onSnapshot, getDocs, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { UserProfile, PasswordResetRequest, UserRole, RiskResult } from '../types';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'records'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // New Staff Form State
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'doctor' as UserRole });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // 1. Real-time listener for users
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const uList = snapshot.docs.map(d => ({
        ...d.data(),
        uid: d.id 
      } as UserProfile));
      setUsers(uList);
    }, (err) => console.error("Admin: User fetch error:", err));

    // 2. Real-time listener for ALL assessment records
    const unsubAssessments = onSnapshot(collection(db, "assessments"), (snapshot) => {
      const aList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setAssessments(aList);
      setLoading(false);
    }, (err) => console.error("Admin: Records fetch error:", err));

    // 3. Real-time listener for reset requests
    const unsubRequests = onSnapshot(collection(db, "reset_requests"), (snapshot) => {
      const rList = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as PasswordResetRequest));
      setRequests(rList);
    }, (err) => console.error("Admin: Requests fetch error:", err));

    return () => {
      unsubUsers();
      unsubAssessments();
      unsubRequests();
    };
  }, []);

  const stats = {
    totalUsers: users.length,
    totalRecords: assessments.length,
    pendingResets: requests.filter(r => r.status === 'pending').length
  };

  const getUserName = (uid: string) => {
    const user = users.find(u => u.uid === uid);
    return user ? user.displayName : `UID: ${uid.slice(0, 8)}...`;
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const tempUid = `staff_${Date.now()}`;
      const staffProfile: UserProfile = {
        uid: tempUid,
        email: newStaff.email,
        displayName: newStaff.name,
        role: newStaff.role,
        createdAt: Date.now()
      };
      await setDoc(doc(db, "users", tempUid), staffProfile);
      setShowAddModal(false);
      setNewStaff({ name: '', email: '', role: 'doctor' });
    } catch (err: any) {
      alert("Error creating staff: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", selectedUser.uid), {
        displayName: selectedUser.displayName,
        role: selectedUser.role
      });
      setShowEditModal(false);
    } catch (err: any) {
      alert("Error updating user: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteConfirmation = (u: UserProfile) => {
    if (auth.currentUser?.uid === u.uid) {
      alert("Security Violation: You cannot delete the active administrative session.");
      return;
    }
    setUserToDelete(u);
    setDeleteConfirmInput('');
    setShowDeleteModal(true);
  };

  /**
   * Performs an atomic purge of the user and all associated clinical data.
   * Includes subcollections like 'messages' within consultations.
   */
  const executePurgeAction = async () => {
    if (!userToDelete) return;
    if (deleteConfirmInput !== userToDelete.email) return;

    setActionLoading(true);
    try {
      const batch = writeBatch(db);
      const uid = userToDelete.uid;
      
      // 1. Delete all assessments
      const assessmentQ = query(collection(db, "assessments"), where("userId", "==", uid));
      const assessmentSnapshot = await getDocs(assessmentQ);
      assessmentSnapshot.forEach((doc) => batch.delete(doc.ref));

      // 2. Delete all consultations (where user is patient or doctor)
      const patientConsultQ = query(collection(db, "consultations"), where("patientId", "==", uid));
      const doctorConsultQ = query(collection(db, "consultations"), where("doctorId", "==", uid));
      
      const [pSnap, dSnap] = await Promise.all([getDocs(patientConsultQ), getDocs(doctorConsultQ)]);
      
      const allConsultations = [...pSnap.docs, ...dSnap.docs];
      
      // Process each consultation to delete its messages subcollection
      for (const consultDoc of allConsultations) {
        const msgColRef = collection(db, `consultations/${consultDoc.id}/messages`);
        const msgSnap = await getDocs(msgColRef);
        msgSnap.forEach(msgDoc => batch.delete(msgDoc.ref));
        batch.delete(consultDoc.ref);
      }

      // 3. Delete user document
      const userRef = doc(db, "users", uid);
      batch.delete(userRef);

      // Execute atomic commit
      await batch.commit();
      console.log(`Governance: Atomic purge completed for identity ${uid}`);
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err: any) {
      console.error("Purge Error:", err);
      alert(`Governance Failure: ${err.message || "Database connection interrupted."}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAssessment = async (recordId: string) => {
    if (!recordId) return;
    if (!confirm("Remove this specific clinical assessment from the database?")) return;

    setActionLoading(true);
    try {
      const recordRef = doc(db, "assessments", recordId);
      await deleteDoc(recordRef);
      console.log(`Governance: Assessment record ${recordId} removed.`);
    } catch (err: any) {
      console.error("Record deletion failed:", err);
      alert("Failed to delete record: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecords = assessments.filter(r => 
    r.userId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getUserName(r.userId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing PHRE Datasets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black dark:text-white tracking-tight">Governance Panel</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Complete oversight of PHRE identities and clinical datasets.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <UserPlus className="w-5 h-5" /> Onboard Staff
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
         {[
           { label: 'System Identities', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
           { label: 'Clinical Data Points', value: stats.totalRecords, icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
           { label: 'Access Requests', value: stats.pendingResets, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
         ].map((stat, i) => (
           <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-6 group hover:shadow-md transition-shadow">
             <div className={`${stat.bg} ${stat.color} w-16 h-16 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                <stat.icon className="w-8 h-8" />
             </div>
             <div>
                <p className="text-3xl font-black dark:text-white leading-none mb-1">{stat.value}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{stat.label}</p>
             </div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-6 justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
             <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1.5 rounded-2xl w-full md:w-auto">
                <button 
                  onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center gap-2 justify-center ${activeTab === 'users' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Users className="w-4 h-4" /> Identities
                </button>
                <button 
                  onClick={() => { setActiveTab('records'); setSearchTerm(''); }}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center gap-2 justify-center ${activeTab === 'records' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Database className="w-4 h-4" /> Records
                </button>
             </div>
             <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={activeTab === 'users' ? "Filter identities..." : "Filter clinical records..."}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white rounded-[1.25rem] outline-none focus:ring-2 focus:ring-blue-500 w-full transition-all text-sm font-medium" 
                />
             </div>
          </div>

          <div className="overflow-x-auto min-h-[500px]">
            {activeTab === 'users' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-5">Full Identity</th>
                    <th className="px-8 py-5">Role</th>
                    <th className="px-8 py-5">Onboard Date</th>
                    <th className="px-8 py-5 text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-blue-600 text-sm">
                            {u.displayName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">{u.displayName}</p>
                            <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                          u.role === 'doctor' ? 'bg-teal-100 text-teal-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs text-slate-500 font-medium">{new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setSelectedUser(u); setShowEditModal(true); }}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                            title="Edit Identity"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openDeleteConfirmation(u)}
                            disabled={actionLoading}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all disabled:opacity-30"
                            title="Clinical Purge"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-5">Patient Name</th>
                    <th className="px-8 py-5">Health Score</th>
                    <th className="px-8 py-5">Assessment Date</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="px-8 py-6">
                         <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-white">{getUserName(r.userId)}</span>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">REF: {r.id.slice(0, 12)}...</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <span className="text-sm font-black dark:text-white">{r.score}</span>
                           <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${
                             r.category === 'Critical' ? 'bg-red-100 text-red-600' :
                             r.category === 'High' ? 'bg-orange-100 text-orange-600' :
                             'bg-green-100 text-green-600'
                           }`}>
                             {r.category}
                           </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs text-slate-500 font-medium">{new Date(r.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleDeleteAssessment(r.id)}
                          disabled={actionLoading}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all disabled:opacity-30"
                          title="Permanently Delete Assessment"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {(activeTab === 'users' ? filteredUsers : filteredRecords).length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                <Search className="w-16 h-16 opacity-5 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-40">No records found matching criteria</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-lg font-bold dark:text-white flex items-center gap-2 px-2 uppercase tracking-tight">
             <Clock className="text-orange-500 w-5 h-5" /> Pending Governance
           </h3>
           <div className="space-y-4">
             {requests.filter(r => r.status === 'pending').map((req) => (
               <div key={req.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-orange-200 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em]">Password Reset</p>
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  </div>
                  <p className="font-bold text-slate-800 dark:text-white truncate text-sm mb-4">{req.email}</p>
                  <div className="flex gap-2">
                    <a 
                      href={`mailto:${req.email}?subject=PHRE Account Recovery`}
                      className="flex-1 py-2.5 bg-blue-600 text-white text-[10px] font-black tracking-widest uppercase rounded-xl text-center hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                    >
                      SEND RECOVERY
                    </a>
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, "reset_requests", req.id), { status: 'resolved' });
                        } catch (e) { alert("Failed to resolve request."); }
                      }}
                      className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-colors"
                      title="Mark as Resolved"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
               </div>
             ))}
             {requests.filter(r => r.status === 'pending').length === 0 && (
               <div className="py-16 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                    <ShieldCheck className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Action queue cleared</p>
               </div>
             )}
           </div>

           <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-3 mb-3 text-red-600 dark:text-red-400">
                 <ShieldAlert className="w-5 h-5" />
                 <h4 className="font-bold text-sm">Security Advisory</h4>
              </div>
              <p className="text-[11px] text-red-500 dark:text-red-300 opacity-80 leading-relaxed font-medium">
                Identity purges are atomic. Associated clinical data and active consultations are removed simultaneously from PHRE cloud systems.
              </p>
           </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-red-950/80 backdrop-blur-md p-4">
           <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[3rem] p-12 shadow-2xl animate-fadeIn relative border-4 border-red-600/20">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-6 text-red-600">
                  <ShieldX className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black dark:text-white mb-3">Irreversible Clinical Purge</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                  You are about to permanently remove all trace of <span className="font-bold text-red-600">"{userToDelete.displayName}"</span> from PHRE governance systems.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl mb-8 border border-red-100 dark:border-red-900/40">
                <ul className="text-[11px] text-red-700 dark:text-red-400 font-bold uppercase tracking-widest space-y-2">
                  <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Permanent Identity Deletion</li>
                  <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Erasure of all 32+ clinical data points</li>
                  <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Closure of all active consultations</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Type user email to authorize purge:</label>
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mb-2 text-center select-all">{userToDelete.email}</p>
                  <input 
                    type="text" 
                    placeholder="Enter email to confirm..."
                    className={`${inputClasses} border-red-200 focus:ring-red-500`} 
                    value={deleteConfirmInput} 
                    onChange={e => setDeleteConfirmInput(e.target.value)} 
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executePurgeAction}
                    disabled={actionLoading || deleteConfirmInput !== userToDelete.email}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all disabled:opacity-20 active:scale-95"
                  >
                    {actionLoading ? "PURGING..." : "EXECUTE PURGE"}
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Onboard Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-fadeIn relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-black dark:text-white mb-2">Onboard Staff</h3>
              <p className="text-slate-500 text-sm mb-8 font-medium">Register a new medical professional or system admin.</p>
              
              <form onSubmit={handleAddStaff} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Identity Name</label>
                  <input type="text" required placeholder="Dr. John Doe" className={inputClasses} value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Identifier</label>
                  <input type="email" required placeholder="doctor@phre.org" className={inputClasses} value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Access Tier</label>
                  <select className={inputClasses} value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value as UserRole})}>
                    <option value="doctor">Medical Doctor / Specialist</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
                <button type="submit" disabled={actionLoading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-3">
                  {actionLoading ? "PROCESSING..." : <><UserPlus className="w-5 h-5" /> CREATE RECORD</>}
                </button>
              </form>
           </div>
        </div>
      )}

      {/* Edit Identity Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-fadeIn relative">
              <button onClick={() => setShowEditModal(false)} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-black dark:text-white mb-2">Update Identity</h3>
              <p className="text-slate-500 text-sm mb-8 font-medium">Modifying system attributes for {selectedUser.email}</p>
              
              <form onSubmit={handleUpdateUser} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Display Name</label>
                  <input type="text" required value={selectedUser.displayName} onChange={e => setSelectedUser({...selectedUser, displayName: e.target.value})} className={inputClasses} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Modify Access Tier</label>
                  <select className={inputClasses} value={selectedUser.role} onChange={e => setSelectedUser({...selectedUser, role: e.target.value as UserRole})}>
                    <option value="patient">Standard Patient</option>
                    <option value="doctor">Medical Professional</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
                <button type="submit" disabled={actionLoading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-3">
                  {actionLoading ? "SAVING..." : <><Save className="w-5 h-5" /> UPDATE RECORD</>}
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
