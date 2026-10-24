import { GoogleGenAI } from "@google/genai";

const apiKey = typeof window === 'undefined' ? process.env.GEMINI_API_KEY : null;

export const ai = apiKey ? new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
}) : null;

export const MODELS = {
  // Image Models (Gemini 3.1 & 3 Pro)
  IMAGE_GEN_BASIC: "gemini-3.1-flash-lite-image",
  IMAGE_GEN_HQ: "gemini-3.1-flash-image",
  
  // Text Models (2026 Model Garden)
  TEXT: "gemini-3.8-flash",
  TEXT_PRO: "gemini-3.1-pro-preview",
  TEXT_LITE: "gemini-3.1-flash-lite",

  // Live Audio Model
  LIVE: "gemini-3.1-flash-live-preview",

  // Veo 3.1 Video Models
  VEO_3_1_LITE: "veo-3.1-lite-generate-preview",
  VEO_3_1_FAST: "veo-3.1-lite-generate-preview",
  VEO_3_1_NORMAL: "veo-3.1-generate-preview"
};

export type ImageResolution = "1K" | "2K" | "4K";
export type ImageAspectRatio = "auto" | "1:1" | "2:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageModel = "nano-2" | "nano-lite" | "nano-pro";
export type ImageModelOption = "lite" | "flash";
export type VeoOption = "lite" | "fast" | "normal";
export type ProcessingTier = "standard" | "flex" | "batch";
export type OperationMode = 'edit' | 'create';
export type MediaType = 'image' | 'video';

export interface CharacterContextImage {
  id: string;
  name?: string;
  label?: string;
  base64: string;
  mimeType?: string;
  enabled?: boolean;
}

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
  veoOption: VeoOption = 'lite',
  imageModelOption: ImageModelOption = 'flash',
  characterContextImages?: CharacterContextImage[],
  retries = 3
) {
  if (typeof window !== 'undefined') {
    const mimeType = base64Image.match(/data:([^;]+);base64,/)?.[1] || "image/jpeg";
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    // Determine target model
    let modelName = MODELS.IMAGE_GEN_HQ;
    if (mediaType === 'video') {
      modelName = veoOption === 'normal' ? MODELS.VEO_3_1_NORMAL : MODELS.VEO_3_1_LITE;
    } else {
      if (imageModelOption === 'lite') {
        modelName = MODELS.IMAGE_GEN_BASIC;
      } else {
        modelName = MODELS.IMAGE_GEN_HQ;
      }
    }

    let lastError: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff with jitter
          const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 800, 8000);
          await new Promise(r => setTimeout(r, delay));
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
            mediaType,
            veoOption,
            imageModelOption,
            characterContextImages: characterContextImages?.filter(c => c && (c.base64 || (c as any).base64Data) && c.enabled !== false)
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errMsg = errorData.error || `HTTP error! status: ${res.status}`;
          // If it's a rate limit or 5xx server glitch, allow retry
          if (res.status === 429 || res.status >= 500 || errMsg.includes('overloaded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            lastError = new Error(errMsg);
            continue;
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        if (data.pending && data.operationName) {
          // If server-side polling timed out, continue polling on client
          let attempts = 0;
          while (attempts < 20) {
            await new Promise(r => setTimeout(r, 5000));
            const statusRes = await fetch('/api/video-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ operationName: data.operationName })
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.done && statusData.response?.generatedVideos?.[0]?.video?.uri) {
                 const downloadRes = await fetch('/api/video-download', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ uri: statusData.response.generatedVideos[0].video.uri })
                 });
                 if (downloadRes.ok) {
                   const downloadData = await downloadRes.json();
                   return downloadData.base64;
                 }
              }
            }
            attempts++;
          }
          throw new Error("Video generation timed out. Please check batch history in a moment.");
        }
        return data.base64;
      } catch (err: any) {
        lastError = err;
        if (attempt === retries) throw err;
      }
    }
    throw lastError || new Error("Failed after retries");
  }

  if (!ai) throw new Error("AI not initialized on server");
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
        model: MODELS.IMAGE_GEN_BASIC
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

export async function improvePrompt(rawPrompt: string, mode: 'create' | 'edit' = 'create', category: string = 'general'): Promise<string> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/improve-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: rawPrompt, mode, category })
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data.improvedPrompt || rawPrompt;
  }
  return rawPrompt;
}

