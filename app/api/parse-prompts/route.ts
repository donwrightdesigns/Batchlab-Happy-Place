import { GoogleGenAI, Type, Schema } from "@google/genai";
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
    const { text, defaultAspectRatio } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: "Please provide text content containing prompts to parse." }, { status: 400 });
    }

    const promptSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        batchTitle: {
          type: Type.STRING,
          description: "Overall title or theme for this batch of prompts (e.g. 'Tad Craig Real Estate Slides')"
        },
        brandVoice: {
          type: Type.STRING,
          description: "Any brand voice or general instructions extracted from the document"
        },
        items: {
          type: Type.ARRAY,
          description: "Array of individual image generation prompts extracted from the text",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique identifier for this slide or prompt item (e.g. 'slide-1')" },
              title: { type: Type.STRING, description: "Short title or slide name (e.g. 'Slide 1: The Dog Inspection')" },
              concept: { type: Type.STRING, description: "Theme or concept grouping if present" },
              visualPrompt: { 
                type: Type.STRING, 
                description: "The complete, rich visual prompt to pass to the image generator model (e.g. 'A cinematic photo of two Golden Retrievers...'). Ensure all important visual and photographic details are captured." 
              },
              textOverlay: { 
                type: Type.STRING, 
                description: "Any text overlay, caption, quote, or slogan associated with this image slide" 
              }
            },
            required: ["title", "visualPrompt"]
          }
        }
      },
      required: ["items"]
    };

    const systemInstruction = `You are an expert prompt extraction and formatting engine.
Your task is to take any raw text, document excerpt, slide deck script, or list of multi-prompts (formatted in Word, markdown, plain text, numbered lists, or JSON) and extract every distinct image/visual generation prompt into a clean, structured JSON array.

Guidelines:
1. Identify every individual slide, scene, or prompt in the text.
2. Extract the detailed 'visualPrompt' containing all scene descriptions, subjects, lighting, vehicles, expressions, and aesthetic style.
3. Extract any 'textOverlay' (quotes, headlines, subtitles, or captions intended for that image).
4. Extract the 'title' or slide label.
5. If the document has a general brand voice or overarching concept, note it in 'brandVoice' or 'batchTitle'.
6. If the text is simply a raw list of separated paragraphs or numbered prompts, treat each one as an individual prompt item.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        {
          text: `Please parse and extract all visual prompts and text overlays from the following document:\n\n---\n${text}\n---`
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: promptSchema,
        temperature: 0.2
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response returned from Gemini text model");
    }

    const parsed = JSON.parse(responseText);

    // Normalize output items
    const items = (parsed.items || []).map((item: any, index: number) => ({
      id: item.id || `prompt-${index + 1}`,
      title: item.title || `Prompt ${index + 1}`,
      concept: item.concept || parsed.batchTitle || "",
      visualPrompt: item.visualPrompt || "",
      textOverlay: item.textOverlay || "",
      aspectRatio: defaultAspectRatio || "1:1"
    })).filter((item: any) => item.visualPrompt.trim().length > 0);

    return NextResponse.json({
      batchTitle: parsed.batchTitle || "Batch Generations",
      brandVoice: parsed.brandVoice || "",
      totalCount: items.length,
      items
    });

  } catch (error: any) {
    console.error("Parse Prompts API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to parse prompts from text" 
    }, { status: 500 });
  }
}
