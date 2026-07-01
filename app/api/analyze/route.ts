import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: NextRequest) {
  try {
    const { base64Data, mimeType, model } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    const result = await genAI.models.generateContent({
      model: model || "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: "Analyze and Identify weaknesses or flaws. provide 3-5 post-production solutions to be passed as editor instruction",
        },
      ]
    });

    return NextResponse.json({ text: result.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis returned" });
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
