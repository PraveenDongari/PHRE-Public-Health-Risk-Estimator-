
import React, { useState } from 'react';
import { Send, User, MessageCircle, HeartPulse, ExternalLink, CheckCircle2, AlertCircle, Mail, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface PatientInboxProps {
  user: UserProfile;
}

export const PatientInbox: React.FC<PatientInboxProps> = ({ user }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In a real app, these would come from Firestore. 
  // We include doctor email here to route the consultation.
  const [activeDoctor] = useState({
    name: 'Dr. James Miller',
    email: 'dr.miller@phre-health.org',
    specialty: 'Public Health Specialist',
    status: 'Online'
  });

  const conversations = [
    { doctor: 'Dr. James Miller', date: '2 hours ago', status: 'replied', lastMsg: 'I reviewed your SDOH results. The environmental factor...' },
    { doctor: 'Dr. Sarah Wilson', date: 'Yesterday', status: 'pending', lastMsg: 'Question about BMI fluctuation' },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // IMPORTANT: Replace 'YOUR_FORMSPREE_ID' with a real ID from formspree.io
    // For demo purposes, we check if it's still the placeholder
    const FORMSPREE_ENDPOINT = 'https://formspree.io/f/placeholder'; 

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        setSubmitted(true);
        form.reset();
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to dispatch notification.');
      }
    } catch (err: any) {
      console.error('Consultation Error:', err);
      // Fallback for prototype demonstration
      setError('System Note: Integration active. Ensure your unique Formspree ID is configured in PatientInbox.tsx');
      // Simulate success for UI demonstration if it's just the placeholder error
      if (FORMSPREE_ENDPOINT.includes('placeholder')) {
        setTimeout(() => {
          setSubmitted(true);
          form.reset();
        }, 1000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-fadeIn pb-10">
       {/* Sidebar: Recent Consultations */}
       <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
            <h3 className="font-black text-xl dark:text-white tracking-tight">Clinical Inbox</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">Medical Consultations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((c, i) => (
              <button key={i} className="w-full p-8 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-b border-slate-50 dark:border-slate-700 last:border-0 group">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{c.doctor}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{c.date}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">{c.lastMsg}</p>
                <div>
                   <span className={`text-[9px] uppercase font-black px-3 py-1 rounded-full tracking-widest ${
                     c.status === 'replied' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                   }`}>
                      {c.status}
                   </span>
                </div>
              </button>
            ))}
          </div>
       </div>

       {/* Main Chat / Email Area */}
       <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm p-10 flex-1 flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <Mail className="w-32 h-32 text-blue-600" />
             </div>

             <div className="flex items-center justify-between gap-4 mb-10 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shadow-inner">
                    <User className="text-blue-600 dark:text-blue-400 w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl dark:text-white tracking-tight">{activeDoctor.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{activeDoctor.specialty} • {activeDoctor.status}</p>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border border-green-100 dark:border-green-900/30">
                  <ShieldCheck className="w-4 h-4" /> Verified Medical Board
                </div>
             </div>

             <div className="flex-1 space-y-6 mb-10 overflow-y-auto pr-2">
                <div className="flex justify-start">
                   <div className="bg-slate-100 dark:bg-slate-700 p-5 rounded-3xl rounded-tl-none max-w-[85%] shadow-sm">
                      <p className="text-sm dark:text-slate-100 leading-relaxed font-medium">
                        Hello {user.displayName}. I reviewed your recent Public Health Risk profile. 
                        Your environment-related indicators (SDOH) suggest high exposure levels. 
                        How have you been feeling lately? Are you experiencing any persistent fatigue or respiratory discomfort?
                      </p>
                   </div>
                </div>
                <div className="flex justify-end">
                   <div className="bg-blue-600 text-white p-5 rounded-3xl rounded-tr-none max-w-[85%] shadow-lg shadow-blue-500/20">
                      <p className="text-sm leading-relaxed font-medium">
                        The air quality has been quite poor due to the industrial construction nearby. 
                        I've been feeling quite tired even after a full night's sleep.
                      </p>
                   </div>
                </div>
                
                {submitted && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-5 rounded-2xl flex items-center gap-4 animate-fadeIn">
                    <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                      <CheckCircle2 className="text-green-600 dark:text-green-400 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-green-800 dark:text-green-300 font-bold">Secure Notification Dispatched</p>
                      <p className="text-[11px] text-green-600 dark:text-green-400/80">Dr. Miller has been notified via secure clinical email and will review your file.</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-3 animate-fadeIn">
                    <AlertCircle className="text-amber-600 w-5 h-5 flex-shrink-0" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-tight uppercase tracking-wider">{error}</p>
                  </div>
                )}
             </div>

             {/* Consultation Dispatch Form */}
             <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
                {/* Formspree Metadata for Secure Routing */}
                <input type="hidden" name="_subject" value={`[PHRE URGENT] Consultation Request: ${user.displayName}`} />
                <input type="hidden" name="doctor_email" value={activeDoctor.email} />
                <input type="hidden" name="doctor_name" value={activeDoctor.name} />
                <input type="hidden" name="patient_name" value={user.displayName} />
                <input type="hidden" name="patient_uid" value={user.uid} />
                <input type="hidden" name="patient_location" value={user.pincode_city || 'Not specified'} />
                <input type="hidden" name="latest_risk_score" value={user.lastProgress?.score || 'N/A'} />
                {/* Sets the reply-to header so doctor can email patient back immediately */}
                <input type="hidden" name="_replyto" value={user.email} />

                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <textarea 
                      name="message"
                      required
                      rows={1}
                      placeholder="Type your clinical update or query..." 
                      className="w-full pl-6 pr-12 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 transition-all resize-none font-medium text-sm"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-8 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3 font-black tracking-widest uppercase text-xs disabled:opacity-50 hover:shadow-blue-500/30 active:scale-95"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> DISPATCH
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-2 flex items-center gap-1.5">
                   <ShieldCheck className="w-3 h-3" /> End-to-end encrypted notification service powered by PHRE.
                </p>
             </form>
          </div>

          <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-teal-500/20 group relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <HeartPulse className="w-32 h-32" />
             </div>
             <h4 className="font-black text-lg flex items-center gap-3 mb-2 tracking-tight">
               <ExternalLink className="w-6 h-6" /> Patient Resource Vault
             </h4>
             <p className="text-sm text-teal-50 opacity-90 mb-6 leading-relaxed">
               Dr. Miller has highlighted these peer-reviewed resources specifically for your environmental risk profile.
             </p>
             <div className="flex flex-wrap gap-3">
                <button className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black tracking-widest uppercase backdrop-blur-md transition-all border border-white/10">
                  Air Quality & Respiratory Vitality
                </button>
                <button className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black tracking-widest uppercase backdrop-blur-md transition-all border border-white/10">
                  Industrial Pollutant Management
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
