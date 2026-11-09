'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  beautifyImage, 
  analyzeImage, 
  improvePrompt,
  ImageResolution, 
  ImageModel, 
  ProcessingTier, 
  OperationMode, 
  MediaType, 
  VeoOption, 
  VideoModel,
  ImageModelOption,
  CharacterContextImage,
  ReferenceAnchor,
  StudioDomain,
  DOMAIN_DEFAULTS
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
  subscribeToBatches,
  isQuotaExceededCached,
  setQuotaExceededCached,
  QUOTA_EXCEEDED_EVENT
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
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'error';
  result?: string;
  resultPreview?: string;
  error?: string;
  isFavorite?: boolean;
  isReferenceAnchor?: boolean;
  analysis?: string;
  isAnalyzing?: boolean;
  usedAnalysis?: boolean;
  finalPrompt?: string;
  memoryId?: string;
  mediaType?: MediaType;
  reprocessPrompt?: string;
  title?: string;
  textOverlay?: string;
  concept?: string;
}

export interface QueueJob {
  taskId: string;
  imageId: string;
  type: 'enhance' | 'create' | 'refine';
  prompt: string;
  systemInstruction?: string;
  resolution: ImageResolution;
  aspectRatio: any;
  tier: ProcessingTier;
  opMode: OperationMode;
  mediaType: MediaType;
  veoOption: VeoOption;
  videoModel: VideoModel;
  choreography?: string;
  referenceAnchor?: ReferenceAnchor | null;
  imageModelOption: ImageModelOption;
  domain?: StudioDomain;
  sourceType?: 'original' | 'result';
  sourceBase64?: string;
  title?: string;
  textOverlay?: string;
  concept?: string;
}

export function useREBE() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [prompt, setPrompt] = useState<string>(DOMAIN_DEFAULTS.arch.prompt);
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
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(() => isQuotaExceededCached());
  const [lastQuotaCheck, setLastQuotaCheck] = useState(0);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [showQuotaBanner, setShowQuotaBanner] = useState(true);
  const [hasDismissedQuotaBanner, setHasDismissedQuotaBanner] = useState(false);

  // Sync quota exceeded state from memory event
  useEffect(() => {
    const handleQuota = () => {
      setIsQuotaExceeded(true);
      if (!hasDismissedQuotaBanner) setShowQuotaBanner(true);
    };
    window.addEventListener(QUOTA_EXCEEDED_EVENT, handleQuota);
    return () => window.removeEventListener(QUOTA_EXCEEDED_EVENT, handleQuota);
  }, [hasDismissedQuotaBanner]);
  const [studioDomain, setStudioDomain] = useState<StudioDomain>('arch');
  const [concurrencyLimit, setConcurrencyLimit] = useState(3);
  const [isBatchMode, setIsBatchMode] = useState(true);
  const [tier, setTier] = useState<ProcessingTier>('flex');
  const [opMode, setOpMode] = useState<OperationMode>('edit');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [videoModel, setVideoModel] = useState<VideoModel>('pvid');
  const [veoOption, setVeoOption] = useState<VeoOption>('pvid');
  const [choreography, setChoreography] = useState<string>('');
  const [referenceAnchor, setReferenceAnchor] = useState<ImageFile | null>(null);
  const [showDirectorDrawer, setShowDirectorDrawer] = useState(false);
  const [imageModelOption, setImageModelOption] = useState<ImageModelOption>('flash');
  const [systemInstruction, setSystemInstruction] = useState<string>(DOMAIN_DEFAULTS.arch.systemInstruction);

  const handleSwitchDomain = useCallback((newDomain: StudioDomain) => {
    setStudioDomain(newDomain);
    const defaults = DOMAIN_DEFAULTS[newDomain];
    if (defaults) {
      setPrompt(defaults.prompt);
      setSystemInstruction(defaults.systemInstruction);
    }
    setChoreography('');
  }, []);
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
  const [showBatchPromptModal, setShowBatchPromptModal] = useState(false);
  const [showCharacterDrawer, setShowCharacterDrawer] = useState(false);
  const [characterContextImages, setCharacterContextImages] = useState<CharacterContextImage[]>([]);
  const [characterContextEnabled, setCharacterContextEnabled] = useState(true);
  const [characterName, setCharacterName] = useState('');
  const [characterNotes, setCharacterNotes] = useState('');

  // Load Character Context from LocalStorage on mount
  useEffect(() => {
    try {
      const savedContext = localStorage.getItem('rebe_character_context_v1');
      if (savedContext) {
        const parsed = JSON.parse(savedContext);
        if (Array.isArray(parsed)) {
          setCharacterContextImages(parsed.slice(0, 4));
        }
      }
      const savedEnabled = localStorage.getItem('rebe_character_enabled_v1');
      if (savedEnabled !== null) {
        setCharacterContextEnabled(savedEnabled === 'true');
      }
      const savedName = localStorage.getItem('rebe_character_name_v1');
      if (savedName) setCharacterName(savedName);
      const savedNotes = localStorage.getItem('rebe_character_notes_v1');
      if (savedNotes) setCharacterNotes(savedNotes);
    } catch (e) {
      console.warn("Failed to load character context from localStorage:", e);
    }
  }, []);

  // Save Character Context to LocalStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('rebe_character_context_v1', JSON.stringify(characterContextImages));
      localStorage.setItem('rebe_character_enabled_v1', characterContextEnabled ? 'true' : 'false');
      localStorage.setItem('rebe_character_name_v1', characterName);
      localStorage.setItem('rebe_character_notes_v1', characterNotes);
    } catch (e) {
      console.warn("Failed to save character context to localStorage:", e);
    }
  }, [characterContextImages, characterContextEnabled, characterName, characterNotes]);
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
    setQuotaExceededCached(false);
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

  const handleAnalyzeSelected = useCallback(async (selectedIds: string[]) => {
    if (!selectedIds || selectedIds.length === 0) return;
    const imagesToAnalyze = images.filter(img => selectedIds.includes(img.id) && !img.analysis && !img.isAnalyzing);
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
  }, [images.length]);

  const removeImage = (id: string) => {
    const imgToRemove = images.find(img => img.id === id);
    if (imgToRemove?.resultPreview) {
      URL.revokeObjectURL(imgToRemove.resultPreview);
    }
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) setSelectedImage(null);
  };

  // Asynchronous Task Queue state and worker management
  const queueRef = useRef<QueueJob[]>([]);
  const activeWorkersRef = useRef<number>(0);

  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);

  const handleImprovePrompt = useCallback(async (
    inputPrompt: string, 
    mode: 'create' | 'edit' = 'create', 
    category: string = 'general'
  ): Promise<string> => {
    if (!inputPrompt || !inputPrompt.trim()) return inputPrompt;
    setIsImprovingPrompt(true);
    try {
      const improved = await improvePrompt(inputPrompt, mode, category);
      return improved;
    } catch (e) {
      console.error("Failed to improve prompt:", e);
      return inputPrompt;
    } finally {
      setIsImprovingPrompt(false);
    }
  }, []);

  const runQueue = useCallback(async () => {
    if (queueRef.current.length === 0) return;

    while (activeWorkersRef.current < concurrencyLimit && queueRef.current.length > 0) {
      const job = queueRef.current.shift();
      if (!job) break;

      activeWorkersRef.current++;

      // Launch async worker for this individual job
      (async (currentJob: QueueJob) => {
        const targetId = currentJob.imageId;
        const logId = addNetworkLog(
          currentJob.type === 'create' ? 'Prompt Generation' : 'Image Enhancement',
          `Processing ${currentJob.title || 'photo'}...`
        );

        // Update image status to 'processing'
        setImages(prev => prev.map(img => 
          img.id === targetId ? { 
            ...img, 
            status: 'processing', 
            finalPrompt: currentJob.prompt,
            error: undefined 
          } : img
        ));
        setSelectedImage(prev => prev && prev.id === targetId ? { ...prev, status: 'processing', finalPrompt: currentJob.prompt, error: undefined } : prev);

        try {
          const memoryId = crypto.randomUUID();
          let base64 = currentJob.sourceBase64 || "";

          if (currentJob.type !== 'create' && !base64) {
            const currentImg = imagesRef.current.find(i => i.id === targetId);
            if (currentJob.sourceType === 'result' && currentImg?.memoryId) {
              const fullItem = await getFullMemoryItem(currentImg.memoryId);
              base64 = fullItem?.editedImage || (currentImg.file ? await fileToBase64(currentImg.file) : "");
            } else if (currentImg?.file) {
              base64 = await fileToBase64(currentImg.file);
            }
          }

          const activeContext = characterContextEnabled 
            ? (characterContextImages || []).filter(c => c && (c.base64 || (c as any).base64Data) && c.enabled !== false) 
            : [];

          const isCreateMode = currentJob.type === 'create' || currentJob.opMode === 'create' || !base64;

          const result = await beautifyImage(
            base64,
            currentJob.prompt,
            currentJob.resolution,
            'nano-2',
            currentJob.aspectRatio,
            currentJob.systemInstruction,
            currentJob.tier,
            isCreateMode ? 'create' : 'edit',
            currentJob.mediaType,
            currentJob.videoModel || currentJob.veoOption || 'omni',
            currentJob.imageModelOption,
            activeContext,
            3,
            currentJob.videoModel || 'pvid',
            currentJob.choreography,
            currentJob.referenceAnchor,
            currentJob.domain || studioDomain
          );

          let finalResult = result;
          if (base64 && currentJob.mediaType === 'image') {
            try {
              const exifObj = piexif.load(base64);
              const exifStr = piexif.dump(exifObj);
              finalResult = piexif.insert(exifStr, result);
            } catch (e) {
              console.warn("Could not transfer EXIF data:", e);
            }
          }

          const blobUrl = await dataUrlToBlobUrl(finalResult);
          
          const existingImg = imagesRef.current.find(i => i.id === targetId);
          const updatedImg: ImageFile = {
            ...(existingImg || {
              id: targetId,
              file: new File([], (currentJob.title || 'generated') + '.png', { type: 'image/png' }),
              preview: blobUrl,
            }),
            id: targetId,
            status: 'completed',
            finalPrompt: currentJob.prompt,
            resultPreview: blobUrl,
            result: finalResult,
            memoryId,
            mediaType: currentJob.mediaType
          };

          setImages(prev => prev.map(img => img.id === targetId ? updatedImg : img));
          
          // Non-blocking & zero focus hijacking: only update selectedImage IF user is still viewing this exact image
          setSelectedImage(prev => prev && prev.id === targetId ? updatedImg : prev);
          setProcessedCount(prev => prev + 1);

          await saveToMemory({
            id: memoryId,
            timestamp: Date.now(),
            prompt: currentJob.prompt,
            title: currentJob.title,
            textOverlay: currentJob.textOverlay,
            concept: currentJob.concept,
            systemInstruction: currentJob.systemInstruction,
            status: 'completed',
            originalImage: base64,
            editedImage: finalResult,
            settings: { prompt: currentJob.prompt, resolution: currentJob.resolution, model, aspectRatio: currentJob.aspectRatio }
          });

          if (user) debouncedSync(user.uid);
          updateNetworkLog(logId, 'success', `Successfully processed ${currentJob.title || 'item'}`);

        } catch (err: any) {
          console.error("Queue task error for image:", targetId, err);
          const errMsg = err.message || 'Processing failed';
          
          setImages(prev => prev.map(img => 
            img.id === targetId ? { ...img, status: 'error', error: errMsg } : img
          ));
          setSelectedImage(prev => prev && prev.id === targetId ? { ...prev, status: 'error', error: errMsg } : prev);
          updateNetworkLog(logId, 'error', `Failed ${currentJob.title || 'item'}: ${errMsg}`);
        } finally {
          activeWorkersRef.current--;
          runQueue();
        }
      })(job);
    }
  }, [concurrencyLimit, characterContextEnabled, characterContextImages, fileToBase64, dataUrlToBlobUrl, user, debouncedSync, addNetworkLog, updateNetworkLog, studioDomain]);

  const enqueueJobs = useCallback((jobs: QueueJob[]) => {
    if (jobs.length === 0) return;
    queueRef.current.push(...jobs);
    setTotalToProcess(prev => prev + jobs.length);
    runQueue();
  }, [runQueue]);

  const processBatch = useCallback(async (selectedIds?: string[]) => {
    const targetImages = images.filter(img => 
      selectedIds && selectedIds.length > 0 
        ? selectedIds.includes(img.id) && img.status !== 'processing' && img.status !== 'queued'
        : img.status !== 'completed' && img.status !== 'processing' && img.status !== 'queued'
    );
    if (targetImages.length === 0) return;

    // Immediately mark target images as queued in UI
    setImages(prev => prev.map(img => 
      targetImages.some(t => t.id === img.id) ? { ...img, status: 'queued', error: undefined } : img
    ));

    const refAnchorParam: ReferenceAnchor | null = referenceAnchor ? {
      id: referenceAnchor.id,
      name: referenceAnchor.title || referenceAnchor.file?.name || 'Anchor',
      base64: referenceAnchor.result || referenceAnchor.preview || '',
      preview: referenceAnchor.resultPreview || referenceAnchor.preview
    } : null;

    const jobs: QueueJob[] = targetImages.map(img => ({
      taskId: crypto.randomUUID(),
      imageId: img.id,
      type: 'enhance',
      prompt: img.reprocessPrompt || prompt,
      systemInstruction,
      resolution,
      aspectRatio,
      tier,
      opMode: 'edit',
      mediaType: img.mediaType || mediaType,
      veoOption,
      videoModel,
      choreography,
      referenceAnchor: refAnchorParam,
      imageModelOption,
      domain: studioDomain,
      title: img.title || img.file.name,
      textOverlay: img.textOverlay,
      concept: img.concept
    }));

    enqueueJobs(jobs);
  }, [images, prompt, systemInstruction, resolution, aspectRatio, tier, mediaType, veoOption, videoModel, choreography, referenceAnchor, imageModelOption, studioDomain, enqueueJobs]);

  const generateBatchPrompts = useCallback(async (
    items: Array<{ id?: string; title?: string; concept?: string; visualPrompt: string; textOverlay?: string; aspectRatio?: any }>,
    batchTitle: string = "Batch Generation"
  ) => {
    if (items.length === 0) return;

    const newImageFiles: ImageFile[] = items.map((item, index) => {
      const id = item.id || `prompt-gen-${Date.now()}-${index}`;
      const safeTitle = (item.title || `Prompt ${index + 1}`).replace(/[<>&"]/g, '');
      const safeOverlay = (item.textOverlay || '').replace(/[<>&"]/g, '');
      const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#18181b"/><text x="400" y="270" font-family="sans-serif" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">${safeTitle}</text><text x="400" y="315" font-family="sans-serif" font-size="15" fill="#a1a1aa" text-anchor="middle">Queued in Task Queue</text>${safeOverlay ? `<text x="400" y="360" font-family="sans-serif" font-size="13" fill="#fbbf24" text-anchor="middle">"${safeOverlay.slice(0, 48)}..."</text>` : ''}</svg>`;
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const dummyFile = new File([blob], `${item.title || `prompt_${index + 1}`}.png`, { type: 'image/png' });
      const previewUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`;

      return {
        id,
        file: dummyFile,
        preview: previewUrl,
        status: 'queued' as const,
        finalPrompt: item.visualPrompt,
        reprocessPrompt: item.visualPrompt,
        title: item.title || `Prompt ${index + 1}`,
        textOverlay: item.textOverlay,
        concept: item.concept || batchTitle,
        mediaType: 'image' as const
      };
    });

    setImages(prev => [...prev, ...newImageFiles]);

    const refAnchorParam: ReferenceAnchor | null = referenceAnchor ? {
      id: referenceAnchor.id,
      name: referenceAnchor.title || referenceAnchor.file?.name || 'Anchor',
      base64: referenceAnchor.result || referenceAnchor.preview || '',
      preview: referenceAnchor.resultPreview || referenceAnchor.preview
    } : null;

    const jobs: QueueJob[] = newImageFiles.map((img, idx) => ({
      taskId: crypto.randomUUID(),
      imageId: img.id,
      type: 'create',
      prompt: items[idx].visualPrompt,
      systemInstruction,
      resolution,
      aspectRatio: items[idx].aspectRatio || aspectRatio || '1:1',
      tier,
      opMode: 'create',
      mediaType: 'image',
      veoOption,
      videoModel,
      choreography,
      referenceAnchor: refAnchorParam,
      imageModelOption,
      domain: studioDomain,
      title: img.title,
      textOverlay: img.textOverlay,
      concept: img.concept
    }));

    enqueueJobs(jobs);
  }, [aspectRatio, resolution, systemInstruction, tier, veoOption, videoModel, choreography, referenceAnchor, imageModelOption, studioDomain, enqueueJobs]);

  const generateTextToImage = useCallback(async (count: number = 1, customPrompt?: string, targetRatio?: any) => {
    const promptToUse = (customPrompt || prompt).trim();
    if (!promptToUse) return;

    const items = Array.from({ length: Math.max(1, Math.min(count, 8)) }, (_, i) => ({
      title: count > 1 ? `Creation ${i + 1}` : 'Generative Creation',
      visualPrompt: promptToUse,
      concept: 'Text-to-Image Creation',
      aspectRatio: targetRatio || aspectRatio
    }));

    const title = count > 1 
      ? `Text-to-Image Batch (${count}) - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : `Text-to-Image Creation - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    await generateBatchPrompts(items, title);
  }, [prompt, aspectRatio, generateBatchPrompts]);

  const setReprocessPrompt = useCallback((prompt: string, imgId?: string) => {
    const id = imgId || selectedImage?.id;
    if (!id) return;
    setImages(prev => prev.map(img => img.id === id ? { ...img, reprocessPrompt: prompt } : img));
    if (selectedImage?.id === id) {
      setSelectedImage(prev => prev ? { ...prev, reprocessPrompt: prompt } : null);
    }
  }, [selectedImage]);

  const reprocessSingle = useCallback(async (
    createNewVariation: boolean = false,
    imgId?: string,
    customPrompt?: string
  ) => {
    const targetId = imgId || selectedImage?.id;
    if (!targetId) return;

    const targetImg = imagesRef.current.find(i => i.id === targetId) || (selectedImage?.id === targetId ? selectedImage : null);
    if (!targetImg) return;

    const currentPrompt = customPrompt || targetImg.reprocessPrompt || targetImg.finalPrompt || prompt;
    const finalTargetId = createNewVariation ? crypto.randomUUID() : targetId;

    if (createNewVariation) {
      const newImg: ImageFile = {
        ...targetImg,
        id: finalTargetId,
        status: 'queued',
        finalPrompt: currentPrompt,
        reprocessPrompt: currentPrompt,
        resultPreview: undefined,
        result: undefined,
        analysis: undefined,
        memoryId: undefined
      };
      setImages(prev => [newImg, ...prev]);
      setSelectedImage(newImg);
    } else {
      setImages(prev => prev.map(img => 
        img.id === finalTargetId ? { 
          ...img, 
          status: 'queued', 
          finalPrompt: currentPrompt,
          error: undefined
        } : img
      ));
      setSelectedImage(prev => prev && prev.id === finalTargetId ? { ...prev, status: 'queued', finalPrompt: currentPrompt, error: undefined } : prev);
    }

    const isCreateMode = opMode === 'create' || !targetImg.file || targetImg.file.name.endsWith('.svg') || (targetImg.preview && targetImg.preview.startsWith('data:image/svg'));

    const refAnchorParam: ReferenceAnchor | null = referenceAnchor ? {
      id: referenceAnchor.id,
      name: referenceAnchor.title || referenceAnchor.file?.name || 'Anchor',
      base64: referenceAnchor.result || referenceAnchor.preview || '',
      preview: referenceAnchor.resultPreview || referenceAnchor.preview
    } : null;

    const job: QueueJob = {
      taskId: crypto.randomUUID(),
      imageId: finalTargetId,
      type: isCreateMode ? 'create' : 'refine',
      prompt: currentPrompt,
      systemInstruction,
      resolution,
      aspectRatio,
      tier,
      opMode: isCreateMode ? 'create' : 'edit',
      mediaType: targetImg.mediaType || mediaType,
      veoOption,
      videoModel,
      choreography,
      referenceAnchor: refAnchorParam,
      imageModelOption,
      domain: studioDomain,
      sourceType: refineSource,
      title: targetImg.title,
      textOverlay: targetImg.textOverlay,
      concept: targetImg.concept
    };

    enqueueJobs([job]);
  }, [selectedImage, prompt, systemInstruction, resolution, aspectRatio, tier, opMode, mediaType, veoOption, videoModel, choreography, referenceAnchor, imageModelOption, studioDomain, refineSource, enqueueJobs]);

  const toggleReferenceAnchor = useCallback((img: ImageFile) => {
    setReferenceAnchor(prev => (prev?.id === img.id ? null : img));
  }, []);

  const pullTriggerPlate = useCallback((targetPrompt: string, targetAspectRatio?: string, targetModel?: string) => {
    setPrompt(targetPrompt);
    setMediaType('image');
    if (targetAspectRatio && targetAspectRatio !== 'auto') {
      setAspectRatio(targetAspectRatio);
    }
    if (targetModel === 'lite' || targetModel === 'flash') {
      setImageModelOption(targetModel as ImageModelOption);
    }

    if (imagesRef.current.length > 0) {
      if (selectedImage?.id) {
        reprocessSingle(false, selectedImage.id, targetPrompt);
      } else {
        processBatch();
      }
    } else {
      setOpMode('create');
      generateTextToImage(1, targetPrompt, targetAspectRatio);
    }
  }, [selectedImage, reprocessSingle, processBatch, generateTextToImage]);

  const pullTriggerMotion = useCallback((targetPrompt: string, targetVideoModel?: string, targetChoreography?: string, targetAspectRatio?: string) => {
    setPrompt(targetPrompt);
    setMediaType('video');
    if (targetVideoModel && ['pvid', 'omni', 'h3', 'seed', 'wan3'].includes(targetVideoModel)) {
      setVideoModel(targetVideoModel as VideoModel);
    }
    if (targetChoreography) {
      setChoreography(targetChoreography);
    }
    if (targetAspectRatio && targetAspectRatio !== 'auto') {
      setAspectRatio(targetAspectRatio);
    }

    if (imagesRef.current.length > 0) {
      if (selectedImage?.id) {
        reprocessSingle(false, selectedImage.id, targetPrompt);
      } else {
        processBatch();
      }
    } else {
      setOpMode('create');
      generateTextToImage(1, targetPrompt, targetAspectRatio);
    }
  }, [selectedImage, reprocessSingle, processBatch, generateTextToImage]);

  const cancelTask = useCallback((imageId: string) => {
    queueRef.current = queueRef.current.filter(j => j.imageId !== imageId);
    setImages(prev => prev.map(img => img.id === imageId && img.status === 'queued' ? { ...img, status: 'idle' } : img));
    setSelectedImage(prev => prev && prev.id === imageId && prev.status === 'queued' ? { ...prev, status: 'idle' } : prev);
  }, []);

  const retryTask = useCallback((imageId: string) => {
    const img = imagesRef.current.find(i => i.id === imageId);
    if (!img) return;
    reprocessSingle(false, imageId);
  }, [reprocessSingle]);

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
    isProcessing: images.some(i => i.status === 'processing' || i.status === 'queued'),
    activeTasksCount: images.filter(i => i.status === 'processing').length,
    queuedTasksCount: images.filter(i => i.status === 'queued').length,
    cancelTask,
    retryTask,
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
    studioDomain, setStudioDomain,
    handleSwitchDomain,
    tier, setTier,
    opMode, setOpMode,
    mediaType, setMediaType,
    videoModel, setVideoModel,
    veoOption, setVeoOption,
    choreography, setChoreography,
    referenceAnchor, setReferenceAnchor,
    toggleReferenceAnchor,
    showDirectorDrawer, setShowDirectorDrawer,
    pullTriggerPlate,
    pullTriggerMotion,
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
    showBatchPromptModal, setShowBatchPromptModal,
    showCharacterDrawer, setShowCharacterDrawer,
    characterContextImages, setCharacterContextImages,
    characterContextEnabled, setCharacterContextEnabled,
    characterName, setCharacterName,
    characterNotes, setCharacterNotes,
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
    handleAnalyzeSelected,
    onDrop,
    removeImage,
    processBatch,
    generateBatchPrompts,
    generateTextToImage,
    reprocessSingle,
    handleImprovePrompt,
    isImprovingPrompt,
    downloadAll,
    downloadBatch,
    handleSaveFavorite,
    isDriveLinked,
    filteredImages,
    setIsQuotaExceeded,
    setNamingFavoriteType
  };
}
