
import { GoogleGenAI } from "@google/genai";

export const getGeminiResponse = async (userMessage: string, contextHistory: {role: 'user' | 'model', text: string}[]) => {
  // Initialisation à chaque appel pour garantir la prise en compte de l'API KEY injectée
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const contents = contextHistory.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: `Tu es un assistant IA intégré à un Power-Up Trello. 
        Ton nom est "AI Assistant". Aide les membres du tableau avec professionnalisme. 
        Sois concis et amical. Utilise le Markdown pour la clarté.`,
        temperature: 0.7,
      }
    });

    return response.text || "Désolé, je rencontre une petite difficulté technique.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Le service d'IA est actuellement indisponible.";
  }
};
