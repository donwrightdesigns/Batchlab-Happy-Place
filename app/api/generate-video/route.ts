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
    const { prompt, base64Data, mimeType, model, resolution, aspectRatio, veoOption } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    let veoModel = "veo-3.1-lite-generate-preview";
    if (veoOption === 'normal' || model === 'veo-3.1-generate-preview') {
      veoModel = "veo-3.1-generate-preview";
    }

    const config: any = {
      numberOfVideos: 1,
      resolution: veoOption === 'fast' ? '720p' : (resolution === '4K' ? '1080p' : '720p'),
      aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9'
    };

    const params: any = {
      model: veoModel,
      prompt: prompt || "A high quality property video walkthrough",
      config
    };

    if (base64Data) {
      params.image = {
        imageBytes: base64Data,
        mimeType: mimeType || 'image/jpeg'
      };
    }

    const operation = await ai.models.generateVideos(params);
    return NextResponse.json({ operationName: operation.name, model: veoModel });
  } catch (error: any) {
    console.error("Generate Video Error:", error);
    return NextResponse.json({ error: error.message || "Failed to start video generation" }, { status: 500 });
  }
}
