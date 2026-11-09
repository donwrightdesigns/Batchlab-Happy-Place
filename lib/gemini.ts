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

  // Official Gemini Omni 1.1 Video Model
  OMNI_1_1: "gemini-omni-1.1-flash"
};

export type StudioDomain = "arch" | "portrait" | "universal";
export type ImageResolution = "1K" | "2K" | "4K";
export type ImageAspectRatio = "auto" | "1:1" | "2:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageModel = "nano-2" | "nano-lite" | "nano-pro";
export type ImageModelOption = "lite" | "flash";
export type VideoModel = "pvid" | "omni" | "h3" | "seed" | "wan3";
export type VeoOption = VideoModel | "lite" | "fast" | "normal"; // backward compatibility
export type ProcessingTier = "standard" | "flex" | "batch";
export type OperationMode = 'edit' | 'create';
export type MediaType = 'image' | 'video';

export interface MotionChoreography {
  id: string;
  name: string;
  badge: string;
  promptSnippet: string;
  description: string;
}

export const ARCHITECTURAL_CHOREOGRAPHIES: MotionChoreography[] = [
  {
    id: "drone_orbit",
    name: "Drone Orbit",
    badge: "ORBIT 360",
    description: "Smooth 25° orbital arc around focal centroid",
    promptSnippet: "Smooth 25-degree orbital drone arc around architectural focal centroid, maintaining strict perspective lines and dynamic parallax depth."
  },
  {
    id: "dolly_in",
    name: "Slow Dolly In",
    badge: "DOLLY IN",
    description: "Eye-level forward glide with +3% focal zoom",
    promptSnippet: "Steady forward camera dolly in at eye level (+3% focal zoom), gliding smoothly across the floor towards the architectural focal point."
  },
  {
    id: "pedestal_up",
    name: "Window Pedestal",
    badge: "PEDESTAL UP",
    description: "Vertical reveal from floor reflection to ceiling",
    promptSnippet: "Vertical jib pedestal reveal moving upwards from ground-level floor reflections to high-ceiling roofline, revealing expansive volume."
  },
  {
    id: "atmospheric_drift",
    name: "Atmospheric Drift",
    badge: "ATMOSPHERIC DRIFT",
    description: "Ambient breeze, curtain flutter, and water ripples",
    promptSnippet: "Subtle wind drift, slow curtain flutter, gentle ripples across water surfaces, ambient dust motes catching natural architectural light."
  }
];

export const PORTRAIT_CHOREOGRAPHIES: MotionChoreography[] = [
  {
    id: "portrait_push",
    name: "Slow Push In",
    badge: "PORTRAIT PUSH",
    description: "Smooth push-in on eyes & micro-expression",
    promptSnippet: "Slow, cinematic forward camera push-in towards subject eyes (+4% focal zoom), capturing subtle eye catchlights and authentic micro-expression."
  },
  {
    id: "head_turn",
    name: "Profile Turn",
    badge: "HEAD TURN 15°",
    description: "Subtle 15° head rotation with eye contact",
    promptSnippet: "Subject executes a natural, subtle 15-degree head rotation with direct eye contact, hair following natural inertia with soft rim light separation."
  },
  {
    id: "breathing_drift",
    name: "Breathing Drift",
    badge: "BREATHING DRIFT",
    description: "Gentle breathing movement & hair sway",
    promptSnippet: "Natural organic breathing movement, subtle hair sway, gentle fabric motion, soft rack focus accentuating eye catchlights."
  },
  {
    id: "orbit_torso",
    name: "Shoulder Orbit",
    badge: "ORBIT TORSO",
    description: "Smooth 20° parallax arc around subject",
    promptSnippet: "Smooth 20-degree orbital arc at eye level around subject shoulders, creating high-fashion cinematic parallax with deep bokeh background."
  }
];

export const UNIVERSAL_CHOREOGRAPHIES: MotionChoreography[] = [
  {
    id: "orbit_universal",
    name: "Orbit 360",
    badge: "ORBIT 360",
    description: "Cinematic orbital camera arc",
    promptSnippet: "Smooth cinematic orbital camera arc around central subject with realistic parallax depth."
  },
  {
    id: "dolly_universal",
    name: "Steady Dolly In",
    badge: "DOLLY IN",
    description: "Forward glide towards subject",
    promptSnippet: "Steady forward camera dolly in at eye level, smoothly gliding towards primary subject."
  },
  {
    id: "pedestal_universal",
    name: "Vertical Reveal",
    badge: "PEDESTAL",
    description: "Smooth vertical camera move",
    promptSnippet: "Vertical pedestal camera reveal from lower frame to eye level, showcasing environment volume."
  },
  {
    id: "ambient_drift",
    name: "Ambient Drift",
    badge: "AMBIENT DRIFT",
    description: "Subtle natural environmental drift",
    promptSnippet: "Subtle ambient motion, natural environmental physics, soft lighting shifts across textures."
  }
];

// Default alias for backwards compatibility
export const MOTION_CHOREOGRAPHIES = ARCHITECTURAL_CHOREOGRAPHIES;

export function getChoreographiesForDomain(domain: StudioDomain = 'arch'): MotionChoreography[] {
  switch (domain) {
    case 'portrait':
      return PORTRAIT_CHOREOGRAPHIES;
    case 'universal':
      return UNIVERSAL_CHOREOGRAPHIES;
    case 'arch':
    default:
      return ARCHITECTURAL_CHOREOGRAPHIES;
  }
}

export const DOMAIN_DEFAULTS = {
  arch: {
    name: "Architectural & Real Estate",
    badge: "ARCH",
    description: "Perspective alignment, structural geometry, twilight blue hour, and materiality",
    prompt: "Professional architectural enhancement: crisp structural geometry, true 2-point vertical lines, natural ambient light balance, rich material textures, clean noise reduction, and optimal interior/exterior dynamic range.",
    systemInstruction: "You are an elite master architectural photographer and digital post-production specialist. Preserve straight verticals, natural material textures (concrete, timber, glass, stone), dynamic range balance between interior and sky, and authentic color temperatures without artificial warmth or lens distortion."
  },
  portrait: {
    name: "Character & Portrait Studio",
    badge: "PORTRAIT",
    description: "Skin tone fidelity, eye catchlights, hair separation, and studio lighting",
    prompt: "Master portrait photography: true-to-life skin tones, fine hair and eyelash detail, authentic iris catchlights, soft depth-of-field separation, clean studio contrast, and natural facial contours.",
    systemInstruction: "You are a world-class high-fashion and commercial portrait master editor (Richard Avedon / Annie Leibovitz studio discipline). Preserve genuine facial bone structure, pores, natural skin texture, iris color depth, and hair strand micro-detail. Never plasticize skin or distort facial proportions. Render authentic studio lighting (Rembrandt, softbox, butterfly) with flattering contrast."
  },
  universal: {
    name: "Universal Photography",
    badge: "UNIVERSAL",
    description: "Commercial clarity, balanced exposure, and natural color grading",
    prompt: "Professional photo enhancement: studio-grade clarity, balanced dynamic range, rich natural colors, crisp details, clean noise reduction, and optimal exposure.",
    systemInstruction: "You are a master professional photography editor. Your goal is to produce high-end commercial quality enhancements across diverse subjects (portraits, landscapes, architecture, street, products, and studio photos).\n\nCRITICAL CONSTRAINTS:\n1. Preserve natural textures, sharpness, and original subject identity without artificial artifacts.\n2. Balance highlights, midtones, and shadows for an optimal dynamic range.\n3. Correct color casts and white balance while maintaining authentic tones and vibrant colors.\n4. Enhance micro-contrast, edge sharpness, and clarity.\n5. Clean up noise and compression artifacts seamlessly.\n6. Follow the user's specific creative direction and instructions faithfully.\n\nOutput only the high-quality edited image."
  }
} as const;

export interface CharacterContextImage {
  id: string;
  name?: string;
  label?: string;
  base64: string;
  mimeType?: string;
  enabled?: boolean;
}

export interface ReferenceAnchor {
  id: string;
  name?: string;
  base64: string;
  mimeType?: string;
  preview?: string;
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
  veoOption: VeoOption = 'omni',
  imageModelOption: ImageModelOption = 'flash',
  characterContextImages?: CharacterContextImage[],
  retries = 3,
  videoModel: VideoModel = 'omni',
  choreography?: string,
  referenceAnchor?: ReferenceAnchor | null,
  domain: StudioDomain = 'arch'
) {
  if (typeof window !== 'undefined') {
    const mimeType = base64Image.match(/data:([^;]+);base64,/)?.[1] || "image/jpeg";
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    // Determine target model
    let modelName = MODELS.IMAGE_GEN_HQ;
    if (mediaType === 'video') {
      modelName = MODELS.OMNI_1_1;
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
            videoModel: videoModel || (veoOption as any) || 'omni',
            choreography,
            referenceAnchor,
            imageModelOption,
            domain,
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

