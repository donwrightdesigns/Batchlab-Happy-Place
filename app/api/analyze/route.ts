import { GoogleGenAI } from "@google/genai";
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
    const { base64Data, mimeType, model } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    const result = await genAI.models.generateContent({
      model: model || "gemini-3.1-flash-lite-image",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || "image/jpeg",
          },
        },
        {
          text: "Act as a professional photographic critic and image processing expert. Identify technical flaws (exposure, lighting, dynamic range, composition, color balance, noise, artifacts, sharpness) and provide concise, actionable correction instructions for an AI image editor. Format as:\n\nFLAWS:\n- [flaws]\n\nCORRECTIONS:\n- [instructions]",
        },
      ]
    });

    return NextResponse.json({ text: result.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis returned" });
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
