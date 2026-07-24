'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  Heart, 
  History, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Download, 
  MapPin, 
  Sliders, 
  LogOut, 
  LogIn, 
  User as UserIcon, 
  HelpCircle,
  Folder,
  Tag,
  Loader2,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  saveToMemory, 
  getMemory, 
  subscribeToLocalMemory, 
  getFullMemoryItem, 
  saveBatch, 
  getBatches, 
  subscribeToBatches, 
  saveFavoritePrompt, 
  subscribeToFavorites, 
  deleteFavoritePrompt, 
  MemoryItem, 
  FavoritePrompt, 
  Batch,
  compressImage
} from '@/lib/memory';
import { 
  beautifyImage, 
  analyzeImage, 
  ImageResolution, 
  ImageAspectRatio, 
  OperationMode, 
  MediaType 
} from '@/lib/gemini';
import { auth, signInWithPopup, signOut, googleProvider, onAuthStateChanged, User } from '@/firebase';
import { BeforeAfterSlider } from '@/components/before-after-slider';
import Chatbot from '@/components/chatbot';

export default function Page() {
  // State for Authentication
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Core Data States
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; file: File; base64: string; name: string; size: string }[]>([]);
  const [queue, setQueue] = useState<MemoryItem[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<MemoryItem | null>(null);
  const [selectedQueueFullItem, setSelectedQueueFullItem] = useState<MemoryItem | null>(null);

  // Property Metadata
  const [batchTitle, setBatchTitle] = useState('Property Launch Batch');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyTags, setPropertyTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // AI Configuration States
  const [enhancementPrompt, setEnhancementPrompt] = useState('Enhance lighting, add blue sky, make interiors bright and modern with photorealistic luxury staging');
  const [systemInstruction, setSystemInstruction] = useState('Act as an elite architectural and real estate photo editor. Enhance lighting, correct perspectives, perform sky replacements, and perform virtual staging with high visual harmony.');
  const [resolution, setResolution] = useState<ImageResolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('auto');
  const [opMode, setOpMode] = useState<OperationMode>('edit');
  const [mediaType, setMediaType] = useState<MediaType>('image');

  // UI Interactive States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSaveFavModal, setShowSaveFavModal] = useState(false);
  const [newFavName, setNewFavName] = useState('');

  // History & Favorites Lists
  const [batchesHistory, setBatchesHistory] = useState<Batch[]>([]);
  const [favoritePrompts, setFavoritePrompts] = useState<FavoritePrompt[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<any>(null);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Local Memory Updates
  useEffect(() => {
    return subscribeToLocalMemory((items) => {
      // Refresh the active queue items to reflect status updates
      setQueue(items);
    });
  }, []);

  // Listen to Favorite Prompts
  useEffect(() => {
    return subscribeToFavorites((favs) => {
      setFavoritePrompts(favs);
    });
  }, []);

  // Listen to Batches history based on Auth
  useEffect(() => {
    return subscribeToBatches(user ? user.uid : null, (batches) => {
      setBatchesHistory(batches);
    });
  }, [user]);

  // Handle selected item loading
  useEffect(() => {
    if (selectedQueueItem) {
      getFullMemoryItem(selectedQueueItem.id).then(fullItem => {
        setSelectedQueueFullItem(fullItem);
      }).catch(err => {
        console.error("Error fetching full item details:", err);
        setSelectedQueueFullItem(selectedQueueItem);
      });
    } else {
      setSelectedQueueFullItem(null);
    }
  }, [selectedQueueItem, queue]);

  // Auth Functions
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  // File conversion & management
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert("Please upload images or videos only.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64String = reader.result as string;

        // Compress images to ensure fast, reliable uploads and prevent payload limit failures
        if (file.type.startsWith('image/')) {
          try {
            base64String = await compressImage(base64String, 1920, 0.85);
          } catch (err) {
            console.warn("Failed to compress image on upload:", err);
          }
        }

        const newFileId = Math.random().toString(36).substr(2, 9);
        const fileSizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

        setUploadedFiles(prev => [
          ...prev, 
          { 
            id: newFileId, 
            file, 
            base64: base64String, 
            name: file.name,
            size: fileSizeStr
          }
        ]);

        // Add to main memory pool as pending
        const newMemoryItem: MemoryItem = {
          id: newFileId,
          timestamp: Date.now(),
          prompt: enhancementPrompt,
          status: 'pending',
          originalImage: base64String,
          mediaType: file.type.startsWith('video') ? 'video' : 'image',
          address: propertyAddress,
          tags: propertyTags,
          systemInstruction
        };

        saveToMemory(newMemoryItem);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    if (selectedQueueItem?.id === id) {
      setSelectedQueueItem(null);
    }
  };

  const clearUploadsQueue = () => {
    setUploadedFiles([]);
    setSelectedQueueItem(null);
  };

  // Metadata tags
  const addTag = () => {
    if (newTagInput.trim() && !propertyTags.includes(newTagInput.trim())) {
      setPropertyTags(prev => [...prev, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    setPropertyTags(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // AI Analysis of single item
  const handleAnalyzePhoto = async () => {
    const itemToAnalyze = selectedQueueFullItem || (uploadedFiles.length > 0 ? uploadedFiles[0] : null);
    if (!itemToAnalyze) {
      alert("Please select or upload a photo to analyze first.");
      return;
    }

    setIsAnalyzing(true);
    setActiveAnalysis(null);

    const base64 = 'base64' in itemToAnalyze ? itemToAnalyze.base64 : itemToAnalyze.originalImage;
    if (!base64) {
      alert("Could not load original photo data.");
      setIsAnalyzing(false);
      return;
    }

    try {
      const resultText = await analyzeImage(base64);
      setActiveAnalysis(resultText);

      // Save analysis to active item if applicable
      if (selectedQueueItem) {
        const updatedItem: MemoryItem = {
          ...selectedQueueItem,
          analysis: resultText,
          isAnalyzing: false
        };
        await saveToMemory(updatedItem);
      }
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setActiveAnalysis(`Analysis failed: ${err.message || err}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Core Processing Loop
  const handleProcessBatch = async () => {
    if (uploadedFiles.length === 0) {
      alert("Please upload at least one image or video to enhance.");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    const totalFiles = uploadedFiles.length;
    let completedCount = 0;

    // Create custom batch session
    const batchId = Math.random().toString(36).substr(2, 9);
    const imageIds = uploadedFiles.map(f => f.id);
    const thumbnailsList: string[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const currentFile = uploadedFiles[i];

      // Set status in memory queue to active/processing
      const queueItem: MemoryItem = {
        id: currentFile.id,
        timestamp: Date.now(),
        prompt: enhancementPrompt,
        status: 'pending',
        originalImage: currentFile.base64,
        mediaType: mediaType,
        address: propertyAddress,
        tags: propertyTags,
        systemInstruction,
        settings: { resolution, aspectRatio, opMode }
      };
      await saveToMemory(queueItem);

      try {
        // Beautify/Enhance single image
        const processedBase64 = await beautifyImage(
          currentFile.base64,
          enhancementPrompt,
          resolution,
          "nano-2",
          aspectRatio,
          systemInstruction,
          "flex",
          opMode,
          mediaType
        );

        // Update successful item in memory
        const completedItem: MemoryItem = {
          ...queueItem,
          status: 'completed',
          editedImage: processedBase64,
          originalImage: currentFile.base64
        };
        await saveToMemory(completedItem);

        // Save thumbnail placeholder for the batch list
        thumbnailsList.push(processedBase64);

        if (selectedQueueItem?.id === currentFile.id) {
          setSelectedQueueItem(completedItem);
        }
      } catch (error: any) {
        console.error(`Enhancement failed for ${currentFile.name}:`, error);
        const errorItem: MemoryItem = {
          ...queueItem,
          status: 'error',
          error: error.message || String(error)
        };
        await saveToMemory(errorItem);
      }

      completedCount++;
      setProcessingProgress(Math.round((completedCount / totalFiles) * 100));
    }

    // Save entire batch session
    const newBatch: Batch = {
      id: batchId,
      timestamp: Date.now(),
      title: batchTitle,
      address: propertyAddress || undefined,
      imageIds,
      thumbnails: thumbnailsList,
      tags: propertyTags,
      prompt: enhancementPrompt,
      systemInstruction
    };
    await saveBatch(newBatch);

    setIsProcessing(false);
  };

  // Preset management
  const handleSaveFavorite = async () => {
    if (!newFavName.trim()) return;
    const newFav: FavoritePrompt = {
      id: Math.random().toString(36).substr(2, 9),
      name: newFavName,
      prompt: enhancementPrompt,
      systemInstruction,
      timestamp: Date.now()
    };
    await saveFavoritePrompt(newFav);
    setNewFavName('');
    setShowSaveFavModal(false);
  };

  const handleApplyFavorite = (fav: FavoritePrompt) => {
    setEnhancementPrompt(fav.prompt);
    if (fav.systemInstruction) {
      setSystemInstruction(fav.systemInstruction);
    }
  };

  const handleDeleteFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this preset?")) {
      await deleteFavoritePrompt(id);
    }
  };

  // Historic batch loading
  const handleLoadBatch = async (batch: Batch) => {
    setBatchTitle(batch.title);
    setPropertyAddress(batch.address || '');
    setPropertyTags(batch.tags || []);
    setEnhancementPrompt(batch.prompt || '');
    if (batch.systemInstruction) {
      setSystemInstruction(batch.systemInstruction);
    }

    // Reconstruct uploadedFiles list
    const restoredFiles: { id: string; file: File; base64: string; name: string; size: string }[] = [];
    
    for (let i = 0; i < batch.imageIds.length; i++) {
      const imgId = batch.imageIds[i];
      const fullItem = await getFullMemoryItem(imgId);
      if (fullItem) {
        // Create synthetic File
        const byteString = atob((fullItem.originalImage || fullItem.originalThumbnail || '').split(',')[1] || '');
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) {
          ia[j] = byteString.charCodeAt(j);
        }
        const blob = new Blob([ab], { type: fullItem.mediaType === 'video' ? 'video/mp4' : 'image/jpeg' });
        const file = new File([blob], `restored_${imgId}.jpg`, { type: blob.type });

        restoredFiles.push({
          id: imgId,
          file,
          base64: fullItem.originalImage || fullItem.originalThumbnail || '',
          name: `Image_${i + 1}.jpg`,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        });
      }
    }

    setUploadedFiles(restoredFiles);
    setShowHistoryModal(false);
  };

  // Download logic
  const downloadProcessed = (item: MemoryItem) => {
    const data = item.editedImage;
    if (!data) return;
    const link = document.createElement('a');
    link.href = data;
    link.download = `enhanced_${item.id}.${item.mediaType === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="main-container" className="min-h-screen bg-[#FBFBFB] text-[#1E293B] flex flex-col font-sans selection:bg-[#E2E8F0]">
      {/* Upper Navigation & Account Status */}
      <header id="app-header" className="border-b border-[#EDF2F7] bg-white sticky top-0 z-40 transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#1E293B] text-white p-2 rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#0F172A]">Batchlab</h1>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Photo Engine BW</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Presets Button */}
            <button 
              id="presets-btn"
              onClick={() => setShowSaveFavModal(true)} 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#475569] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all active:scale-95"
            >
              <Heart className="w-3.5 h-3.5" />
              Save Preset
            </button>

            {/* History Sessions Button */}
            <button 
              id="history-btn"
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#475569] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all active:scale-95"
            >
              <History className="w-3.5 h-3.5" />
              Sessions ({batchesHistory.length})
            </button>

            {/* User Profile / Login */}
            <div className="h-8 w-px bg-slate-200" />
            
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#475569]" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-semibold text-[#1E293B]">{user.displayName || 'Architect'}</span>
                  <span className="text-[10px] text-gray-400 font-medium">Verified Professional</span>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User photo" className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <button 
                  id="signout-btn"
                  onClick={handleSignOut} 
                  title="Sign Out" 
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                id="signin-btn"
                onClick={handleSignIn} 
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1E293B] hover:bg-[#334155] rounded-md transition-all active:scale-95 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Upload, Prompts, Metadata, Presets */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Section 1: Property Metadata Info */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569] mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4 text-slate-400" />
              Batch Information
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Batch / Property Title</label>
                <input 
                  type="text" 
                  value={batchTitle} 
                  onChange={(e) => setBatchTitle(e.target.value)}
                  className="w-full text-sm font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none transition-all"
                  placeholder="e.g. 42 Luxury Oak Drive"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Property Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={propertyAddress} 
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none transition-all"
                    placeholder="e.g. 42 Oak Drive, Beverly Hills, CA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Property Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {propertyTags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200">
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                      <button onClick={() => removeTag(idx)} className="text-slate-400 hover:text-slate-600 font-bold ml-1">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newTagInput} 
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none"
                    placeholder="e.g. LivingRoom, Exterior"
                  />
                  <button onClick={addTag} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold">Add</button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Media Batch Upload Dropzone */}
          <div 
            id="dropzone"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragOver 
                ? 'border-slate-800 bg-slate-50' 
                : 'border-[#E2E8F0] bg-white hover:border-slate-300'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              multiple 
              className="hidden" 
              accept="image/*,video/*"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="bg-slate-50 p-3 rounded-full border border-slate-100">
                <Upload className="w-6 h-6 text-slate-500 animate-bounce" />
              </div>
              <div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-bold text-slate-800 hover:underline"
                >
                  Upload Property Files
                </button>
                <p className="text-xs text-slate-400 mt-1">Drag and drop photos or videos here</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1.5">Max resolution 4K supported</p>
              </div>
            </div>
          </div>

          {/* Section 3: Professional Prompts & Settings */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569] mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-400" />
              Editor Directives
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Enhancement Instruction Prompt</label>
                <textarea 
                  value={enhancementPrompt} 
                  onChange={(e) => setEnhancementPrompt(e.target.value)}
                  rows={3}
                  className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none resize-none"
                  placeholder="Directives for the AI staging engine..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Expert System Correction Instruction</label>
                <textarea 
                  value={systemInstruction} 
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  rows={2}
                  className="w-full text-[11px] font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none resize-none"
                  placeholder="Expert rules applied behind the scenes..."
                />
              </div>

              {/* Grid of advanced parameters */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Resolution Limit</label>
                  <select 
                    value={resolution} 
                    onChange={(e) => setResolution(e.target.value as ImageResolution)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-1.5 bg-slate-50 outline-none"
                  >
                    <option value="1K">1K Standard</option>
                    <option value="2K">2K Full HD</option>
                    <option value="4K">4K Ultra HD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Aspect Ratio</label>
                  <select 
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-1.5 bg-slate-50 outline-none"
                  >
                    <option value="auto">Auto Match</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="4:3">4:3 Standard</option>
                    <option value="16:9">16:9 Wide</option>
                    <option value="3:2">3:2 Classic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Edit / Create Mode</label>
                  <select 
                    value={opMode} 
                    onChange={(e) => setOpMode(e.target.value as OperationMode)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-1.5 bg-slate-50 outline-none"
                  >
                    <option value="edit">Enhance / Stage (Edit)</option>
                    <option value="create">Pure Generator (Create)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Target Media</label>
                  <select 
                    value={mediaType} 
                    onChange={(e) => setMediaType(e.target.value as MediaType)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-1.5 bg-slate-50 outline-none"
                  >
                    <option value="image">Still Photos</option>
                    <option value="video">Staged Walkthroughs</option>
                  </select>
                </div>
              </div>

              {/* Preset Shortcuts */}
              {favoritePrompts.length > 0 && (
                <div className="pt-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Quick Presets</label>
                  <div className="flex flex-wrap gap-1.5">
                    {favoritePrompts.slice(0, 5).map((fav) => (
                      <button 
                        key={fav.id}
                        onClick={() => handleApplyFavorite(fav)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded"
                      >
                        {fav.name}
                        <span onClick={(e) => handleDeleteFavorite(e, fav.id)} className="text-slate-400 hover:text-red-500 font-bold ml-1">×</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Process Trigger */}
          <div className="flex flex-col gap-3">
            {isProcessing && (
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div 
                  className="bg-slate-800 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            )}
            
            <button 
              id="process-batch-btn"
              onClick={handleProcessBatch}
              disabled={isProcessing || uploadedFiles.length === 0}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 ${
                isProcessing || uploadedFiles.length === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-[#1E293B] hover:bg-[#334155] text-white'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Processing Batch ({processingProgress}%)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Enhance & Stage All ({uploadedFiles.length} media)
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Side: Active Queue & Comparison Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Section 1: Active Batch Uploads Queue list */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                Active Uploads Queue ({uploadedFiles.length})
              </h2>
              {uploadedFiles.length > 0 && (
                <button 
                  id="clear-queue-btn"
                  onClick={clearUploadsQueue} 
                  className="text-xs font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Queue
                </button>
              )}
            </div>

            {uploadedFiles.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-100 rounded-xl">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Your uploads queue is empty. Drag in real estate photos above to begin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                {uploadedFiles.map((item) => {
                  const qMatch = queue.find(q => q.id === item.id);
                  const isCompleted = qMatch?.status === 'completed';
                  const isError = qMatch?.status === 'error';
                  const isPending = qMatch?.status === 'pending';
                  const isSelected = selectedQueueItem?.id === item.id;

                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        const currentMatch = queue.find(q => q.id === item.id) || {
                          id: item.id,
                          timestamp: Date.now(),
                          prompt: enhancementPrompt,
                          status: 'pending',
                          originalImage: item.base64
                        };
                        setSelectedQueueItem(currentMatch);
                      }}
                      className={`relative aspect-[4/3] rounded-lg overflow-hidden border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-slate-800 ring-2 ring-slate-100 shadow-md scale-[0.98]' 
                          : 'border-slate-100 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      {/* Image Preview */}
                      <img src={item.base64} alt={item.name} className="w-full h-full object-cover" />

                      {/* Status indicator badge */}
                      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md rounded-full p-1 text-white flex items-center justify-center">
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {isError && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />}
                        {!qMatch && <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />}
                      </div>

                      {/* Item index / Name footer */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white text-[10px] font-semibold truncate">
                        {item.name}
                      </div>

                      {/* Delete action overlay */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUploadedFile(item.id);
                        }}
                        className="absolute top-2 left-2 p-1 bg-black/60 hover:bg-red-600 rounded-md text-white opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Active Comparison / Staging Canvas Workspace */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm min-h-[440px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                Comparison & Staging Workspace
              </h2>
              {selectedQueueFullItem?.editedImage && (
                <button 
                  onClick={() => downloadProcessed(selectedQueueFullItem)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              )}
            </div>

            {/* Main view renderer */}
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden relative flex items-center justify-center">
              {selectedQueueFullItem ? (
                selectedQueueFullItem.editedImage ? (
                  <BeforeAfterSlider 
                    before={selectedQueueFullItem.originalImage || selectedQueueFullItem.originalThumbnail || ''} 
                    after={selectedQueueFullItem.editedImage} 
                  />
                ) : (
                  <div className="text-center p-8 max-w-sm">
                    <img src={selectedQueueFullItem.originalImage || selectedQueueFullItem.originalThumbnail} alt="Preview" className="w-48 h-32 object-cover rounded-lg mx-auto mb-4 border border-slate-200 shadow-sm" />
                    <p className="text-xs font-bold text-slate-800">Ready to Stage</p>
                    <p className="text-xs text-slate-400 mt-1">This photo hasn't been enhanced yet. Click the main process button to launch the engine.</p>
                  </div>
                )
              ) : (
                <div className="text-center p-12 max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 mx-auto mb-3">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">Interactive Canvas</p>
                  <p className="text-xs text-slate-400 mt-1">Select an uploaded real estate photo from the list above to view interactive slide staging comparisons.</p>
                </div>
              )}
            </div>

            {/* Secondary footer details for active selected photo */}
            {selectedQueueFullItem && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 font-medium">
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-800 font-bold">Enhancement Directives used:</span>
                  <p className="italic text-[11px] text-slate-500">"{selectedQueueFullItem.prompt}"</p>
                </div>
                
                {/* Analyze Action button */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button 
                    id="analyze-btn"
                    onClick={handleAnalyzePhoto}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        AI Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: AI Weakness and Flaw Analysis Board */}
          {(activeAnalysis || selectedQueueFullItem?.analysis) && (
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-5 shadow-inner">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569] mb-3 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#475569]" />
                AI Real Estate Audit
              </h2>
              <div className="text-xs font-medium text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg p-3 max-h-56 overflow-y-auto whitespace-pre-line">
                {activeAnalysis || selectedQueueFullItem?.analysis}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Floating Chatbot Assistant Component */}
      <Chatbot 
        uploadedImages={uploadedFiles.map(f => ({ url: f.base64, name: f.name }))}
        onUpdatePrompt={(newPrompt) => setEnhancementPrompt(newPrompt)}
        onProcessBatch={handleProcessBatch}
      />

      {/* Footer copyright */}
      <footer className="border-t border-[#EDF2F7] bg-white py-4 text-center text-[10px] text-slate-400 font-medium tracking-wide">
        &copy; 2026 BATCHLAB PHOTO ENGINE. POWERED BY GEMINI 3.5 FLASH & FIRESTORE.
      </footer>

      {/* MODAL 1: Save Favorite Preset Modal */}
      <AnimatePresence>
        {showSaveFavModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1E293B] mb-3">Save Preset</h3>
              <p className="text-xs text-slate-400 mb-4">Save the current prompt configuration to your account library for future real estate batches.</p>
              
              <input 
                type="text" 
                value={newFavName} 
                onChange={(e) => setNewFavName(e.target.value)}
                placeholder="e.g. Sunny Editorial Interior"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white outline-none mb-4"
              />

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowSaveFavModal(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveFavorite}
                  className="px-4 py-2 bg-[#1E293B] hover:bg-[#334155] rounded-lg text-xs font-semibold text-white transition-colors"
                >
                  Save Preset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: History sessions archive modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-xl w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#1E293B]">Archived Work Sessions</h3>
                <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
              </div>

              {batchesHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No work sessions found. Create your first batch to start saving sessions.
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                  {batchesHistory.map((batch) => (
                    <div 
                      key={batch.id}
                      onClick={() => handleLoadBatch(batch)}
                      className="border border-slate-100 hover:border-slate-300 rounded-lg p-3 bg-slate-50 cursor-pointer flex items-center justify-between gap-4 transition-all hover:scale-[1.01]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {batch.thumbnails.slice(0, 3).map((thumb, idx) => (
                            <img key={idx} src={thumb} alt="Preview" className="w-8 h-8 rounded-full border border-white object-cover" />
                          ))}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{batch.title}</h4>
                          <p className="text-[10px] text-slate-400">{batch.address || 'No address specified'}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{new Date(batch.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
