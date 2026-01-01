
import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { RiskResult } from '../types';
import { History, Trash2, Calendar, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<RiskResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Use onSnapshot for real-time updates and simplified query (sort in memory to avoid indexing issues)
    const q = query(
      collection(db, "assessments"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RiskResult));
      
      // Sort in-memory by timestamp descending
      const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(sortedRecords);
      setLoading(false);
    }, (err) => {
      console.error("History fetch error:", err);
      setError("Database permission error. Ensure your Firestore rules are configured to allow access.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const chartData = [...history].reverse().map(record => ({
    date: new Date(record.timestamp).toLocaleDateString(),
    score: record.score
  }));

  const latestTrend = history.length >= 2 
    ? history[0].score - history[1].score 
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 font-medium">Loading your health history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-3xl border border-red-100 dark:border-red-800 text-center space-y-4 max-w-2xl mx-auto">
        <Activity className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-red-600 dark:text-red-400 font-bold text-xl">Permission Issue Detected</h3>
        <p className="text-red-500 dark:text-red-300 opacity-90">{error}</p>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl text-left text-xs font-mono overflow-auto border border-red-100 dark:border-red-900/50">
          Firestore Rule required:<br/>
          allow read, write: if request.auth != null;
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Risk Progress</h2>
          <p className="text-slate-500 dark:text-slate-400">Analyze how your health indicators change over time</p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className={`p-2 rounded-lg ${latestTrend > 0 ? 'bg-red-50 text-red-600' : latestTrend < 0 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-600'}`}>
            {latestTrend > 0 ? <TrendingUp className="w-5 h-5" /> : latestTrend < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Latest Trend</p>
            <p className="font-bold dark:text-white">
              {latestTrend > 0 ? `+${latestTrend}` : latestTrend < 0 ? `${latestTrend}` : 'Stable'} points
            </p>
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-20 rounded-[3rem] border border-slate-100 dark:border-slate-700 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl flex items-center justify-center mx-auto">
            <History className="w-10 h-10 text-slate-300" />
          </div>
          <div>
            <p className="text-slate-800 dark:text-white text-xl font-bold">No data points yet</p>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">Complete your first assessment to start tracking your public health risk progress.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Take First Assessment</button>
        </div>
      ) : (
        <>
          {/* Trend Chart */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-8 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> Score Trend
            </h4>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis 
                    hide
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#fff' }}
                    itemStyle={{ color: '#2563eb', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Table */}
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-slate-800 dark:text-white font-bold">Past Assessments</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <th className="px-8 py-5">Analysis Date</th>
                    <th className="px-8 py-5">Score</th>
                    <th className="px-8 py-5">Classification</th>
                    <th className="px-8 py-5">Primary Factor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {history.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </div>
                          <span className="text-sm font-semibold dark:text-slate-200">
                            {new Date(record.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-black text-lg dark:text-white">{record.score}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                          record.category === 'Low' ? 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' :
                          record.category === 'Moderate' ? 'bg-green-100/50 text-green-600 dark:bg-green-900/40 dark:text-green-300' :
                          record.category === 'High' ? 'bg-orange-100/50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300' :
                          'bg-red-100/50 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                          {record.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                             {record.factorContributions[0]?.factor || 'N/A'}
                           </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
