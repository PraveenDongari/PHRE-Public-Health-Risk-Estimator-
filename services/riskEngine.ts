
import { AssessmentData, RiskResult } from '../types';

export const calculateRisk = (data: AssessmentData): RiskResult => {
  // Normalized weights (simplified representation for demo)
  // Total weight = 1.0 (Sum of all normalized sub-factors)
  
  let socialScore = 0;
  let lifestyleScore = 0;
  let medicalScore = 0;

  // Social Determinants logic (approx 35%)
  const incomeWeights: Record<string, number> = { very_low: 1, low: 0.8, medium: 0.5, high: 0.2, very_high: 0 };
  socialScore += (incomeWeights[data.income] || 0.5) * 0.1;
  
  const educationWeights: Record<string, number> = { none: 1, primary: 0.8, high_school: 0.5, graduate: 0.2, postgraduate: 0 };
  socialScore += (educationWeights[data.education] || 0.5) * 0.05;

  const envWeights: Record<string, number> = { industrial: 1, crowded_urban: 0.8, urban: 0.6, semi_urban: 0.4, rural_clean: 0.1 };
  socialScore += (envWeights[data.environment] || 0.5) * 0.1;
  
  socialScore += (data.healthcareAccess / 120) * 0.1; // Max 120 mins normalized

  // Lifestyle logic (approx 35%)
  lifestyleScore += (1 - (data.diet / 5)) * 0.1;
  const smokingWeights: Record<string, number> = { current_heavy: 1, current_light: 0.7, former: 0.4, never: 0 };
  lifestyleScore += (smokingWeights[data.smoking] || 0) * 0.1;
  lifestyleScore += (1 - (data.sleep / 8)) * 0.05; // Ideal 8h
  
  const exerciseWeights: Record<string, number> = { none: 1, '1-2_days': 0.7, '3-5_days': 0.3, daily: 0 };
  lifestyleScore += (exerciseWeights[data.exercise] || 0.5) * 0.1;

  // Medical Indicators (approx 30%)
  if (data.bmi > 30) medicalScore += 0.1;
  if (data.bmi > 25 && data.bmi <= 30) medicalScore += 0.05;
  if (data.chronicDisease) medicalScore += 0.1;
  const bpWeights: Record<string, number> = { hypertension: 0.1, pre_hypertension: 0.05, normal: 0 };
  medicalScore += bpWeights[data.bloodPressure] || 0;

  const totalWeightedRaw = (socialScore + lifestyleScore + medicalScore);
  const finalScore = Math.min(100, Math.round(totalWeightedRaw * 100));

  let category: RiskResult['category'] = 'Low';
  if (finalScore >= 81) category = 'Critical';
  else if (finalScore >= 61) category = 'High';
  else if (finalScore >= 41) category = 'Moderate';

  return {
    score: finalScore,
    category,
    emergencyFlag: finalScore >= 81,
    timestamp: Date.now(),
    breakdown: {
      social: Math.round(socialScore * 100),
      lifestyle: Math.round(lifestyleScore * 100),
      medical: Math.round(medicalScore * 100)
    },
    factorContributions: [
      { factor: 'Socio-economic', contribution: Math.round(socialScore * 100), category: 'Social' },
      { factor: 'Behavioral Habits', contribution: Math.round(lifestyleScore * 100), category: 'Lifestyle' },
      { factor: 'Clinical Indicators', contribution: Math.round(medicalScore * 100), category: 'Medical' }
    ].sort((a, b) => b.contribution - a.contribution)
  };
};
