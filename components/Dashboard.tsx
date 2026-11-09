'use client';

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  History, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
  Video,
  CheckCircle2, 
  Loader2,
  ChevronRight,
  X,
  Layers,
  Sun,
  Palette,
  Settings,
  Star,
  Save,
  Terminal,
  Info,
  Edit3,
  ChevronLeft,
  Search,
  Maximize2,
  Clock,
  Folder,
  MapPin,
  RefreshCw,
  MessageSquare,
  Zap,
  Check,
  FileText,
  User,
  Anchor,
  Clapperboard
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { saveAs } from 'file-saver';

import { BeforeAfterSlider } from '@/components/before-after-slider';
import Chatbot from '@/components/chatbot';
import { AppHeader } from '@/components/AppHeader';
import { HistorySidebar } from '@/components/HistorySidebar';
import { ImageDetailModal } from '@/components/ImageDetailModal';
import { BatchIdentifyModal } from '@/components/BatchIdentifyModal';
import { FavoriteNamingModal } from '@/components/FavoriteNamingModal';
import { BatchPromptModal } from '@/components/BatchPromptModal';
import { CharacterContextDrawer } from '@/components/CharacterContextDrawer';
import { DirectorPanel } from '@/components/DirectorPanel';
import { MOTION_CHOREOGRAPHIES, VideoModel, StudioDomain, getChoreographiesForDomain, DOMAIN_DEFAULTS } from '@/lib/gemini';
import { useREBE } from '@/hooks/useREBE';

export default function Dashboard() {
  const {
    images, setImages,
    isMounted,
    studioDomain, setStudioDomain,
    handleSwitchDomain,
    prompt, setPrompt,
    resolution, setResolution,
    aspectRatio, setAspectRatio,
    suffix,
    isProcessing,
    memory,
    showMemory, setShowMemory,
    selectedImage, setSelectedImage,
    setReprocessPrompt,
    refineSource, setRefineSource,
    user,
    isAuthLoading,
    isQuotaExceeded,
    showQuotaBanner,
    setShowQuotaBanner,
    handleRetrySync,
    processedCount,
    totalToProcess,
    mediaType, setMediaType,
    videoModel, setVideoModel,
    veoOption, setVeoOption,
    choreography, setChoreography,
    referenceAnchor, setReferenceAnchor,
    toggleReferenceAnchor,
    showDirectorDrawer, setShowDirectorDrawer,
    pullTriggerPlate,
    pullTriggerMotion,
    galleryFilter, setGalleryFilter,
    showSettingsDrawer, setShowSettingsDrawer,
    showCharacterDrawer, setShowCharacterDrawer,
    characterContextImages, setCharacterContextImages,
    characterContextEnabled, setCharacterContextEnabled,
    characterName, setCharacterName,
    characterNotes, setCharacterNotes,
    showSlider, setShowSlider,
    analysisResult,
    isAnalyzing,
    batches,
    propertyAddress, setPropertyAddress,
    historyTab, setHistoryTab,
    showAddressPrompt, setShowAddressPrompt,
    showBatchPromptModal, setShowBatchPromptModal,
    showNamingFavorite, setShowNamingFavorite,
    favoriteName, setFavoriteName,
    pendingFavoritePrompt,
    setPendingFavoritePrompt,
    pendingImages,
    setPendingImages,
    handleLogin,
    handleLogout,
    openImageDetail,
    goToNextImage,
    goToPreviousImage,
    handleAnalyze,
    handleAnalyzeAll,
    handleAnalyzeSelected,
    onDrop,
    removeImage,
    processBatch,
    generateBatchPrompts,
    generateTextToImage,
    reprocessSingle,
    handleImprovePrompt,
    isImprovingPrompt,
    opMode, setOpMode,
    downloadAll,
    downloadBatch,
    handleSaveFavorite,
    dataUrlToBlobUrl,
    fileToBase64,
    systemInstruction,
    setSystemInstruction,
    addNetworkLog,
    updateNetworkLog,
    imageModelOption, setImageModelOption,
    tier, setTier,
    concurrencyLimit, setConcurrencyLimit,
    filteredImages,
    showFavorites, setShowFavorites,
    showRecentPrompts, setShowRecentPrompts,
    cycleResolution
  } = useREBE();

  const [selectedImageIds, setSelectedImageIds] = React.useState<string[]>([]);
  const [createCount, setCreateCount] = React.useState<number>(1);

  React.useEffect(() => {
    setSelectedImageIds(prev => prev.filter(id => images.some(img => img.id === id)));
  }, [images]);

  const toggleSelectImage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [], 'application/octet-stream': [] },
  });

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Initializing Cosmic Photo Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <AppHeader
        user={user}
        isAuthLoading={isAuthLoading}
        showMemory={showMemory}
        setShowMemory={setShowMemory}
        showSettingsDrawer={showSettingsDrawer}
        setShowSettingsDrawer={setShowSettingsDrawer}
        showCharacterDrawer={showCharacterDrawer}
        setShowCharacterDrawer={setShowCharacterDrawer}
        showDirectorDrawer={showDirectorDrawer}
        setShowDirectorDrawer={setShowDirectorDrawer}
        characterContextCount={characterContextImages.filter(img => img.enabled !== false).length}
        characterContextEnabled={characterContextEnabled}
        isProcessing={isProcessing}
        processedCount={processedCount}
        totalToProcess={totalToProcess}
        hasCompletedImages={images.some(img => img.status === 'completed')}
        downloadAll={downloadAll}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        isQuotaExceeded={isQuotaExceeded}
        showQuotaBanner={showQuotaBanner}
        setShowQuotaBanner={setShowQuotaBanner}
        handleRetrySync={handleRetrySync}
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-80 border-r border-border bg-white p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Studio Domain Switcher (Architecture vs Portrait vs Universal) */}
          <section className="p-3 bg-neutral-950 text-white rounded-2xl border border-white/10 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Studio Domain</label>
              <span className="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                {DOMAIN_DEFAULTS[studioDomain].badge} MODE
              </span>
            </div>
            <div className="grid grid-cols-3 p-1 bg-white/5 rounded-xl border border-white/10">
              {(['arch', 'portrait', 'universal'] as const).map((dom) => (
                <button
                  key={dom}
                  onClick={() => handleSwitchDomain(dom)}
                  className={`py-1.5 px-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    studioDomain === dom
                      ? 'bg-amber-400 text-black shadow-xs font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {dom === 'arch' ? 'Arch / RE' : dom === 'portrait' ? 'Portrait' : 'Universal'}
                </button>
              ))}
            </div>
            <p className="text-[8px] text-gray-400 font-medium leading-relaxed px-0.5">
              {DOMAIN_DEFAULTS[studioDomain].description}
            </p>
          </section>

          {/* Mode Switcher: Retouch vs Text-to-Image Creation */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Workflow Mode</label>
              <span className="text-[9px] font-bold text-accent uppercase tracking-wider">
                {opMode === 'create' ? 'Generative AI' : 'Retouch & Edit'}
              </span>
            </div>
            <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl border border-border">
              <button 
                onClick={() => setOpMode('edit')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${opMode === 'edit' ? 'bg-white text-black shadow-xs border border-border' : 'text-gray-400 hover:text-black'}`}
              >
                <Edit3 size={13} />
                <span>Edit Photo</span>
              </button>
              <button 
                onClick={() => setOpMode('create')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${opMode === 'create' ? 'bg-white text-black shadow-xs border border-border' : 'text-gray-400 hover:text-black'}`}
              >
                <Sparkles size={13} className="text-accent" />
                <span>Text-to-Image</span>
              </button>
            </div>
          </section>

          {/* Media Target: Photos vs Video */}
          <section>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2 block">Media Target</label>
            <div className="grid grid-cols-2 p-1 bg-gray-50 rounded-2xl border border-border">
              <button 
                onClick={() => setMediaType('image')}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${mediaType === 'image' ? 'bg-white text-black shadow-xs border border-border' : 'text-gray-400 hover:text-black'}`}
              >
                <ImageIcon size={14} />
                <span>Photos</span>
              </button>
              <button 
                onClick={() => setMediaType('video')}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${mediaType === 'video' ? 'bg-white text-black shadow-xs border border-border' : 'text-gray-400 hover:text-black'}`}
              >
                <Video size={14} />
                <span>Video</span>
              </button>
            </div>
          </section>

          {/* AI Creative Director Drawer Trigger */}
          <section>
            <button
              onClick={() => setShowDirectorDrawer(true)}
              className="w-full px-3.5 py-2.5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent hover:from-amber-500/20 text-black rounded-2xl flex items-center justify-between transition-all group shadow-xs cursor-pointer border border-amber-400/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-amber-400 text-black rounded-xl group-hover:scale-110 transition-transform shadow-xs">
                  <Clapperboard size={13} />
                </span>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    Creative Director
                    <span className="px-1.5 py-0.2 bg-black text-white text-[7px] font-mono rounded font-bold">3.8</span>
                  </p>
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tight">Critique · Staging · Trigger</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </section>

          {/* Subject & Reference Anchor (/c) Staging */}
          <section className="p-3 bg-gray-50/90 rounded-2xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                <Anchor size={12} className={referenceAnchor ? "text-amber-500" : "text-gray-400"} />
                <span>/c Identity Anchor</span>
              </span>
              {referenceAnchor && (
                <button 
                  onClick={() => toggleReferenceAnchor(null as any)}
                  className="text-[9px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider transition-colors cursor-pointer"
                  title="Clear anchor"
                >
                  Clear
                </button>
              )}
            </div>

            {referenceAnchor ? (
              <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-amber-400/60 shadow-xs">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-amber-300">
                  <img 
                    src={referenceAnchor.resultPreview || referenceAnchor.preview} 
                    alt={referenceAnchor.file.name} 
                    className="w-full h-full object-cover" 
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-black text-[7px] font-black text-center leading-none py-0.5 uppercase">/c</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-black truncate uppercase tracking-tight">
                    {referenceAnchor.title || referenceAnchor.file.name}
                  </p>
                  <p className="text-[8px] text-amber-600 font-bold uppercase tracking-wider">
                    Consistency Anchor Active
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 bg-white/70 rounded-xl border border-dashed border-gray-200 text-center">
                <p className="text-[9px] text-gray-500 font-medium leading-relaxed">
                  Pin any plate via <Anchor size={10} className="inline text-amber-500 mx-0.5" /> as <strong className="text-black font-black">/c Anchor</strong> to preserve scale, fixtures & facade identity.
                </p>
              </div>
            )}
          </section>

          {/* Batch Ingest Shortcut */}
          <section>
            <button
              onClick={() => setShowBatchPromptModal(true)}
              className="w-full px-3.5 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-2xl flex items-center justify-between transition-all group shadow-xs cursor-pointer border border-neutral-800"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-white/10 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <FileText size={13} />
                </span>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white">Batch Ingest Doc</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">Paste Multi-Slide Prompts</p>
                </div>
              </div>
              <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                Batch Mode
              </span>
            </button>
          </section>

          {/* Prompt Section with Mode-Agnostic Polish Tool */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                {opMode === 'create' ? 'Text Prompt (Creation)' : 'Enhancement Prompt'}
              </label>
              
              <div className="flex items-center gap-1">
                {/* Mode Agnostic Polish Tool */}
                <button
                  type="button"
                  onClick={async () => {
                    if (!prompt.trim() || isImprovingPrompt) return;
                    const enhanced = await handleImprovePrompt(prompt, opMode);
                    setPrompt(enhanced);
                  }}
                  disabled={isImprovingPrompt || !prompt.trim()}
                  className="px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent disabled:opacity-40 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                  title="Improve Prompt with AI"
                >
                  {isImprovingPrompt ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>{isImprovingPrompt ? 'Polishing...' : 'Polish'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowRecentPrompts(!showRecentPrompts);
                    if (!showRecentPrompts) setShowFavorites(false);
                  }}
                  className={`p-1.5 rounded-md transition-all ${showRecentPrompts ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="Recent Prompts"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setShowFavorites(!showFavorites);
                    if (!showFavorites) setShowRecentPrompts(false);
                  }}
                  className={`p-1.5 rounded-md transition-all ${showFavorites ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="Favorite Prompts"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={opMode === 'create' ? "Describe the image you want to create from scratch..." : "Describe your enhancement..."}
                className="w-full h-28 bg-bg border border-border rounded-2xl p-3.5 text-xs resize-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans leading-relaxed shadow-xs"
              />
              <div className="absolute bottom-2.5 right-2.5 flex gap-1">
                <button
                  onClick={() => setPrompt('')}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 transition-colors"
                  title="Clear text"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Recent Prompts Dropdown */}
              <AnimatePresence>
                {showRecentPrompts && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute z-20 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-blue-100 p-4"
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Recent Prompts</span>
                      <button onClick={() => setShowRecentPrompts(false)}><X size={12} className="text-blue-300" /></button>
                    </div>
                    <div className="space-y-1">
                      {(() => {
                        const uniquePrompts = Array.from(new Set(memory.filter(m => m.prompt).map(m => m.prompt!))).slice(0, 5);
                        if (uniquePrompts.length === 0) {
                          return <p className="text-[10px] text-blue-600/60 italic">No recent prompts.</p>;
                        }
                        return (
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {uniquePrompts.map((p, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 group">
                                <button 
                                  onClick={() => {
                                    setPrompt(p);
                                    setShowRecentPrompts(false);
                                  }}
                                  className="flex-1 text-left text-[10px] text-blue-800 hover:bg-blue-100 p-1.5 rounded transition-colors truncate"
                                  title={p}
                                >
                                  {p}
                                </button>
                                <button 
                                  onClick={() => {
                                    if (navigator.clipboard) {
                                      navigator.clipboard.writeText(p);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-blue-400 hover:text-blue-600 transition-all"
                                  title="Copy"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setPendingFavoritePrompt(p);
                                    setFavoriteName(p.substring(0, 20) + '...');
                                    setShowNamingFavorite(true);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-blue-400 hover:text-amber-500 transition-all"
                                  title="Save as Favorite"
                                >
                                  <Star size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Unified Formatting, Resolution & Priority Tier Region */}
          <section className="p-4 bg-gray-50/80 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                <Settings size={12} className="text-gray-400" />
                Format & Output Quality
              </span>
              <span className="text-[9px] font-mono text-gray-400">{resolution} • {aspectRatio}</span>
            </div>

            {/* Frame Format (Aspect Ratio) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted">Frame Aspect</label>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['auto', '1:1', '16:9', '9:16'] as const).map((ratio) => (
                  <button 
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 px-1 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${aspectRatio === ratio ? 'bg-black text-white border-black shadow-xs' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
                  >
                    {ratio === 'auto' ? 'Auto' : ratio === '1:1' ? '1:1' : ratio === '16:9' ? '16:9' : '9:16'}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted">Resolution</label>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['1K', '2K', '4K'] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`py-2 px-1 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${resolution === res ? 'bg-black text-white border-black shadow-xs' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Mode / Processing Tier */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-widest text-text-muted">Priority Tier</label>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setTier('flex')}
                  className={`py-2 px-1 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${tier === 'flex' ? 'bg-black text-white border-black shadow-xs' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
                  title="Flex Processing: Cost-effective high quality"
                >
                  Flex
                </button>
                <button
                  onClick={() => setTier('standard')}
                  className={`py-2 px-1 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${tier === 'standard' ? 'bg-black text-white border-black shadow-xs' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
                  title="Standard Processing: Real-time generation"
                >
                  Standard
                </button>
                <button
                  onClick={() => setTier('batch')}
                  className={`py-2 px-1 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${tier === 'batch' ? 'bg-black text-white border-black shadow-xs' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
                  title="Batch Processing: Optimized for multiple simultaneous items"
                >
                  Batch
                </button>
              </div>
            </div>

            <AnimatePresence>
              {mediaType === 'video' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden pt-2 border-t border-border/60"
                >
                  {/* Video Engine Model */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">Video Engine</label>
                      <span className="text-[8px] font-mono font-bold text-amber-500 uppercase tracking-wider">
                        {videoModel === 'pvid' ? 'P-Video Turbo' : videoModel === 'omni' ? 'Google Omni 1.1' : videoModel === 'h3' ? 'MiniMax H3' : videoModel === 'seed' ? 'Seed 2.5' : 'WAN 3.0'}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {([
                        { id: 'pvid', label: 'P-VID' },
                        { id: 'omni', label: 'OMNI' },
                        { id: 'h3', label: 'H3' },
                        { id: 'seed', label: 'SEED' },
                        { id: 'wan3', label: 'WAN3' }
                      ] as const).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setVideoModel(m.id as VideoModel);
                            setVeoOption(m.id as any);
                          }}
                          className={`py-1.5 px-0.5 rounded-lg border text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            videoModel === m.id
                              ? 'bg-black text-amber-400 border-black shadow-xs ring-1 ring-amber-400/30'
                              : 'bg-white text-gray-500 border-border hover:border-gray-300'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Motion Choreography Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">Motion Choreography</label>
                      {choreography && (
                        <button
                          onClick={() => setChoreography('')}
                          className="text-[8px] font-bold text-gray-400 hover:text-black uppercase tracking-wider"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {getChoreographiesForDomain(studioDomain).map((ch) => {
                        const isSelected = choreography === ch.id;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => setChoreography(isSelected ? '' : ch.id)}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                              isSelected
                                ? 'bg-black text-white border-black ring-1 ring-amber-400/40 shadow-xs'
                                : 'bg-white text-gray-700 border-border hover:border-gray-300'
                            }`}
                          >
                            <span className={`text-[8px] font-black uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-black'}`}>
                              {ch.badge}
                            </span>
                            <span className={`text-[7px] font-medium leading-tight line-clamp-1 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                              {ch.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Action Button Section */}
          <div className="mt-auto space-y-3">
            {opMode === 'create' || images.length === 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 uppercase px-1">
                  <span>Variations</span>
                  <div className="flex gap-1">
                    {[1, 2, 4].map((count) => (
                      <button
                        key={count}
                        onClick={() => setCreateCount(count)}
                        className={`px-2 py-0.5 rounded text-[9px] font-black transition-all cursor-pointer ${createCount === count ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:text-black'}`}
                      >
                        {count}x
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => generateTextToImage(createCount)}
                  disabled={!prompt.trim() || isProcessing}
                  className="w-full bg-accent hover:bg-accent-hover disabled:bg-gray-200 disabled:text-gray-400 text-white font-black uppercase tracking-[0.2em] text-xs py-4 rounded-2xl transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3 group relative overflow-hidden cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Creating ({createCount})...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="group-hover:scale-110 transition-transform" />
                      <span>Generate {createCount > 1 ? `${createCount} Images` : 'New Image'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => processBatch()}
                disabled={images.length === 0 || isProcessing}
                className="w-full bg-accent hover:bg-accent-hover disabled:bg-gray-200 disabled:text-gray-400 text-white font-black uppercase tracking-[0.2em] text-xs py-4 rounded-2xl transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3 group relative overflow-hidden cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="group-hover:scale-110 transition-transform" />
                    <span>{mediaType === 'video' ? 'Generate Video' : `Enhance ${images.length > 0 ? `${images.length} Photos` : 'Gallery'}`}</span>
                  </>
                )}
              </button>
            )}
            <p className="text-[9px] text-center text-text-muted font-bold uppercase tracking-widest opacity-60">High-Precision Neural Processing</p>
          </div>
        </div>

        {/* Right Panel: Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] relative">
          {images.length === 0 ? (
            <div 
              {...getRootProps()} 
              className={`flex-1 flex flex-col items-center justify-center p-8 transition-all ${isDragActive ? 'bg-accent/5' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className={`relative w-48 h-48 rounded-[48px] border-2 border-dashed flex flex-col items-center justify-center transition-all duration-500 ${isDragActive ? 'border-accent scale-105 bg-white shadow-2xl' : 'border-gray-200 bg-white/50'}`}>
                  <Upload className={`w-12 h-12 mb-4 transition-all duration-500 ${isDragActive ? 'text-accent scale-110' : 'text-gray-300'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted text-center px-6">
                    {isDragActive ? 'Drop to Upload' : 'Drag & Drop Images'}
                  </p>
                </div>
              </div>
              <div className="text-center space-y-4 max-w-md">
                <h1 className="font-display font-black text-6xl tracking-tighter uppercase leading-[0.85] text-black">IMAGE<br/><span className="text-accent">ENHANCER</span></h1>
                <p className="text-xs text-text-muted font-medium leading-relaxed px-8">High-fidelity photographic retouching, batch prompt ingestion, and multi-slide generation powered by Gemini AI.</p>
                <div className="pt-4 flex flex-wrap justify-center items-center gap-3">
                  <button 
                    onClick={(e) => {
                      // default dropzone click will trigger file select
                    }}
                    className="px-8 py-3.5 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-accent transition-all shadow-xl cursor-pointer"
                  >
                    Select Files
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpMode('create');
                      generateTextToImage(1);
                    }}
                    className="px-6 py-3.5 bg-accent text-white hover:bg-accent-hover rounded-full text-[11px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-accent/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Create from Prompt</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBatchPromptModal(true);
                    }}
                    className="px-6 py-3.5 bg-white hover:bg-black hover:text-white text-black border border-border rounded-full text-[11px] font-black uppercase tracking-[0.15em] transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <FileText size={14} />
                    <span>Batch Ingest Doc</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-6 sm:p-8 pb-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-[#F8F9FA]/80 backdrop-blur-xl z-10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tighter uppercase leading-none">WORK SESSION</h2>
                    <span className="px-3 py-1 bg-black text-white text-[10px] font-black rounded-full uppercase tracking-widest">{images.length} ITEMS</span>
                    {selectedImageIds.length > 0 && (
                      <span className="px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 text-[10px] font-black rounded-full uppercase tracking-widest">
                        {selectedImageIds.length} SELECTED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Folder size={12} />
                    <span>{propertyAddress || (studioDomain === 'portrait' ? 'Portrait & Character Studio Session' : studioDomain === 'universal' ? 'Commercial Visuals Session' : 'Architectural & Real Estate Batch')}</span>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-3">
                  {/* Single smaller Analyze Button */}
                  {selectedImageIds.length > 0 ? (
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-border shadow-xs">
                      <button
                        onClick={() => handleAnalyzeSelected(selectedImageIds)}
                        disabled={
                          isProcessing ||
                          images.filter(img => selectedImageIds.includes(img.id)).every(img => img.analysis) ||
                          images.filter(img => selectedImageIds.includes(img.id)).some(img => img.isAnalyzing)
                        }
                        className="px-3 py-1.5 bg-black hover:bg-accent disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-40"
                      >
                        {images.filter(img => selectedImageIds.includes(img.id)).some(img => img.isAnalyzing) ? (
                          <>
                            <Loader2 className="animate-spin" size={11} />
                            <span>Analyzing...</span>
                          </>
                        ) : images.filter(img => selectedImageIds.includes(img.id)).every(img => img.analysis) ? (
                          <>
                            <Check size={11} />
                            <span>Selected Analyzed</span>
                          </>
                        ) : (
                          <>
                            <Search size={11} />
                            <span>Analyze Selected ({selectedImageIds.length})</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedImageIds([])}
                        className="px-2 py-1.5 text-gray-400 hover:text-black text-[9px] font-bold uppercase tracking-wider transition-colors"
                        title="Clear Selection"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAnalyzeAll}
                      disabled={images.length === 0 || images.every(img => img.analysis) || isProcessing || images.some(img => img.isAnalyzing)}
                      className="px-3 py-1.5 bg-white hover:bg-black hover:text-white disabled:bg-gray-100/60 disabled:text-gray-400 text-black border border-border rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {images.some(img => img.isAnalyzing) ? (
                        <>
                          <Loader2 className="animate-spin" size={11} />
                          <span>Analyzing...</span>
                        </>
                      ) : images.every(img => img.analysis) && images.length > 0 ? (
                        <>
                          <Check size={11} className="text-accent" />
                          <span>Batch Analyzed</span>
                        </>
                      ) : (
                        <>
                          <Search size={11} />
                          <span>Analyze All</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Filter tabs */}
                  <div className="flex bg-white p-1 rounded-xl border border-border shadow-xs">
                    {(['all', 'completed', 'processing', 'error'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setGalleryFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${galleryFilter === f ? 'bg-black text-white shadow-xs' : 'text-gray-400 hover:text-black'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Batch Ingest Document */}
                  <button
                    onClick={() => setShowBatchPromptModal(true)}
                    className="px-3 py-1.5 bg-white hover:bg-black hover:text-white text-black border border-border rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Batch Ingest Prompts / Slides from Document"
                  >
                    <FileText size={12} className="text-gray-500" />
                    <span>Batch Prompts</span>
                  </button>

                  {/* Clear Gallery */}
                  <button 
                    onClick={() => {
                      setImages([]);
                      setSelectedImageIds([]);
                    }}
                    disabled={images.length === 0 || isProcessing}
                    className="p-2.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 cursor-pointer"
                    title="Clear All Images"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-8 pt-4 overflow-y-auto min-h-0 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredImages.map((img) => (
                      <motion.div
                        key={img.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group relative aspect-[4/3] bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border cursor-pointer ${
                          selectedImageIds.includes(img.id) ? 'ring-2 ring-black border-black shadow-md' : 'border-border'
                        }`}
                        onClick={() => openImageDetail(img)}
                      >
                        {/* Image Preview */}
                        <div className="absolute inset-0">
                          {img.resultPreview ? (
                            img.mediaType === 'video' ? (
                              <video 
                                src={img.resultPreview} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                muted
                                playsInline
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => {
                                  e.currentTarget.pause();
                                  e.currentTarget.currentTime = 0;
                                }}
                              />
                            ) : (
                              <img 
                                src={img.resultPreview} 
                                alt="Enhanced" 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            )
                          ) : (
                            img.mediaType === 'video' && img.preview.includes('blob:') ? (
                              <video 
                                src={img.preview} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700 group-hover:scale-110"
                                muted
                                playsInline
                              />
                            ) : (
                              <img 
                                src={img.preview} 
                                alt="Original" 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700 group-hover:scale-110"
                              />
                            )
                          )}
                        </div>

                        {/* Status Overlay */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${img.status === 'processing' ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/20 group-hover:backdrop-blur-[2px]'}`}>
                          {img.status === 'processing' ? (
                            <div className="flex flex-col items-center gap-4">
                              <div className="relative">
                                <Loader2 className="w-10 h-10 animate-spin text-white" />
                                <div className="absolute inset-0 blur-xl bg-white/30 animate-pulse" />
                              </div>
                              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Processing...</span>
                            </div>
                          ) : img.status === 'completed' ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black shadow-xl scale-0 group-hover:scale-100 transition-transform duration-500">
                                <ImageIcon size={20} />
                              </div>
                              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity duration-500">View Result</span>
                            </div>
                          ) : img.status === 'error' ? (
                            <div className="flex flex-col items-center gap-2 p-6 text-center">
                              <X size={24} className="text-red-400 mb-2" />
                              <span className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Process Error</span>
                              <p className="text-[8px] text-white/70 line-clamp-2">{img.error}</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              {!img.analysis && !img.isAnalyzing && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnalyze(img.id);
                                  }}
                                  className="px-4 py-2 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-accent hover:text-white transition-all transform hover:scale-105 flex items-center gap-2"
                                >
                                  <Search size={14} />
                                  Analyze
                                </button>
                              )}
                              {img.isAnalyzing && (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                                  <span className="text-[8px] font-black text-white uppercase tracking-widest">Analyzing...</span>
                                </div>
                              )}
                              <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black mt-2">
                                <Maximize2 size={14} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Analysis & Anchor Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                          {referenceAnchor?.id === img.id && (
                            <div className="bg-amber-400 text-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg font-black text-[8px] uppercase tracking-widest border border-amber-500">
                              <Anchor size={10} className="stroke-[2.5]" />
                              <span>/c Anchor</span>
                            </div>
                          )}
                          {img.analysis && (
                            <div className="bg-accent text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                              <Search size={10} />
                              <span className="text-[8px] font-black uppercase tracking-widest">Studied</span>
                            </div>
                          )}
                          {img.status === 'completed' && (
                            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                              <CheckCircle2 size={12} className="text-green-500" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-black">Perfected</span>
                            </div>
                          )}
                        </div>

                        {/* Prompt Title and Text Overlay Banner */}
                        {(img.title || img.textOverlay) && (
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-6 pointer-events-none z-10">
                            {img.title && (
                              <p className="text-[10px] font-black text-white uppercase tracking-wider truncate drop-shadow-sm">
                                {img.title}
                              </p>
                            )}
                            {img.textOverlay && (
                              <p className="text-[9px] text-amber-200 font-serif italic line-clamp-1 drop-shadow-sm opacity-90">
                                &ldquo;{img.textOverlay}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        {/* Top Right Actions: Anchor, Select and Delete */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReferenceAnchor(img);
                            }}
                            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer ${
                              referenceAnchor?.id === img.id
                                ? 'bg-amber-400 text-black opacity-100 ring-2 ring-amber-500 scale-100'
                                : 'bg-black/50 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-amber-400 hover:text-black'
                            }`}
                            title={referenceAnchor?.id === img.id ? "Unpin /c Consistency Anchor" : "Pin as /c Consistency Anchor"}
                          >
                            <Anchor size={12} className={referenceAnchor?.id === img.id ? "stroke-[2.5]" : ""} />
                          </button>
                          <button
                            onClick={(e) => toggleSelectImage(img.id, e)}
                            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-md ${
                              selectedImageIds.includes(img.id)
                                ? 'bg-black text-white opacity-100 ring-2 ring-white/50 scale-100'
                                : 'bg-black/50 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black hover:text-white'
                            }`}
                            title={selectedImageIds.includes(img.id) ? "Deselect photo" : "Select photo"}
                          >
                            <Check size={12} className={selectedImageIds.includes(img.id) ? "stroke-[3]" : "opacity-50"} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(img.id);
                            }}
                            className="p-2 bg-black/50 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {/* Add More Button */}
                    <div 
                      {...getRootProps()}
                      className="aspect-[4/3] rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 hover:border-accent hover:bg-accent/5 transition-all group cursor-pointer"
                    >
                      <input {...getInputProps()} />
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-accent group-hover:bg-accent/10 transition-all">
                        <Upload size={24} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-accent">Add Photos</span>
                    </div>
                  </div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* History Sidebar */}
      <AnimatePresence>
        {showMemory && (
          <HistorySidebar
            setShowMemory={setShowMemory}
            historyTab={historyTab}
            setHistoryTab={setHistoryTab}
            batches={batches}
            memory={memory}
            downloadBatch={downloadBatch}
            dataUrlToBlobUrl={dataUrlToBlobUrl}
            setImages={setImages}
            setPrompt={setPrompt}
            setSystemInstruction={setSystemInstruction}
            addNetworkLog={addNetworkLog}
            updateNetworkLog={updateNetworkLog}
            fileToBase64={fileToBase64}
            isQuotaExceeded={isQuotaExceeded}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <ImageDetailModal
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            showSlider={showSlider}
            setShowSlider={setShowSlider}
            goToPreviousImage={goToPreviousImage}
            goToNextImage={goToNextImage}
            images={images}
            openImageDetail={openImageDetail}
            isAnalyzing={isAnalyzing}
            handleAnalyze={handleAnalyze}
            analysisResult={analysisResult}
            setPrompt={setPrompt}
            reprocessPrompt={selectedImage.reprocessPrompt || ''}
            setReprocessPrompt={setReprocessPrompt}
            refineSource={refineSource}
            setRefineSource={setRefineSource}
            isProcessing={isProcessing}
            reprocessSingle={reprocessSingle}
            handleImprovePrompt={handleImprovePrompt}
            isImprovingPrompt={isImprovingPrompt}
            suffix={suffix}
            removeImage={removeImage}
            setImages={setImages}
            saveAs={saveAs}
            characterContextCount={characterContextImages.filter(img => img.enabled !== false).length}
            characterContextEnabled={characterContextEnabled}
            onOpenCharacterDrawer={() => setShowCharacterDrawer(true)}
            isReferenceAnchor={referenceAnchor?.id === selectedImage.id}
            toggleReferenceAnchor={toggleReferenceAnchor}
          />
        )}
      </AnimatePresence>

      <BatchIdentifyModal
        showAddressPrompt={showAddressPrompt}
        setShowAddressPrompt={setShowAddressPrompt}
        pendingImagesCount={pendingImages.length}
        propertyAddress={propertyAddress}
        setPropertyAddress={setPropertyAddress}
        onStartSession={() => {
          setImages(prev => [...prev, ...pendingImages]);
          setPendingImages([]);
          setShowAddressPrompt(false);
        }}
        onSkip={() => {
          setPropertyAddress('');
          setImages(prev => [...prev, ...pendingImages]);
          setPendingImages([]);
          setShowAddressPrompt(false);
        }}
      />

      <FavoriteNamingModal
        showNamingFavorite={showNamingFavorite}
        setShowNamingFavorite={setShowNamingFavorite}
        favoriteName={favoriteName}
        setFavoriteName={setFavoriteName}
        pendingFavoritePrompt={pendingFavoritePrompt}
        handleSaveFavorite={handleSaveFavorite}
      />

      <BatchPromptModal
        isOpen={showBatchPromptModal}
        onClose={() => setShowBatchPromptModal(false)}
        onGenerateBatch={generateBatchPrompts}
        defaultConcurrency={concurrencyLimit}
        characterContextCount={characterContextImages.filter(img => img.enabled !== false).length}
        characterContextEnabled={characterContextEnabled}
        onOpenCharacterDrawer={() => setShowCharacterDrawer(true)}
      />

      <CharacterContextDrawer
        isOpen={showCharacterDrawer}
        onClose={() => setShowCharacterDrawer(false)}
        characterContextImages={characterContextImages}
        setCharacterContextImages={setCharacterContextImages}
        characterContextEnabled={characterContextEnabled}
        setCharacterContextEnabled={setCharacterContextEnabled}
        characterName={characterName}
        setCharacterName={setCharacterName}
        characterNotes={characterNotes}
        setCharacterNotes={setCharacterNotes}
      />

      <DirectorPanel
        isOpen={showDirectorDrawer}
        onClose={() => setShowDirectorDrawer(false)}
        currentPrompt={prompt}
        activeImageName={selectedImage?.file.name}
        referenceAnchorName={referenceAnchor?.title || referenceAnchor?.file.name}
        mediaType={mediaType}
        domain={studioDomain}
        onPullTriggerPlate={pullTriggerPlate}
        onPullTriggerMotion={pullTriggerMotion}
      />

      <Chatbot 
        uploadedImages={images.map(img => ({ url: img.preview, name: img.file.name }))} 
        onUpdatePrompt={setPrompt}
        onProcessBatch={processBatch}
      />

      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettingsDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsDrawer(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col border-l border-border"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black text-white rounded-xl">
                    <Settings size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Engine Settings</h2>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Configure your processing pipeline</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettingsDrawer(false)}
                  className="p-2 hover:bg-gray-200 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Resolution & Quality */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Maximize2 size={14} className="text-accent" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Resolution & Quality</label>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Output Resolution</span>
                        <span className="text-[10px] font-black text-accent">{resolution}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['1K', '2K', '4K'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setResolution(r)}
                            className={`py-2 rounded-lg border text-[10px] font-black transition-all ${resolution === r ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-border hover:border-gray-300'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Model Pipeline</span>
                        <span className="text-[10px] font-black text-accent uppercase">{imageModelOption}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setImageModelOption('lite')}
                          className={`py-2 rounded-lg border text-[10px] font-black transition-all ${imageModelOption === 'lite' ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-border hover:border-gray-300'}`}
                        >
                          3.1 LITE
                        </button>
                        <button
                          onClick={() => setImageModelOption('flash')}
                          className={`py-2 rounded-lg border text-[10px] font-black transition-all ${imageModelOption === 'flash' ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-border hover:border-gray-300'}`}
                        >
                          3.1 FLASH
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Character Consistency Anchors */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-600" />
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Character Likeness</label>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      characterContextEnabled && characterContextImages.filter(i => i.enabled !== false).length > 0
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {characterContextImages.filter(i => i.enabled !== false).length} / 4 Anchors
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-border space-y-3">
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                      Maintain exact subject likeness (face, hair, build) across turn-by-turn edits and multi-image batches.
                    </p>
                    <button
                      onClick={() => {
                        setShowSettingsDrawer(false);
                        setShowCharacterDrawer(true);
                      }}
                      className="w-full py-2 bg-white hover:bg-black hover:text-white text-black border border-border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>Manage Character Anchors</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </section>

                {/* Base Prompt / System Instruction */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-accent" />
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Base Prompt</label>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSystemInstruction('')}
                        className="text-[8px] font-black text-gray-400 uppercase hover:text-red-500 transition-colors"
                      >
                        Creative (Empty)
                      </button>
                      <button 
                        onClick={() => setSystemInstruction(DOMAIN_DEFAULTS[studioDomain].systemInstruction)}
                        className="text-[8px] font-black text-amber-500 uppercase hover:text-amber-600 transition-colors"
                        title="Reset to active Studio Domain prompt"
                      >
                        {DOMAIN_DEFAULTS[studioDomain].badge} Default
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      placeholder="Add base system-level prompt constraints here..."
                      className="w-full h-32 p-3 bg-gray-50 border border-border rounded-xl text-[10px] font-medium leading-relaxed resize-none focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${systemInstruction.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                  <p className="text-[8px] text-text-muted font-bold uppercase tracking-wider leading-relaxed">
                    Underlying base prompt sent to the AI engine. To give 100% priority to your enhancement prompt, select &apos;Creative (Empty)&apos;.
                  </p>
                </section>

                {/* Performance */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-accent" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Performance</label>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-border">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Processing Tier</span>
                        <span className={`text-[10px] font-black uppercase ${tier === 'standard' ? 'text-orange-500' : 'text-blue-500'}`}>{tier}</span>
                      </div>
                      <div className="flex p-1 bg-white rounded-xl border border-border">
                        <button
                          onClick={() => setTier('flex')}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${tier === 'flex' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          Flex
                        </button>
                        <button
                          onClick={() => setTier('standard')}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${tier === 'standard' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          Standard
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Concurrency Limit</span>
                        <span className="text-[10px] font-black text-accent">{concurrencyLimit} Parallel</span>
                      </div>
                      <input 
                        type="range" 
                        min="2" 
                        max="20" 
                        step="1"
                        value={concurrencyLimit}
                        onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-gray-400 font-bold">2 (STABLE)</span>
                        <span className="text-[8px] text-gray-400 font-bold">20 (FAST)</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-border bg-gray-50">
                <button 
                  onClick={() => setShowSettingsDrawer(false)}
                  className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-gray-900 transition-all active:scale-95"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
