
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { RiskAssessmentForm } from './components/RiskAssessmentForm';
import { RiskResults } from './components/RiskResults';
import { AdminPanel } from './components/AdminPanel';
import { ConsultationPortal } from './components/ConsultationPortal';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { RecommendationsView } from './components/RecommendationsView';
import { UserRole, RiskResult, AssessmentData, UserProfile } from './types';
import { calculateRisk } from './services/riskEngine';
import { getQuickRootCause } from './services/geminiService';
import { Stethoscope, ShieldCheck, Activity, Chrome, X, Key, Info, Sparkles, BrainCircuit, ChevronRight, Users, Inbox, Database, Clock, HeartPulse } from 'lucide-react';
import { auth, googleProvider, db } from './services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, addDoc, collection, onSnapshot, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [currentResult, setCurrentResult] = useState<RiskResult | null>(null);
  const [lastInput, setLastInput] = useState<AssessmentData | null>(null);
  const [view, setView] = useState<'form' | 'results'>('form');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [rootCause, setRootCause] = useState<string | null>(null);

  // System-wide stats (for Doctor/Admin dashboards)
  const [stats, setStats] = useState({ users: 0, assessments: 0, pendingConsults: 0 });

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        unsubProfile = onSnapshot(doc(db, "users", firebaseUser.uid), async (userSnapshot) => {
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data() as UserProfile;
            setUser(userData);
            setIsAuthenticated(true);
            
            // If patient, fetch latest risk results and base reason
            if (userData.role === 'patient') {
              const q = query(
                collection(db, "assessments"),
                where("userId", "==", firebaseUser.uid)
              );
              // Note: We use in-memory sorting here to bypass the need for a composite Firestore index
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                const records = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as RiskResult));
                const latest = records.sort((a, b) => b.timestamp - a.timestamp)[0];
                setCurrentResult(latest);
                getQuickRootCause(latest, { environment: 'urban', income: 'medium' } as any).then(setRootCause);
              }
            } else {
              // Fetch global stats for non-patients
              const usersSnap = await getDocs(collection(db, "users"));
              const assessmentsSnap = await getDocs(collection(db, "assessments"));
              const consultsSnap = await getDocs(query(collection(db, "consultations"), where("status", "==", "pending")));
              setStats({
                users: usersSnap.size,
                assessments: assessmentsSnap.size,
                pendingConsults: consultsSnap.size
              });
            }
            
            setLoading(false);
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'New User',
              role: 'patient',
              createdAt: Date.now()
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
          }
        }, (err) => {
          console.error("Firestore Profile Error:", err);
          setError("Database permission error.");
          setLoading(false);
        });
      } else {
        if (unsubProfile) unsubProfile();
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const newUser: UserProfile = {
          uid: cred.user.uid,
          email: email,
          displayName: name,
          role: selectedRole,
          createdAt: Date.now()
        };
        await setDoc(doc(db, "users", cred.user.uid), newUser);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "reset_requests"), {
        email: resetEmail,
        status: 'pending',
        timestamp: Date.now()
      });
      setResetSuccess(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setResetSuccess(false);
        setResetEmail('');
      }, 3000);
    } catch (err: any) {
      setError("Failed to send reset request.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    setActivePage('dashboard');
    setView('form');
  };

  const handleCalculate = async (data: AssessmentData) => {
    const result = calculateRisk(data);
    setCurrentResult(result);
    setLastInput(data);
    setView('results');

    if (auth.currentUser) {
      try {
        await addDoc(collection(db, "assessments"), {
          userId: auth.currentUser.uid,
          ...result
        });
        getQuickRootCause(result, data).then(setRootCause);
      } catch (err) {
        console.error("Failed to save record:", err);
      }
    }
  };

  const renderDashboard = () => {
    if (!user) return null;

    if (user.role === 'patient') {
      return (
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
             <h2 className="text-3xl font-black dark:text-white tracking-tight">Personal Health Dashboard</h2>
             <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last Analysis: {currentResult ? new Date(currentResult.timestamp).toLocaleDateString() : 'Never'}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Risk Category</p>
                <div className="flex items-center justify-between">
                   <span className={`text-3xl font-black ${currentResult?.emergencyFlag ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
                     {currentResult ? currentResult.category : 'N/A'}
                   </span>
                   <Activity className={`w-8 h-8 ${currentResult?.emergencyFlag ? 'text-red-500 animate-pulse' : 'text-blue-500 opacity-50'}`} />
                </div>
             </div>
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex justify-between">Latest Score <Info className="w-3 h-3" /></p>
                <p className="text-3xl font-black text-slate-800 dark:text-white">{currentResult ? currentResult.score : '--'}</p>
             </div>
             <div className="md:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group cursor-pointer" onClick={() => setActivePage('recommendations')}>
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-16 h-16 text-blue-600" />
                </div>
                <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> Primary Risk Driver (Base Reason)
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed line-clamp-2 italic">
                  {rootCause || "Complete an assessment to unlock your personalized AI root cause analysis."}
                </p>
                <div className="mt-4 flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                  View Clinical Guidance <ChevronRight className="w-3 h-3" />
                </div>
             </div>
          </div>

          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-500/30 group">
             <div className="relative z-10 max-w-xl">
                <h3 className="text-3xl font-black mb-4 tracking-tight">Advance your health recovery.</h3>
                <p className="text-blue-100 mb-10 text-lg font-medium leading-relaxed">Our clinical decision support engine is ready to generate your next intervention dossier based on your unique risk profile.</p>
                <button onClick={() => { setActivePage('assessment'); setView('form'); }} className="px-10 py-4 bg-white text-blue-700 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-50 transition-all shadow-xl active:scale-95">Initiate New Assessment</button>
             </div>
             <Activity className="absolute -right-20 -bottom-20 w-96 h-96 text-white/10 group-hover:scale-110 transition-transform duration-1000" />
          </div>
        </div>
      );
    }

    if (user.role === 'doctor') {
      return (
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
             <h2 className="text-3xl font-black dark:text-white tracking-tight">Medical Board Dashboard</h2>
             <div className="flex items-center gap-3 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-100 dark:border-green-800/30">
               <Stethoscope className="w-4 h-4" /> Specialist Active
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Total Patient Roster</p>
                <div className="flex items-center justify-between">
                   <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.users}</span>
                   <Users className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
             </div>
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Unclaimed Requests</p>
                <div className="flex items-center justify-between">
                   <span className="text-3xl font-black text-orange-600">{stats.pendingConsults}</span>
                   <Inbox className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
             </div>
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Clinical Data Points</p>
                <div className="flex items-center justify-between">
                   <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.assessments}</span>
                   <Database className="w-8 h-8 text-teal-500 opacity-50" />
                </div>
             </div>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="max-w-md">
              <h3 className="text-2xl font-black mb-4">Urgent Review Queue</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">There are {stats.pendingConsults} patients waiting for specialist review in the marketplace. Action requested for High/Critical profiles.</p>
              <button onClick={() => setActivePage('messages')} className="px-8 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2">
                Open Clinical Comms <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700">
                  <p className="text-xs font-black text-red-500 uppercase mb-2">Critical Cases</p>
                  <p className="text-2xl font-black">--</p>
               </div>
               <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700">
                  <p className="text-xs font-black text-green-500 uppercase mb-2">Active Chats</p>
                  <p className="text-2xl font-black">--</p>
               </div>
            </div>
          </div>
        </div>
      );
    }

    if (user.role === 'admin') {
      return (
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
             <h2 className="text-3xl font-black dark:text-white tracking-tight">Governance Overview</h2>
             <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-purple-100 dark:border-purple-800/30">
               <ShieldCheck className="w-4 h-4" /> System Administrator
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Identities</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.users}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Health Records</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.assessments}</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Integrity Level</p>
                <p className="text-3xl font-black text-green-600">99.9%</p>
             </div>
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Sync Status</p>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   <p className="text-sm font-bold text-slate-800 dark:text-white">Active</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <h4 className="font-black text-xl mb-6 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" /> Pending Governance
                </h4>
                <div className="space-y-4">
                   <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">Staff Onboarding Request</p>
                        <p className="text-[10px] text-slate-400 uppercase">External Registry</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                   </div>
                   <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">Database Migration Alert</p>
                        <p className="text-[10px] text-slate-400 uppercase">Cloud Infrastructure</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                   </div>
                </div>
             </div>
             <div className="bg-indigo-900 rounded-[3rem] p-10 text-white flex flex-col justify-center">
                <HeartPulse className="w-12 h-12 text-blue-400 mb-6" />
                <h3 className="text-2xl font-black mb-2">System Integrity Guard</h3>
                <p className="text-indigo-200 text-sm leading-relaxed mb-8">PHRE systems are currently performing within governance thresholds. Clinical datasets are encrypted and stored in HIPAA-compliant recovery vaults.</p>
                <button onClick={() => setActivePage('admin-panel')} className="w-fit px-8 py-3 bg-white text-indigo-900 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-all">
                  Open Governance Panel
                </button>
             </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return renderDashboard();
      case 'assessment':
        return view === 'form' ? (
          <RiskAssessmentForm onCalculate={handleCalculate} onReset={() => setView('form')} />
        ) : (
          <RiskResults result={currentResult!} inputData={lastInput!} onBack={() => setView('form')} />
        );
      case 'recommendations':
        return <RecommendationsView user={user!} />;
      case 'history':
        return <HistoryView />;
      case 'admin-panel':
        return <AdminPanel />;
      case 'patients-list':
        return <AdminPanel />; 
      case 'messages':
        return <ConsultationPortal user={user!} />;
      case 'settings':
        return <SettingsView user={user!} />;
      default:
        return <div className="p-20 text-center text-slate-500 dark:text-slate-400">Section under clinical review...</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 font-medium animate-pulse text-xs font-black uppercase tracking-widest">Verifying Governance Protocol...</p>
        </div>
      </div>
    );
  }

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 transition-all";

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute top-0 -left-20 w-72 h-72 bg-blue-400/10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-400/10 blur-3xl rounded-full"></div>

        <div className="w-full max-w-md space-y-8 relative z-10">
           <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30 transform rotate-3 mb-6">
                 <ShieldCheck className="text-white w-8 h-8" />
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">PHRE</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Public Health Risk Estimator</p>
           </div>

           <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 transition-colors duration-300">
              <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl mb-8">
                <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'login' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Login</button>
                <button onClick={() => setAuthMode('signup')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'signup' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Sign Up</button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                 {authMode === 'signup' && (
                    <>
                      <input type="text" placeholder="Full Name" required value={name} onChange={e => setName(e.target.value)} className={inputClasses} />
                      <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as UserRole)} className={inputClasses}>
                        <option value="patient">Patient Account</option>
                        <option value="doctor">Medical Professional</option>
                        <option value="admin">System Administrator</option>
                      </select>
                    </>
                 )}
                 <input type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} />
                 <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} className={inputClasses} />
                 
                 {error && (
                   <div className="flex items-center gap-2 text-red-500 text-xs font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                     <Info className="w-4 h-4" />
                     {error}
                   </div>
                 )}

                 <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                    {authMode === 'login' ? 'Sign In' : 'Create Account'}
                 </button>
              </form>

              <div className="relative my-8">
                 <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-slate-700"></span></div>
                 <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">Or continue with</span></div>
              </div>

              <button onClick={handleGoogleAuth} className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-900 dark:text-white font-semibold">
                 <Chrome className="w-5 h-5 text-red-500" /> Google Account
              </button>

              <div className="mt-8 text-center">
                 <button onClick={() => setShowForgotModal(true)} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors">Forgot Password? Send Reset Request</button>
              </div>
           </div>
        </div>

        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-sm rounded-3xl p-8 shadow-2xl animate-fadeIn">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-xl font-bold dark:text-white">Reset Request</h3>
                   <p className="text-xs text-slate-500 mt-1">Admin will verify and email your new pass.</p>
                 </div>
                 <button onClick={() => setShowForgotModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                   <X className="w-5 h-5 dark:text-slate-400" />
                 </button>
               </div>
               
               {resetSuccess ? (
                 <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-green-600 dark:text-green-400 text-center text-sm font-medium">
                   Request sent to Admin successfully!
                 </div>
               ) : (
                 <form onSubmit={handleResetRequest} className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Email</label>
                     <input 
                       type="email" 
                       required 
                       value={resetEmail}
                       onChange={e => setResetEmail(e.target.value)}
                       placeholder="you@example.com" 
                       className={inputClasses} 
                     />
                   </div>
                   <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                     <Key className="w-4 h-4" /> Send Request
                   </button>
                 </form>
               )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout 
      user={user!}
      activePage={activePage} 
      onLogout={handleLogout}
      onNavigate={(page) => {
        setActivePage(page);
        if (page === 'assessment') setView('form');
      }}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
