'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  beautifyImage, 
  analyzeImage, 
  ImageResolution, 
  ImageModel, 
  ProcessingTier, 
  OperationMode, 
  MediaType, 
  VeoOption, 
  ImageModelOption 
} from '@/lib/gemini';
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
import { auth, onAuthStateChanged, User, signInWithPopup, googleProvider, GoogleAuthProvider, signOut } from '@/firebase';
import { setDriveToken, getDriveToken } from '@/lib/drive';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as piexif from 'piexifjs';

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  result?: string;
  resultPreview?: string;
  error?: string;
  isFavorite?: boolean;
  analysis?: string;
  isAnalyzing?: boolean;
  usedAnalysis?: boolean;
  finalPrompt?: string;
  memoryId?: string;
  mediaType?: MediaType;
  reprocessPrompt?: string;
}

export function useREBE() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [prompt, setPrompt] = useState('Professional photo enhancement: studio-grade clarity, balanced dynamic range, rich natural colors, crisp details, clean noise reduction, and optimal exposure.');
  const [resolution, setResolution] = useState<ImageResolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<any>('auto');
  const model: ImageModel = 'nano-2';
  const [suffix, setSuffix] = useState('_enhanced');
  const [isProcessing, setIsProcessing] = useState(false);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [refineSource, setRefineSource] = useState<'original' | 'result'>('original');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [lastQuotaCheck, setLastQuotaCheck] = useState(0);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [showQuotaBanner, setShowQuotaBanner] = useState(true);
  const [hasDismissedQuotaBanner, setHasDismissedQuotaBanner] = useState(false);
  const [concurrencyLimit, setConcurrencyLimit] = useState(3);
  const [isBatchMode, setIsBatchMode] = useState(true);
  const [tier, setTier] = useState<ProcessingTier>('flex');
  const [opMode, setOpMode] = useState<OperationMode>('edit');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [veoOption, setVeoOption] = useState<VeoOption>('lite');
  const [imageModelOption, setImageModelOption] = useState<ImageModelOption>('flash');
  const [systemInstruction, setSystemInstruction] = useState("You are a master professional photography editor. Your goal is to produce high-end commercial quality enhancements across diverse subjects (portraits, landscapes, architecture, street, products, and studio photos).\n\nCRITICAL CONSTRAINTS:\n1. Preserve natural textures, sharpness, and original subject identity without artificial artifacts.\n2. Balance highlights, midtones, and shadows for an optimal dynamic range.\n3. Correct color casts and white balance while maintaining authentic tones and vibrant colors.\n4. Enhance micro-contrast, edge sharpness, and clarity.\n5. Clean up noise and compression artifacts seamlessly.\n6. Follow the user's specific creative direction and instructions faithfully.\n\nOutput only the high-quality edited image.");
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
  const [showNamingFavorite, setShowNamingFavorite] = useState(false);
  const [namingFavoriteType, setNamingFavoriteType] = useState<'recent' | 'manual'>('recent');
  const [favoriteName, setFavoriteName] = useState('');
  const [pendingFavoritePrompt, setPendingFavoritePrompt] = useState('');
  const [pendingFavoriteSystem, setPendingFavoriteSystem] = useState('');
  const [pendingImages, setPendingImages] = useState<ImageFile[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  
  useEffect(() => {
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

  const dataUrlToBlobUrl = useCallback(async (dataUrl: string) => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Blob conversion failed:", e);
      return dataUrl;
    }
  }, []);

  const cycleResolution = () => {
    const resMap: Record<ImageResolution, ImageResolution> = { '1K': '2K', '2K': '4K', '4K': '1K' };
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

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSync = useCallback((userId: string) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      if (isQuotaExceeded) return;
      
      const syncId = addNetworkLog('Database Sync', 'Syncing local records...');
      syncLocalToFirestore(userId)
        .then(() => {
          updateNetworkLog(syncId, 'success', 'Synced to Cloud.');
        })
        .catch(e => {
          updateNetworkLog(syncId, 'error', `Sync failed: ${e.message}`);
          if (e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('resource-exhausted')) {
            setIsQuotaExceeded(true);
            if (!hasDismissedQuotaBanner) setShowQuotaBanner(true);
          }
        });
    }, 2000);
  }, [isQuotaExceeded, hasDismissedQuotaBanner, addNetworkLog, updateNetworkLog]);

  useEffect(() => {
    let unsubscribeMemory = () => {};
    let unsubscribeBatches = () => {};

    if (user) {
      getSystemInstruction().then(inst => {
        if (inst) setSystemInstruction(inst);
      });

      if (!isQuotaExceeded) {
        debouncedSync(user.uid);

        import('@/lib/memory').then(m => {
          m.getCloudFavorites(user.uid!)
            .then(setFavorites)
            .catch(e => {
              if (e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('resource-exhausted')) {
                setIsQuotaExceeded(true);
                if (!hasDismissedQuotaBanner) setShowQuotaBanner(true);
              }
            });
        });
        
        unsubscribeBatches = subscribeToBatches(user.uid, (items) => {
          setBatches(items);
        }, (e) => {
          if (e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('resource-exhausted')) {
            setIsQuotaExceeded(true);
            if (!hasDismissedQuotaBanner) setShowQuotaBanner(true);
          }
        });

        unsubscribeMemory = subscribeToMemory(user.uid, (items) => {
          setMemory(items);
        }, (e) => {
          if (e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('resource-exhausted')) {
            setIsQuotaExceeded(true);
            if (!hasDismissedQuotaBanner) setShowQuotaBanner(true);
          }
        });
      } else {
        unsubscribeBatches = subscribeToBatches(null, setBatches);
        unsubscribeMemory = subscribeToLocalMemory(setMemory);
        getMemory().then(setMemory);
      }
    } else {
      unsubscribeBatches = subscribeToBatches(null, setBatches);
      unsubscribeMemory = subscribeToLocalMemory(setMemory);
      getMemory().then(setMemory);
    }

    return () => {
      unsubscribeMemory();
      unsubscribeBatches();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [user, isQuotaExceeded, isRetryingSync, debouncedSync, hasDismissedQuotaBanner]);

  const handleRetrySync = useCallback(() => {
    setIsRetryingSync(true);
    setIsQuotaExceeded(false);
    setHasDismissedQuotaBanner(false);
    setShowQuotaBanner(true);
    // Small delay to ensure state transitions are clean
    setTimeout(() => {
      setIsRetryingSync(false);
    }, 100);
  }, []);

  const [isDriveLinked, setIsDriveLinked] = useState(false);

  useEffect(() => {
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
    setShowSlider(false);
    setAnalysisResult(img.analysis || null);
    setIsAnalyzing(!!img.isAnalyzing);
    setRefineSource('original');
  }, []);

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

  const handleAnalyzeAll = useCallback(async () => {
    if (images.length === 0) return;
    const imagesToAnalyze = images.filter(img => !img.analysis && !img.isAnalyzing);
    if (imagesToAnalyze.length === 0) return;

    for (const img of imagesToAnalyze) {
      await handleAnalyze(img.id);
    }
  }, [images, handleAnalyze]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'idle' as const,
      mediaType: file.type.startsWith('video/') ? ('video' as const) : ('image' as const)
    }));
    
    if (images.length === 0) {
      setPendingImages(prev => [...prev, ...newImages]);
      setShowAddressPrompt(true);
    } else {
      setImages(prev => [...prev, ...newImages]);
    }

    if (autoAnalyzeOnUpload) {
      newImages.forEach(img => handleAnalyze(img.id));
    }
  }, [images.length, autoAnalyzeOnUpload, handleAnalyze]);

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

    const processImage = async (img: ImageFile) => {
      if (img.status === 'completed') return img;

      const logId = addNetworkLog('Image Generation', `Processing ${img.file.name}...`);
      const memoryId = crypto.randomUUID();
      const originalBase64 = await fileToBase64(img.file);
      
      const currentPrompt = img.reprocessPrompt || prompt;
      
      await saveToMemory({
        id: memoryId,
        timestamp: Date.now(),
        prompt: currentPrompt,
        systemInstruction,
        status: 'pending',
        originalImage: originalBase64,
        settings: { prompt: currentPrompt, resolution, model, aspectRatio }
      });

      const hasAnalysis = currentPrompt.includes("### ANALYSIS RECOMMENDATIONS:");
      setImages(prev => prev.map(i => i.id === img.id ? { 
        ...i, 
        status: 'processing',
        usedAnalysis: hasAnalysis,
        finalPrompt: currentPrompt
      } : i));

      try {
        if (isBatchMode) {
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        }

        const result = await beautifyImage(
          originalBase64, 
          currentPrompt, 
          resolution, 
          model, 
          aspectRatio, 
          systemInstruction, 
          tier,
          opMode,
          mediaType,
          veoOption,
          imageModelOption
        );
        
        let finalResult = result;
        if (mediaType === 'image') {
          try {
            const exifObj = piexif.load(originalBase64);
            const exifStr = piexif.dump(exifObj);
            finalResult = piexif.insert(exifStr, result);
          } catch (e) {
            console.warn("Could not transfer EXIF data:", e);
          }
        }

        const updatedImg: ImageFile = {
          ...img,
          status: 'completed',
          resultPreview: await dataUrlToBlobUrl(finalResult),
          memoryId,
          mediaType
        };

        setProcessedCount(prev => prev + 1);

        await saveToMemory({
          id: memoryId,
          timestamp: Date.now(),
          prompt,
          systemInstruction,
          status: 'completed',
          originalImage: originalBase64,
          editedImage: finalResult,
          settings: { prompt, resolution, model, aspectRatio }
        });

        if (user) debouncedSync(user.uid);

        updateNetworkLog(logId, 'success', `Successfully processed ${img.file.name}`);
        setImages(prev => prev.map(i => i.id === img.id ? updatedImg : i));
        return updatedImg;
      } catch (error: any) {
        console.error(error);
        const errorMsg = error.message || 'Failed to process';
        
        await saveToMemory({
          id: memoryId,
          timestamp: Date.now(),
          prompt,
          status: 'error',
          error: errorMsg,
          originalImage: originalBase64,
          settings: { prompt, resolution, model }
        });

        if (user) debouncedSync(user.uid);

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
    let queueIndex = 0;
    const getNextImage = () => {
      if (queueIndex < imagesToProcess.length) {
        return imagesToProcess[queueIndex++];
      }
      return null;
    };

    const workerCount = Math.min(concurrencyLimit, imagesToProcess.length);
    const workers = Array(workerCount).fill(null).map(async (_, index) => {
      await new Promise(resolve => setTimeout(resolve, index * 600));
      while (true) {
        const img = getNextImage();
        if (!img) break;
        try {
          const updatedImg = await processImage(img);
          if (updatedImg?.status === 'completed') {
            successfullyProcessed.push(updatedImg);
          }
        } catch (err) {
          console.error("Worker error processing image:", err);
        }
      }
    });
    await Promise.all(workers);

    const batchImages = successfullyProcessed;
    if (batchImages.length > 0) {
      const timestamp = Date.now();
      const defaultTitle = `Batch - ${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      const batchThumbnails: string[] = [];
      const localMemory = await getMemory();
      for (const img of batchImages.slice(0, 4)) {
        const memoryMatch = localMemory.find(m => m.id === (img.memoryId || img.id));
        if (memoryMatch?.editedThumbnail) {
          batchThumbnails.push(memoryMatch.editedThumbnail);
        } else if (img.resultPreview) {
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
        prompt,
        systemInstruction,
        tags: ['enhanced']
      });
      if (batchImages.length === images.length) {
        setPropertyAddress(''); 
      }
    }

    setIsProcessing(false);
  }, [images, isProcessing, prompt, resolution, model, aspectRatio, fileToBase64, concurrencyLimit, systemInstruction, isBatchMode, propertyAddress, tier, opMode, mediaType, veoOption, imageModelOption, addNetworkLog, updateNetworkLog, dataUrlToBlobUrl, user, debouncedSync]);

  const setReprocessPrompt = useCallback((prompt: string, imgId?: string) => {
    const id = imgId || selectedImage?.id;
    if (!id) return;
    setImages(prev => prev.map(img => img.id === id ? { ...img, reprocessPrompt: prompt } : img));
    if (selectedImage?.id === id) {
      setSelectedImage(prev => prev ? { ...prev, reprocessPrompt: prompt } : null);
    }
  }, [selectedImage]);

  const reprocessSingle = useCallback(async (createNewVariation: boolean = false) => {
    if (!selectedImage || selectedImage.status === 'processing') return;
    
    const currentPrompt = selectedImage.reprocessPrompt || prompt;
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
      let base64: string;
      if (refineSource === 'result' && selectedImage.memoryId) {
        const fullItem = await getFullMemoryItem(selectedImage.memoryId);
        if (fullItem?.editedImage) {
          base64 = fullItem.editedImage;
        } else {
          base64 = await fileToBase64(selectedImage.file);
        }
      } else {
        base64 = await fileToBase64(selectedImage.file);
      }

      const result = await beautifyImage(
        base64, 
        currentPrompt, 
        resolution, 
        model, 
        aspectRatio, 
        systemInstruction, 
        tier,
        opMode,
        mediaType,
        veoOption,
        imageModelOption
      );
      
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
        memoryId,
        mediaType
      };
      
      setImages(prev => prev.map(img => img.id === targetId ? updatedImg : img));
      setSelectedImage(updatedImg);
      
      await saveToMemory({
        id: memoryId,
        timestamp: Date.now(),
        prompt: currentPrompt,
        systemInstruction,
        originalImage: base64,
        editedImage: result,
        settings: { prompt: currentPrompt, resolution, model }
      });
      
      if (user) debouncedSync(user.uid);
      
    } catch (error) {
      console.error(error);
      setImages(prev => prev.map(img => 
        img.id === targetId ? { ...img, status: 'error', error: 'Failed to re-process' } : img
      ));
    }
  }, [selectedImage, prompt, refineSource, resolution, model, aspectRatio, fileToBase64, systemInstruction, tier, opMode, mediaType, veoOption, imageModelOption, dataUrlToBlobUrl, user, debouncedSync]);

  const downloadAll = async () => {
    const zip = new JSZip();
    const completedImages = images.filter(img => img.status === 'completed' && img.resultPreview);
    
    for (const img of completedImages) {
      if (!img.resultPreview) continue;
      const response = await fetch(img.resultPreview);
      const blob = await response.blob();
      
      const originalName = img.file.name || 'file';
      const dotIndex = originalName.lastIndexOf('.');
      const nameWithoutExt = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
      let origExt = dotIndex !== -1 ? originalName.substring(dotIndex) : '';
      const isVideo = img.mediaType === 'video' || blob.type.startsWith('video/') || img.file.type?.startsWith('video/');
      let ext = isVideo ? '.mp4' : (origExt || '.jpg');
      if (isVideo && origExt && origExt.match(/\.(mp4|webm|mov|mkv|avi)$/i)) {
        ext = origExt;
      }
      
      zip.file(`${nameWithoutExt}${suffix}${ext}`, blob);
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const zipName = mediaType === 'video' ? 'processed_real_estate_videos.zip' : 'processed_real_estate_photos.zip';
    saveAs(content, zipName);
  };

  const downloadBatch = async (batch: Batch) => {
    const zip = new JSZip();
    addNetworkLog('Batch Download', `Preparing ${batch.imageIds.length} items...`);
    
    let foundCount = 0;
    for (const id of batch.imageIds) {
      const fullItem = await getFullMemoryItem(id);
      if (fullItem && fullItem.editedImage) {
        const base64Data = fullItem.editedImage.split(',')[1];
        const isVideo = fullItem.mediaType === 'video' || fullItem.editedImage.startsWith('data:video/');
        const ext = isVideo ? 'mp4' : 'jpg';
        zip.file(`enhanced_${id.slice(0, 8)}.${ext}`, base64Data, { base64: true });
        foundCount++;
      }
    }
    
    if (foundCount === 0) {
      alert("No full-size items found for this batch in your local cache or cloud.");
      return;
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${batch.title.replace(/[^\w]/g, '_')}_results.zip`);
  };

  const handleSaveFavorite = async () => {
    if (!favoriteName.trim()) return;
    
    await saveFavoritePrompt({
      id: crypto.randomUUID(),
      name: favoriteName.trim(),
      prompt: pendingFavoritePrompt,
      systemInstruction: pendingFavoriteSystem,
      timestamp: Date.now()
    });
    
    setShowNamingFavorite(false);
    setFavoriteName('');
  };

  return {
    images, setImages,
    isMounted,
    prompt, setPrompt,
    resolution, setResolution,
    aspectRatio, setAspectRatio,
    suffix, setSuffix,
    isProcessing,
    memory, setMemory,
    showMemory, setShowMemory,
    showSettings, setShowSettings,
    selectedImage, setSelectedImage,
    setReprocessPrompt,
    refineSource, setRefineSource,
    user, setUser,
    isAuthLoading,
    isQuotaExceeded,
    showQuotaBanner,
    setShowQuotaBanner: (val: boolean) => {
      setShowQuotaBanner(val);
      if (val === false) setHasDismissedQuotaBanner(true);
    },
    handleRetrySync,
    concurrencyLimit, setConcurrencyLimit,
    isBatchMode, setIsBatchMode,
    tier, setTier,
    opMode, setOpMode,
    mediaType, setMediaType,
    veoOption, setVeoOption,
    imageModelOption, setImageModelOption,
    systemInstruction, setSystemInstruction,
    favorites, setFavorites,
    showFavorites, setShowFavorites,
    showRecentPrompts, setShowRecentPrompts,
    processedCount,
    totalToProcess,
    galleryFilter, setGalleryFilter,
    autoAnalyzeOnUpload, setAutoAnalyzeOnUpload,
    showSettingsDrawer, setShowSettingsDrawer,
    showPromptPreview, setShowPromptPreview,
    showSlider, setShowSlider,
    analysisResult, setAnalysisResult,
    isAnalyzing, setIsAnalyzing,
    networkLog, setNetworkLog,
    batches, setBatches,
    propertyAddress, setPropertyAddress,
    historyTab, setHistoryTab,
    showAddressPrompt, setShowAddressPrompt,
    showNamingFavorite, setShowNamingFavorite,
    favoriteName, setFavoriteName,
    pendingFavoritePrompt, setPendingFavoritePrompt,
    pendingFavoriteSystem, setPendingFavoriteSystem,
    pendingImages, setPendingImages,
    importInputRef,
    addNetworkLog,
    updateNetworkLog,
    dataUrlToBlobUrl,
    cycleResolution,
    fileToBase64,
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
    isDriveLinked,
    filteredImages,
    setIsQuotaExceeded,
    setNamingFavoriteType
  };
}
