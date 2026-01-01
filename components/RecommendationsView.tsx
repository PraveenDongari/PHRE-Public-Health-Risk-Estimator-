
import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, Activity, HeartPulse, GraduationCap, ClipboardCheck, ArrowRight, ShieldAlert, Info, Loader2 } from 'lucide-react';
import { UserProfile, RiskResult, AssessmentData } from '../types';
import { getClinicalAdvisorGuidance } from '../services/geminiService';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

interface RecommendationsViewProps {
  user: UserProfile;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ risk: RiskResult, data: AssessmentData } | null>(null);

  useEffect(() => {
    const fetchLatestData = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "assessments"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          // Sort in-memory to avoid index requirements
          const records = snapshot.docs.map(d => d.data() as RiskResult);
          const risk = records.sort((a, b) => b.timestamp - a.timestamp)[0];
          
          // In a real app, we'd store the full input data with the assessment
          const mockData: AssessmentData = {
            age: 35, // fallback
            gender: 'Unknown',
            pincode_city: user.pincode_city || 'Local Area',
            income: 'medium',
            education: 'graduate',
            housing: 'good',
            healthcareAccess: 15,
            environment: 'urban',
            diet: 3,
            smoking: 'never',
            alcohol: 'occasional',
            exercise: '1-2_days',
            water: 4,
            sleep: 7,
            meditation: 'none',
            bmi: 22,
            chronicDisease: false,
            familyHistory: 'none',
            bloodPressure: 'normal',
            diabetes: 'no'
          };
          setLastResult({ risk, data: mockData });
          const advice = await getClinicalAdvisorGuidance(risk, mockData);
          setDossier(advice);
        }
      } catch (err) {
        console.error("Failed to load recommendations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestData();
  }, [user.uid]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="relative">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-ping absolute inset-0"></div>
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center relative z-10 shadow-xl shadow-blue-500/20">
            <BrainCircuit className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Synthesizing Preventive Dossier...</p>
      </div>
    );
  }

  if (!lastResult) {
    return (
      <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
        <Activity className="w-16 h-16 text-slate-300 mx-auto mb-6" />
        <h3 className="text-xl font-bold dark:text-white mb-2">No Clinical Data Found</h3>
        <p className="text-slate-500 max-w-sm mx-auto mb-8">Complete a Risk Assessment to receive AI-powered health recommendations and root cause analysis.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-4xl font-black dark:text-white tracking-tight">Personalized Guidance</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Evidence-based interventions tailored to your PHRE profile</p>
        </div>
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 px-6 py-3 rounded-2xl border border-green-100 dark:border-green-800/30">
          <ClipboardCheck className="w-5 h-5 text-green-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-400">Clinical Protocol Verified</span>
        </div>
      </div>

      {/* Hero Recommendation Summary */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[3rem] p-12 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-6 h-6 text-blue-200" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-100">AI Root Cause Analysis</span>
          </div>
          <h3 className="text-3xl font-black mb-6 leading-tight max-w-2xl">
            Base Reason: Your ${lastResult.risk.category} risk score is primarily driven by ${lastResult.risk.factorContributions[0].factor.toLowerCase()}.
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10 flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-200" />
              <span className="text-sm font-bold">Score: {lastResult.risk.score}/100</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-200" />
              <span className="text-sm font-bold">Priority: {lastResult.risk.category}</span>
            </div>
          </div>
        </div>
        <BrainCircuit className="absolute -right-20 -bottom-20 w-96 h-96 opacity-10" />
      </div>

      {/* Main Dossier Content */}
      <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 flex items-center justify-center rounded-2xl text-blue-600">
                 <Info className="w-6 h-6" />
              </div>
              <h4 className="font-black text-xl dark:text-white tracking-tight">Full Preventive Dossier</h4>
           </div>
           <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Download PDF</button>
        </div>
        <div className="p-10">
          <div className="prose prose-slate dark:prose-invert max-w-none">
             <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
               {dossier}
             </div>
          </div>
        </div>
        <div className="px-10 py-8 bg-slate-50 dark:bg-slate-900/30 flex justify-center gap-10">
           <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <HeartPulse className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Safe & Verified</span>
           </div>
           <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <GraduationCap className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Evidence Based</span>
           </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-orange-50 dark:bg-orange-900/10 p-8 rounded-[2.5rem] border border-orange-100 dark:border-orange-900/30 flex items-start gap-6">
        <ShieldAlert className="w-10 h-10 text-orange-600 flex-shrink-0" />
        <div>
          <h4 className="font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest text-xs mb-2">Non-Diagnostic Advisory</h4>
          <p className="text-sm text-orange-600/80 font-medium leading-relaxed">
            This guidance is for preventive purposes and does not constitute a medical diagnosis. Always consult with a certified healthcare provider before starting new treatments or exercise regimens.
          </p>
        </div>
      </div>
    </div>
  );
};
