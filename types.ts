
export type UserRole = 'patient' | 'doctor' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  pincode_city?: string;
  photoURL?: string;
  createdAt: number;
  lastProgress?: RiskResult;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPincode?: string;
  doctorId: string | null;
  doctorName: string | null;
  doctorEmail: string | null;
  lastMessage: string;
  lastUpdated: number;
  status: 'pending' | 'active' | 'archived';
}

export interface RiskResult {
  id?: string;
  score: number;
  category: 'Low' | 'Moderate' | 'High' | 'Critical';
  emergencyFlag: boolean;
  timestamp: number;
  breakdown: {
    social: number;
    lifestyle: number;
    medical: number;
  };
  factorContributions: Array<{ factor: string; contribution: number; category: string }>;
}

export interface AssessmentData {
  age: number;
  gender: string;
  pincode_city: string;
  // SDOH
  income: string;
  education: string;
  housing: string;
  healthcareAccess: number;
  environment: string;
  // Lifestyle
  diet: number;
  smoking: string;
  alcohol: string;
  exercise: string;
  water: number;
  sleep: number;
  meditation: string;
  // Medical
  bmi: number;
  chronicDisease: boolean;
  familyHistory: string;
  bloodPressure: string;
  diabetes: string;
}

export interface PasswordResetRequest {
  id: string;
  email: string;
  status: 'pending' | 'resolved';
  timestamp: number;
}
