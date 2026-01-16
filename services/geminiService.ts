
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI SDK client directly using the API key from process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enhanceBio = async (currentBio: string): Promise<string> => {
  try {
    // Calling generateContent with the appropriate model for text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rewrite this dating app bio to be more catchy, confident, and direct for a casual hook-up app. Keep it under 150 characters. Original: ${currentBio}`,
    });
    // The .text property is used directly as per the latest SDK definitions (it is not a method)
    return response.text || currentBio;
  } catch (error) {
    console.error("Gemini Error:", error);
    return currentBio;
  }
};

export const suggestIcebreaker = async (recipientName: string): Promise<string> => {
  try {
    // Suggesting a short icebreaker using the Gemini 3 Flash model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a short, bold, and playful icebreaker message for someone named ${recipientName} on a casual hook-up app.`,
    });
    // Accessing .text as a property, which returns string | undefined
    return response.text || "Hey! How's your night going?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Hey there!";
  }
};
