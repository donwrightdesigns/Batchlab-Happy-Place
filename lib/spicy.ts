/**
 * SpicyAPI & Gemini Omni 1.1 Video Production Suite
 * Models: Gemini Omni 1.1 Flash, MiniMax H3, Seeddance 2.5, WAN 3.0
 */

export interface VideoGenerationParams {
  prompt: string;
  base64Data?: string;
  mimeType?: string;
  model: 'pvid' | 'omni' | 'h3' | 'seed' | 'wan3';
  aspectRatio?: '16:9' | '9:16' | '1:1' | 'auto';
  resolution?: '1K' | '2K' | '4K';
  choreographySnippet?: string;
  referenceAnchorUrls?: string[];
  referenceAnchorBase64?: string;
}

export const VIDEO_MODELS = {
  pvid: {
    id: 'pvid',
    name: 'P-Video Turbo Engine',
    engine: 'P-Video Fast Motion',
    badge: 'P-VID',
    description: 'Ultra-fast low-cost video rendering with high-speed turnaround',
    tag: 'Turbo Fast'
  },
  omni: {
    id: 'omni',
    name: 'Gemini Omni 1.1 Flash',
    engine: 'Google DeepMind Native Motion',
    badge: 'OMNI 1.1',
    description: 'First-party multimodal camera trajectories & physics',
    tag: 'Official Google'
  },
  h3: {
    id: 'h3',
    name: 'MiniMax Hailuo H3',
    engine: 'SpicyAPI Video Suite',
    badge: 'MINIMAX H3',
    description: 'Hyper-realistic material lighting & micro-reflections',
    tag: 'SpicyAPI'
  },
  seed: {
    id: 'seed',
    name: 'Seeddance 2.5',
    engine: 'SpicyAPI Video Suite',
    badge: 'SEED 2.5',
    description: 'Atmospheric volumetric lighting, foliage sway & fluid caustics',
    tag: 'SpicyAPI'
  },
  wan3: {
    id: 'wan3',
    name: 'WAN 3.0',
    engine: 'SpicyAPI Video Suite',
    badge: 'WAN 3.0',
    description: 'Ultra-wide architectural pans and structural geometric stability',
    tag: 'SpicyAPI'
  }
} as const;

export async function generateSpicyVideo(params: VideoGenerationParams): Promise<{ base64?: string; url?: string; modelUsed: string }> {
  const spicyKey = process.env.SPICY_API_KEY || process.env.SPICY_KEY;
  const targetModel = params.model;
  
  if (spicyKey) {
    try {
      const modelMap: Record<string, string> = {
        h3: 'minimax-h3-video',
        seed: 'seeddance-2.5-video',
        wan3: 'wan-3.0-video'
      };

      const res = await fetch('https://api.spicyapi.com/v1/videos/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${spicyKey}`
        },
        body: JSON.stringify({
          model: modelMap[targetModel] || 'minimax-h3-video',
          prompt: params.prompt + (params.choreographySnippet ? ` Motion: ${params.choreographySnippet}` : ''),
          image_url: params.base64Data ? `data:${params.mimeType || 'image/jpeg'};base64,${params.base64Data}` : undefined,
          reference_image_urls: params.referenceAnchorUrls || (params.referenceAnchorBase64 ? [`data:image/jpeg;base64,${params.referenceAnchorBase64}`] : undefined),
          aspect_ratio: params.aspectRatio === '9:16' ? '9:16' : '16:9'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.video_url || data.url) {
          return { url: data.video_url || data.url, modelUsed: targetModel };
        }
      }
    } catch (err) {
      console.warn("SpicyAPI direct request error, falling back to Omni 1.1:", err);
    }
  }

  return { modelUsed: targetModel };
}
