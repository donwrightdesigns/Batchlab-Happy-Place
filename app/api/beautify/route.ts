import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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
      imageModelOption,
      characterContextImages
    } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    // Video Mode using Veo 3.1
    if (mediaType === 'video') {
      let veoModel = "veo-3.1-lite-generate-preview";
      if (veoOption === 'normal' || model === 'veo-3.1-generate-preview') {
        veoModel = "veo-3.1-generate-preview";
      } else if (veoOption === 'fast' || veoOption === 'lite') {
        veoModel = "veo-3.1-lite-generate-preview";
      } else if (model && model.includes('veo')) {
        veoModel = model;
      }

      const isEditMode = opMode === 'edit';
      const videoConfig: any = {
        numberOfVideos: 1,
        resolution: veoOption === 'fast' ? '720p' : (resolution === '4K' && veoModel === 'veo-3.1-generate-preview' ? '1080p' : (resolution === '1K' ? '720p' : '1080p')),
        aspectRatio: aspectRatio === 'auto' ? '16:9' : (aspectRatio === '9:16' ? '9:16' : '16:9')
      };

      const videoParams: any = {
        model: veoModel,
        prompt: prompt || "A high quality property video walkthrough with cinematic camera movement",
        config: videoConfig
      };

      if (isEditMode && base64Data) {
        videoParams.image = {
          imageBytes: base64Data,
          mimeType: mimeType || 'image/jpeg'
        };
      }

      const operation = await genAI.models.generateVideos(videoParams);

      // Poll until completion (up to ~90s)
      let op = new GenerateVideosOperation();
      op.name = operation.name;
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 3000));
        const updated = await genAI.operations.getVideosOperation({ operation: op });
        if (updated.done) {
          const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
          if (!uri) {
            throw new Error("Veo 3.1 video generation completed but returned no video output");
          }
          const videoRes = await fetch(uri, {
            headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || "" }
          });
          const arrayBuffer = await videoRes.arrayBuffer();
          const base64Video = Buffer.from(arrayBuffer).toString('base64');
          return NextResponse.json({ 
            base64: `data:video/mp4;base64,${base64Video}`,
            operationName: operation.name,
            modelUsed: veoModel
          });
        }
        attempts++;
      }

      return NextResponse.json({ 
        operationName: operation.name,
        pending: true,
        message: "Video generation in progress in background.",
        modelUsed: veoModel
      });
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
