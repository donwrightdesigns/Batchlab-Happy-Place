import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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
    const { prompt, base64Data, mimeType, resolution, aspectRatio, videoModel = 'omni' } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    const targetAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
    const inputParts: any[] = [];
    if (base64Data) {
      inputParts.push({
        type: "image",
        mime_type: mimeType || "image/jpeg",
        data: base64Data
      });
    }
    inputParts.push({
      type: "text",
      text: prompt || "A high quality architectural video walkthrough"
    });

    const interaction = await ai.interactions.create({
      model: 'gemini-omni-1.1-flash',
      input: inputParts.length === 1 && !base64Data ? (prompt || "A high quality architectural video walkthrough") : inputParts,
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
        modelUsed: 'gemini-omni-1.1-flash'
      });
    }

    return NextResponse.json({ 
      operationName: interaction.id,
      pending: interaction.status === 'in_progress',
      modelUsed: 'gemini-omni-1.1-flash' 
    });
  } catch (error: any) {
    console.error("Generate Video Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start video generation" }, { status: 500 });
  }
}
