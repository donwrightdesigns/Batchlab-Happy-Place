import { get, set, del } from 'idb-keyval';
import { db, auth } from '@/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, limit, onSnapshot, getDocFromServer } from 'firebase/firestore';

export interface MemoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  status?: 'pending' | 'completed' | 'error';
  error?: string;
  originalImage?: string; // Base64 (Local only)
  editedImage?: string;   // Base64 (Local only)
  originalThumbnail?: string; // Small Base64 for cloud
  editedThumbnail?: string;   // Small Base64 for cloud
  settings?: any;
  isSynced?: boolean;
  analysis?: string;
  isAnalyzing?: boolean;
  usedAnalysis?: boolean;
  finalPrompt?: string;
  systemInstruction?: string;
  mediaType?: 'image' | 'video';
  address?: string;
  tags?: string[];
}

export interface FavoritePrompt {
  id: string;
  name: string;
  prompt: string;
  systemInstruction?: string;
  timestamp: number;
}

export interface Batch {
  id: string;
  timestamp: number;
  title: string;
  address?: string;
  imageIds: string[];
  thumbnails: string[]; // Array of strings (base64 edited thumbnails)
  tags?: string[];
  isSynced?: boolean;
  prompt?: string;
  systemInstruction?: string;
}

const MEMORY_KEY = 'rebe_memory';
const BATCHES_KEY = 'rebe_batches';
const FAVORITES_KEY = 'rebe_favorites';
const SYSTEM_INST_KEY = 'rebe_system_inst';
const MEMORY_UPDATE_EVENT = 'rebe_memory_updated';
const BATCHES_UPDATE_EVENT = 'rebe_batches_updated';
const FAVORITES_UPDATE_EVENT = 'rebe_favorites_updated';

// Helper to compress base64 images for Firestore (1MB limit)
async function compressImage(base64: string, maxWidth = 1400, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality)); 
    };
    img.onerror = () => resolve(base64); // Fallback to original if error
  });
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const isQuotaExceeded = message.toLowerCase().includes('quota exceeded') || 
                          message.toLowerCase().includes('quota limit exceeded');

  const errInfo = {
    error: message,
    isQuotaExceeded,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // If it's a quota error, we might want to handle it differently in the UI
  // but we still throw so the caller knows it failed.
  throw new Error(JSON.stringify(errInfo));
}

async function prepareForCloud(item: MemoryItem): Promise<MemoryItem> {
  const cloudItem = { ...item };
  
  // Create thumbnails for cloud storage before we delete the large base64s
  if (item.originalImage && !cloudItem.originalThumbnail) {
    cloudItem.originalThumbnail = await compressImage(item.originalImage, 300, 0.4);
  }
  if (item.editedImage && !cloudItem.editedThumbnail) {
    cloudItem.editedThumbnail = await compressImage(item.editedImage, 300, 0.4);
  }

  // Remove base64 from cloud item to save space in Firestore
  delete cloudItem.originalImage;
  delete cloudItem.editedImage;
  
  return cloudItem;
}

let memoryMutex = Promise.resolve();

export async function saveToMemory(item: MemoryItem) {
  let itemToSave = { ...item };

  // Always ensure thumbnails exist for the local list view
  if (item.originalImage && !itemToSave.originalThumbnail) {
    itemToSave.originalThumbnail = await compressImage(item.originalImage, 400, 0.6);
  }
  if (item.editedImage && !itemToSave.editedThumbnail) {
    itemToSave.editedThumbnail = await compressImage(item.editedImage, 400, 0.6);
  }

  // Use a mutex to prevent race conditions on indexeddb get/set during concurrent batch processing
  await (memoryMutex = memoryMutex.then(async () => {
    // Store full images separately in local DB so we don't freeze the browser
    const imageDataKey = `image_data_${itemToSave.id}`;
    if (itemToSave.originalImage || itemToSave.editedImage) {
      // Merge with existing image data if present to avoid losing original when saving completed edited
      const existingImageData = await get<{originalImage?: string, editedImage?: string}>(imageDataKey);
      await set(imageDataKey, {
        originalImage: itemToSave.originalImage || existingImageData?.originalImage,
        editedImage: itemToSave.editedImage || existingImageData?.editedImage
      });
      // Remove base64 from main list to save extreme RAM usage
      delete itemToSave.originalImage;
      delete itemToSave.editedImage;
    }

    // Save to local storage (FAST - no network)
    const currentMemory = (await get<MemoryItem[]>(MEMORY_KEY)) || [];
    const existingIndex = currentMemory.findIndex(m => m.id === itemToSave.id);
    
    let updatedMemory: MemoryItem[];
    if (existingIndex !== -1) {
      updatedMemory = [...currentMemory];
      updatedMemory[existingIndex] = { ...updatedMemory[existingIndex], ...itemToSave };
    } else {
      updatedMemory = [itemToSave, ...currentMemory].slice(0, 100); // More history
    }
    
    await set(MEMORY_KEY, updatedMemory);
    
    // Notify local listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MEMORY_UPDATE_EVENT, { detail: updatedMemory }));
    }
  }).catch(e => console.error(e)));
}

export async function getMemory(): Promise<MemoryItem[]> {
  return (await get<MemoryItem[]>(MEMORY_KEY)) || [];
}

export function subscribeToLocalMemory(callback: (items: MemoryItem[]) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: any) => callback(e.detail);
  window.addEventListener(MEMORY_UPDATE_EVENT, handler);
  return () => window.removeEventListener(MEMORY_UPDATE_EVENT, handler);
}

export async function saveBatch(batch: Batch) {
  let batchToSave = { ...batch };

  if (auth.currentUser) {
    const path = `users/${auth.currentUser.uid}/batches`;
    try {
      await setDoc(doc(db, path, batch.id), batchToSave);
      batchToSave.isSynced = true;
    } catch (error) {
      console.warn("Firestore batch save failed:", error);
    }
  }

  const currentBatches = (await get<Batch[]>(BATCHES_KEY)) || [];
  const existingIndex = currentBatches.findIndex(b => b.id === batchToSave.id);
  
  let updatedBatches: Batch[];
  if (existingIndex !== -1) {
    updatedBatches = [...currentBatches];
    updatedBatches[existingIndex] = { ...updatedBatches[existingIndex], ...batchToSave };
  } else {
    updatedBatches = [batchToSave, ...currentBatches].slice(0, 30);
  }
  
  await set(BATCHES_KEY, updatedBatches);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BATCHES_UPDATE_EVENT, { detail: updatedBatches }));
  }
}

export async function getBatches(): Promise<Batch[]> {
  return (await get<Batch[]>(BATCHES_KEY)) || [];
}

export async function getCloudBatches(userId: string): Promise<Batch[]> {
  const path = `users/${userId}/batches`;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(30));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Batch);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToBatches(userId: string | null, callback: (items: Batch[]) => void, onError?: (error: any) => void) {
  if (typeof window === 'undefined') return () => {};
  
  const localHandler = (e: any) => {
    if (!userId) callback(e.detail);
  };
  window.addEventListener(BATCHES_UPDATE_EVENT, localHandler);

  let unsubscribeFirestore = () => {};
  if (userId) {
    const path = `users/${userId}/batches`;
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(30));
    unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as Batch);
      callback(items);
    }, (error) => {
      if (error.code === 'cancelled') return;
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
        console.warn("Batch subscription error:", e.message);
      }
    });
  } else {
    getBatches().then(callback);
  }

  return () => {
    window.removeEventListener(BATCHES_UPDATE_EVENT, localHandler);
    unsubscribeFirestore();
  };
}

export async function clearMemory() {
  await del(MEMORY_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MEMORY_UPDATE_EVENT, { detail: [] }));
  }
  
  if (auth.currentUser) {
    const path = `users/${auth.currentUser.uid}/enhancements`;
    try {
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export async function getFullMemoryItem(id: string): Promise<MemoryItem | null> {
  const localMemory = await getMemory();
  const localItem = localMemory.find(m => m.id === id);
  
  if (localItem) {
    if (localItem.originalImage || localItem.editedImage) {
      return localItem; // Legacy inline image
    }
    // Try to get separate large local images first
    const localImageData = await get<{originalImage?: string, editedImage?: string}>(`image_data_${id}`);
    if (localImageData && (localImageData.originalImage || localImageData.editedImage)) {
      return { 
        ...localItem, 
        originalImage: localImageData.originalImage, 
        editedImage: localImageData.editedImage 
      };
    }
  }

  if (auth.currentUser) {
    const path = `users/${auth.currentUser.uid}/enhancements/${id}`;
    try {
      const snap = await getDocFromServer(doc(db, path));
      if (snap.exists()) return snap.data() as MemoryItem;
    } catch (e) {
      console.warn("Failed to fetch full item from cloud:", e);
    }
  }
  return localItem || null;
}

export async function getCloudMemory(userId: string): Promise<MemoryItem[]> {
  const path = `users/${userId}/enhancements`;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MemoryItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToMemory(userId: string, callback: (items: MemoryItem[]) => void, onError?: (error: any) => void) {
  const path = `users/${userId}/enhancements`;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    get<MemoryItem[]>(MEMORY_KEY).then(localMemory => {
      const cloudItems = snapshot.docs.map(doc => doc.data() as MemoryItem);
      const cloudIds = new Set(cloudItems.map(i => i.id));
      
      const localMemoryArray = localMemory || [];
      const localMemoryMap = new Map(localMemoryArray.map(item => [item.id, item]));
      
      // Combine cloud items with local-only items
      const enrichedCloudItems = cloudItems.map(cloudItem => {
         const localMatch = localMemoryMap.get(cloudItem.id);
         if (localMatch) {
            return {
               ...cloudItem,
               originalThumbnail: localMatch.originalThumbnail || cloudItem.originalThumbnail,
               editedThumbnail: localMatch.editedThumbnail || cloudItem.editedThumbnail
            };
         }
         return cloudItem;
      });

      const localOnlyItems = localMemoryArray.filter(item => !cloudIds.has(item.id));
      
      // Merge and sort by timestamp
      const allItems = [...enrichedCloudItems, ...localOnlyItems].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      callback(allItems.slice(0, 100));
    }).catch(() => {
      const cloudItems = snapshot.docs.map(doc => doc.data() as MemoryItem);
      callback(cloudItems);
    });
  }, (error) => {
    // Ignore cancelled errors which are often just idle stream disconnects
    if (error.code === 'cancelled') return;
    
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (e) {
      if (onError) onError(e);
    }
  });
}

export async function syncLocalToFirestore(userId: string) {
  const localMemory = (await get<MemoryItem[]>(MEMORY_KEY)) || [];
  const path = `users/${userId}/enhancements`;
  let localUpdated = false;
  
  // Sync in batches to avoid overwhelming the connection
  for (let i = 0; i < localMemory.length; i++) {
    const item = localMemory[i];
    
    // SKIP if already synced to Firestore
    if (item.isSynced) continue;

    try {
      // Re-hydrate the full images for syncing
      let fullItemToSync = { ...item };
      const localImageData = await get<{originalImage?: string, editedImage?: string}>(`image_data_${item.id}`);
      if (localImageData) {
         fullItemToSync.originalImage = fullItemToSync.originalImage || localImageData.originalImage;
         fullItemToSync.editedImage = fullItemToSync.editedImage || localImageData.editedImage;
      }

      const cloudItem = await prepareForCloud(fullItemToSync);
      
      // Update local memory with sync status
      localMemory[i].isSynced = true;
      localUpdated = true;

      await setDoc(doc(db, path, item.id), cloudItem);
    } catch (e) {
      console.warn("Failed to sync item:", item.id, e);
    }
  }

  if (localUpdated) {
    await set(MEMORY_KEY, localMemory);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(MEMORY_UPDATE_EVENT, { detail: localMemory }));
    }
  }
}

export async function saveFavoritePrompt(fav: FavoritePrompt) {
  const current = (await get<FavoritePrompt[]>(FAVORITES_KEY)) || [];
  const updated = [fav, ...current];
  await set(FAVORITES_KEY, updated);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITES_UPDATE_EVENT, { detail: updated }));
  }

  if (auth.currentUser) {
    const path = `users/${auth.currentUser.uid}/favorites`;
    try {
      await setDoc(doc(db, path, fav.id), fav);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${fav.id}`);
    }
  }
}

export async function getFavoritePrompts(): Promise<FavoritePrompt[]> {
  return (await get<FavoritePrompt[]>(FAVORITES_KEY)) || [];
}

export async function deleteFavoritePrompt(id: string) {
  const current = (await get<FavoritePrompt[]>(FAVORITES_KEY)) || [];
  const updated = current.filter(f => f.id !== id);
  await set(FAVORITES_KEY, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FAVORITES_UPDATE_EVENT, { detail: updated }));
  }

  if (auth.currentUser) {
    const path = `users/${auth.currentUser.uid}/favorites`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  }
}

export async function getCloudFavorites(userId: string): Promise<FavoritePrompt[]> {
  const path = `users/${userId}/favorites`;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as FavoritePrompt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeToFavorites(callback: (items: FavoritePrompt[]) => void, onError?: (error: any) => void) {
  if (typeof window === 'undefined') return () => {};
  
  // Load initial local favorites
  getFavoritePrompts().then(callback);
  
  const handler = (e: any) => callback(e.detail);
  window.addEventListener(FAVORITES_UPDATE_EVENT, handler);

  let unsubscribeFirestore = () => {};
  if (auth.currentUser) {
    const path = `users/${auth.currentUser.uid}/favorites`;
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as FavoritePrompt);
      callback(items);
    }, (error) => {
      if (error.code === 'cancelled') return;
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError) onError(e);
      }
    });
  }

  return () => {
    window.removeEventListener(FAVORITES_UPDATE_EVENT, handler);
    unsubscribeFirestore();
  };
}

export async function saveSystemInstruction(inst: string) {
  await set(SYSTEM_INST_KEY, inst);
  if (auth.currentUser) {
    const path = `users/${auth.currentUser.uid}/settings`;
    try {
      await setDoc(doc(db, path, 'system'), { instruction: inst });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function getSystemInstruction(): Promise<string | null> {
  if (auth.currentUser) {
    const path = `users/${auth.currentUser.uid}/settings`;
    try {
      const snap = await getDocFromServer(doc(db, path, 'system'));
      if (snap.exists()) return (snap.data() as any).instruction;
    } catch (e) {
      // Don't throw here, just fallback to local
      console.warn("Failed to fetch system instruction from cloud:", e);
    }
  }
  return (await get<string>(SYSTEM_INST_KEY)) || null;
}
