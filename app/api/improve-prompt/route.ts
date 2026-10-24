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
    const { prompt, mode = 'create', category = 'general' } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "No prompt provided to improve" }, { status: 400 });
    }

    const systemInstruction = `You are an expert AI prompt engineer specializing in photorealistic imagery, architectural visualization, cinematic lighting, and fine photographic aesthetics.
Your task is to take a raw, simple, or rough user prompt and rewrite it into a highly detailed, descriptive, vivid, and effective image generation prompt.

GUIDELINES:
1. Maintain the user's core intent and subject faithfully.
2. Add precise photographic details: lighting (e.g. golden hour, soft diffuse morning light, moody architectural illumination), composition, camera angle, textures, materials, and atmospheric depth.
3. If architectural or interior: specify realistic materials (concrete, warm oak, brushed brass, fluted glass, polished travertine), spatial depth, and clean vertical perspective.
4. Keep the output strictly as the improved prompt itself (1 to 3 concise, powerful sentences). Do NOT wrap in quotes, do NOT add introductory pleasantries or explanations.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          text: `Mode: ${mode === 'edit' ? 'Image Enhancement / Retouching' : 'Generative Text-to-Image Creation'}\nCategory: ${category}\nOriginal User Prompt:\n"${prompt.trim()}"\n\nGenerate the improved, enriched prompt:`
        }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 300,
      }
    });

    const improvedPrompt = response.text?.trim() || prompt;
    return NextResponse.json({ improvedPrompt });
  } catch (error: any) {
    console.error("Improve Prompt API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to improve prompt" }, { status: 500 });
  }
}
