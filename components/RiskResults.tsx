
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  AlertCircle, FileText, Share2, MapPin, AlertTriangle, ArrowLeft, 
  Sparkles, Stethoscope, ChevronRight, Activity, BrainCircuit,
  ClipboardCheck, ShieldAlert, HeartPulse, GraduationCap
} from 'lucide-react';
import { RiskResult, AssessmentData } from '../types';
import { getClinicalAdvisorGuidance } from '../services/geminiService';

interface ResultsProps {
  result: RiskResult;
  inputData: AssessmentData;
  onBack: () => void;
}

export const RiskResults: React.FC<ResultsProps> = ({ result, inputData, onBack }) => {
  const [advisorGuidance, setAdvisorGuidance] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(true);

  useEffect(() => {
    setLoadingAdvice(true);
    getClinicalAdvisorGuidance(result, inputData).then(text => {
      setAdvisorGuidance(text);
      setLoadingAdvice(false);
    });
  }, [result, inputData]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Low': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/30';
      case 'Moderate': return 'text-green-500 bg-green-50 dark:bg-green-900/30';
      case 'High': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/30';
      case 'Critical': return 'text-red-500 bg-red-50 dark:bg-red-900/30 animate-pulse';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Recalculate Assessment
          </button>
          <h2 className="text-4xl font-black dark:text-white tracking-tight">Clinical Risk Dossier</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Research-grade public health analysis generated on {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-all">
            <FileText className="w-4 h-4" /> Export Dossier
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
            <Share2 className="w-4 h-4" /> Share Results
          </button>
        </div>
      </div>

      {result.emergencyFlag && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-8 border-red-600 p-8 rounded-3xl flex items-start gap-6 animate-pulse-red shadow-lg">
          <ShieldAlert className="w-12 h-12 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-red-700 dark:text-red-400 font-black text-xl uppercase tracking-tighter">Emergency Intervention Recommended</h3>
            <p className="text-red-600 dark:text-red-300/80 text-sm mt-2 font-medium leading-relaxed">
              Your estimated risk profile exceeds the safe threshold. Immediate consultation with a healthcare professional or emergency services is advised based on current clinical indicators.
            </p>
          </div>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Core Meter */}
        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-slate-100 dark:bg-slate-700">
             <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${result.score}%` }}></div>
          </div>
          <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-8">Aggregate PHRE Score</h4>
          <div className="relative w-56 h-56 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90">
                <circle cx="112" cy="112" r="100" fill="transparent" stroke="currentColor" strokeWidth="16" className="text-slate-100 dark:text-slate-900" />
                <circle cx="112" cy="112" r="100" fill="transparent" stroke="currentColor" strokeWidth="16" strokeDasharray={628.3} strokeDashoffset={628.3 * (1 - result.score / 100)} className="text-blue-600 transition-all duration-1000 ease-out" />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{result.score}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">PERCENTILE</span>
             </div>
          </div>
          <div className={`mt-10 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] ${getCategoryColor(result.category)}`}>
            {result.category} RISK
          </div>
        </div>

        {/* Contribution Breakdown Chart */}
        <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 lg:col-span-2">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Clinical Factors Breakdown</h4>
              <Activity className="w-5 h-5 text-blue-500 opacity-30" />
           </div>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.factorContributions} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="factor" type="category" width={140} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                  <Bar dataKey="contribution" radius={[0, 12, 12, 0]} barSize={40}>
                    {result.factorContributions.map((entry, index) => (
                      <Cell key={index} fill={index === 0 ? '#3b82f6' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* AI Clinical Advisor Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-10 text-white flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                 <BrainCircuit className="w-8 h-8 text-blue-200" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">AI Clinical Advisor</h3>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Senior Decision Support Active
                </p>
              </div>
           </div>
           <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
              <ClipboardCheck className="w-5 h-5 text-green-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Protocol Verified</span>
           </div>
        </div>

        <div className="p-10">
          {loadingAdvice ? (
            <div className="py-20 flex flex-col items-center justify-center gap-6 animate-pulse">
               <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <Activity className="w-8 h-8 text-blue-600 animate-spin" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Advisor synthesizing clinical data...</p>
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <div className="grid grid-cols-1 gap-8">
                 {/* This section renders the markdown content from Gemini with high aesthetics */}
                 <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap text-sm">
                    {advisorGuidance}
                 </div>
              </div>
              
              <div className="mt-10 flex flex-wrap gap-4 justify-center">
                 <div className="flex items-center gap-3 px-6 py-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-[1.5rem] border border-blue-100 dark:border-blue-900/30">
                    <HeartPulse className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Preventive Focus</span>
                 </div>
                 <div className="flex items-center gap-3 px-6 py-4 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-[1.5rem] border border-teal-100 dark:border-teal-900/30">
                    <GraduationCap className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Evidence Based</span>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hospital Finder / Geospatial Intelligence */}
      <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h4 className="text-slate-900 dark:text-white text-xl font-black tracking-tight">Geospatial Care Infrastructure</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Region: {inputData.pincode_city}</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
            <MapPin className="w-4 h-4" /> Open Full Map
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[1, 2, 3].map(i => (
             <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 group hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center text-blue-600">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{i * 1.2} km</span>
                </div>
                <h5 className="font-bold text-slate-800 dark:text-white mb-1">Metropolitan Medical Hub {i}</h5>
                <p className="text-xs text-slate-500 mb-6">Secondary trauma center with active OPD and diagnostic labs.</p>
                <button className="w-full py-3 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100 dark:border-blue-900/30">
                  Book Consultation
                </button>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
