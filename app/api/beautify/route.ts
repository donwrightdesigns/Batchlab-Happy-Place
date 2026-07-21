import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { base64Data, mimeType, prompt, resolution, model, aspectRatio, systemInstruction, opMode, mediaType } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    const isEditMode = opMode === 'edit';

    const parts = isEditMode ? [
      { text: "TARGET MEDIA TO ENHANCE:" },
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      systemInstruction?.trim() 
        ? { text: `\nINSTRUCTIONS: ${systemInstruction}\n\nUSER PROMPT: ${prompt}` }
        : { text: `\nUSER PROMPT: ${prompt}` }
    ] : [
      systemInstruction?.trim()
        ? { text: `INSTRUCTIONS: ${systemInstruction}\n\nUSER PROMPT: ${prompt}` }
        : { text: `USER PROMPT: ${prompt}` }
    ];

    const config: any = {};
    if (mediaType !== 'video') {
      config.imageConfig = {
        // Only include non-auto properties
        ...(resolution && resolution !== 'auto' ? { imageSize: resolution } : {}),
        ...(aspectRatio && aspectRatio !== 'auto' ? { aspectRatio: aspectRatio } : {})
      };
    }

    const result = await genAI.models.generateContent({
      model: model || "gemini-3.1-flash-image",
      contents: parts,
      config,
    });

    if (!result.candidates?.[0]?.content?.parts) {
      throw new Error("No valid response parts returned from AI");
    }

    for (const part of result.candidates[0].content.parts) {
      if (part.inlineData) {
        return NextResponse.json({ 
          base64: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}` 
        });
      }
    }

    throw new Error("No image returned from AI");
  } catch (error: any) {
    console.error("Beautify API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
