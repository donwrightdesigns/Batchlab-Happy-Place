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
  Zap
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
import { useREBE } from '@/hooks/useREBE';

export default function Dashboard() {
  const {
    images, setImages,
    isMounted,
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
    veoOption, setVeoOption,
    galleryFilter, setGalleryFilter,
    showSettingsDrawer, setShowSettingsDrawer,
    showSlider, setShowSlider,
    analysisResult,
    isAnalyzing,
    batches,
    propertyAddress, setPropertyAddress,
    historyTab, setHistoryTab,
    showAddressPrompt, setShowAddressPrompt,
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
    onDrop,
    removeImage,
    processBatch,
    reprocessSingle,
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
    autoAnalyzeOnUpload, setAutoAnalyzeOnUpload,
    showPromptPreview, setShowPromptPreview,
    cycleResolution
  } = useREBE();

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
        <div className="w-full lg:w-80 border-r border-border bg-white p-6 flex flex-col gap-6 overflow-y-auto">
          <section>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3 block">Media Target</label>
            <div className="grid grid-cols-2 p-1 bg-gray-50 rounded-2xl border border-border">
              <button 
                onClick={() => setMediaType('image')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mediaType === 'image' ? 'bg-white text-black shadow-sm border border-border' : 'text-gray-400 hover:text-black'}`}
              >
                <ImageIcon size={14} />
                <span>Photos</span>
              </button>
              <button 
                onClick={() => setMediaType('video')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mediaType === 'video' ? 'bg-white text-black shadow-sm border border-border' : 'text-gray-400 hover:text-black'}`}
              >
                <Video size={14} />
                <span>Video</span>
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Enhancement Prompt</label>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setShowRecentPrompts(!showRecentPrompts);
                    if (!showRecentPrompts) setShowFavorites(false);
                  }}
                  className={`p-1.5 rounded-md transition-all ${showRecentPrompts ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="Recent Prompts"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setShowFavorites(!showFavorites);
                    if (!showFavorites) setShowRecentPrompts(false);
                  }}
                  className={`p-1.5 rounded-md transition-all ${showFavorites ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-400'}`}
                  title="Favorite Prompts"
                >
                  <Star className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your enhancement..."
                className="w-full h-32 bg-bg border border-border rounded-2xl p-4 text-sm resize-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-sans leading-relaxed shadow-sm"
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={() => setPrompt('')}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                >
                  <X size={14} />
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

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-text-muted">Frame Format</label>
              <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase">
                <Maximize2 size={10} />
                <span>Aspect</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setAspectRatio('auto')}
                className={`py-3 px-1 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${aspectRatio === 'auto' ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
              >
                Auto
              </button>
              <button 
                onClick={() => setAspectRatio('1:1')}
                className={`py-3 px-1 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${aspectRatio === '1:1' ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
              >
                Square
              </button>
              <button 
                onClick={() => setAspectRatio('16:9')}
                className={`py-3 px-1 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${aspectRatio === '16:9' ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
              >
                16:9
              </button>
            </div>

            <AnimatePresence>
              {mediaType === 'video' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Video Speed/Quality</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['lite', 'fast', 'normal'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setVeoOption(style)}
                        className={`py-2 px-3 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${veoOption === style ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-500 border-border hover:border-gray-300'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className={`w-full p-4 rounded-2xl border border-dashed flex items-center justify-between group transition-all ${systemInstruction.length > 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-border hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <Terminal size={16} className={systemInstruction.length > 0 ? 'text-blue-500' : 'text-gray-500'} />
                <div className="text-left">
                  <span className={`text-[10px] font-black uppercase tracking-widest block ${systemInstruction.length > 0 ? 'text-blue-600' : 'text-gray-500'}`}>Master AI Overlay</span>
                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">{systemInstruction.length > 0 ? 'Overlay Active' : 'No Active Overlay'}</span>
                </div>
              </div>
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${showPromptPreview ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showPromptPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-gray-50 rounded-2xl border border-border mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Global Constraints</span>
                      <button 
                        onClick={() => setSystemInstruction('')}
                        className="text-[8px] font-black text-red-500 uppercase hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <textarea 
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      placeholder="Add system-level constraints here... Warning: Long overlays can dilute your primary prompt."
                      className="w-full h-40 bg-white p-3 rounded-xl border border-border text-[10px] font-mono text-gray-600 leading-relaxed outline-none resize-none focus:border-blue-300 transition-all"
                    />
                    <p className="text-[8px] text-text-muted font-bold uppercase tracking-wider leading-relaxed">
                      This text is sent as a background instruction. If your edits feel &quot;diluted&quot;, try clearing this area.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <div className="mt-auto space-y-4">
            <section className="p-4 bg-accent/5 rounded-2xl border border-accent/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Step 1: Pre-Process</span>
                <Search size={14} className="text-accent" />
              </div>
              <button
                onClick={handleAnalyzeAll}
                disabled={images.length === 0 || images.every(img => img.analysis) || isProcessing}
                className="w-full py-4 bg-white hover:bg-gray-50 disabled:bg-gray-50 text-black border border-accent/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {images.some(img => img.isAnalyzing) ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Studying Images...</span>
                  </>
                ) : (
                  <>
                    <Search size={14} />
                    <span>Analyze Full Batch</span>
                  </>
                )}
              </button>
              <p className="text-[8px] text-accent/60 font-bold uppercase tracking-wider mt-2 text-center">
                Identify flaws & generate custom fixes
              </p>
            </section>

             <button
              onClick={processBatch}
              disabled={images.length === 0 || isProcessing}
              className="w-full bg-accent hover:bg-accent-hover disabled:bg-gray-200 disabled:text-gray-400 text-white font-black uppercase tracking-[0.2em] text-xs py-5 rounded-2xl transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className="group-hover:scale-110 transition-transform" />
                  <span>{mediaType === 'video' ? 'Generate Video' : `Enhance ${images.length > 0 ? `${images.length} Photos` : 'Gallery'}`}</span>
                </>
              )}
            </button>
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
                <p className="text-xs text-text-muted font-medium leading-relaxed px-8">High-fidelity photographic retouching and batch enhancement powered by Gemini AI. Upload your photos to begin processing.</p>
                <div className="pt-4 flex justify-center">
                   <button className="px-10 py-4 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-accent transition-all shadow-2xl">Select Files</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-8 pb-4 flex items-center justify-between sticky top-0 bg-[#F8F9FA]/80 backdrop-blur-xl z-10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display font-black text-4xl tracking-tighter uppercase leading-none">WORK SESSION</h2>
                    <span className="px-3 py-1 bg-black text-white text-[10px] font-black rounded-full uppercase tracking-widest">{images.length} ITEMS</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Folder size={12} />
                    <span>{propertyAddress || 'Unnamed Batch'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm">
                      {(['all', 'completed', 'processing', 'error'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setGalleryFilter(f)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${galleryFilter === f ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => setImages([])}
                    disabled={images.length === 0 || isProcessing}
                    className="p-3 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={20} />
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
                        className="group relative aspect-[4/3] bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-border cursor-pointer"
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

                        {/* Analysis Badge */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
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

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                        >
                          <X size={14} />
                        </button>
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
            suffix={suffix}
            removeImage={removeImage}
            setImages={setImages}
            saveAs={saveAs}
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

                {/* Master System Instruction Overlay */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-accent" />
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Master AI Overlay</label>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSystemInstruction('')}
                        className="text-[8px] font-black text-gray-400 uppercase hover:text-red-500 transition-colors"
                      >
                        Creative
                      </button>
                      <button 
                        onClick={() => setSystemInstruction("You are a master professional photography editor. Produce commercial studio-grade clarity, balanced dynamic range, rich natural colors, and crisp details across any photo subject.")}
                        className="text-[8px] font-black text-gray-400 uppercase hover:text-accent transition-colors"
                      >
                        Minimal
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      placeholder="Add system-level constraints here..."
                      className="w-full h-32 p-3 bg-gray-50 border border-border rounded-xl text-[10px] font-medium leading-relaxed resize-none focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${systemInstruction.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                  <p className="text-[8px] text-text-muted font-bold uppercase tracking-wider leading-relaxed">
                    Sent as a native System Instruction. If results feel &quot;diluted&quot; or fight your prompt, try &apos;Creative&apos; mode (empty).
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
                        <span className="text-[10px] font-black text-accent">{concurrencyLimit}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={concurrencyLimit}
                        onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-gray-400 font-bold">STABLE</span>
                        <span className="text-[8px] text-gray-400 font-bold">AGGRESSIVE</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Automation */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-accent" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Workflow Automation</label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-border">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider">Auto-Analyze</p>
                      <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Run AI vision on upload</p>
                    </div>
                    <button 
                      onClick={() => setAutoAnalyzeOnUpload(!autoAnalyzeOnUpload)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${autoAnalyzeOnUpload ? 'bg-accent' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoAnalyzeOnUpload ? 'left-6' : 'left-1'}`} />
                    </button>
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
