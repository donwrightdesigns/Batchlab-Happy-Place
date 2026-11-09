import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { generateSpicyVideo } from "@/lib/spicy";
import { generatePVideo } from "@/lib/pvideo";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { 
      prompt, 
      base64Data, 
      mimeType, 
      resolution, 
      aspectRatio, 
      videoModel = 'omni',
      choreography,
      referenceAnchor,
      domain = 'arch'
    } = await req.json();

    if (!process.env.GEMINI_API_KEY && !process.env.P_VIDEO_API_KEY) {
      return NextResponse.json({ error: "No video API keys configured on server" }, { status: 500 });
    }

    // Build enriched cinematographic motion prompt based strictly on domain
    let motionPrompt = prompt;
    if (!motionPrompt) {
      if (domain === 'portrait') {
        motionPrompt = "High-end studio portrait cinematography with natural subject motion, micro-expressions, and authentic lighting.";
      } else if (domain === 'universal') {
        motionPrompt = "Professional commercial cinematography with crisp clarity, balanced dynamic range, and authentic physics.";
      } else {
        motionPrompt = "Architectural cinematography showcasing structural geometry, light, and natural movement.";
      }
    }

    if (choreography) {
      if (domain === 'portrait') {
        motionPrompt += ` Motion Choreography: ${choreography}. Preserve subject facial identity, eye catchlights, natural skin textures, and hair definition.`;
      } else if (domain === 'universal') {
        motionPrompt += ` Camera Motion Choreography: ${choreography}. Preserve natural textures and realistic motion physics.`;
      } else {
        motionPrompt += ` Camera Motion Choreography: ${choreography}. Preserve architectural verticals, realistic lighting reflections, and material physics.`;
      }
    }

    // 1. Try P-Video Turbo Engine if pvid is selected
    if (videoModel === 'pvid') {
      const pvidRes = await generatePVideo({
        prompt: motionPrompt,
        base64Data,
        mimeType,
        aspectRatio,
        resolution,
        choreographySnippet: choreography,
        referenceAnchorBase64: referenceAnchor?.base64,
        domain
      });

      if (pvidRes.base64) {
        return NextResponse.json({
          base64: pvidRes.base64,
          modelUsed: 'p-video-turbo'
        });
      }

      if (pvidRes.url) {
        try {
          const videoFetch = await fetch(pvidRes.url);
          if (videoFetch.ok) {
            const buffer = await videoFetch.arrayBuffer();
            const b64 = Buffer.from(buffer).toString('base64');
            return NextResponse.json({
              base64: `data:video/mp4;base64,${b64}`,
              modelUsed: 'p-video-turbo',
              videoUrl: pvidRes.url
            });
          }
        } catch (e) {
          return NextResponse.json({
            url: pvidRes.url,
            modelUsed: 'p-video-turbo'
          });
        }
      }
    }

    // 2. Try SpicyAPI if H3, Seeddance, or WAN 3.0 is selected
    if (videoModel === 'h3' || videoModel === 'seed' || videoModel === 'wan3') {
      const spicyRes = await generateSpicyVideo({
        prompt: motionPrompt,
        base64Data,
        mimeType,
        model: videoModel,
        aspectRatio,
        resolution,
        choreographySnippet: choreography,
        referenceAnchorBase64: referenceAnchor?.base64
      });

      if (spicyRes.url) {
        // Fetch and convert URL to base64 for seamless client playback
        try {
          const videoFetch = await fetch(spicyRes.url);
          if (videoFetch.ok) {
            const buffer = await videoFetch.arrayBuffer();
            const b64 = Buffer.from(buffer).toString('base64');
            return NextResponse.json({
              base64: `data:video/mp4;base64,${b64}`,
              modelUsed: spicyRes.modelUsed,
              videoUrl: spicyRes.url
            });
          }
        } catch (e) {
          console.warn("Could not convert SpicyAPI URL to base64, returning URL directly:", e);
          return NextResponse.json({
            url: spicyRes.url,
            modelUsed: spicyRes.modelUsed
          });
        }
      }
    }

    // 2. Official Gemini Omni 1.1 Native Video Generation via Interactions API
    const targetAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

    const inputParts: any[] = [];
    if (base64Data) {
      inputParts.push({
        type: "image",
        mime_type: mimeType || "image/jpeg",
        data: base64Data
      });
    }

    // Include /c Reference Anchor if supplied
    if (referenceAnchor?.base64) {
      inputParts.push({
        type: "image",
        mime_type: referenceAnchor.mimeType || "image/jpeg",
        data: referenceAnchor.base64.includes(",") ? referenceAnchor.base64.split(",")[1] : referenceAnchor.base64
      });
      motionPrompt = `[Multi-Reference Anchor: Maintain material & subject identity from reference image]. ${motionPrompt}`;
    }

    inputParts.push({
      type: "text",
      text: motionPrompt
    });

    const interaction = await ai.interactions.create({
      model: 'gemini-omni-1.1-flash',
      input: inputParts.length === 1 && !base64Data ? motionPrompt : inputParts,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: targetAspect
      }
    }, { timeout: 300000 });

    const videoPart = interaction.output_video;
    if (videoPart && videoPart.data) {
      const mime = videoPart.mime_type || 'video/mp4';
      return NextResponse.json({
        base64: `data:${mime};base64,${videoPart.data}`,
        modelUsed: `gemini-omni-1.1-flash (${videoModel.toUpperCase()})`
      });
    }

    // If interaction returned text or pending status
    if (interaction.status === 'in_progress' || interaction.status === 'pending') {
      return NextResponse.json({
        operationName: interaction.id,
        pending: true,
        message: "Video rendering in progress with Gemini Omni 1.1.",
        modelUsed: 'gemini-omni-1.1-flash'
      });
    }

    throw new Error("Gemini Omni 1.1 completed without producing video data");
  } catch (error: any) {
    console.error("Video Generation Route Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to generate video plate" 
    }, { status: 500 });
  }
}
