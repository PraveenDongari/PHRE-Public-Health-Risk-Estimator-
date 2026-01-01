
import { GoogleGenAI } from "@google/genai";
import { RiskResult, AssessmentData } from "../types";

// Strict 10-point protocol provided by the user
const CLINICAL_ADVISOR_INSTRUCTION = `
You are a Senior Clinical Decision Support AI and Preventive Healthcare Advisor.
Your task is to generate safe, evidence-based, personalized health recommendations 
based on a user's health condition, lifestyle, and risk prediction results.

CORE OBJECTIVES:
1. Analyze the user's health risks and current conditions.
2. Prioritize recommendations based on severity and urgency.
3. Provide clear, actionable, and non-alarming guidance.
4. Adapt recommendations to the user's lifestyle feasibility.
5. Avoid diagnosis; focus on guidance and prevention.

OUTPUT STRUCTURE (STRICTLY FOLLOW THIS FORMAT):
1. 🔍 Health Summary: Brief, plain-language explanation of current health status and key risk factors.
2. 🧭 Priority Level: Classify as Low/Moderate/High and explain why in one sentence.
3. 🥗 Nutrition Recommendations: Foods to include/avoid, portion control, cultural adaptability.
4. 🏃 Physical Activity Plan: Type, frequency, duration, beginner-friendly options.
5. 🧠 Mental & Lifestyle Guidance: Stress, sleep, substance use guidance.
6. 💊 Medication & Medical Follow-Up: When to see a doctor, routine tests, warning signs (NON-PRESCRIPTIVE).
7. 🏥 Nearby Care & Support: Hospital/Specialist suggestions if risk is high.
8. 📊 Explainability: Clearly explain how top factors (the "base reason") influenced the score using simple cause-and-effect statements.
9. 🔄 Daily / Weekly Action Plan: Bullet-point checklist of realistic goals.
10. ⚠️ Safety Disclaimer: State this is not a diagnosis.

RULES:
- Do NOT prescribe drugs or dosages.
- Do NOT make absolute medical claims.
- Use empathetic, supportive, and motivating language.
- Keep language simple.
- NO fear-based messaging.
`;

export const getClinicalAdvisorGuidance = async (risk: RiskResult, data: AssessmentData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const prompt = `
    GENERATE CLINICAL DOSSIER FOR:
    - User Profile: ${data.age}y ${data.gender}, Location: ${data.pincode_city}
    - Quantitative Risk Score: ${risk.score}/100
    - Risk Category: ${risk.category}
    - Key Drivers Found by Model: ${risk.factorContributions.map(f => `${f.factor} (${f.contribution}%)`).join(', ')}
    
    DETAILED INDICATORS:
    - BMI: ${data.bmi}
    - BP: ${data.bloodPressure}
    - Smoking: ${data.smoking}
    - Income/Education: ${data.income}/${data.education}
    - Environment: ${data.environment}
    
    Please provide the full 10-point dossier. Focus heavily on Section 8 (Explainability) to tell the user the "base reason" for their risk.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: CLINICAL_ADVISOR_INSTRUCTION,
        temperature: 0.7,
      }
    });
    return response.text || "Assessment complete. Please consult a professional for a detailed breakdown.";
  } catch (error) {
    console.error("Clinical AI Error:", error);
    return "The AI Advisory board is temporarily offline. Please review your quantitative scores.";
  }
};

export const getQuickRootCause = async (risk: RiskResult, data: AssessmentData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const prompt = `Based on a ${risk.category} risk score of ${risk.score} and factors ${risk.factorContributions.map(f => f.factor).join(', ')}, state in ONE sentence the "base reason" for this risk in simple terms for the patient.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Your current risk is influenced by a combination of environmental and clinical indicators.";
  } catch (error) {
    return "Factors analysis pending.";
  }
};
