/**
 * P-Video Turbo Engine Integration
 * Uses process.env.P_VIDEO_API_KEY with standard video generation payload.
 * Optimized for high-speed, cost-effective volume generation.
 */

export interface PVideoParams {
  prompt: string;
  base64Data?: string;
  mimeType?: string;
  model?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | 'auto';
  resolution?: '1K' | '2K' | '4K';
  choreographySnippet?: string;
  referenceAnchorBase64?: string;
  domain?: 'arch' | 'portrait' | 'universal';
}

export async function generatePVideo(params: PVideoParams): Promise<{ base64?: string; url?: string; modelUsed: string; error?: string }> {
  const pVideoKey = process.env.P_VIDEO_API_KEY || process.env.P_VIDEO_KEY;
  const endpoint = process.env.P_VIDEO_URL || 'https://api.p-video.com/v1/videos/generations';

  const fullPrompt = params.prompt + (params.choreographySnippet ? ` Motion: ${params.choreographySnippet}` : '');
  const imagePayload = params.base64Data ? `data:${params.mimeType || 'image/jpeg'};base64,${params.base64Data}` : undefined;

  if (pVideoKey) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pVideoKey}`,
          'x-api-key': pVideoKey
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          image_url: imagePayload,
          aspect_ratio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
          resolution: params.resolution || '2K',
          model: 'p-video-turbo',
          reference_image: params.referenceAnchorBase64 ? `data:image/jpeg;base64,${params.referenceAnchorBase64}` : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        const videoUrl = data.video_url || data.url || data.output_url;
        const videoB64 = data.base64 || data.video_base64;
        if (videoB64) {
          return { base64: videoB64.startsWith('data:') ? videoB64 : `data:video/mp4;base64,${videoB64}`, modelUsed: 'pvid' };
        }
        if (videoUrl) {
          return { url: videoUrl, modelUsed: 'pvid' };
        }
      } else {
        console.warn(`P-Video endpoint returned HTTP ${res.status}, checking fallback response`);
      }
    } catch (err: any) {
      console.warn("P-Video network call error, falling back to Omni 1.1:", err?.message || err);
    }
  }

  // If no external endpoint responded or key is simulated in sandbox, return signal for server fallback
  return { modelUsed: 'pvid' };
}
