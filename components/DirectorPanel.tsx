'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clapperboard, 
  X, 
  Send, 
  Sparkles, 
  Video, 
  Loader2, 
  Camera, 
  Sun, 
  Compass, 
  Layers, 
  Play, 
  Zap,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface DirectorTrigger {
  type: 'plate' | 'video';
  label: string;
  prompt: string;
  aspectRatio?: string;
  model?: string;
  videoModel?: string;
  choreography?: string;
}

export interface DirectorSpecs {
  lens?: string;
  lighting?: string;
  elevation?: string;
  materials?: string;
}

export interface DirectorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  specs?: DirectorSpecs;
  triggers?: DirectorTrigger[];
  timestamp: number;
}

interface DirectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  activeImageName?: string;
  referenceAnchorName?: string;
  mediaType: 'image' | 'video';
  domain?: 'arch' | 'portrait' | 'universal';
  onPullTriggerPlate: (prompt: string, aspectRatio?: string, model?: string) => void;
  onPullTriggerMotion: (prompt: string, videoModel?: string, choreography?: string, aspectRatio?: string) => void;
}

const STARTER_PROMPTS_BY_DOMAIN = {
  arch: [
    "Evaluate facade composition & balance",
    "Scandi twilight mood (overcast & brass)",
    "Recommend 25° drone orbit flight",
    "Accentuate raw concrete & pool caustics"
  ],
  portrait: [
    "Evaluate facial lighting & skin tones",
    "Rembrandt lighting with soft hair rim",
    "Subtle 15° eye-level head turn",
    "85mm f/1.4 creamy bokeh falloff"
  ],
  universal: [
    "Evaluate commercial composition & clarity",
    "Golden hour directional lighting",
    "Subtle forward dolly camera glide",
    "Clean micro-contrast & surface textures"
  ]
};

export const DirectorPanel: React.FC<DirectorPanelProps> = ({
  isOpen,
  onClose,
  currentPrompt,
  activeImageName,
  referenceAnchorName,
  mediaType,
  domain = 'arch',
  onPullTriggerPlate,
  onPullTriggerMotion
}) => {
  const starters = STARTER_PROMPTS_BY_DOMAIN[domain] || STARTER_PROMPTS_BY_DOMAIN.arch;

  const getInitialMessage = (): DirectorMessage => {
    if (domain === 'portrait') {
      return {
        id: 'welcome',
        role: 'assistant',
        content: `Welcome to the Portrait & Character Director suite. I evaluate facial bone structure, skin tone accuracy, studio lighting ratios (Rembrandt, Paramount, soft rim), and formulate one-click triggers for high-fashion portrait plates and natural character micro-motion.`,
        specs: {
          lens: "85mm f/1.4 Portrait Prime",
          lighting: "Rembrandt Key 4:1 + Soft Ambient Fill",
          elevation: "Eye-Level Direct Subject Gaze",
          materials: "Natural Skin Pores & Micro Hair Texture"
        },
        triggers: [
          {
            type: "plate",
            label: "Pull Trigger: Generate Portrait Plate",
            prompt: currentPrompt || "Editorial portrait photograph, 85mm f/1.4 lens, natural skin undertones, fine hair texture, authentic iris catchlights, soft background bokeh, studio grade.",
            aspectRatio: "4:5",
            model: "flash"
          },
          {
            type: "video",
            label: "Pull Trigger: Animate Portrait (P-VID / Omni)",
            prompt: "Cinematic portrait micro-motion: gentle eye contact, subtle 15-degree head rotation with soft hair rim light separation.",
            videoModel: "pvid",
            choreography: "portrait_push",
            aspectRatio: "9:16"
          }
        ],
        timestamp: Date.now()
      };
    }

    if (domain === 'universal') {
      return {
        id: 'welcome',
        role: 'assistant',
        content: `Welcome to the Commercial Photography Director suite. I evaluate subject framing, exposure balance, color harmonies, and formulate clean triggers for master plates and camera movements.`,
        specs: {
          lens: "50mm Natural Perspective f/2.0",
          lighting: "Directional Golden Hour Sun",
          elevation: "Natural Subject Height",
          materials: "High-Fidelity Surface Micro-Contrast"
        },
        triggers: [
          {
            type: "plate",
            label: "Pull Trigger: Generate Master Plate",
            prompt: currentPrompt || "Professional commercial photograph with studio lighting, balanced dynamic range, rich natural colors, crisp details, 8k resolution.",
            aspectRatio: "16:9",
            model: "flash"
          },
          {
            type: "video",
            label: "Pull Trigger: Animate Plate (P-VID / Omni)",
            prompt: "Smooth forward camera dolly glide at natural focal eye level, showcasing depth and environment lighting.",
            videoModel: "pvid",
            choreography: "dolly_universal",
            aspectRatio: "16:9"
          }
        ],
        timestamp: Date.now()
      };
    }

    return {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to the Architectural Director suite. I evaluate structural geometry, perspective verticals, twilight lighting temperatures, and construct one-click production triggers for plate generation and drone camera choreography.`,
      specs: {
        lens: "24mm Tilt-Shift f/8",
        lighting: "Diffused Architectural Ambient",
        elevation: "1.6m Eye-Level Two-Point Perspective",
        materials: "Natural Wood, Raw Concrete & Glass"
      },
      triggers: [
        {
          type: "plate",
          label: "Pull Trigger: Generate Architectural Plate",
          prompt: currentPrompt || "Architectural photography of modern minimalist villa at twilight, raw concrete texture, expansive glass openings, warm 3000K interior glow, sharp 2-point perspective, 8k resolution.",
          aspectRatio: "16:9",
          model: "flash"
        },
        {
          type: "video",
          label: "Pull Trigger: Animate Plate (Omni 1.1 Motion)",
          prompt: "Smooth forward camera dolly glide at human eye level, evening breeze rustling through landscape greenery, ambient pool surface ripples.",
          videoModel: "omni",
          choreography: "dolly_in",
          aspectRatio: "16:9"
        }
      ],
      timestamp: Date.now()
    };
  };

  const [messages, setMessages] = useState<DirectorMessage[]>([getInitialMessage()]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [triggeredId, setTriggeredId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: DirectorMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentPrompt,
          activeImageName,
          referenceAnchorName,
          mediaType,
          domain
        })
      });

      if (!res.ok) {
        throw new Error(`Director copilot returned ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage: DirectorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.critique || "I have analyzed the concept and configured optimal staging triggers below.",
        specs: data.specs,
        triggers: data.triggers || [],
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Director copilot error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Director review encountered a temporary signal disruption: ${err.message || 'Unknown error'}. You can still pull the baseline triggers below.`,
          triggers: [
            {
              type: "plate",
              label: "Pull Trigger: Generate Baseline Plate",
              prompt: currentPrompt || "Architectural photograph of modern pavilion at blue hour, 24mm tilt shift lens, 8k.",
              aspectRatio: "16:9"
            }
          ],
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeTrigger = (trigger: DirectorTrigger, triggerKey: string) => {
    setTriggeredId(triggerKey);
    setTimeout(() => setTriggeredId(null), 3000);

    if (trigger.type === 'video') {
      onPullTriggerMotion(trigger.prompt, trigger.videoModel, trigger.choreography, trigger.aspectRatio);
    } else {
      onPullTriggerPlate(trigger.prompt, trigger.aspectRatio, trigger.model);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs cursor-pointer"
          />

          {/* Slide-over Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-xl h-full bg-[#09090b] text-white border-l border-white/10 shadow-2xl flex flex-col z-10 font-sans"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Clapperboard size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">AI Creative Director</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[8px] font-mono font-bold text-amber-300">
                      GEMINI 3.8 FLASH
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 font-mono tracking-wider mt-0.5">
                    {domain === 'portrait' ? 'PORTRAIT & CHARACTER STUDIO · MULTI-REFERENCE STAGING' : domain === 'universal' ? 'COMMERCIAL PHOTO STUDIO · BALANCED EXPOSURE' : 'ARCHITECTURAL COPILOT · MULTI-REFERENCE STAGING'}
                  </p>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close Director"
              >
                <X size={18} />
              </button>
            </div>

            {/* Context Status Bar */}
            <div className="px-6 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[9px] font-mono text-gray-400">
              <div className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">Scene: <strong className="text-gray-200">{activeImageName || 'New Plate'}</strong></span>
                <span>·</span>
                <span>Anchor: <strong className="text-amber-400">{referenceAnchorName || 'None'}</strong></span>
              </div>
              <span className="text-gray-500 uppercase tracking-widest">{mediaType === 'video' ? 'Video Motion' : 'Still Plate'}</span>
            </div>

            {/* Message Thread */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-white/10 text-white rounded-2xl rounded-tr-xs px-4 py-3 max-w-[85%] border border-white/10 text-xs leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="w-full space-y-4">
                      {/* Technical Cinematography Breakdown */}
                      {msg.specs && (
                        <div className="grid grid-cols-2 gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 text-[10px] font-mono">
                          <div className="flex items-start gap-2">
                            <Camera size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-gray-500 block uppercase text-[8px]">Lens & Optic</span>
                              <span className="text-gray-200 font-bold">{msg.specs.lens}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Sun size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-gray-500 block uppercase text-[8px]">Lighting & Temp</span>
                              <span className="text-gray-200 font-bold">{msg.specs.lighting}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 pt-2 border-t border-white/5">
                            <Compass size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-gray-500 block uppercase text-[8px]">Elevation & Angle</span>
                              <span className="text-gray-200 font-bold">{msg.specs.elevation}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 pt-2 border-t border-white/5">
                            <Layers size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-gray-500 block uppercase text-[8px]">Materials & Texture</span>
                              <span className="text-gray-200 font-bold">{msg.specs.materials}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Narrative Critique */}
                      <div className="bg-black/50 border border-white/10 rounded-2xl p-4 text-xs text-gray-300 leading-relaxed space-y-2">
                        <div className="prose prose-invert prose-xs max-w-none text-gray-300">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Actionable Trigger Cards */}
                      {msg.triggers && msg.triggers.length > 0 && (
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 flex items-center gap-1.5">
                              <Zap size={11} />
                              Actionable Studio Triggers
                            </span>
                            <span className="text-[8px] font-mono text-gray-500">1-CLICK EXECUTION</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {msg.triggers.map((trigger, idx) => {
                              const triggerKey = `${msg.id}-${idx}`;
                              const isFired = triggeredId === triggerKey;

                              return (
                                <div 
                                  key={idx}
                                  className={`p-3.5 rounded-2xl border transition-all ${
                                    trigger.type === 'video'
                                      ? 'bg-gradient-to-br from-white/[0.04] to-amber-950/20 border-amber-500/30 hover:border-amber-400/60'
                                      : 'bg-white/[0.03] border-white/15 hover:border-white/30'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {trigger.type === 'video' ? (
                                        <span className="p-1 rounded-md bg-amber-400/20 text-amber-400">
                                          <Video size={12} />
                                        </span>
                                      ) : (
                                        <span className="p-1 rounded-md bg-white/20 text-white">
                                          <Sparkles size={12} />
                                        </span>
                                      )}
                                      <span className="text-[10px] font-black uppercase tracking-wider text-white">
                                        {trigger.label}
                                      </span>
                                    </div>
                                    <span className="text-[8px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                      {trigger.type === 'video' ? (trigger.videoModel ? trigger.videoModel.toUpperCase() : 'OMNI 1.1') : 'Z-IMAGE / FLASH'}
                                    </span>
                                  </div>

                                  <p className="text-[10px] text-gray-400 font-mono leading-relaxed line-clamp-2 mb-3 bg-black/40 p-2 rounded-xl border border-white/5">
                                    &ldquo;{trigger.prompt}&rdquo;
                                  </p>

                                  <button
                                    onClick={() => executeTrigger(trigger, triggerKey)}
                                    className={`w-full py-2.5 px-3 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                                      isFired
                                        ? 'bg-emerald-500 text-black shadow-emerald-500/20 scale-[0.98]'
                                        : (trigger.type === 'video' 
                                            ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20' 
                                            : 'bg-white hover:bg-gray-200 text-black shadow-white/10')
                                    }`}
                                  >
                                    {isFired ? (
                                      <>
                                        <Zap size={13} className="fill-black" />
                                        <span>Trigger Fired! Engine Processing</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play size={12} className="fill-current" />
                                        <span>{trigger.label}</span>
                                        <ArrowRight size={12} className="ml-1 opacity-70" />
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-gray-400">
                  <Loader2 size={16} className="animate-spin text-amber-400" />
                  <span className="text-[10px] font-mono tracking-wider">
                    DIRECTOR CONSTRUCTING CINEMATOGRAPHIC BLUEPRINT & TRIGGERS...
                  </span>
                </div>
              )}
            </div>

            {/* Quick Starters */}
            <div className="px-6 py-2 border-t border-white/5 bg-black/20 flex gap-1.5 overflow-x-auto custom-scrollbar">
              {starters.map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(promptText)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-[9px] font-mono transition-all cursor-pointer disabled:opacity-40"
                >
                  {promptText}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-white/10 bg-black/60">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    domain === 'portrait' 
                      ? "Ask director: 'Rembrandt lighting with soft 85mm f/1.4 bokeh'..." 
                      : domain === 'universal' 
                        ? "Ask director: 'High-contrast commercial lighting with crisp detail'..." 
                        : "Ask director: 'Overcast Scandinavian twilight with wet slate'..."
                  }
                  disabled={isLoading}
                  className="flex-1 bg-white/[0.05] border border-white/15 focus:border-amber-400 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 outline-none transition-all font-sans"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 bg-amber-400 hover:bg-amber-300 disabled:bg-gray-800 disabled:text-gray-600 text-black rounded-xl transition-all cursor-pointer font-bold shadow-md shadow-amber-400/20"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
