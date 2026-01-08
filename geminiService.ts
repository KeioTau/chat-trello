
import { GoogleGenAI } from "@google/genai";

export const getGeminiResponse = async (userMessage: string, contextHistory: {role: 'user' | 'model', text: string}[]) => {
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
        Ton nom est "AI Assistant". Aide les membres du tableau. Sois bref et utile.`,
        temperature: 0.7,
      }
    });

    return response.text || "Désolé, je n'ai pas pu répondre.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erreur de connexion avec l'IA.";
  }
};
