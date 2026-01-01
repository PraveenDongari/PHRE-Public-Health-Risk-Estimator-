
import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Send, Sparkles } from 'lucide-react';
import { AssessmentData } from '../types';

interface FormProps {
  onCalculate: (data: AssessmentData) => void;
  onReset: () => void;
}

export const RiskAssessmentForm: React.FC<FormProps> = ({ onCalculate, onReset }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<AssessmentData>({
    age: 35,
    gender: 'female',
    pincode_city: 'Mumbai',
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
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(val) : val }));
  };

  const steps = [
    { title: 'Demographics', icon: '👤' },
    { title: 'Social Factors', icon: '🌍' },
    { title: 'Lifestyle', icon: '🏃' },
    { title: 'Medical', icon: '🩺' }
  ];

  const handleNext = () => setStep(s => Math.min(steps.length, s + 1));
  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const loadDemo = () => {
    setFormData({
      age: 45,
      gender: 'male',
      pincode_city: 'Delhi',
      income: 'low',
      education: 'high_school',
      housing: 'poor',
      healthcareAccess: 45,
      environment: 'industrial',
      diet: 2,
      smoking: 'current_light',
      alcohol: 'regular',
      exercise: 'none',
      water: 3,
      sleep: 6,
      meditation: 'none',
      bmi: 29,
      chronicDisease: true,
      familyHistory: 'one_parent',
      bloodPressure: 'pre_hypertension',
      diabetes: 'prediabetic'
    });
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder-slate-400";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stepper Header */}
      <div className="flex justify-between items-center mb-10">
        {steps.map((s, idx) => (
          <div key={idx} className="flex flex-col items-center relative flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 transition-all ${
              step >= idx + 1 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
            }`}>
              {s.icon}
            </div>
            <span className={`text-xs mt-2 font-medium ${step === idx + 1 ? 'text-blue-600' : 'text-slate-400'}`}>
              {s.title}
            </span>
            {idx < steps.length - 1 && (
              <div className={`h-1 absolute top-5 left-1/2 w-full -z-0 ${step > idx + 1 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl shadow-blue-500/5 border border-slate-100 dark:border-slate-700 min-h-[500px] flex flex-col transition-all">
        <div className="flex-1">
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 flex items-center justify-center">1</span>
                Demographic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Age</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} className={inputClasses} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className={inputClasses}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">City / Pincode</label>
                  <input type="text" name="pincode_city" value={formData.pincode_city} onChange={handleChange} className={inputClasses} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 flex items-center justify-center">2</span>
                Social Determinants (SDOH)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Annual Income Level</label>
                  <select name="income" value={formData.income} onChange={handleChange} className={inputClasses}>
                    <option value="very_low">Very Low</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="very_high">Very High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Education Weight</label>
                  <select name="education" value={formData.education} onChange={handleChange} className={inputClasses}>
                    <option value="none">None</option>
                    <option value="primary">Primary</option>
                    <option value="high_school">High School</option>
                    <option value="graduate">Graduate</option>
                    <option value="postgraduate">Postgraduate</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex justify-between">
                    Healthcare Access (mins to hospital)
                    <span className="text-blue-600 font-bold">{formData.healthcareAccess} mins</span>
                  </label>
                  <input type="range" name="healthcareAccess" min="0" max="120" value={formData.healthcareAccess} onChange={handleChange} className="w-full accent-blue-600" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 flex items-center justify-center">3</span>
                Lifestyle Habits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Diet Score (1-5 Healthy)</label>
                  <input type="number" name="diet" min="1" max="5" value={formData.diet} onChange={handleChange} className={inputClasses} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Smoking Status</label>
                  <select name="smoking" value={formData.smoking} onChange={handleChange} className={inputClasses}>
                    <option value="never">Never</option>
                    <option value="former">Former</option>
                    <option value="current_light">Current Light</option>
                    <option value="current_heavy">Current Heavy</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sleep Duration (Hours)</label>
                  <input type="number" name="sleep" value={formData.sleep} onChange={handleChange} className={inputClasses} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 flex items-center justify-center">4</span>
                Medical Indicators
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">BMI Index</label>
                  <input type="number" name="bmi" value={formData.bmi} onChange={handleChange} className={inputClasses} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Blood Pressure</label>
                  <select name="bloodPressure" value={formData.bloodPressure} onChange={handleChange} className={inputClasses}>
                    <option value="normal">Normal</option>
                    <option value="pre_hypertension">Pre-Hypertension</option>
                    <option value="hypertension">Hypertension</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 md:col-span-2 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                  <input type="checkbox" name="chronicDisease" checked={formData.chronicDisease} onChange={handleChange} className="w-5 h-5 accent-blue-600 rounded" />
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">History of Chronic Disease?</label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-700 pt-8">
          <button
            onClick={loadDemo}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline"
          >
            <Sparkles className="w-4 h-4" /> Load Sample Data
          </button>
          <div className="flex gap-4 w-full sm:w-auto">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
            )}
            {step < steps.length ? (
              <button
                onClick={handleNext}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => onCalculate(formData)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none transition-all"
              >
                Calculate Risk <Send className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
