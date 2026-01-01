
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle, HeartPulse, ExternalLink, CheckCircle2, AlertCircle, Mail, ShieldCheck, Search, ChevronRight, Clock, History as HistoryIcon, Plus, UserCheck, Inbox, Stethoscope, Share2 } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, orderBy, limit, setDoc, getDocs, or, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { UserProfile, Message, Consultation } from '../types';

interface ConsultationPortalProps {
  user: UserProfile;
}

export const ConsultationPortal: React.FC<ConsultationPortalProps> = ({ user }) => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Consultation[]>([]);
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorView, setDoctorView] = useState<'active' | 'waiting_room'>('active');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Formspree Clinical Gateway ID
  const FORMSPREE_ID = "xpzeqevp"; 

  useEffect(() => {
    const colRef = collection(db, "consultations");
    
    if (user.role === 'patient') {
      const q = query(colRef, where("patientId", "==", user.uid));
      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));
        setConsultations(list.sort((a, b) => b.lastUpdated - a.lastUpdated));
        setLoading(false);
      });
    }

    if (user.role === 'doctor') {
      const qActive = query(colRef, where("doctorId", "==", user.uid));
      const unsubActive = onSnapshot(qActive, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));
        setConsultations(list.sort((a, b) => b.lastUpdated - a.lastUpdated));
      });

      const qPending = query(colRef, where("status", "==", "pending"));
      const unsubPending = onSnapshot(qPending, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consultation));
        setPendingRequests(list.sort((a, b) => b.lastUpdated - a.lastUpdated));
        setLoading(false);
      });

      return () => {
        unsubActive();
        unsubPending();
      };
    }
  }, [user.uid, user.role]);

  useEffect(() => {
    if (!activeConsultation || activeConsultation.status === 'pending') {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `consultations/${activeConsultation.id}/messages`),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [activeConsultation?.id, activeConsultation?.status]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Dispatches a clinical notification via Formspree.
   * Enables the doctor to reply directly to the patient's email.
   */
  const notifyViaFormspree = async (type: 'request' | 'message', text: string, consultation: Consultation) => {
    const endpoint = `https://formspree.io/f/${FORMSPREE_ID}`;
    const formData = new FormData();
    
    const subject = type === 'request' 
      ? `[PHRE URGENT] New Consultation Request from ${user.displayName}`
      : `[PHRE] Secure Message from ${user.displayName}`;

    formData.append('_subject', subject);
    formData.append('Patient Name', user.displayName);
    formData.append('Patient Email', user.email);
    formData.append('Risk Score', user.lastProgress?.score.toString() || 'N/A');
    formData.append('Risk Category', user.lastProgress?.category || 'Uncalculated');
    formData.append('Region/City', user.pincode_city || 'Not provided');
    formData.append('Clinical Query', text);
    
    // Critical: Setting the _replyto ensures the doctor can reply to the patient via email client
    formData.append('_replyto', user.email);
    
    // Technical metadata for the portal link (mock)
    formData.append('Portal Link', `https://phre-health.org/messages/${consultation.id}`);
    
    try {
      await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      console.log(`Clinical email notification dispatched: ${type}`);
    } catch (err) {
      console.warn("Clinical dispatch failed. Check Formspree ID configuration.", err);
    }
  };

  const handleCreateRequest = async () => {
    const initialText = "Requesting expert review for recent PHRE risk indicators. Seeking intervention guidance.";
    const id = `req_${user.uid}_${Date.now()}`;
    const newRequest: Consultation = {
      id,
      patientId: user.uid,
      patientName: user.displayName,
      patientEmail: user.email,
      patientPincode: user.pincode_city,
      doctorId: null,
      doctorName: null,
      doctorEmail: null,
      lastMessage: initialText,
      lastUpdated: Date.now(),
      status: 'pending'
    };
    
    setLoading(true);
    try {
      await setDoc(doc(db, "consultations", id), newRequest);
      // Log the notification in Firestore to show intent
      await addDoc(collection(db, `consultations/${id}/messages`), {
        senderId: 'system',
        senderName: 'Clinical Bot',
        text: 'Consultation request broadcasted to the medical board. Doctors notified via secure clinical email.',
        timestamp: Date.now()
      });
      
      await notifyViaFormspree('request', initialText, newRequest);
      setActiveConsultation(newRequest);
    } catch (err) {
      console.error("Governance Failure: Consultation request could not be persisted.", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPatient = async (c: Consultation) => {
    if (user.role !== 'doctor') return;
    setSending(true);
    try {
      const update = {
        doctorId: user.uid,
        doctorName: user.displayName,
        doctorEmail: user.email,
        status: 'active',
        lastUpdated: Date.now(),
        lastMessage: `Claimed by ${user.displayName}. DIRECT CHANNEL ESTABLISHED.`
      };
      await updateDoc(doc(db, "consultations", c.id), update);
      
      // Post system message about acceptance
      await addDoc(collection(db, `consultations/${c.id}/messages`), {
        senderId: 'system',
        senderName: 'Clinical Bot',
        text: `Consultation request accepted by ${user.displayName}. HIPAA-secure direct channel is now open.`,
        timestamp: Date.now()
      });

      setActiveConsultation({ ...c, ...update } as Consultation);
      setDoctorView('active');
    } catch (err) {
      alert("Database error: Clinical claim unsuccessful.");
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConsultation || activeConsultation.status === 'pending') return;

    setSending(true);
    const text = inputText;
    setInputText('');

    try {
      const msgData = {
        senderId: user.uid,
        senderName: user.displayName,
        text: text,
        timestamp: Date.now()
      };

      // 1. Log in the Consultation Portal (Firestore)
      await addDoc(collection(db, `consultations/${activeConsultation.id}/messages`), msgData);
      
      // 2. Update the meta-record for sidebar sorting
      await updateDoc(doc(db, "consultations", activeConsultation.id), {
        lastMessage: text,
        lastUpdated: Date.now()
      });

      // 3. If patient sends, ensure the doctor gets an email alert via Formspree
      if (user.role === 'patient') {
        await notifyViaFormspree('message', text, activeConsultation);
      }
    } catch (err) {
      console.error("Communication failure:", err);
    } finally {
      setSending(false);
    }
  };

  const displayList = user.role === 'doctor' && doctorView === 'waiting_room' ? pendingRequests : consultations;
  const filteredList = displayList.filter(c => 
    (user.role === 'doctor' ? c.patientName : (c.doctorName || 'Seeking Specialist')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
        <Loader2 />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)] animate-fadeIn">
      {/* Sidebar: Navigation & Directory */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-xl dark:text-white tracking-tight">Clinical Comms</h3>
            {user.role === 'patient' && (
              <button 
                onClick={handleCreateRequest}
                className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                title="Broadcast Clinical Query"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden xl:block text-[10px] font-black uppercase tracking-widest">New Query</span>
              </button>
            )}
          </div>

          {user.role === 'doctor' && (
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl mb-6">
              <button 
                onClick={() => setDoctorView('active')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${doctorView === 'active' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-500'}`}
              >
                <Inbox className="w-4 h-4" /> My Roster
              </button>
              <button 
                onClick={() => setDoctorView('waiting_room')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 relative ${doctorView === 'waiting_room' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-500'}`}
              >
                <Stethoscope className="w-4 h-4" /> Waiting Room
                {pendingRequests.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold animate-pulse">{pendingRequests.length}</span>}
              </button>
            </div>
          )}
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search directory..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredList.map((c) => (
            <button 
              key={c.id} 
              onClick={() => setActiveConsultation(c)}
              className={`w-full p-8 text-left transition-all border-b border-slate-50 dark:border-slate-700/50 last:border-0 group flex items-center gap-4 ${
                activeConsultation?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                activeConsultation?.id === c.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}>
                {(user.role === 'doctor' ? c.patientName : (c.doctorName || '?')).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-slate-800 dark:text-white truncate text-sm">
                    {user.role === 'doctor' ? c.patientName : (c.doctorName || 'Pending Broadcast')}
                  </p>
                  <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">
                    {new Date(c.lastUpdated).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === 'pending' && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>}
                  <p className={`text-xs truncate italic leading-tight ${c.status === 'pending' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}>"{c.lastMessage}"</p>
                </div>
              </div>
              <ChevronRight className={`w-5 h-5 transition-transform ${activeConsultation?.id === c.id ? 'text-blue-600 translate-x-1' : 'text-slate-300'}`} />
            </button>
          ))}
          {filteredList.length === 0 && (
            <div className="p-20 text-center opacity-30">
              <Inbox className="w-16 h-16 mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest leading-loose">No active consultations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Secure Clinical Channel */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {activeConsultation ? (
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full relative overflow-hidden">
            {/* Unified Clinical Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-2xl dark:text-white tracking-tight">
                    {user.role === 'doctor' ? activeConsultation.patientName : (activeConsultation.doctorName || 'Clinical Broadcast active')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${activeConsultation.status === 'pending' ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></span>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      {activeConsultation.status === 'pending' ? 'Marketplace Visibility: ON' : 'Direct Patient-Doctor Link: SECURE'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                 {user.role === 'doctor' && activeConsultation.status === 'pending' && (
                    <button 
                      onClick={() => handleClaimPatient(activeConsultation)}
                      disabled={sending}
                      className="px-8 py-3.5 bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-3 shadow-xl shadow-green-500/20 active:scale-95"
                    >
                      <UserCheck className="w-5 h-5" /> Claim Case
                    </button>
                 )}
                 <div className="hidden md:flex items-center gap-3 px-5 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                    <ShieldCheck className="w-5 h-5" /> HIPAA LOGS ACTIVE
                  </div>
              </div>
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth bg-slate-50/30 dark:bg-slate-900/10">
              {activeConsultation.status === 'pending' && (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-8 rounded-[2rem] border border-orange-100 dark:border-orange-900/30 text-center animate-fadeIn mb-8">
                   <Mail className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-bounce" />
                   <h4 className="font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest text-xs mb-2">Broadcast Dispatched via Formspree</h4>
                   <p className="text-sm text-orange-600/80 font-medium leading-relaxed max-w-sm mx-auto">
                     The PHRE clinical network has been notified. This consultation is visible to all certified medical professionals until claimed.
                   </p>
                </div>
              )}

              {messages.length === 0 && activeConsultation.status === 'active' && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Clock className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40">Establishing clinical record baseline...</p>
                </div>
              )}

              {messages.map((m, idx) => (
                <div key={m.id || idx} className={`flex ${m.senderId === user.uid ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div className={`max-w-[80%] p-6 rounded-[2rem] shadow-sm relative ${
                    m.senderId === 'system' 
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-center mx-auto border border-dashed border-slate-300 dark:border-slate-700 w-full' 
                      : m.senderId === user.uid 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-700 dark:text-white border border-slate-100 dark:border-slate-600 rounded-tl-none'
                  }`}>
                    {m.senderId !== 'system' && (
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">
                        {m.senderName} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <p className={`text-sm leading-relaxed font-semibold ${m.senderId === 'system' ? 'italic' : ''}`}>{m.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Communication Interface */}
            <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 relative z-10">
              <form onSubmit={handleSendMessage} className="flex gap-4">
                <div className="flex-1 relative">
                  <textarea 
                    disabled={activeConsultation.status === 'pending'}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    rows={1}
                    placeholder={activeConsultation.status === 'pending' ? "Session locked until specialist claims request..." : "Type clinical update (Auto-EMAILS doctor)..."}
                    className="w-full pl-6 pr-14 py-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm transition-all disabled:opacity-50 resize-none shadow-inner"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <MessageCircle className="w-6 h-6 text-slate-300" />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={sending || !inputText.trim() || activeConsultation.status === 'pending'}
                  className="px-10 bg-blue-600 text-white rounded-[1.5rem] shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 font-black tracking-widest uppercase text-xs disabled:opacity-50 active:scale-95 shadow-blue-500/20"
                >
                  {sending ? <Loader2 className="w-5 h-5" /> : <><Send className="w-4 h-4" /> DISPATCH</>}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 group cursor-help">
                   <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-colors" />
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                     In-Portal Log Synchronized with Email Notification
                   </p>
                </div>
                {user.role === 'patient' && activeConsultation.status === 'active' && (
                  <p className="text-[9px] text-blue-500 font-black uppercase tracking-tighter flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    DIRECT LINK TO {activeConsultation.doctorName}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex-1 flex flex-col items-center justify-center p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
              <HeartPulse className="w-96 h-96" />
            </div>
            <div className="w-40 h-40 bg-slate-50 dark:bg-slate-900/50 rounded-[3.5rem] flex items-center justify-center mb-10 shadow-inner">
              <Inbox className="w-20 h-20 text-slate-200 dark:text-slate-700" />
            </div>
            <h4 className="text-3xl font-black dark:text-white mb-4 tracking-tight">Clinical Governance Portal</h4>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium leading-relaxed mb-10">
              {user.role === 'patient' 
                ? "Initiate a secure clinical consultation. Your query will be broadcast to our specialist medical board via encrypted email." 
                : "Manage your active patient roster or browse the waiting room to claim new clinical consultation requests."}
            </p>
            {user.role === 'patient' && (
              <button 
                onClick={handleCreateRequest}
                className="px-12 py-5 bg-blue-600 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/30 active:scale-95 flex items-center gap-4"
              >
                <Plus className="w-6 h-6" /> START NEW CONSULTATION
              </button>
            )}
          </div>
        )}

        {/* Action Banner: Specialist Vault */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-slate-500/20 group relative overflow-hidden">
           <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform">
              <HeartPulse className="w-48 h-48" />
           </div>
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div>
                <h4 className="font-black text-2xl flex items-center gap-3 mb-3 tracking-tight">
                  <ExternalLink className="w-7 h-7 text-blue-400" /> Specialist Recovery Vault
                </h4>
                <p className="text-sm text-slate-300 opacity-90 max-w-md leading-relaxed font-medium">
                  Evidence-based guidelines and peer-reviewed protocols for managing SDOH-driven public health risks.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3.5 bg-white/10 hover:bg-white/20 rounded-2xl text-[11px] font-black tracking-widest uppercase backdrop-blur-md transition-all border border-white/10 flex items-center gap-2">
                   Clinical Protocol <ChevronRight className="w-4 h-4" />
                </button>
                <button className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all shadow-lg flex items-center gap-2">
                   Case Archive <Share2 className="w-4 h-4" />
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className = "w-12 h-12" }) => (
  <div className={`flex flex-col items-center justify-center h-full gap-4 ${className}`}>
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Synchronizing dataset...</p>
  </div>
);
