import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("NEXT_PUBLIC_GEMINI_API_KEY is not set. AI features will be disabled.");
}

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const MODELS = {
  IMAGE_GEN_BASIC: "gemini-2.5-flash-image",
  IMAGE_GEN_HQ: "gemini-3.1-flash-image-preview",
  IMAGE_GEN_PRO: "gemini-3-pro-image-preview",
  TEXT: "gemini-3-flash-preview",
  LIVE: "gemini-3.1-flash-live-preview",
};

export type ImageResolution = "512px" | "1K" | "2K" | "4K";
export type ImageAspectRatio = "1:1" | "2:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageModel = "nano-2";
export type ProcessingTier = "standard" | "flex" | "batch";

export async function beautifyImage(
  base64Image: string, 
  prompt: string, 
  resolution: ImageResolution = "2K",
  modelType: ImageModel = "nano-2",
  aspectRatio: ImageAspectRatio = "3:2",
  systemInstruction?: string,
  referenceImageB64s: string[] = [],
  useContextForStyle: boolean = false,
  tier: ProcessingTier = "standard",
  retries = 3
) {
  if (!ai) throw new Error("AI not initialized");

  // Locked strictly to gemini-3.1-flash-image-preview
  const model = MODELS.IMAGE_GEN_HQ;
  const isHqModel = true;

  // Extract mime type from data URL
  const mimeType = base64Image.match(/data:([^;]+);base64,/)?.[1] || "image/jpeg";
  const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

  // Prepare parts
  const parts: any[] = [];
  
  parts.push({ text: "TARGET IMAGE TO ENHANCE:" });
  parts.push({
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  });

  // Add reference images if provided
  if (referenceImageB64s.length > 0) {
    parts.push({ text: useContextForStyle 
      ? "\nSTYLE REFERENCE IMAGES (Extract mood, lighting, and aesthetic style ONLY from these images. Do NOT include in the final image):" 
      : "\nSPATIAL CONTEXT IMAGES (Use these ONLY to understand the surrounding room geometry or light sources. Do not adopt their style or subjects directly):" });
      
    referenceImageB64s.forEach((refB64, idx) => {
      const refMime = refB64.match(/data:([^;]+);base64,/)?.[1] || "image/jpeg";
      const refData = refB64.includes(",") ? refB64.split(",")[1] : refB64;
      parts.push({
        inlineData: {
          data: refData,
          mimeType: refMime,
        },
      });
    });
  }

  const instruction = systemInstruction || "YOU ARE A MASTER PHOTOGRAPHY EDITOR.  USE LOCALIZED dodge and burn, correct technical errors, reduce iso noise, fine-tune all light sources for  consistent WHITE BALANCE, ensure sharp detailed images, LIGHTING ENHANCEMENT MAINTAINING EXACT STRUCTURAL ELEMENTS OF ANY INTERIOR SPACES.";
  parts.push({ text: `\nINSTRUCTIONS: ${instruction}\n\nUSER PROMPT: ${prompt}` });

  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: { role: 'user', parts },
        config: {
          imageConfig: isHqModel ? {
            imageSize: resolution,
            aspectRatio: aspectRatio,
          } : undefined
        }
      });

      if (!response.candidates?.[0]?.content?.parts) {
        const finishReason = response.candidates?.[0]?.finishReason;
        throw new Error(`No valid response parts returned from AI. Reason: ${finishReason || 'Unknown'}`);
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
      
      throw new Error("No image returned from AI");
    } catch (error: any) {
      lastError = error;
      const message = error.message || String(error);
      
      // If it's a 503 or 429, wait and retry
      const isQuotaExceeded = message.includes('429') || message.toLowerCase().includes('quota');
      const isServiceUnavailable = message.includes('503') || message.toLowerCase().includes('overloaded');
      const isDeadlineExpired = message.toLowerCase().includes('deadline expired');
      
      if ((isQuotaExceeded || isServiceUnavailable || isDeadlineExpired) && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Retry ${i + 1}/${retries} after ${delay}ms due to: ${message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If we're here, we're not retrying or we've run out of retries
      if (isQuotaExceeded) {
        throw new Error("AI Quota Exceeded: You've reached the rate limit for this model. If you are processing a batch, try reducing the 'Concurrency' in Settings to 1 or 2 to avoid firing too many requests at once.");
      }
      if (isServiceUnavailable) {
        throw new Error("AI Service Overloaded: The AI model is currently busy. Retrying might help, or try again in a few minutes.");
      }
      
      throw error;
    }
  }

  throw lastError;
}

export async function analyzeImage(base64Image: string) {
  if (!ai) throw new Error("AI not initialized");

  const mimeType = base64Image.match(/data:([^;]+);base64,/)?.[1] || "image/jpeg";
  const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

  const response = await ai.models.generateContent({
    model: MODELS.TEXT,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this photo. Identify technical flaws (lighting, white balance, lens distortion) and aesthetic opportunities (sky replacement, grass enhancement, decluttering). Provide a concise, professional assessment in markdown format.",
          },
        ],
      },
    ],
  });

  return response.text || "Could not analyze image.";
}
