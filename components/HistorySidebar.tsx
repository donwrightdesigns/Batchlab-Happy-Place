'use client';

import React, { useRef } from 'react';
import { 
  History, 
  X, 
  Download, 
  Folder, 
  Clock, 
  Image as ImageIcon, 
  MapPin, 
  RefreshCw, 
  Upload, 
  Trash2, 
  Loader2 
} from 'lucide-react';
import { motion } from 'motion/react';
import { saveAs } from 'file-saver';
import { 
  Batch, 
  MemoryItem, 
  getFullMemoryItem, 
  clearMemory, 
  saveToMemory, 
  saveSystemInstruction 
} from '@/lib/memory';

interface HistorySidebarProps {
  setShowMemory: (show: boolean) => void;
  historyTab: 'edits' | 'batches';
  setHistoryTab: (tab: 'edits' | 'batches') => void;
  batches: Batch[];
  memory: MemoryItem[];
  downloadBatch: (batch: Batch) => void;
  dataUrlToBlobUrl: (dataUrl: string) => Promise<string>;
  setImages: (images: any[]) => void;
  setPrompt: (prompt: string) => void;
  setSystemInstruction: (inst: string) => void;
  addNetworkLog: (type: string, message: string) => string;
  updateNetworkLog: (id: string, status: 'success' | 'error', message?: string) => void;
  fileToBase64: (file: File) => Promise<string>;
  isQuotaExceeded?: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  setShowMemory,
  historyTab,
  setHistoryTab,
  batches,
  memory,
  downloadBatch,
  dataUrlToBlobUrl,
  setImages,
  setPrompt,
  setSystemInstruction,
  addNetworkLog,
  updateNetworkLog,
  fileToBase64,
  isQuotaExceeded
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
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
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] md:w-[600px] lg:w-[800px] bg-[#fcfcfc] z-50 shadow-2xl flex flex-col"
      >
        <div className="p-4 sm:p-10 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between bg-white sticky top-0 z-10 gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-2xl text-white">
                <History size={24} />
              </div>
              <div>
                <h2 className="font-display font-black text-3xl tracking-tight uppercase leading-none">WORK SESSIONS</h2>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Archived Enhancement History</p>
                  {isQuotaExceeded && (
                    <span className="text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                      Local Mode
                    </span>
                  )}
                </div>
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
                            thumb.startsWith('data:video/') || thumb.includes('blob:') ? (
                              <video src={thumb} className="w-full h-full object-cover" muted playsInline />
                            ) : (
                              <img src={thumb} alt="Preview" className="w-full h-full object-cover grayscale-[0.3] group-hover/thumb:grayscale-0 transition-all duration-700 transform group-hover/thumb:scale-110" />
                            )
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
                              const restoredImages: any[] = [];
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
                                    memoryId: m.id,
                                    mediaType: m.mediaType
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
                                const isVideo = item.mediaType === 'video' || full.originalImage.startsWith('data:video/');
                                const ext = isVideo ? 'mp4' : 'jpg';
                                saveAs(full.originalImage, `original_${item.id}.${ext}`);
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
                                const isVideo = item.mediaType === 'video' || full.editedImage.startsWith('data:video/');
                                const ext = isVideo ? 'mp4' : 'jpg';
                                saveAs(full.editedImage, `processed_${item.id}.${ext}`);
                              } else {
                                alert("Full resolution result not found.");
                              }
                            }}
                            className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Download size={10} />
                            Result
                          </button>
                          <button 
                            onClick={async () => {
                              const m = await getFullMemoryItem(item.id);
                              if (m) {
                                setImages([{
                                  id: m.id,
                                  file: new File([], 'Restored File'), 
                                  preview: m.originalThumbnail || m.originalImage || '',
                                  status: 'completed',
                                  resultPreview: m.editedImage ? await dataUrlToBlobUrl(m.editedImage) : undefined,
                                  analysis: m.analysis,
                                  usedAnalysis: m.usedAnalysis,
                                  finalPrompt: m.finalPrompt || m.prompt,
                                  memoryId: m.id,
                                  mediaType: m.mediaType
                                }]);
                                if (m.prompt) setPrompt(m.prompt);
                                if (m.systemInstruction) {
                                  setSystemInstruction(m.systemInstruction);
                                  saveSystemInstruction(m.systemInstruction);
                                }
                                setShowMemory(false);
                              }
                            }}
                            className="text-[10px] font-black uppercase text-accent hover:underline flex items-center gap-1"
                          >
                            <RefreshCw size={10} />
                            Restore
                          </button>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex-shrink-0">
                        {item.editedThumbnail || item.originalThumbnail ? (
                          (item.editedThumbnail || item.originalThumbnail)?.startsWith('data:video/') ? (
                            <video src={item.editedThumbnail || item.originalThumbnail || ''} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            <img src={item.editedThumbnail || item.originalThumbnail || ''} alt="Thumbnail" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-700 font-medium line-clamp-2 italic mb-3">
                          &quot;{item.prompt}&quot;
                        </p>
                        <div className="flex items-center gap-4">
                           <button 
                              onClick={() => {
                                 setPrompt(item.prompt);
                                 if (item.systemInstruction) {
                                   setSystemInstruction(item.systemInstruction);
                                   saveSystemInstruction(item.systemInstruction);
                                 }
                                 setShowMemory(false);
                              }}
                              className="text-[9px] font-black uppercase tracking-widest text-accent hover:underline flex items-center gap-1"
                           >
                              <RefreshCw size={10} />
                              Reuse
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};
