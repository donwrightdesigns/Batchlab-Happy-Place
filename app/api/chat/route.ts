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
    const { messages, uploadedImages } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    const imageContext = uploadedImages && uploadedImages.length > 0
      ? `Uploaded images: ${uploadedImages.map((img: any) => img.name).join(', ')}.`
      : 'No images uploaded yet.';

    const systemInstruction = `You are a professional photography and image processing consultant. You help users decide how to enhance and edit their photos across diverse photographic styles. 
    ${imageContext}
    Be professional, helpful, and concise.
    If the user asks to enhance, beautify, or change settings, provide clear advice and suggest specific prompt enhancements.`;

    const chat = genAI.chats.create({
      model: "gemini-3.7-flash",
      config: { systemInstruction }
    });

    const lastMessage = messages[messages.length - 1]?.content || "Hello";
    const response = await chat.sendMessage({ message: lastMessage });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message || "Chat failed" }, { status: 500 });
  }
}
