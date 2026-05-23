'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  History, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
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
  MessageSquare
} from 'lucide-react';
import { beautifyImage, analyzeImage, ImageResolution, ImageModel, ProcessingTier } from '@/lib/gemini';
import { 
  saveToMemory, 
  getMemory, 
  MemoryItem, 
  getFullMemoryItem,
  clearMemory, 
  subscribeToMemory, 
  subscribeToLocalMemory, 
  syncLocalToFirestore,
  FavoritePrompt,
  saveFavoritePrompt,
  getFavoritePrompts,
  deleteFavoritePrompt,
  subscribeToFavorites,
  saveSystemInstruction,
  getSystemInstruction,
  Batch,
  saveBatch,
  subscribeToBatches
} from '@/lib/memory';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User, GoogleAuthProvider } from '@/firebase';
import { setDriveToken, getDriveViewUrl, getDriveToken, getFolderId } from '@/lib/drive';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as piexif from 'piexifjs';
import ReactMarkdown from 'react-markdown';

import { BeforeAfterSlider } from '@/components/before-after-slider';
import Chatbot from '@/components/chatbot';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  result?: string;
  resultPreview?: string; // Blob URL for performance
  error?: string;
  isFavorite?: boolean;
  analysis?: string;
  isAnalyzing?: boolean;
  usedAnalysis?: boolean;
  finalPrompt?: string;
  memoryId?: string; // Link to the enhancement record
}

// Helper to convert data URL to Blob URL
const dataUrlToBlobUrl = async (dataUrl: string) => {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Blob conversion failed:", e);
    return dataUrl;
  }
};

export default function REBEPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [prompt, setPrompt] = useState('High noon, diffused sunlight conversion with corrected verticals and improved sharpness, color and color balance.');
  const [resolution, setResolution] = useState<ImageResolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<any>('3:2');
  const model: ImageModel = 'nano-2';
  const [suffix, setSuffix] = useState('_nano');
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [reprocessPrompt, setReprocessPrompt] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [concurrencyLimit, setConcurrencyLimit] = useState(2);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [tier, setTier] = useState<ProcessingTier>('standard');
  const [useContextForStyle, setUseContextForStyle] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState("You are an expert photography retoucher with no tolerance for technical imperfections and off-balance color or mixed white balance. Every image you work on is ready for gallery showings but remains grounded in reality. \n\nMaintain the exact structural integrity and perspective of the 'TARGET IMAGE'. Use 'SPATIAL CONTEXT' images only to understand the room's geometry and light sources. Use 'STYLE REFERENCE' images only if explicitly requested for aesthetic cues. Return ONLY the edited image data.");
  const [favorites, setFavorites] = useState<FavoritePrompt[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showRecentPrompts, setShowRecentPrompts] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'completed' | 'processing' | 'error'>('all');
  const [autoAnalyzeOnUpload, setAutoAnalyzeOnUpload] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [networkLog, setNetworkLog] = useState<{ id: string; type: string; status: 'pending' | 'success' | 'error'; timestamp: number; message: string }[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [historyTab, setHistoryTab] = useState<'edits' | 'batches'>('batches');
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [pendingImages, setPendingImages] = useState<ImageFile[]>([]);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const imagesRef = React.useRef(images);
  
  React.useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const addNetworkLog = useCallback((type: string, message: string, status: 'pending' | 'success' | 'error' = 'pending') => {
    const id = crypto.randomUUID();
    setNetworkLog(prev => [{ id, type, status, message, timestamp: Date.now() }, ...prev].slice(0, 50));
    return id;
  }, []);

  const updateNetworkLog = useCallback((id: string, status: 'success' | 'error', message?: string) => {
    setNetworkLog(prev => prev.map(log => log.id === id ? { ...log, status, message: message || log.message } : log));
  }, []);



  const cycleResolution = () => {
    const resMap: Record<ImageResolution, ImageResolution> = { '512px': '1K', '1K': '2K', '2K': '4K', '4K': '512px' };
    setResolution(resMap[resolution] || '2K');
  };

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getSystemInstruction().then(inst => {
      if (inst) setSystemInstruction(inst);
    });

    const unsubscribe = subscribeToFavorites((items) => {
      setFavorites(items);
    }, (e) => {
      if (e.message.includes('isQuotaExceeded":true')) {
        setIsQuotaExceeded(true);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user) {
      // Sync local memory to Firestore when user logs in
      const syncId = addNetworkLog('Database Sync', 'Checking for unsynced local records...');
      syncLocalToFirestore(user.uid)
        .then(() => updateNetworkLog(syncId, 'success', 'Local records synced to Cloud.'))
        .catch(e => {
          updateNetworkLog(syncId, 'error', `Sync failed: ${e.message}`);
          if (e.message.includes('isQuotaExceeded":true')) {
            setIsQuotaExceeded(true);
          }
        });
      
      const unsubscribeBatches = subscribeToBatches(user.uid, (items) => {
        setBatches(items);
      });

      const unsubscribe = subscribeToMemory(user.uid, (items) => {
        setMemory(items);
      }, (e) => {
        if (e.message.includes('isQuotaExceeded":true')) {
          setIsQuotaExceeded(true);
        }
      });
      return () => {
        unsubscribe();
        unsubscribeBatches();
      };
    } else {
      // Fallback to local memory if not logged in
      const unsubscribeBatches = subscribeToBatches(null, (items) => {
        setBatches(items);
      });
      const unsubscribe = subscribeToLocalMemory((items) => {
        setMemory(items);
      });
      
      // Initial load
      getMemory().then(setMemory);
      
      return () => {
        unsubscribe();
        unsubscribeBatches();
      };
    }
  }, [user, addNetworkLog, updateNetworkLog]);

  const [isDriveLinked, setIsDriveLinked] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsDriveLinked(!!getDriveToken());
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveToken(credential.accessToken);
        setIsDriveLinked(true);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const openImageDetail = useCallback((img: ImageFile) => {
    setSelectedImage(img);
    setReprocessPrompt(img.finalPrompt || prompt);
    setShowSlider(false);
    setAnalysisResult(img.analysis || null);
    setIsAnalyzing(!!img.isAnalyzing);
  }, [prompt]);

  const filteredImages = images.filter(img => {
    if (galleryFilter === 'all') return true;
    return img.status === galleryFilter;
  });

  const goToNextImage = useCallback(() => {
    if (!selectedImage) return;
    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    openImageDetail(filteredImages[nextIndex]);
  }, [selectedImage, filteredImages, openImageDetail]);

  const goToPreviousImage = useCallback(() => {
    if (!selectedImage) return;
    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + filteredImages.length) % filteredImages.length;
    openImageDetail(filteredImages[prevIndex]);
  }, [selectedImage, filteredImages, openImageDetail]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowRight') goToNextImage();
      if (e.key === 'ArrowLeft') goToPreviousImage();
      if (e.key === 'Escape') setSelectedImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, goToNextImage, goToPreviousImage]);

  const handleAnalyze = useCallback(async (imgId?: string) => {
    const targetId = imgId || selectedImage?.id;
    if (!targetId) return;
    
    setImages(prev => prev.map(img => img.id === targetId ? { ...img, isAnalyzing: true } : img));
    if (selectedImage?.id === targetId) {
      setIsAnalyzing(true);
    }

    try {
      const img = images.find(i => i.id === targetId) || pendingImages.find(i => i.id === targetId);
      if (!img) return;

      const base64 = await fileToBase64(img.file);
      const result = await analyzeImage(base64);
      
      setImages(prev => prev.map(i => i.id === targetId ? { ...i, analysis: result, isAnalyzing: false } : i));
      if (selectedImage?.id === targetId) {
        setAnalysisResult(result);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setImages(prev => prev.map(i => i.id === targetId ? { ...i, isAnalyzing: false } : i));
    } finally {
      if (selectedImage?.id === targetId) {
        setIsAnalyzing(false);
      }
    }
  }, [selectedImage, images, pendingImages, fileToBase64]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'idle' as const,
    }));
    
    if (images.length === 0) {
      setPendingImages(newImages);
      setShowAddressPrompt(true);
    } else {
      setImages(prev => [...prev, ...newImages]);
    }

    if (autoAnalyzeOnUpload) {
      newImages.forEach(img => handleAnalyze(img.id));
    }
  }, [images.length, autoAnalyzeOnUpload, handleAnalyze]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
  });

  const onDropContext = useCallback((acceptedFiles: File[]) => {
    setContextFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps: getContextRootProps, getInputProps: getContextInputProps, isDragActive: isContextDragActive } = useDropzone({
    onDrop: onDropContext,
    accept: { 'image/*': [], 'application/pdf': [], 'text/plain': [] },
  });

  const removeContextFile = (index: number) => {
    setContextFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (id: string) => {
    const imgToRemove = images.find(img => img.id === id);
    if (imgToRemove?.resultPreview) {
      URL.revokeObjectURL(imgToRemove.resultPreview);
    }
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) setSelectedImage(null);
  };

  const processBatch = useCallback(async () => {
    if (images.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setProcessedCount(0);
    
    const imagesToProcess = images.filter(img => img.status !== 'completed');
    if (imagesToProcess.length === 0) {
      setIsProcessing(false);
      return;
    }
    setTotalToProcess(imagesToProcess.length);

    // Prepare context
    let contextText = "";
    if (contextFiles.length > 0) {
      contextText = `\nAdditional context from files: ${contextFiles.map(f => f.name).join(', ')}`;
    }

    // Load reference images as base64
    const referenceImageB64s = await Promise.all(
      contextFiles
        .filter(f => f.type.startsWith('image/'))
        .map(f => fileToBase64(f))
    );

    const processImage = async (img: ImageFile) => {
      if (img.status === 'completed') return img;

      const logId = addNetworkLog('Image Generation', `Processing ${img.file.name}...`);
      
      // Create a persistent memory entry immediately so it's not "lost" if the browser crashes
      const memoryId = crypto.randomUUID();
      const originalBase64 = await fileToBase64(img.file);
      
      await saveToMemory({
        id: memoryId,
        timestamp: Date.now(),
        prompt,
        systemInstruction, // Store system instruction
        status: 'pending',
        originalImage: originalBase64,
        settings: { prompt, resolution, model, aspectRatio }
      });

      const currentPrompt = prompt;
      const hasAnalysis = currentPrompt.includes("### ANALYSIS RECOMMENDATIONS:");
      setImages(prev => prev.map(i => i.id === img.id ? { 
        ...i, 
        status: 'processing',
        usedAnalysis: hasAnalysis,
        finalPrompt: currentPrompt
      } : i));

      try {
        // Simulate batch delay if enabled
        if (isBatchMode) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }

        const result = await beautifyImage(
          originalBase64, 
          prompt + contextText, 
          resolution, 
          model, 
          aspectRatio, 
          systemInstruction, 
          referenceImageB64s,
          useContextForStyle,
          tier
        );
        
        // Maintain EXIF
        let finalResult = result;
        try {
          const exifObj = piexif.load(originalBase64);
          const exifStr = piexif.dump(exifObj);
          finalResult = piexif.insert(exifStr, result);
        } catch (e) {
          console.warn("Could not transfer EXIF data:", e);
        }

        const updatedImg: ImageFile = {
          ...img,
          status: 'completed',
          resultPreview: await dataUrlToBlobUrl(finalResult),
          memoryId
        };

        setProcessedCount(prev => prev + 1);

        // Update the memory entry to 'completed'
        await saveToMemory({
          id: memoryId,
          timestamp: Date.now(),
          prompt,
          systemInstruction, // Store system instruction
          status: 'completed',
          originalImage: originalBase64,
          editedImage: finalResult,
          settings: { prompt, resolution, model, aspectRatio }
        });

        updateNetworkLog(logId, 'success', `Successfully processed ${img.file.name}`);
        setImages(prev => prev.map(i => i.id === img.id ? updatedImg : i));
        return updatedImg;
      } catch (error: any) {
        console.error(error);
        const errorMsg = error.message || 'Failed to process';
        
        // Update memory entry to 'error'
        await saveToMemory({
          id: memoryId,
          timestamp: Date.now(),
          prompt,
          status: 'error',
          error: errorMsg,
          originalImage: originalBase64,
          settings: { prompt, resolution, model }
        });

        updateNetworkLog(logId, 'error', `Failed ${img.file.name}: ${errorMsg}`);
        setProcessedCount(prev => prev + 1);
        
        const errorImg: ImageFile = {
          ...img,
          status: 'error',
          error: errorMsg
        };
        setImages(prev => prev.map(i => i.id === img.id ? errorImg : i));
        return errorImg;
      }
    };

    const successfullyProcessed: ImageFile[] = [];

    // Process images with limited concurrency
    const queue = [...imagesToProcess];
    const workers = Array(Math.min(concurrencyLimit, queue.length)).fill(null).map(async (_, index) => {
      // Stagger start slightly to avoid burst 429s
      await new Promise(resolve => setTimeout(resolve, index * 800));
      
      while (queue.length > 0) {
        const img = queue.shift()!;
        const updatedImg = await processImage(img);
        if (updatedImg?.status === 'completed') {
          successfullyProcessed.push(updatedImg);
        }
      }
    });
    await Promise.all(workers);

    // Create a batch entry for these results
    const batchImages = successfullyProcessed;
    if (batchImages.length > 0) {
      const timestamp = Date.now();
      const defaultTitle = `Batch - ${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      // Get actual base64 thumbnails from memory for persistence
      const batchThumbnails: string[] = [];
      const localMemory = await getMemory();
      for (const img of batchImages.slice(0, 4)) {
        const memoryMatch = localMemory.find(m => m.id === (img.memoryId || img.id));
        if (memoryMatch?.editedThumbnail) {
          batchThumbnails.push(memoryMatch.editedThumbnail);
        } else if (img.resultPreview) {
          // Fallback if not found in memory yet (unlikely)
          batchThumbnails.push(img.resultPreview);
        }
      }

      await saveBatch({
        id: crypto.randomUUID(),
        timestamp,
        imageIds: batchImages.map(img => img.memoryId || img.id),
        thumbnails: batchThumbnails,
        title: propertyAddress.trim() || defaultTitle,
        address: propertyAddress.trim() || undefined,
        prompt, // Store batch prompt
        systemInstruction, // Store batch system instruction
        tags: ['enhanced']
      });
      // Do not reset address if user might want to process more in the same batch session
      // but we clear it if the whole batch is done and "successful"
      if (batchImages.length === images.length) {
        setPropertyAddress(''); 
      }
    }

    setIsProcessing(false);
  }, [images, isProcessing, prompt, resolution, model, aspectRatio, contextFiles, fileToBase64, concurrencyLimit, systemInstruction, isBatchMode, useContextForStyle, propertyAddress, tier, addNetworkLog, updateNetworkLog]);

  const reprocessSingle = useCallback(async (createNewVariation: boolean = false) => {
    if (!selectedImage || selectedImage.status === 'processing') return;
    
    const currentPrompt = reprocessPrompt;
    const hasAnalysis = currentPrompt.includes("### ANALYSIS RECOMMENDATIONS:");
    const newId = crypto.randomUUID();
    const targetId = createNewVariation ? newId : selectedImage.id;

    if (createNewVariation) {
      const newImg: ImageFile = {
        ...selectedImage,
        id: targetId,
        status: 'processing',
        usedAnalysis: hasAnalysis,
        finalPrompt: currentPrompt,
        resultPreview: undefined,
        analysis: undefined,
        memoryId: undefined
      };
      setImages(prev => [newImg, ...prev]);
      setSelectedImage(newImg);
    } else {
      setImages(prev => prev.map(img => 
        img.id === targetId ? { 
          ...img, 
          status: 'processing',
          usedAnalysis: hasAnalysis,
          finalPrompt: currentPrompt
        } : img
      ));
    }

    try {
      // Load reference images as base64
      const referenceImageB64s = await Promise.all(
        contextFiles
          .filter(f => f.type.startsWith('image/'))
          .map(f => fileToBase64(f))
      );

      const base64 = await fileToBase64(selectedImage.file);
      const result = await beautifyImage(
        base64, 
        reprocessPrompt, 
        resolution, 
        model, 
        aspectRatio, 
        systemInstruction, 
        referenceImageB64s,
        useContextForStyle,
        tier
      );
      
      // Maintain EXIF
      let finalResult = result;
      try {
        const exifObj = piexif.load(base64);
        const exifStr = piexif.dump(exifObj);
        finalResult = piexif.insert(exifStr, result);
      } catch (e) {
        console.warn("Could not transfer EXIF data:", e);
      }

      const memoryId = crypto.randomUUID();
      const updatedImg: ImageFile = {
        ...selectedImage,
        id: targetId,
        status: 'completed',
        usedAnalysis: hasAnalysis,
        finalPrompt: currentPrompt,
        resultPreview: await dataUrlToBlobUrl(finalResult),
        memoryId
      };
      
      setImages(prev => prev.map(img => img.id === targetId ? updatedImg : img));
      setSelectedImage(updatedImg);
      
      await saveToMemory({
        id: memoryId,
        timestamp: Date.now(),
        prompt: reprocessPrompt,
        systemInstruction, // Store system instruction
        originalImage: base64,
        editedImage: result,
        settings: { prompt: reprocessPrompt, resolution, model }
      });
      
    } catch (error) {
      console.error(error);
      setImages(prev => prev.map(img => 
        img.id === targetId ? { ...img, status: 'error', error: 'Failed to re-process' } : img
      ));
    }
  }, [selectedImage, reprocessPrompt, resolution, model, aspectRatio, fileToBase64, systemInstruction, contextFiles, useContextForStyle, tier]);

  const downloadAll = async () => {
    const zip = new JSZip();
    const completedImages = images.filter(img => img.status === 'completed' && img.resultPreview);
    
    for (const img of completedImages) {
      if (!img.resultPreview) continue;
      // Fetch blob directly from the object URL
      const response = await fetch(img.resultPreview);
      const blob = await response.blob();
      
      const originalName = img.file.name;
      const dotIndex = originalName.lastIndexOf('.');
      const nameWithoutExt = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
      const ext = dotIndex !== -1 ? originalName.substring(dotIndex) : '.jpg';
      
      zip.file(`${nameWithoutExt}${suffix}${ext}`, blob);
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'processed_real_estate_photos.zip');
  };

  const downloadBatch = async (batch: Batch) => {
    const zip = new JSZip();
    addNetworkLog('Batch Download', `Preparing ${batch.imageIds.length} images...`);
    
    let foundCount = 0;
    for (const id of batch.imageIds) {
      const fullItem = await getFullMemoryItem(id);
      if (fullItem && fullItem.editedImage) {
        const base64Data = fullItem.editedImage.split(',')[1];
        zip.file(`enhanced_${id.slice(0, 8)}.jpg`, base64Data, { base64: true });
        foundCount++;
      }
    }
    
    if (foundCount === 0) {
      alert("No full-size images found for this batch in your local cache or cloud.");
      return;
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${batch.title.replace(/[^\w]/g, '_')}_results.zip`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      {/* Quota Warning Banner */}
      {isQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 p-2 text-center">
          <p className="text-[10px] text-amber-800 flex items-center justify-center gap-2">
            <Info size={12} />
            Firestore daily read quota exceeded. Cloud sync is paused until tomorrow, but local history still works.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="bg-black sticky top-0 z-40 px-6 py-4 flex flex-col gap-3 shadow-2xl">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="flex items-baseline text-white">
                <span className="font-sans font-black italic tracking-tighter text-3xl">BATCH</span>
                <span className="font-sans font-light italic tracking-tight text-3xl">LAB</span>
              </div>
              <div className="text-white text-[9px] tracking-[0.6em] font-serif uppercase -mt-1 opacity-90 pl-1 w-full text-center">
                PHOTO ENGINE
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isAuthLoading && (
              user ? (
                <div className="flex items-center gap-3 mr-2 bg-white/5 px-2 py-1 rounded-xl border border-white/10 max-sm:mr-1">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-bold text-white leading-none">{user.displayName}</p>
                    <button onClick={handleLogout} className="text-[9px] text-gray-400 hover:text-red-400 transition-colors">Sign Out</button>
                  </div>
                  <img src={user.photoURL || ''} alt="Profile" className="w-7 h-7 rounded-full border border-white/20" />
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all mr-2 border border-white/20"
                >
                  Sign In
                </button>
              )
            )}
            <button 
              onClick={() => setShowMemory(!showMemory)}
              className="p-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10"
              title="History"
            >
              <History className="w-4 h-4" />
              <span className="hidden lg:inline">History</span>
            </button>
            <button 
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="p-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10"
              title="Settings"
            >
              <Settings className={`w-4 h-4 ${showSettingsDrawer ? 'animate-spin-slow' : ''}`} />
              <span className="hidden lg:inline">Settings</span>
            </button>
            
                {user && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10 opacity-30 cursor-not-allowed">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                      Bucket
                    </span>
                  </div>
                )}

            {images.some(img => img.status === 'completed') && (
              <button 
                onClick={downloadAll}
                className="px-3 py-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-accent hover:bg-accent-dark text-white rounded-lg shadow-lg shadow-accent/20 transition-all ml-1"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline text-[10px]">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Progress Bar */}
        <AnimatePresence>
          {isProcessing && totalToProcess > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full pt-1 pb-2 border-t border-white/5"
            >
              <div className="flex items-center justify-between mb-1.5 px-1">
                <div className="flex items-center gap-2">
                  <Loader2 size={10} className="text-accent animate-spin" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Processing Batch</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-accent">{processedCount} / {totalToProcess}</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-accent shadow-[0_0_8px_#FF6B00]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(processedCount / totalToProcess) * 100}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-80 border-r border-border bg-white p-6 flex flex-col gap-6 overflow-y-auto">
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
            
            {/* Quick Settings Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <div 
                className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-md cursor-default select-none"
                title="AI Model is locked to Gemini 3.1 Flash Image Preview"
              >
                <span>🍌🍌</span>
                <span>Gemini 3.1 Flash Image Preview</span>
              </div>

              <button 
                onClick={cycleResolution}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md transition-colors"
                title="Click to cycle Resolution"
              >
                <Maximize2 size={10} className="text-accent" />
                {resolution}
              </button>

              <div className="relative group">
                <select 
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="appearance-none flex items-center pr-5 text-[9px] font-bold uppercase tracking-wider bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md transition-colors outline-none cursor-pointer"
                  title="Aspect Ratio"
                >
                  {['1:1', '2:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronRight size={8} className="absolute right-1.5 top-1.5 text-gray-400 rotate-90 pointer-events-none" />
              </div>

              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
                {(['standard', 'flex', 'batch'] as ProcessingTier[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTier(t);
                      setIsBatchMode(t === 'batch');
                    }}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${
                      tier === t 
                        ? 'bg-white text-black shadow-md scale-[1.02]' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={t === 'batch' ? 'Batch Processing (Lowest Priority)' : t === 'flex' ? 'Flex Priority' : 'Standard Priority'}
                  >
                    {t === 'batch' && <Clock size={10} />}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-24 p-3 rounded-2xl bg-bg border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-xs resize-none leading-relaxed"
              placeholder="Describe how to beautify the photos..."
            />
            
            <AnimatePresence>
              {showRecentPrompts && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2 space-y-2"
                >
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Recent Prompts</p>
                    {(() => {
                      const uniquePrompts = Array.from(new Set(memory.map(m => m.prompt))).slice(0, 10);
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
                                  const name = window.prompt('Name this favorite prompt:', p.substring(0, 20) + '...');
                                  if (name) {
                                    saveFavoritePrompt({
                                      id: crypto.randomUUID(),
                                      name,
                                      prompt: p,
                                      systemInstruction,
                                      timestamp: Date.now()
                                    });
                                  }
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

            <AnimatePresence>
              {showFavorites && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2 space-y-2"
                >
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Favorite Prompts</p>
                       <button 
                         onClick={() => {
                           const name = window.prompt("Name for new session preset:");
                           if (!name) return;
                           const favPrompt = window.prompt("Paste the enhancement prompt:");
                           if (!favPrompt) return;
                           const favSystem = window.prompt("Paste the system instruction (optional):") || systemInstruction;
                           
                           saveFavoritePrompt({
                             id: crypto.randomUUID(),
                             name,
                             prompt: favPrompt,
                             systemInstruction: favSystem,
                             timestamp: Date.now()
                           });
                         }}
                         className="text-[9px] font-black uppercase text-amber-600 bg-amber-100/50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-all flex items-center gap-1"
                       >
                         <Save size={8} />
                         Add Manual
                       </button>
                    </div>
                    {favorites.length === 0 ? (
                      <p className="text-[10px] text-amber-600/60 italic">No favorites yet.</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {favorites.map(fav => (
                          <div key={fav.id} className="flex items-center justify-between gap-2 group">
                            <button 
                              onClick={() => {
                                setPrompt(fav.prompt);
                                if (fav.systemInstruction) {
                                  setSystemInstruction(fav.systemInstruction);
                                  saveSystemInstruction(fav.systemInstruction);
                                }
                                setShowFavorites(false);
                              }}
                              className="flex-1 text-left text-[10px] text-amber-800 hover:bg-amber-100 p-1.5 rounded transition-colors truncate"
                              title={fav.prompt}
                            >
                              {fav.name}
                            </button>
                            <button 
                              onClick={() => deleteFavoritePrompt(fav.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-amber-400 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {favorites.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {favorites.slice(0, 6).map(fav => (
                  <button 
                    key={fav.id}
                    onClick={() => setPrompt(fav.prompt)}
                    className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md transition-colors truncate max-w-[140px]"
                    title={fav.prompt}
                  >
                    {fav.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="flex-1 mt-4">
            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer h-full min-h-[160px]
                ${isDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-gray-50'}
              `}
            >
              <input {...getInputProps()} />
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Upload className="text-accent w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="font-bold text-xs">Drop photos here</p>
                <p className="text-[10px] text-text-muted">or click to browse</p>
              </div>
            </div>
          </section>

          <div className="mt-4">
            <button 
              onClick={processBatch}
              disabled={images.length === 0 || isProcessing}
              className={`
                btn-primary w-full py-4 flex items-center justify-center gap-2 text-[11px] font-bold tracking-widest uppercase rounded-2xl
                ${(images.length === 0 || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}
                ${isBatchMode ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : ''}
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isBatchMode ? 'Submitting Batch...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  {isBatchMode ? <Layers className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  <span>{isBatchMode ? `Process ${images.length > 0 ? images.length : ''} in Batch` : `Beautify ${images.length > 0 ? images.length : ''} Photo${images.length !== 1 ? 's' : ''}`}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Gallery */}
        <div className="flex-1 bg-bg p-4 overflow-y-auto relative flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <div className="flex items-center gap-4">
              <h2 className="font-display font-black text-xl tracking-tighter uppercase">Gallery</h2>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                {(['all', 'completed', 'processing', 'error'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setGalleryFilter(f)}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      galleryFilter === f 
                        ? 'bg-black text-white shadow-md' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {f}
                    {f === 'all' ? ` (${images.length})` : images.filter(img => img.status === f).length > 0 ? ` (${images.filter(img => img.status === f).length})` : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1">
            {isBatchMode && isProcessing && (
            <div className="absolute top-20 left-4 right-4 z-10">
              <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5" />
                  <div>
                    <p className="text-xs font-bold">Batch Job in Progress</p>
                    <p className="text-[10px] opacity-80">Processing at convenient moments for maximum discount...</p>
                  </div>
                </div>
                <div className="text-xs font-mono">
                  {images.filter(img => img.status === 'completed').length} / {images.length}
                </div>
              </div>
            </div>
          )}
          {images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50 gap-4">
              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="font-display uppercase tracking-widest text-sm">No photos uploaded yet</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50 gap-4 mt-20">
              <Search className="w-10 h-10 text-gray-300" />
              <p className="font-display uppercase tracking-widest text-sm">No {galleryFilter} photos</p>
              <button 
                onClick={() => setGalleryFilter('all')}
                className="text-accent text-[10px] uppercase font-bold tracking-widest hover:underline"
              >
                Clear Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredImages.map((img) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={img.id}
                    className="card group relative"
                  >
                    <div className="aspect-[4/3] relative bg-gray-200 cursor-pointer overflow-hidden rounded-md">
                      <img 
                        src={img.resultPreview || img.preview} 
                        alt="Preview" 
                        className={`w-full h-full object-cover transition-all duration-500 ${img.status === 'processing' ? 'blur-sm grayscale' : ''}`}
                        onClick={() => openImageDetail(img)}
                      />
                      
                      {img.status === 'processing' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}

                      {img.status === 'completed' && (
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <div className="bg-green-500 text-white p-1 rounded-full shadow-lg pointer-events-none">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                          {img.usedAnalysis && (
                            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]" title="AI Analyzed" />
                          )}
                        </div>
                      )}

                      {img.status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/60 pointer-events-none">
                          <div className="bg-red-500 text-white p-1 rounded-full shadow-lg mb-1">
                            <X className="w-4 h-4" />
                          </div>
                          <p className="text-[9px] font-bold text-white text-center px-2 py-0.5 bg-red-500/80 rounded w-[90%] truncate">{img.error || 'Failed'}</p>
                        </div>
                      )}

                      {/* Desktop overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openImageDetail(img); }}
                          className="p-2 bg-white rounded-full text-accent hover:scale-110 transition-transform pointer-events-auto"
                        >
                          <Layers className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                          className="p-2 bg-white rounded-full text-red-500 hover:scale-110 transition-transform pointer-events-auto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Mobile remove button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                        className="md:hidden absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white/90 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="p-1.5 flex items-center justify-between">
                      <p className="text-[8px] font-mono text-text-muted truncate max-w-[100px]">{img.file.name}</p>
                      {img.status === 'completed' && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!img.resultPreview) return;
                            const originalName = img.file.name;
                            const dotIndex = originalName.lastIndexOf('.');
                            const nameWithoutExt = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
                            const ext = dotIndex !== -1 ? originalName.substring(dotIndex) : '.jpg';
                            
                            const response = await fetch(img.resultPreview);
                            const blob = await response.blob();
                            saveAs(blob, `${nameWithoutExt}${suffix}${ext}`);
                          }}
                          className="text-accent hover:text-accent-dark transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </main>

      {/* Memory Drawer */}
      <AnimatePresence>
        {showMemory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              className="fixed right-0 top-0 bottom-0 w-full bg-[#fcfcfc] z-50 shadow-2xl flex flex-col"
            >
              <div className="p-4 sm:p-10 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between bg-white sticky top-0 z-10 gap-4">
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black rounded-2xl text-white">
                      <History size={24} />
                    </div>
                    <div>
                      <h2 className="font-display font-black text-3xl tracking-tight uppercase leading-none">WORK SESSIONS</h2>
                      <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">Archived Enhancement History</p>
                    </div>
                  </div>
                  <button onClick={() => setShowMemory(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors border border-gray-100 sm:hidden shadow-sm">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setHistoryTab('batches')}
                    className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm ${historyTab === 'batches' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
                  >
                    Sessions
                  </button>
                  <button 
                    onClick={() => setHistoryTab('edits')}
                    className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm ${historyTab === 'edits' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
                  >
                    Individual Edits
                  </button>
                  <button onClick={() => setShowMemory(false)} className="hidden sm:block p-3 hover:bg-gray-100 rounded-2xl transition-colors border border-gray-100 shadow-sm bg-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                {historyTab === 'batches' ? (
                  <div className="grid grid-cols-1 gap-6">
                    {batches.length === 0 ? (
                      <div className="col-span-full text-center py-40 text-gray-400 bg-white rounded-[40px] border border-dashed border-gray-200 shadow-sm">
                        <Folder size={64} className="mx-auto mb-6 opacity-10" />
                        <p className="text-sm font-black uppercase tracking-widest">No sessions recorded</p>
                      </div>
                    ) : (
                      batches.map((batch) => (
                        <div key={batch.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col group">
                          <div className="grid grid-cols-4 h-32 bg-gray-50 border-b border-gray-50 overflow-hidden">
                            {batch.thumbnails.concat(Array(4).fill(null)).slice(0, 4).map((thumb, idx) => (
                              <div key={idx} className="bg-gray-100 overflow-hidden relative group/thumb">
                                {thumb ? (
                                  <img src={thumb} alt="Preview" className="w-full h-full object-cover grayscale-[0.3] group-hover/thumb:grayscale-0 transition-all duration-700 transform group-hover/thumb:scale-110" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center opacity-5">
                                    <ImageIcon size={16} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="p-8 flex-1 flex flex-col">
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex-1">
                                <h3 className="font-display font-black text-2xl tracking-tight uppercase leading-tight mb-2 line-clamp-1">{batch.title}</h3>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} className="text-accent" />
                                    <span>{new Date(batch.timestamp).toLocaleDateString()}</span>
                                  </div>
                                  <span className="opacity-30">|</span>
                                  <div className="flex items-center gap-1">
                                    <ImageIcon size={12} className="text-accent" />
                                    <span>{batch.imageIds.length} Photos</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button 
                                  className="p-3 bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all border border-gray-100"
                                  title="Download Batch"
                                  onClick={() => downloadBatch(batch)}
                                >
                                  <Download size={16} />
                                </button>
                                <button 
                                  className="p-3 bg-gray-50 rounded-2xl hover:bg-black hover:text-white transition-all border border-gray-100"
                                  title="Restore"
                                  onClick={async () => {
                                    const logId = addNetworkLog('Session Restore', `Restoring ${batch.title}...`);
                                    const restoredImages: ImageFile[] = [];
                                    for (const id of batch.imageIds) {
                                      const m = await getFullMemoryItem(id);
                                      if (m) {
                                        restoredImages.push({
                                          id: m.id,
                                          file: new File([], 'Restored File'), 
                                          preview: m.originalThumbnail || m.originalImage || '',
                                          status: 'completed',
                                          resultPreview: m.editedImage ? await dataUrlToBlobUrl(m.editedImage) : undefined,
                                          analysis: m.analysis,
                                          usedAnalysis: m.usedAnalysis,
                                          finalPrompt: m.finalPrompt || m.prompt,
                                          memoryId: m.id
                                        });
                                      }
                                    }
                                    if (restoredImages.length > 0) {
                                      setImages(restoredImages);
                                      if (batch.prompt) setPrompt(batch.prompt);
                                      if (batch.systemInstruction) {
                                        setSystemInstruction(batch.systemInstruction);
                                        saveSystemInstruction(batch.systemInstruction);
                                      }
                                      setShowMemory(false);
                                      updateNetworkLog(logId, 'success', 'Session restored.');
                                    } else {
                                      updateNetworkLog(logId, 'error', 'No images found.');
                                    }
                                  }}
                                >
                                  <Folder size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6 italic">
                                <p className="text-[11px] text-gray-500 font-medium leading-relaxed line-clamp-3">
                                  &quot;{batch.prompt || memory.find(m => m.id === batch.imageIds[0])?.prompt || 'No prompt info'}&quot;
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2 mb-8">
                                {batch.tags?.map(tag => (
                                  <span key={tag} className="text-[9px] font-black uppercase tracking-widest bg-accent text-white px-3 py-1.5 rounded-lg">
                                    {tag}
                                  </span>
                                ))}
                                {batch.address && (
                                  <span className="text-[9px] font-black uppercase tracking-widest bg-gray-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                    <MapPin size={10} />
                                    {batch.address.split(',')[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                              <button 
                                onClick={() => {
                                  if (batch.prompt) setPrompt(batch.prompt);
                                  if (batch.systemInstruction) {
                                    setSystemInstruction(batch.systemInstruction);
                                    saveSystemInstruction(batch.systemInstruction);
                                  }
                                  alert("Config restored.");
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline flex items-center gap-2"
                              >
                                <RefreshCw size={12} />
                                Reuse Config
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Individual Edit Log</p>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          ref={importInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const promptInput = window.prompt("Paste the prompt for this record (optional):") || "Manual Import";
                              const base64 = await fileToBase64(file);
                              await saveToMemory({
                                id: crypto.randomUUID(),
                                timestamp: Date.now(),
                                prompt: promptInput,
                                status: 'completed',
                                originalImage: base64,
                                editedImage: base64,
                                settings: { prompt: promptInput, model: 'manual-import' }
                              });
                              alert("History entry created successfully.");
                            }
                            // Reset input
                            e.target.value = '';
                          }}
                        />
                        <button 
                          onClick={() => importInputRef.current?.click()}
                          className="text-[10px] font-bold uppercase tracking-widest text-accent hover:underline flex items-center gap-1"
                        >
                          <Upload size={10} />
                          Import Result
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm('Clear all history?')) {
                              await clearMemory();
                            }
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={10} />
                          Nuke Everything
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {memory.map((item) => (
                        <div key={item.id} className="bg-white p-6 rounded-[30px] border border-gray-100 hover:shadow-lg transition-all group">
                          <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-text-muted">
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                                {item.status === 'pending' && (
                                  <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">
                                    <Loader2 size={8} className="animate-spin" />
                                    Pending
                                  </span>
                                )}
                                {item.status === 'error' && (
                                  <span className="text-[8px] font-bold uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200" title={item.error}>
                                    Error
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-3">
                                <button 
                                  onClick={async () => {
                                    const full = await getFullMemoryItem(item.id);
                                    if (full?.originalImage) {
                                      saveAs(full.originalImage, `original_${item.id}.jpg`);
                                    } else {
                                      alert("Full resolution original not found.");
                                    }
                                  }}
                                  className="text-[10px] font-black uppercase text-gray-500 hover:underline flex items-center gap-1"
                                >
                                  <Download size={10} />
                                  Original
                                </button>
                                <button 
                                  onClick={async () => {
                                    const full = await getFullMemoryItem(item.id);
                                    if (full?.editedImage) {
                                      saveAs(full.editedImage, `processed_${item.id}.jpg`);
                                    } else {
                                      alert("Full resolution result not found.");
                                    }
                                  }}
                                  className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Download size={10} />
                                  Full-Size Result
                                </button>
                                {(!item.editedThumbnail && item.status === 'pending') && (
                                  <span className="text-[9px] text-gray-400 italic">Processing...</span>
                                )}
                                <button 
                                  onClick={() => {
                                    setPrompt(item.prompt);
                                    if (item.systemInstruction) {
                                      setSystemInstruction(item.systemInstruction);
                                      saveSystemInstruction(item.systemInstruction);
                                    }
                                    if (item.settings?.resolution) setResolution(item.settings.resolution);
                                    alert("Archived session configuration restored.");
                                  }}
                                  className="text-[10px] font-black uppercase text-accent hover:underline"
                                >
                                  Reuse Config
                                </button>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                                {(item.originalThumbnail || item.originalImage) ? (
                                  <img src={item.originalThumbnail || item.originalImage} className="w-full h-full object-cover" alt="Original" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={16}/></div>
                                )}
                              </div>
                              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
                                {(item.editedThumbnail || item.editedImage) ? (
                                  <img src={item.editedThumbnail || item.editedImage} className="w-full h-full object-cover" alt="Edited" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={16}/></div>
                                )}
                              </div>
                          </div>
                          <p className="text-[11px] text-gray-500 italic leading-snug line-clamp-2">&quot;{item.prompt}&quot;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettingsDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsDrawer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Settings className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg leading-tight">Settings</h2>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Preferences & Debug</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettingsDrawer(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Property Address */}
                <section>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Property Address (Batch Title)</label>
                  <input 
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-bg border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-xs"
                    placeholder="123 Main St, New York, NY"
                  />
                  <p className="mt-1 text-[8px] text-text-muted italic">This will be used as the collection name for this batch.</p>
                </section>

                {/* Image Analysis Toggle */}
                <section className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Auto-Analyze Images</label>
                    <p className="text-[9px] text-gray-500">Enable automatic room analysis on upload</p>
                  </div>
                  <button 
                    onClick={() => setAutoAnalyzeOnUpload(!autoAnalyzeOnUpload)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${autoAnalyzeOnUpload ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${autoAnalyzeOnUpload ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </section>

                <hr className="border-border" />

                {/* Filename Suffix */}
                <section>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Filename Suffix</label>
                  <input 
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-bg border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-xs"
                    placeholder="_processed"
                  />
                </section>

                <hr className="border-border" />



                {/* Concurrency Limit */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Concurrency Limit</label>
                    <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">{concurrencyLimit} threads</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={concurrencyLimit} 
                    onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <p className="mt-1 text-[8px] text-text-muted">Lower this value (1-2) if you encounter &quot;Quota Exceeded&quot; errors. Image generation models have stricter rate limits than text models.</p>
                </section>

                <hr className="border-border" />
                
                {/* Network Monitor */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                      <Terminal size={12} className="text-gray-400" />
                      Network Monitor
                    </label>
                    <button 
                      onClick={() => setNetworkLog([])}
                      className="text-[9px] font-bold uppercase text-accent hover:underline"
                    >
                      Clear Logs
                    </button>
                  </div>
                  <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                    <div className="max-h-[200px] overflow-y-auto p-2 font-mono text-[9px] space-y-1.5 scrollbar-thin scrollbar-thumb-gray-800">
                      {networkLog.length === 0 ? (
                        <p className="text-gray-500 italic p-4 text-center">No active requests.</p>
                      ) : (
                        networkLog.map(log => (
                          <div key={log.id} className="flex gap-2 leading-tight">
                            <span className="text-gray-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                            <span className={`shrink-0 font-bold ${log.status === 'pending' ? 'text-yellow-400 animate-pulse' : log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                              {log.status === 'pending' ? 'RUN' : log.status === 'success' ? 'OK' : 'ERR'}
                            </span>
                            <span className="text-gray-300 break-all">{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[8px] text-text-muted">Real-time log of background tasks and AI requests.</p>
                    {user && (
                      <button 
                        onClick={() => {
                          const id = addNetworkLog('Database Sync', 'Manual sync triggered...');
                          syncLocalToFirestore(user.uid)
                            .then(() => updateNetworkLog(id, 'success', 'Manual sync complete.'))
                            .catch(e => updateNetworkLog(id, 'error', `Sync failed: ${e.message}`));
                        }}
                        className="text-[8px] font-bold uppercase text-accent hover:underline flex items-center gap-1"
                      >
                        <RefreshCw size={8} />
                        Retry Sync
                      </button>
                    )}
                  </div>
                </section>

                <hr className="border-border" />
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted block">Additional Context Files</label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted group-hover:text-accent transition-colors">Use for Style</span>
                      <div className="relative inline-flex items-center">
                        <input 
                          type="checkbox" 
                          checked={useContextForStyle}
                          onChange={(e) => setUseContextForStyle(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent"></div>
                      </div>
                    </label>
                  </div>
                  <p className="text-[10px] text-text-muted mb-2 font-medium">Add photos to help the AI understand the layout (Spatial Context) or the desired look (Style Reference).</p>
                  
                  <div className="flex flex-col gap-2">
                    <label className="border-2 border-dashed border-border rounded-xl p-3 text-center cursor-pointer hover:bg-bg transition-colors flex flex-col items-center gap-1 group">
                      <Upload className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                      <span className="text-xs text-text-muted font-medium">Add Reference Images</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setContextFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                      />
                    </label>
                    
                    <AnimatePresence>
                      {contextFiles.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col gap-2 mt-2 bg-gray-50/50 p-2 rounded-xl border border-gray-100"
                        >
                          {contextFiles.map((file, idx) => (
                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-2 bg-white rounded-lg border border-border shadow-sm text-xs">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                  <ImageIcon className="w-3 h-3 text-gray-400" />
                                </div>
                                <span className="truncate text-gray-700 font-medium">{file.name}</span>
                              </div>
                              <button
                                onClick={() => setContextFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>

                <hr className="border-border" />

                {/* Prompt Debugger */}
                <section>
                  <button 
                    onClick={() => setShowPromptPreview(!showPromptPreview)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-gray-400 group-hover:text-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Prompt Debugger</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showPromptPreview ? 'rotate-90' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showPromptPreview && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1">
                              <Edit3 size={10} /> System Instruction
                            </label>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const defaultInst = "You are a technically savvy, OCD creative director for high-end real estate photography. Your goal is to achieve a 'DAYLIGHT AIRY DIFFUSED NATURAL' style that looks professionally edited but remains grounded in reality. \n\nMaintain the exact structural integrity and perspective of the 'TARGET IMAGE'. Use 'SPATIAL CONTEXT' images only to understand the room's geometry and light sources. Use 'STYLE REFERENCE' images only if explicitly requested for aesthetic cues. Return ONLY the edited image data.";
                                  setSystemInstruction(defaultInst);
                                  saveSystemInstruction(defaultInst);
                                }}
                                className="text-[9px] text-gray-400 hover:text-accent transition-colors"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                          <textarea 
                            value={systemInstruction}
                            onChange={(e) => setSystemInstruction(e.target.value)}
                            onBlur={() => saveSystemInstruction(systemInstruction)}
                            className="w-full min-h-[150px] p-2 bg-gray-900 rounded-lg border border-gray-800 text-[9px] font-mono text-green-400/80 leading-relaxed outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y"
                            placeholder="Enter system instructions..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1">
                            <Info size={10} /> Final User Prompt
                          </label>
                          <div className="p-2 bg-gray-900 rounded-lg border border-gray-800">
                            <p className="text-[9px] font-mono text-blue-400/80 leading-relaxed break-words">
                              {prompt}
                              {contextFiles.length > 0 && (
                                <span className="text-gray-500">
                                  {"\n"}Additional context from files: {contextFiles.map(f => f.name).join(', ')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-[8px] text-text-muted italic">
                          The model receives the System Instruction first, followed by the image data and the Final User Prompt.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Detail Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl h-[85vh] bg-[#1A1C1E] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group/viewer">
                {selectedImage.resultPreview || selectedImage.result ? (
                  showSlider ? (
                    <BeforeAfterSlider 
                      before={selectedImage.preview} 
                      after={selectedImage.resultPreview || selectedImage.result!} 
                    />
                  ) : (
                    <img 
                      src={selectedImage.resultPreview || selectedImage.result} 
                      className="max-w-full max-h-full object-contain"
                      alt="Result"
                    />
                  )
                ) : (
                  <img 
                    src={selectedImage.preview} 
                    className="max-w-full max-h-full object-contain"
                    alt="Detail"
                  />
                )}
                
                {/* Navigation Arrows */}
                <button 
                  onClick={(e) => { e.stopPropagation(); goToPreviousImage(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover/viewer:opacity-100 z-20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover/viewer:opacity-100 z-20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Slider Toggle */}
                {selectedImage.resultPreview && (
                  <button 
                    onClick={() => setShowSlider(!showSlider)}
                    className={`
                      absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full backdrop-blur-md transition-all z-20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest
                      ${showSlider ? 'bg-accent text-white' : 'bg-white/10 text-white hover:bg-white/20'}
                    `}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    {showSlider ? 'Hide Comparison' : 'Compare Original'}
                  </button>
                )}
                
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors z-20"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Bottom Thumbnail Strip */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
                  <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-2xl flex gap-1.5 overflow-x-auto max-w-full no-scrollbar pointer-events-auto border border-white/10">
                    {filteredImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={(e) => { e.stopPropagation(); openImageDetail(img); }}
                        className={`
                          relative w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all border-2 
                          ${selectedImage.id === img.id ? 'border-accent scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-80'}
                        `}
                      >
                        <img 
                          src={img.resultPreview || img.preview} 
                          className="w-full h-full object-cover"
                          alt="Thumb"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-96 p-8 flex flex-col gap-6 text-white border-l border-white/10 overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display font-bold text-xl">Photo Details</h3>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {images.findIndex(img => img.id === selectedImage.id) + 1} / {images.length}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono truncate">{selectedImage.file.name}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Status</p>
                      <div className="flex items-center gap-2">
                        {selectedImage.status === 'completed' ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Processed</span>
                            </div>
                            {selectedImage.usedAnalysis && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-[8px] text-purple-400 uppercase font-black tracking-tighter">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                AI Analyzed
                              </div>
                            )}
                          </div>
                        ) : selectedImage.status === 'processing' ? (
                          <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 text-sm font-bold">
                            <ImageIcon className="w-4 h-4" />
                            <span>Idle</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleAnalyze()}
                      disabled={isAnalyzing}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex flex-col items-start gap-1"
                    >
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Analysis</p>
                      <div className="flex items-center gap-2 text-accent text-sm font-bold">
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
                      </div>
                    </button>
                  </div>

                  {analysisResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-accent/5 border border-accent/20 text-[10px] leading-relaxed text-gray-300"
                    >
                      <p className="font-bold text-accent uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Search size={10} /> Gemini Analysis
                      </p>
                      <div className="prose prose-invert prose-xs max-w-none mb-3">
                        <ReactMarkdown>{analysisResult}</ReactMarkdown>
                      </div>
                      <button 
                        onClick={() => {
                          setPrompt(prev => {
                            const header = "\n\n### ANALYSIS RECOMMENDATIONS:\n";
                            if (prev.includes(header)) return prev;
                            return prev + header + analysisResult;
                          });
                          alert("Recommendations incorporated into global enhancement prompt.");
                        }}
                        className="w-full py-1.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg border border-accent/30 transition-all font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                      >
                        <Edit3 size={10} />
                        Apply to Global Prompt
                      </button>
                    </motion.div>
                  )}

                  {selectedImage.finalPrompt && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10"
                    >
                      <p className="font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1 text-[9px]">
                        <MessageSquare size={10} /> Final Processing Prompt
                      </p>
                      <div className="text-[10px] text-gray-300 font-mono leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 max-h-40 overflow-y-auto no-scrollbar">
                        {selectedImage.finalPrompt}
                      </div>
                      {selectedImage.usedAnalysis && (
                        <div className="mt-2 flex items-center gap-1.5 text-[8px] text-purple-400 font-black uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                          AI Analysis was used
                        </div>
                      )}
                    </motion.div>
                  )}

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Refine Enhancement</p>
                    <textarea 
                      value={reprocessPrompt}
                      onChange={(e) => setReprocessPrompt(e.target.value)}
                      className="w-full h-24 bg-transparent border-0 outline-none text-xs text-gray-300 resize-none leading-relaxed"
                      placeholder="New prompt for this photo..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => reprocessSingle(false)}
                        disabled={selectedImage.status === 'processing' || selectedImage.status === 'pending' || (isProcessing && selectedImage.status !== 'completed')}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        {selectedImage.status === 'processing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-white/50" />}
                        {selectedImage.status === 'pending' || (isProcessing && selectedImage.status !== 'completed') ? 'Queue' : selectedImage.status === 'processing' ? 'Working' : 'Redo'}
                      </button>
                      <button 
                        onClick={() => reprocessSingle(true)}
                        disabled={selectedImage.status === 'processing' || selectedImage.status === 'pending' || (isProcessing && selectedImage.status !== 'completed')}
                        className="flex-1 py-2 bg-accent/20 hover:bg-accent/30 text-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        {selectedImage.status === 'processing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {selectedImage.status === 'pending' || (isProcessing && selectedImage.status !== 'completed') ? 'Queue' : selectedImage.status === 'processing' ? 'Working' : 'New Variation'}
                      </button>
                    </div>
                  </div>

                  {selectedImage.status === 'completed' && (
                    <button 
                      onClick={async () => {
                        if (!selectedImage.resultPreview) return;
                        const originalName = selectedImage.file.name;
                        const dotIndex = originalName.lastIndexOf('.');
                        const nameWithoutExt = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
                        const ext = dotIndex !== -1 ? originalName.substring(dotIndex) : '.jpg';
                        
                        const response = await fetch(selectedImage.resultPreview);
                        const blob = await response.blob();
                        saveAs(blob, `${nameWithoutExt}${suffix}${ext}`);
                      }}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const isFav = !selectedImage.isFavorite;
                        setImages(prev => prev.map(img => img.id === selectedImage.id ? { ...img, isFavorite: isFav } : img));
                        setSelectedImage(prev => prev ? { ...prev, isFavorite: isFav } : null);
                      }}
                      className={`flex-1 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                        selectedImage.isFavorite 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-500' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${selectedImage.isFavorite ? 'fill-current' : ''}`} />
                      <span>{selectedImage.isFavorite ? 'Favorited' : 'Favorite'}</span>
                    </button>

                    <button 
                      onClick={() => {
                        if (confirm('Delete this photo?')) {
                          removeImage(selectedImage.id);
                          setSelectedImage(null);
                        }
                      }}
                      className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500 hover:text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all text-gray-400 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    AI-enhanced using Gemini 2.5 Flash Image. Slide to compare original vs processed.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddressPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-md"
               onClick={() => {
                 setImages(prev => [...prev, ...pendingImages]);
                 setPendingImages([]);
                 setShowAddressPrompt(false);
               }}
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8">
                   <button 
                     onClick={() => {
                        setImages(prev => [...prev, ...pendingImages]);
                        setPendingImages([]);
                        setShowAddressPrompt(false);
                     }}
                     className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                   >
                     <X size={20} />
                   </button>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                      <MapPin size={24} />
                    </div>
                    <h2 className="font-display font-black text-4xl tracking-tighter uppercase leading-tight">IDENTIFY BATCH</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">GROUP THESE {pendingImages.length} PHOTOS UNDER A PROPERTY ADDRESS OR COLLECTION NAME.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Property Address</label>
                      <input 
                        autoFocus
                        type="text"
                        value={propertyAddress}
                        onChange={(e) => setPropertyAddress(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setImages(prev => [...prev, ...pendingImages]);
                            setPendingImages([]);
                            setShowAddressPrompt(false);
                          }
                        }}
                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm font-medium transition-all"
                        placeholder="e.g. 742 Evergreen Terrace..."
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => {
                          setImages(prev => [...prev, ...pendingImages]);
                          setPendingImages([]);
                          setShowAddressPrompt(false);
                        }}
                        className="flex-1 py-4 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
                      >
                        Start Session
                      </button>
                      <button 
                         onClick={() => {
                          setPropertyAddress('');
                          setImages(prev => [...prev, ...pendingImages]);
                          setPendingImages([]);
                          setShowAddressPrompt(false);
                         }}
                         className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Chatbot 
        uploadedImages={images.map(img => ({ url: img.preview, name: img.file.name }))} 
        onUpdatePrompt={setPrompt}
        onProcessBatch={processBatch}
      />
    </div>
  );
}
