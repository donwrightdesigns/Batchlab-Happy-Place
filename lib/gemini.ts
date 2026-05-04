import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("NEXT_PUBLIC_GEMINI_API_KEY is not set. AI features will be disabled.");
}

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const MODELS = {
  IMAGE_GEN_BASIC: "gemini-3.1-flash-image-preview",
  IMAGE_GEN_HQ: "gemini-3.1-flash-image-preview",
  IMAGE_GEN_PRO: "gemini-3-pro-image-preview",
  TEXT: "gemini-3-flash-preview",
  LIVE: "gemini-3.1-flash-live-preview",
};

export type ImageResolution = "512px" | "1K" | "2K" | "4K";
export type ImageAspectRatio = "1:1" | "2:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageModel = "basic" | "nano-2" | "pro";
export type ProcessingTier = "standard" | "flex" | "batch";

export async function beautifyImage(
  base64Image: string, 
  prompt: string, 
  resolution: ImageResolution = "2K",
  modelType: ImageModel = "basic",
  aspectRatio: ImageAspectRatio = "1:1",
  systemInstruction?: string,
  creativeStrength: number = 0.7,
  referenceImageB64s: string[] = [],
  useContextForStyle: boolean = false,
  tier: ProcessingTier = "standard",
  retries = 3
) {
  if (!ai) throw new Error("AI not initialized");

  let model = MODELS.IMAGE_GEN_BASIC;
  if (modelType === "pro") model = MODELS.IMAGE_GEN_PRO;
  if (modelType === "nano-2") model = MODELS.IMAGE_GEN_HQ;

  const isHqModel = model === MODELS.IMAGE_GEN_HQ || model === MODELS.IMAGE_GEN_PRO;

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
      ? "\nSTYLE REFERENCE IMAGES (Extract mood, lighting, and aesthetic style ONLY from these images. Do NOT include any of their subjects, structures, or layouts in the final image):" 
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

  const instruction = systemInstruction || "You are a real estate photo beautifier. Enhance the provided image based on the user prompt. Maintain photographic realism, enhance lighting, sky, and landscaping.";
  parts.push({ text: `\nINSTRUCTIONS: ${instruction}\n\nUSER PROMPT: ${prompt}` });

  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: parts,
        },
        config: {
          ...(isHqModel ? {
            imageConfig: {
              imageSize: resolution,
              aspectRatio: aspectRatio,
            }
          } : {})
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
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: "Analyze this real estate photo. Identify technical flaws (lighting, white balance, lens distortion) and aesthetic opportunities (sky replacement, grass enhancement, decluttering). Provide a concise, professional assessment in markdown format.",
        },
      ],
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.text || "Could not analyze image.";
}
