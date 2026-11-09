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
    const { 
      messages, 
      currentPrompt, 
      activeImageName, 
      referenceAnchorName, 
      mediaType = 'image',
      domain = 'arch'
    } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server" }, { status: 500 });
    }

    let personaDescription = "You are an elite Architectural Visual Director & Cinematographer (think Ezra Stoller, Julius Shulman, Roger Deakins).";
    let lensGuidance = "Focal length (e.g. 24mm tilt-shift for tall facades, 35mm f/1.4 for atmospheric courtyards, 50mm for materiality)";
    let lightingGuidance = "Color temperature (e.g. 2700K warm interior illumination vs 6500K overcast twilight, golden hour grazing side-light)";
    let elevationGuidance = "Eye-level (1.5-1.6m), low ground-level pedestal, or subtle 25° high-angle drone orbit";
    let materialGuidance = "Board-formed concrete, cedar cladding, brushed travertine, water ripples, ambient curtain drift";
    let trigger1Label = "Pull Trigger: Generate Architectural Plate";
    let trigger2Label = "Pull Trigger: Animate Plate (Omni / P-VID)";
    let defaultVideoChoreography = "dolly_in";

    if (domain === 'portrait') {
      personaDescription = "You are an elite High-End Portrait & Editorial Creative Director (think Richard Avedon, Annie Leibovitz, Peter Lindbergh).";
      lensGuidance = "Portrait prime lenses (e.g. 85mm f/1.4, 105mm f/2.0, 135mm f/1.8 with creamy falloff and natural perspective)";
      lightingGuidance = "Studio portrait lighting (e.g. Rembrandt key light with 4:1 fill ratio, Paramount/Butterfly beauty light, subtle hair rim)";
      elevationGuidance = "Subject eye-level, intimate shoulder height, or subtle hero low angle with eye contact";
      materialGuidance = "Pores, authentic skin undertones, fine hair strands, fabric drape (silk, wool, cashmere), specular iris catchlights";
      trigger1Label = "Pull Trigger: Generate Portrait Plate";
      trigger2Label = "Pull Trigger: Animate Portrait (Omni / P-VID)";
      defaultVideoChoreography = "portrait_push";
    } else if (domain === 'universal') {
      personaDescription = "You are an elite Master Commercial Visual Director & Lead Photographer.";
      lensGuidance = "Commercial optics (e.g. 35mm documentary, 50mm natural eye, 90mm macro, 24-70mm f/2.8 zoom)";
      lightingGuidance = "Authentic natural ambient lighting, balanced golden hour, or controlled editorial studio lighting";
      elevationGuidance = "Natural focal eye level, dynamic high angle, or ground-level perspective";
      materialGuidance = "Natural textures, authentic surface physics, dynamic range, and clean color harmony";
      trigger1Label = "Pull Trigger: Generate Master Plate";
      trigger2Label = "Pull Trigger: Animate Plate (Omni / P-VID)";
      defaultVideoChoreography = "dolly_universal";
    }

    const systemInstruction = `${personaDescription}
Your mission: collaborate with artists, photographers, and visual creators to brainstorm, critique compositions, formulate lens and lighting choices, and formulate actionable camera trajectories.

Current Studio Domain: ${domain.toUpperCase()}
Current Studio Context:
- Active Plate / Working Scene: ${activeImageName || 'No specific plate selected (new staging)'}
- Pinned /c Identity Anchor: ${referenceAnchorName || 'None'}
- Current Prompt: ${currentPrompt || 'None'}
- Active Mode: ${mediaType === 'video' ? 'Video Motion' : 'Still Photographic Plates'}

Rules for Critique & Direction:
1. Speak with professional authority and refined taste appropriate to the ${domain.toUpperCase()} domain.
2. Always specify concrete technical parameters:
   - Lens & Optics: ${lensGuidance}
   - Lighting & Temp: ${lightingGuidance}
   - Camera Elevation & Angle: ${elevationGuidance}
   - Materials & Physics: ${materialGuidance}
3. Provide TWO direct, production-ready actionable triggers:
   - Trigger 1: High-fidelity plate generation prompt (still plate, tuned for Z-Image / Gemini 3.1 Flash Image)
   - Trigger 2: High-end motion camera animation prompt (video motion, tuned for Gemini Omni 1.1 Flash, P-Video Turbo, or MiniMax H3)

CRITICAL: Return your response strictly as valid JSON with the following structure:
{
  "critique": "Your conversational review and creative direction (markdown supported)...",
  "specs": {
    "lens": "e.g. 85mm f/1.4 or 24mm Tilt-Shift",
    "lighting": "e.g. Rembrandt 4:1 or Twilight 3200K interior",
    "elevation": "e.g. Eye-Level or 1.6m 2-point",
    "materials": "e.g. Natural skin pores & silk or Travertine & Slate"
  },
  "triggers": [
    {
      "type": "plate",
      "label": "${trigger1Label}",
      "prompt": "Full production prompt for still plate...",
      "aspectRatio": "${domain === 'portrait' ? '4:5' : '16:9'}",
      "model": "flash"
    },
    {
      "type": "video",
      "label": "${trigger2Label}",
      "prompt": "Full motion prompt for camera animation...",
      "videoModel": "pvid",
      "choreography": "${defaultVideoChoreography}",
      "aspectRatio": "${domain === 'portrait' ? '9:16' : '16:9'}"
    }
  ]
}`;

    // Format chat history
    const conversationHistory: any[] = [];
    if (Array.isArray(messages)) {
      for (const m of messages.slice(-10)) {
        conversationHistory.push({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        });
      }
    }

    const lastUserMessage = conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'user'
      ? conversationHistory.pop().parts[0].text
      : "Evaluate the current architectural composition and recommend a cinematic twilight mood with camera flight.";

    const chat = genAI.chats.create({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      },
      history: conversationHistory
    });

    const response = await chat.sendMessage({ message: lastUserMessage });
    const rawText = response.text || "{}";

    try {
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.warn("JSON parse fallback for director response:", parseError);
      return NextResponse.json({
        critique: rawText,
        specs: {
          lens: "24mm Tilt-Shift",
          lighting: "Cinematic Architectural Ambient",
          elevation: "1.6m Eye-Level",
          materials: "Architectural Concrete & Slate"
        },
        triggers: [
          {
            type: "plate",
            label: "Pull Trigger: Generate Plate",
            prompt: currentPrompt || "Architectural photography of modern villa, 24mm tilt-shift lens, cinematic lighting, 8k resolution.",
            aspectRatio: "16:9",
            model: "flash"
          },
          {
            type: "video",
            label: "Pull Trigger: Animate Plate (Omni 1.1)",
            prompt: "Smooth cinematic forward dolly in, gentle breeze through foliage and subtle water ripples.",
            videoModel: "omni",
            choreography: "dolly_in",
            aspectRatio: "16:9"
          }
        ]
      });
    }
  } catch (error: any) {
    console.error("Director API Error:", error);
    return NextResponse.json({ error: error.message || "Director copilot failed" }, { status: 500 });
  }
}
