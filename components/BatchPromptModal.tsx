'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Trash2, 
  Plus, 
  Copy, 
  Check, 
  FileText, 
  Layers, 
  Zap, 
  Loader2, 
  Sliders, 
  Type, 
  Image as ImageIcon,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { ImageModelOption, ImageAspectRatio } from '@/lib/gemini';

export interface ParsedPromptItem {
  id: string;
  title: string;
  concept?: string;
  visualPrompt: string;
  textOverlay?: string;
  aspectRatio?: ImageAspectRatio;
}

interface BatchPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateBatch: (items: ParsedPromptItem[], batchTitle: string) => void;
  defaultConcurrency?: number;
  characterContextCount?: number;
  characterContextEnabled?: boolean;
  onOpenCharacterDrawer?: () => void;
}

const SAMPLE_DOCUMENT = `TAD CRAIG: 20 FUNNY INSTAGRAM SLIDES FOR AI GENERATION

Brand Voice: Broker | Auctioneer | Helluvaguy. Anti-Zestimate. 110% Hustle.
Instructions: Copy the "Visual Prompt" into your AI image generator (Gemini Flash). Add the "Text Overlay" to the resulting image.

CONCEPT 1: "SHELBYVILLE ESTATES" (The Blazer & The Dogs)

Slide 1: The Dog Inspection
Visual Prompt: A cinematic photo of two Golden Retrievers sitting on the hood of a vintage 1970s bright orange Chevy Blazer. One dog is wearing a yellow construction hard hat and looking closely at a blueprint. The truck is parked in the driveway of a massive luxury brick estate in Tennessee at sunset.
Text Overlay: "My GC says the bones are good. My dogs say the yard is huge."

Slide 2: The Trifecta Juggling Act
Visual Prompt: A ruggedly handsome man in his 50s with a beard, wearing a vest and ballcap, leaning against a vintage orange Chevy Blazer. He is casually tossing three items in the air: a wooden auctioneer's gavel, a real estate "SOLD" sign, and a contractor's hammer. High-end luxury house in the background.
Text Overlay: "Broker. Auctioneer. Contractor. (I also do children's birthday parties.)"

Slide 3: Mud on the Concrete
Visual Prompt: A pristine, multi-million dollar luxury mansion with a stark white concrete driveway. Parked dead center is a vintage 1970s orange Chevy Blazer covered in thick, wet, red Tennessee clay mud. Two happy dogs are looking out the back.
Text Overlay: "We clean up nice. But we never forget where the dirt is."

Slide 4: The Zestimate Guard Dogs
Visual Prompt: Two Golden Retrievers sitting fiercely on the hood of a vintage orange Chevy Blazer. They are aggressively barking at a glowing blue, holographic floating robot that has the word "ALGORITHM" written on it.
Text Overlay: "The only algorithm my team trusts is the one that tells us when it's dinner time."

Slide 5: The Over-Delivering Chauffeur
Visual Prompt: An interior shot looking over the steering wheel of a vintage orange Chevy Blazer. The driver is wearing driving gloves. In the passenger seat is a completely shocked tech-bro looking at a real estate contract. Outside the windshield is a beautiful Tennessee estate.
Text Overlay: "Your agent drives you to the showing. I tell you how much it'll cost to fix the roof before we park."

Slide 6: The "Apples to Apples" CMA
Visual Prompt: A man in a vest and boots standing next to an orange Chevy Blazer. He is holding a literal apple in one hand, and a highly detailed architectural model of a house in the other, looking at the camera with a deadpan expression.
Text Overlay: "Real Estate is unique. You can't comp a custom estate to a tract home. That's apples to... whatever Zillow is doing."

Slide 7: High Speed Negotiation
Visual Prompt: A vintage orange Chevy Blazer doing a massive, smokey burnout in the driveway of a luxury estate. A real estate "FOR SALE" sign is flying through the air, instantly transforming into a "SOLD" sign.
Text Overlay: "The market changes by the minute. We move by the second."

CONCEPT 2: "HOME & ADVENTURE" (The Dirt Road Action)

Slide 8: The 110% Approach
Visual Prompt: An action-packed panning shot of a bright orange 1972 Chevy Blazer catching a foot of air over a dirt hill on a rural Tennessee farm. Mud is flying everywhere. Two dogs in the back seat are wearing aviator goggles and their ears are flapping in the wind.
Text Overlay: "How I approach real estate: 110% and full speed ahead."

Slide 9: The Literal Perc Test
Visual Prompt: A man in a nice button-down shirt, vest, and ballcap is standing waist-deep in a muddy Tennessee creek, giving a thumbs up to the camera. His orange Chevy Blazer is parked on the grassy bank behind him.
Text Overlay: "Your agent Googled 'Flood Zone.' I just waded through it."

Slide 10: Outrunning the Market
Visual Prompt: A bright orange Chevy Blazer speeding down a gravel country road, leaving a massive dust trail. In the rearview mirror, you can see a terrifying, cartoonish storm cloud labeled "INTEREST RATES."
Text Overlay: "Real estate moves fast. The Orange Thunder moves faster."

Slide 11: The GPS Fail
Visual Prompt: A close up of a smartphone GPS screen displaying the words "RECALCULATING... YOU ARE LOST." In the background, out of focus, an orange Chevy Blazer is effortlessly driving through a dense, pathless Tennessee forest.
Text Overlay: "I don't need a pin drop. I know every fence row in Bedford County."

Slide 12: The Fly Fishing Closer
Visual Prompt: A man standing in a river casting a fly-fishing rod. Instead of a fly on the end of the line, there is a miniature real estate "SOLD" sign. An orange Chevy Blazer is parked on the riverbank.
Text Overlay: "Patience for the strike. Speed for the close."

Slide 13: The Off-Road Office
Visual Prompt: The tailgate of an orange Chevy Blazer is down. On the tailgate is a laptop, a cup of coffee, a contractor's hardhat, and an auctioneer's gavel. A vast, 50-acre farm stretches out in the background under a sunrise.
Text Overlay: "Corner offices are overrated. I prefer 50 acres and a tailgate."

Slide 14: The Fence Line Tightrope
Visual Prompt: A man in boots and a vest is literally balancing and walking along the top wire of a barbed-wire fence line like a circus tightrope walker. He is holding a clipboard.
Text Overlay: "Your out-of-town agent doesn't know where the property line is. I'm currently standing on it."

CONCEPT 3: "SHELBYVILLE REALTY" (Heritage & Auctions)

Slide 15: The Gavel Drop
Visual Prompt: A dramatic, low-angle shot of a man slamming a wooden auctioneer's gavel down onto the hood of an orange Chevy Blazer. The impact is causing a shockwave that is blowing the leaves off the surrounding trees.
Text Overlay: "Most realtors wait for a buyer. I make them compete."

Slide 16: The 50-Year Stare Down
Visual Prompt: A split screen. On the left, a grainy, vintage 1973 photo of a man leaning on a wooden Craig & Wheeler real estate sign. On the right, a modern, ultra-high-definition photo of a man in 2024 leaning on the exact same sign.
Text Overlay: "Zillow launched in 2006. We’ve been putting signs in this dirt since 1973."

Slide 17: Auctioneer Energy
Visual Prompt: A man standing on top of a giant round hay bale in the middle of a green pasture. He holds a microphone and is speaking so fast and with so much energy that the hay bale is literally catching on fire.
Text Overlay: "Auctioneer energy: It’s not just a chant, it’s a strategy."

Slide 18: Burying the Algorithm
Visual Prompt: A man in boots leaning on a shovel next to an orange Chevy Blazer. At his feet is a freshly dug hole. Inside the hole is a computer monitor displaying a "Zestimate."
Text Overlay: "Algorithms belong on the internet. Not in your topsoil."

Slide 19: The 1973 Time Machine
Visual Prompt: A magical, glowing 1970s orange Chevy Blazer parked in front of the historic Craig & Wheeler Realty office on Cannon Blvd. A neon sign in the window says "Est. 1973".
Text Overlay: "Four generations of local deal-flow. You can't download that from an app."

Slide 20: The Ultimate SOLD Board
Visual Prompt: A colossal, 50-foot tall wooden "SOLD" board standing in the middle of a Tennessee pasture, requiring construction scaffolding. A man in a vest is climbing a ladder to stick a tiny "SOLD" sticker at the very top. The orange Blazer is parked at the bottom.
Text Overlay: "The SOLD board doesn't lie. And neither do I. Let's add yours."`;

export const BatchPromptModal: React.FC<BatchPromptModalProps> = ({
  isOpen,
  onClose,
  onGenerateBatch,
  defaultConcurrency = 3,
  characterContextCount = 0,
  characterContextEnabled = false,
  onOpenCharacterDrawer
}) => {
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [batchTitle, setBatchTitle] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedPromptItem[]>([]);
  const [globalAspectRatio, setGlobalAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [activeTab, setActiveTab] = useState<'input' | 'review'>('input');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(defaultConcurrency);
  const [imageModelOption, setImageModelOption] = useState<ImageModelOption>('flash');

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) {
      setParseError('Please paste document text or a list of prompts.');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const res = await fetch('/api/parse-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          defaultAspectRatio: globalAspectRatio
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Error ${res.status}: Failed to extract prompts`);
      }

      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        throw new Error('No valid visual prompts could be extracted from this text. Please check the formatting.');
      }

      setBatchTitle(data.batchTitle || 'Batch Generations');
      setBrandVoice(data.brandVoice || '');
      setParsedItems(data.items);
      setActiveTab('review');
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Failed to parse prompts with Gemini.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof ParsedPromptItem, value: any) => {
    setParsedItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };

  const handleDeleteItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddItem = () => {
    const newItem: ParsedPromptItem = {
      id: `prompt-${Date.now()}`,
      title: `Prompt ${parsedItems.length + 1}`,
      visualPrompt: '',
      textOverlay: '',
      aspectRatio: globalAspectRatio
    };
    setParsedItems(prev => [...prev, newItem]);
  };

  const handleApplyGlobalAspectRatio = (ratio: ImageAspectRatio) => {
    setGlobalAspectRatio(ratio);
    setParsedItems(prev => prev.map(item => ({ ...item, aspectRatio: ratio })));
  };

  const handleCopyPrompt = (text: string, index: number) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleStartGeneration = () => {
    const validItems = parsedItems.filter(item => item.visualPrompt.trim().length > 0);
    if (validItems.length === 0) {
      setParseError('Please provide at least one valid visual prompt.');
      return;
    }
    onGenerateBatch(validItems, batchTitle || 'Batch Generation');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-5xl h-[92vh] max-h-[850px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-gray-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
              <Zap size={20} className="text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-lg tracking-tight uppercase">Multi-Prompt Batch Ingestion</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                  Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Paste Word docs, slide scripts, or multi-prompt campaigns to generate in parallel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            {parsedItems.length > 0 && (
              <div className="flex bg-white p-1 rounded-xl border border-border shadow-xs">
                <button
                  onClick={() => setActiveTab('input')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    activeTab === 'input' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
                  }`}
                >
                  Raw Document
                </button>
                <button
                  onClick={() => setActiveTab('review')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    activeTab === 'review' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'
                  }`}
                >
                  Extracted Prompts ({parsedItems.length})
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-black transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
          {activeTab === 'input' ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Compact Helper Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 font-medium">
                    Paste your presentation deck script, article, or prompt list:
                  </span>
                  <button
                    onClick={() => setRawText(SAMPLE_DOCUMENT)}
                    className="text-[10px] font-bold text-gray-400 hover:text-black transition-colors underline cursor-pointer"
                  >
                    Load sample
                  </button>
                </div>

                {characterContextEnabled && characterContextCount > 0 ? (
                  <button
                    onClick={onOpenCharacterDrawer}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-black text-white rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <UserIcon size={12} className="text-accent" />
                    <span>{characterContextCount} Character Anchor{characterContextCount > 1 ? 's' : ''} Linked</span>
                  </button>
                ) : onOpenCharacterDrawer ? (
                  <button
                    onClick={onOpenCharacterDrawer}
                    className="text-[9px] font-bold text-gray-400 hover:text-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    + Link Character Anchors
                  </button>
                ) : null}
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (parseError) setParseError(null);
                  }}
                  placeholder="Paste your multi-prompt document, slide deck script, or prompt list here..."
                  className="w-full h-80 sm:h-96 p-4 bg-white border border-border rounded-2xl text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-black/10 transition-all resize-none shadow-sm"
                />
                {rawText.length > 0 && (
                  <button
                    onClick={() => setRawText('')}
                    className="absolute top-3 right-3 p-1.5 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg text-[9px] font-bold uppercase transition-colors"
                  >
                    Clear Text
                  </button>
                )}
              </div>

              {parseError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-medium">
                  {parseError}
                </div>
              )}

              {/* Configuration & Parse Action */}
              <div className="p-4 bg-white rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Default Aspect Ratio */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Default Ratio:</span>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-border">
                      {(['1:1', '16:9', '4:3', '9:16'] as ImageAspectRatio[]).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => handleApplyGlobalAspectRatio(ratio)}
                          className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${
                            globalAspectRatio === ratio ? 'bg-white text-black shadow-xs font-black' : 'text-gray-500 hover:text-black'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Model:</span>
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-border">
                      <button
                        onClick={() => setImageModelOption('flash')}
                        className={`px-2.5 py-1 text-[9px] rounded-md transition-all ${
                          imageModelOption === 'flash' ? 'bg-black text-white font-black shadow-xs' : 'text-gray-500 hover:text-black font-bold'
                        }`}
                      >
                        Gemini 3.1 Flash HQ
                      </button>
                      <button
                        onClick={() => setImageModelOption('lite')}
                        className={`px-2.5 py-1 text-[9px] rounded-md transition-all ${
                          imageModelOption === 'lite' ? 'bg-black text-white font-black shadow-xs' : 'text-gray-500 hover:text-black font-bold'
                        }`}
                      >
                        Gemini 3.1 Flash Lite
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleParse}
                  disabled={isParsing || !rawText.trim()}
                  className="px-6 py-3 bg-black hover:bg-accent disabled:bg-gray-200 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Extracting Prompts with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Extract & Structure Prompts</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch Meta Bar */}
              <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black text-white rounded-xl">
                    <Layers size={18} />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={batchTitle}
                      onChange={(e) => setBatchTitle(e.target.value)}
                      placeholder="Batch Title..."
                      className="font-display font-black text-base tracking-tight uppercase bg-transparent outline-none border-b border-transparent focus:border-black"
                    />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {parsedItems.length} Prompts Ready for High-Speed Generation
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Character Context Indicator */}
                  {characterContextCount > 0 && characterContextEnabled ? (
                    <div 
                      onClick={onOpenCharacterDrawer}
                      className="flex items-center gap-1.5 bg-black text-white px-3 py-1.5 rounded-xl cursor-pointer transition-colors shadow-xs"
                      title="Character consistency active"
                    >
                      <UserIcon size={12} className="text-accent" />
                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {characterContextCount} Character Anchor{characterContextCount > 1 ? 's' : ''} Linked
                      </span>
                    </div>
                  ) : onOpenCharacterDrawer ? (
                    <button
                      onClick={onOpenCharacterDrawer}
                      className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 border border-border px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <UserIcon size={12} />
                      <span>Link Character</span>
                    </button>
                  ) : null}

                  {/* Concurrency Selector */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-border">
                    <Zap size={14} className="text-yellow-500" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Parallel Workers:</span>
                    <select
                      value={concurrencyLimit}
                      onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
                      className="bg-transparent font-black text-xs outline-none cursor-pointer"
                    >
                      {[2, 4, 6, 8, 10, 15, 20].map((num) => (
                        <option key={num} value={num}>{num} Parallel</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleAddItem}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-border"
                  >
                    <Plus size={12} />
                    <span>Add Prompt</span>
                  </button>
                </div>
              </div>

              {brandVoice && (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-900">
                  <div>
                    <span className="font-bold uppercase text-[9px] text-blue-600 block">Brand Voice / Theme</span>
                    <span className="text-[11px] font-medium">{brandVoice}</span>
                  </div>
                </div>
              )}

              {/* Parsed Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parsedItems.map((item, idx) => (
                  <div 
                    key={item.id || idx}
                    className="bg-white rounded-2xl border border-border p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-3 relative group"
                  >
                    <div>
                      {/* Item Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-black text-white text-[9px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                            placeholder={`Slide ${idx + 1}`}
                            className="text-xs font-black uppercase tracking-wider bg-transparent outline-none border-b border-transparent focus:border-black max-w-[200px]"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <select
                            value={item.aspectRatio || globalAspectRatio}
                            onChange={(e) => handleUpdateItem(idx, 'aspectRatio', e.target.value)}
                            className="text-[9px] font-bold bg-gray-50 border border-border rounded-md px-1.5 py-0.5 outline-none"
                          >
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="4:3">4:3 Standard</option>
                            <option value="9:16">9:16 Story</option>
                            <option value="2:3">2:3 Portrait</option>
                          </select>

                          <button
                            onClick={() => handleCopyPrompt(item.visualPrompt, idx)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black transition-colors"
                            title="Copy Visual Prompt"
                          >
                            {copiedIndex === idx ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                          </button>

                          <button
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Visual Prompt Input */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-wider text-gray-400">Visual Prompt (AI Image):</label>
                        <textarea
                          value={item.visualPrompt}
                          onChange={(e) => handleUpdateItem(idx, 'visualPrompt', e.target.value)}
                          placeholder="Describe image visual..."
                          className="w-full h-24 p-2 bg-gray-50 border border-border rounded-xl text-[11px] font-sans leading-relaxed outline-none focus:bg-white focus:ring-1 focus:ring-black transition-all resize-none"
                        />
                      </div>

                      {/* Text Overlay Input */}
                      {item.textOverlay !== undefined && (
                        <div className="mt-2 space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-wider text-accent flex items-center gap-1">
                            <Type size={10} />
                            <span>Text Overlay / Caption:</span>
                          </label>
                          <input
                            type="text"
                            value={item.textOverlay}
                            onChange={(e) => handleUpdateItem(idx, 'textOverlay', e.target.value)}
                            placeholder="Optional quote or caption overlay..."
                            className="w-full p-2 bg-amber-50/50 border border-amber-200/60 rounded-xl text-[10px] font-medium outline-none focus:bg-white focus:border-amber-400 transition-all text-amber-950"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {parsedItems.length > 0 ? `${parsedItems.length} Prompts in Queue` : 'Ready to parse text'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
            >
              Cancel
            </button>

            {activeTab === 'review' ? (
              <button
                onClick={handleStartGeneration}
                disabled={parsedItems.length === 0}
                className="px-6 py-2.5 bg-black hover:bg-accent disabled:bg-gray-200 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                <span>Generate All {parsedItems.length} Images ({concurrencyLimit}x Parallel)</span>
              </button>
            ) : (
              <button
                onClick={handleParse}
                disabled={isParsing || !rawText.trim()}
                className="px-6 py-2.5 bg-black hover:bg-accent disabled:bg-gray-200 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={14} />
                    <span>Next: Review {rawText.trim().length > 0 ? 'Prompts' : ''}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
