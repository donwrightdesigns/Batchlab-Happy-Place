import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { generateSpicyVideo } from "@/lib/spicy";
import { generatePVideo } from "@/lib/pvideo";

const genAI = new GoogleGenAI({ 
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
      base64Data, 
      mimeType, 
      prompt, 
      resolution, 
      model, 
      aspectRatio, 
      systemInstruction, 
      opMode, 
      mediaType, 
      veoOption,
      videoModel = 'omni',
      choreography,
      referenceAnchor,
      imageModelOption,
      characterContextImages,
      domain = 'arch'
    } = await req.json();

    if (!process.env.GEMINI_API_KEY && !process.env.P_VIDEO_API_KEY) {
      return NextResponse.json({ error: "No AI API keys configured on server" }, { status: 500 });
    }

    // Video Mode using P-Video, Gemini Omni 1.1 Flash & SpicyAPI Video Suite
    if (mediaType === 'video') {
      const activeVideoModel = videoModel || (veoOption as string) || 'omni';
      const targetAspect = aspectRatio === 'auto' ? '16:9' : (aspectRatio === '9:16' ? '9:16' : '16:9');
      
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
          motionPrompt += ` Camera Motion Choreography: ${choreography}. Preserve accurate perspective, stable lines, and material reflections.`;
        }
      }

      // Check P-Video Turbo Engine
      if (activeVideoModel === 'pvid') {
        const pvidRes = await generatePVideo({
          prompt: motionPrompt,
          base64Data,
          mimeType,
          model: 'pvid',
          aspectRatio: targetAspect,
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
                modelUsed: 'p-video-turbo'
              });
            }
          } catch (e) {
            console.warn("Could not buffer P-Video URL, returning URL signal:", e);
          }
        }
      }

      // Check SpicyAPI models (h3, seed, wan3)
      if (activeVideoModel === 'h3' || activeVideoModel === 'seed' || activeVideoModel === 'wan3') {
        const spicyRes = await generateSpicyVideo({
          prompt: motionPrompt,
          base64Data,
          mimeType,
          model: activeVideoModel as any,
          aspectRatio: targetAspect,
          resolution,
          choreographySnippet: choreography,
          referenceAnchorBase64: referenceAnchor?.base64
        });

        if (spicyRes.url) {
          try {
            const videoFetch = await fetch(spicyRes.url);
            if (videoFetch.ok) {
              const buffer = await videoFetch.arrayBuffer();
              const b64 = Buffer.from(buffer).toString('base64');
              return NextResponse.json({
                base64: `data:video/mp4;base64,${b64}`,
                modelUsed: spicyRes.modelUsed
              });
            }
          } catch (e) {
            console.warn("Could not buffer SpicyAPI video URL:", e);
          }
        }
      }

      // Native Gemini Omni 1.1 Video Generation
      const inputParts: any[] = [];
      if (base64Data) {
        inputParts.push({
          type: "image",
          mime_type: mimeType || "image/jpeg",
          data: base64Data
        });
      }

      if (referenceAnchor?.base64) {
        const refRaw = referenceAnchor.base64;
        const refMime = referenceAnchor.mimeType || (refRaw.match(/data:([^;]+);base64,/)?.[1]) || "image/jpeg";
        const refData = refRaw.includes(",") ? refRaw.split(",")[1] : refRaw;
        inputParts.push({
          type: "image",
          mime_type: refMime,
          data: refData
        });
        motionPrompt = `[Multi-Reference Anchor: Maintain material & subject identity from reference image]. ${motionPrompt}`;
      }

      inputParts.push({
        type: "text",
        text: motionPrompt
      });

      const interaction = await genAI.interactions.create({
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
        const vMime = videoPart.mime_type || 'video/mp4';
        return NextResponse.json({
          base64: `data:${vMime};base64,${videoPart.data}`,
          modelUsed: `gemini-omni-1.1-flash (${activeVideoModel.toUpperCase()})`
        });
      }

      if (interaction.status === 'in_progress' || interaction.status === 'pending') {
        return NextResponse.json({
          operationName: interaction.id,
          pending: true,
          message: "Video rendering in progress with Gemini Omni 1.1.",
          modelUsed: 'gemini-omni-1.1-flash'
        });
      }

      throw new Error("Gemini Omni 1.1 completed without producing video data");
    }

    // Image Mode using Gemini 3.1 Image models
    let selectedModel = model || "gemini-3.1-flash-image";
    if (imageModelOption === 'lite') {
      selectedModel = "gemini-3.1-flash-lite-image";
    } else {
      selectedModel = "gemini-3.1-flash-image";
    }

    const isEditMode = opMode === 'edit';

    // Construct a clean prompt string
    const cleanPrompt = prompt ? prompt.trim() : "";
    const finalUserPrompt = cleanPrompt || "Relight and retouch this image as a professional studio would prior to print.";

    // Assemble parts with support for up to 4 Character Context Reference Images
    const activeContextImages = Array.isArray(characterContextImages)
      ? characterContextImages.filter((c: any) => c && (c.base64 || c.base64Data) && c.enabled !== false).slice(0, 4)
      : [];

    const parts: any[] = [];

    // 0. Inject /c Subject & Architectural Identity Anchor if provided
    if (referenceAnchor?.base64) {
      const refRaw = referenceAnchor.base64;
      const refMime = referenceAnchor.mimeType || (refRaw.match(/data:([^;]+);base64,/)?.[1]) || "image/jpeg";
      const refClean = refRaw.includes(",") ? refRaw.split(",")[1] : refRaw;

      let anchorHeader = `=== ARCHITECTURAL & FACADE IDENTITY ANCHOR (/c) ===\n` +
        `The attached reference plate defines the master architectural material, fixture, facade, or spatial identity (${referenceAnchor.name || 'Structural Anchor'}).\n` +
        `CRITICAL MANDATE: Maintain identical materials, architectural textures, colors, and perspective scale shown in this reference anchor.`;

      if (domain === 'portrait') {
        anchorHeader = `=== CHARACTER / PORTRAIT IDENTITY ANCHOR (/c) ===\n` +
          `The attached reference plate defines the master subject identity, face structure, skin tone, and character styling (${referenceAnchor.name || 'Subject Anchor'}).\n` +
          `CRITICAL MANDATE: Maintain identical facial bone structure, skin undertones, eye color, hair style/color, and natural human proportions shown in this reference anchor.`;
      } else if (domain === 'universal') {
        anchorHeader = `=== SUBJECT IDENTITY ANCHOR (/c) ===\n` +
          `The attached reference plate defines the master subject identity and texture (${referenceAnchor.name || 'Subject Anchor'}).\n` +
          `CRITICAL MANDATE: Maintain identical colors, textures, details, and style shown in this reference anchor.`;
      }

      parts.push({
        text: anchorHeader
      });
      parts.push({
        inlineData: {
          data: refClean,
          mimeType: refMime
        }
      });
    }

    // 1. Inject Character Reference Images if provided
    if (activeContextImages.length > 0) {
      parts.push({
        text: `=== CHARACTER CONSISTENCY REFERENCE ANCHORS (${activeContextImages.length} REFERENCE IMAGE${activeContextImages.length > 1 ? 'S' : ''}) ===\n` +
              `The attached reference images define the primary character/subject's features.\n` +
              `CRITICAL MANDATE: Maintain likeness and consistency with these reference images in the generated output.`
      });

      for (let i = 0; i < activeContextImages.length; i++) {
        const ctx = activeContextImages[i];
        const raw = ctx.base64 || ctx.base64Data || "";
        const mType = ctx.mimeType || (raw.match(/data:([^;]+);base64,/)?.[1]) || "image/jpeg";
        const cleanBase64 = raw.includes(",") ? raw.split(",")[1] : raw;
        const label = ctx.label || ctx.name || `Reference Angle ${i + 1}`;

        parts.push({ text: `[Character Reference ${i + 1}: ${label}]` });
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mType
          }
        });
      }
    }

    // 2. Inject target image if editing an existing photo
    if (isEditMode && base64Data) {
      if (activeContextImages.length > 0) {
        parts.push({
          text: `=== BASE SCENE / TARGET IMAGE TO MODIFY ===\nApply the requested turn-by-turn modifications to this base image while maintaining full character likeness matching the Character Reference Anchors provided above.`
        });
      }
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "image/jpeg",
        }
      });
    }

    // 3. Inject User Prompt with character consistency instructions
    if (activeContextImages.length > 0) {
      parts.push({
        text: `=== GENERATION TASK / PROMPT ===\n${finalUserPrompt}\n\nSTRICT REQUIREMENT: The character rendered in this scene MUST have the features, and build of the character shown in the Character Reference Anchors above.`
      });
    } else {
      parts.push({ text: finalUserPrompt });
    }

    const config: any = {};
    if (aspectRatio && aspectRatio !== 'auto') {
      config.imageConfig = { aspectRatio };
    }

    // Set native systemInstruction inside config where the GenAI SDK expects it
    if (systemInstruction && systemInstruction.trim().length > 0) {
      config.systemInstruction = systemInstruction.trim();
    }

    const generationParams: any = {
      model: selectedModel,
      contents: parts,
      config,
    };

    const result = await genAI.models.generateContent(generationParams);

    if (!result.candidates?.[0]?.content?.parts) {
      throw new Error("No valid response parts returned from AI model");
    }

    for (const part of result.candidates[0].content.parts) {
      if (part.inlineData) {
        return NextResponse.json({ 
          base64: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
          modelUsed: selectedModel
        });
      }
    }

    throw new Error("No image returned from AI model");
  } catch (error: any) {
    console.error("Beautify API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
