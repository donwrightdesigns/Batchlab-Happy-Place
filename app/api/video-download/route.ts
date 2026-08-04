import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { uri } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    if (!uri) {
      return NextResponse.json({ error: "URI is required" }, { status: 400 });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || "" }
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video from Veo: ${videoRes.statusText}`);
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const base64Video = Buffer.from(arrayBuffer).toString('base64');
    
    return NextResponse.json({ 
      base64: `data:video/mp4;base64,${base64Video}`
    });
  } catch (error: any) {
    console.error("Video Download Error:", error);
    return NextResponse.json({ error: error.message || "Failed to download video" }, { status: 500 });
  }
}
