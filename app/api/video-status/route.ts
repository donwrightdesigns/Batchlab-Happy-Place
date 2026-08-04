import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
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
    const { operationName } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    return NextResponse.json({ done: updated.done, response: updated.response });
  } catch (error: any) {
    console.error("Video Status Error:", error);
    return NextResponse.json({ error: error.message || "Failed to get video status" }, { status: 500 });
  }
}
