import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const fetchEurPlnRate = async (): Promise<number> => {
  try {
    const ai = getClient();
    
    // We use gemini-2.5-flash for fast, simple query processing
    const model = 'gemini-2.5-flash';
    
    const systemPrompt = "You are a financial assistant. Provide the current exchange rate from EUR to PLN. The output must contain ONLY the raw numeric value (using a dot as the decimal separator) for 1 Euro. Example: 4.3521. Do not include any text, currency symbols, or markdown.";
    const userQuery = "current EUR to PLN exchange rate";

    const response = await ai.models.generateContent({
      model: model,
      contents: userQuery,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }] // Enable search to get real-time data
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const cleanText = text.replace(/[^\d.]/g, '');
    const rate = parseFloat(cleanText);

    if (isNaN(rate) || rate <= 0) {
      throw new Error("Invalid rate format received");
    }

    return rate;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};