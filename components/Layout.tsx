
import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Shield, LayoutDashboard, Activity, Users, Settings, LogOut, MessageSquare, History, User, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  activePage: string;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, activePage, onLogout, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['patient', 'doctor', 'admin'] },
    { id: 'assessment', label: 'Risk Assessment', icon: Activity, roles: ['patient'] },
    { id: 'recommendations', label: 'Personalized Guidance', icon: Sparkles, roles: ['patient'] },
    { id: 'history', label: 'Risk History', icon: History, roles: ['patient'] },
    { id: 'admin-panel', label: 'Admin Management', icon: Shield, roles: ['admin'] },
    { id: 'patients-list', label: 'Patients', icon: Users, roles: ['doctor', 'admin'] },
    { id: 'messages', label: 'Consultations', icon: MessageSquare, roles: ['patient', 'doctor'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['patient', 'doctor', 'admin'] },
  ];

  return (
    <div className="min-h-screen flex transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">PHRE</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-semibold">Public Health Risk Estimator</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.filter(item => item.roles.includes(user.role)).map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === item.id 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activePage === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 overflow-hidden flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold ring-2 ring-blue-50 dark:ring-blue-900/50">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{user.displayName.charAt(0)}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate dark:text-white">{user.displayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-2 md:hidden">
             <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">PHRE</h1>
          </div>
          <div className="hidden md:block">
            <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Clinical Portal | <span className="text-slate-800 dark:text-slate-100">{user.displayName}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-[10px] uppercase font-bold rounded-full tracking-wider border border-blue-200 dark:border-blue-800">
              {user.role}
            </span>
          </div>
        </header>

        <section className="flex-1 p-8 overflow-y-auto">
          {children}
        </section>

        <footer className="py-4 px-8 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 italic">
            Governance: This system estimates public-health risk and does not replace professional medical advice.
          </p>
        </footer>
      </main>
    </div>
  );
};
