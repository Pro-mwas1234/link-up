
import { GoogleGenAI, Type } from "@google/genai";
import { User, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateVirtualPeers = async (count: number = 5): Promise<User[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count} diverse and interesting user profiles for a casual hookup app. 
      Return them as a JSON array of objects with these fields: 
      id (string, e.g. "ai-1"), name (string), age (number 18-45), bio (string), preference (one of: 'Tonight', 'FWB', 'Discrete', 'Short Term', 'Right Now'), media (array with one image URL from https://images.unsplash.com/photo-...).
      Ensure bios are bold, catchy and fit a casual vibe.`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Peer Generation Error:", error);
    return [];
  }
};

export const getAIChatResponse = async (userBio: string, chatHistory: Message[], nextMessage: string): Promise<string> => {
  try {
    const historyPrompt = chatHistory.map(m => `${m.senderId === 'me' ? 'User' : 'You'}: ${m.text}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a user on a casual hookup app with this bio: "${userBio}". 
      Here is the conversation so far:
      ${historyPrompt}
      User just said: "${nextMessage}"
      Respond in character. Be playful, bold, and direct. Keep it short (max 2 sentences).`,
    });
    return response.text || "That sounds interesting. Tell me more?";
  } catch (error) {
    return "Hey! Sorry, just getting back to you. ;)";
  }
};

export const enhanceBio = async (currentBio: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rewrite this dating app bio to be more catchy, confident, and direct for a casual hook-up app. Keep it under 150 characters. Original: ${currentBio}`,
    });
    return response.text || currentBio;
  } catch (error) {
    return currentBio;
  }
};

export const suggestIcebreaker = async (recipientName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a short, bold, and playful icebreaker message for someone named ${recipientName} on a casual hook-up app.`,
    });
    return response.text || "Hey! How's your night going?";
  } catch (error) {
    return "Hey there!";
  }
};
