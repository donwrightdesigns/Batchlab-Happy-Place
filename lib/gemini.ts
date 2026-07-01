import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const apiKey = typeof window === 'undefined' ? process.env.GEMINI_API_KEY : null;

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const MODELS = {
  IMAGE_GEN_BASIC: "gemini-3.1-flash-lite-image",
  IMAGE_GEN_HQ: "gemini-3.1-flash-image",
  IMAGE_GEN_PRO: "gemini-3-pro-image",
  TEXT: "gemini-3.1-flash-lite",
  LIVE: "gemini-3.1-flash-live",
  VIDEO: "omni-flash-preview"
};

export type ImageResolution = "1K" | "2K" | "4K";
export type ImageAspectRatio = "auto" | "1:1" | "2:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageModel = "nano-2";
export type ProcessingTier = "standard" | "flex" | "batch";
export type OperationMode = 'edit' | 'create';
export type MediaType = 'image' | 'video';

export async function beautifyImage(
  base64Image: string, 
  prompt: string, 
  resolution: ImageResolution = "2K",
  modelType: ImageModel = "nano-2",
  aspectRatio: ImageAspectRatio = "auto",
  systemInstruction?: string,
  tier: ProcessingTier = "flex",
  opMode: OperationMode = 'edit',
  mediaType: MediaType = 'image',
  retries = 3
) {
  // If we are in the browser, call the API route
  if (typeof window !== 'undefined') {
    const mimeType = base64Image.match(/data:([^;]+);base64,/)?.[1] || "image/jpeg";
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    // Determine model based on mediaType and tier
    let modelName = MODELS.IMAGE_GEN_HQ;
    if (mediaType === 'video') {
      modelName = MODELS.VIDEO;
    } else if (tier === 'batch' || resolution === '1K') {
      modelName = MODELS.IMAGE_GEN_BASIC;
    }

    const res = await fetch('/api/beautify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        mimeType,
        prompt,
        resolution,
        model: modelName,
        aspectRatio,
        systemInstruction,
        tier,
        opMode,
        mediaType
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data.base64;
  }

  // Fallback for server-side if needed (though API routes are the standard)
  if (!ai) throw new Error("AI not initialized on server");
  // ... (SDK logic if needed, but the API route is already handling it)
  throw new Error("SDK calls should be proxied through API routes context");
}

export async function analyzeImage(base64Image: string) {
  if (typeof window !== 'undefined') {
    const mimeType = base64Image.match(/data:([^;]+);base64,/)?.[1] || "image/jpeg";
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        mimeType,
        model: MODELS.TEXT
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data.text;
  }
  
  if (!ai) throw new Error("AI not initialized on server");
  throw new Error("SDK calls should be proxied through API routes context");
}

