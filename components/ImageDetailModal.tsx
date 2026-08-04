'use client';

import React from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  CheckCircle2, 
  Loader2, 
  Image as ImageIcon, 
  Search, 
  Edit3, 
  MessageSquare, 
  Sparkles, 
  Download, 
  Star, 
  Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { BeforeAfterSlider } from './before-after-slider';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  result?: string;
  resultPreview?: string;
  analysis?: string;
  usedAnalysis?: boolean;
  finalPrompt?: string;
  error?: string;
  isFavorite?: boolean;
  mediaType?: 'image' | 'video';
  reprocessPrompt?: string;
}

interface ImageDetailModalProps {
  selectedImage: ImageFile;
  setSelectedImage: (img: ImageFile | null) => void;
  showSlider: boolean;
  setShowSlider: (show: boolean) => void;
  goToPreviousImage: () => void;
  goToNextImage: () => void;
  images: ImageFile[];
  openImageDetail: (img: ImageFile) => void;
  isAnalyzing: boolean;
  handleAnalyze: () => void;
  analysisResult: string | null;
  setPrompt: (update: (prev: string) => string) => void;
  reprocessPrompt: string;
  setReprocessPrompt: (p: string) => void;
  refineSource: 'original' | 'result';
  setRefineSource: (s: 'original' | 'result') => void;
  isProcessing: boolean;
  reprocessSingle: (newVariation: boolean) => void;
  suffix: string;
  removeImage: (id: string) => void;
  setImages: (update: (prev: ImageFile[]) => ImageFile[]) => void;
  saveAs: (blob: Blob, name: string) => void;
}

export const ImageDetailModal: React.FC<ImageDetailModalProps> = ({
  selectedImage,
  setSelectedImage,
  showSlider,
  setShowSlider,
  goToPreviousImage,
  goToNextImage,
  images,
  openImageDetail,
  isAnalyzing,
  handleAnalyze,
  analysisResult,
  setPrompt,
  reprocessPrompt,
  setReprocessPrompt,
  refineSource,
  setRefineSource,
  isProcessing,
  reprocessSingle,
  suffix,
  removeImage,
  setImages,
  saveAs
}) => {
  return (
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
        className="relative w-full max-w-6xl h-full md:h-[85vh] bg-[#1A1C1E] md:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
      >
        <div className="w-full h-[55vh] md:h-full shrink-0 md:shrink md:flex-1 relative bg-black flex items-center justify-center overflow-hidden group/viewer">
          {selectedImage.resultPreview || selectedImage.result ? (
            showSlider && selectedImage.preview ? (
              <BeforeAfterSlider 
                before={selectedImage.preview} 
                after={selectedImage.resultPreview || selectedImage.result!} 
              />
            ) : (
              selectedImage.mediaType === 'video' && selectedImage.resultPreview ? (
                <video 
                  src={selectedImage.resultPreview}
                  autoPlay
                  loop
                  playsInline
                  controls
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <img 
                  src={selectedImage.resultPreview || selectedImage.result} 
                  className="max-w-full max-h-full object-contain"
                  alt="Result"
                />
              )
            )
          ) : (
            selectedImage.mediaType === 'video' && selectedImage.preview && selectedImage.preview.includes('blob:') ? (
              <video 
                src={selectedImage.preview} 
                className="max-w-full max-h-full object-contain"
                autoPlay loop muted playsInline
              />
            ) : (
              <img 
                src={selectedImage.preview || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='} 
                className="max-w-full max-h-full object-contain"
                alt="Detail"
              />
            )
          )}
          
          <button 
            onClick={(e) => { e.stopPropagation(); goToPreviousImage(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all opacity-100 md:opacity-0 md:group-hover/viewer:opacity-100 z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all opacity-100 md:opacity-0 md:group-hover/viewer:opacity-100 z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {(selectedImage.resultPreview || selectedImage.result) && selectedImage.preview && selectedImage.mediaType !== 'video' && (
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

          <div className="absolute bottom-4 left-4 right-4 hidden md:flex justify-center pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-2xl flex gap-1.5 overflow-x-auto max-w-full no-scrollbar pointer-events-auto border border-white/10">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={(e) => { e.stopPropagation(); openImageDetail(img); }}
                  className={`
                    relative w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all border-2 
                    ${selectedImage.id === img.id ? 'border-accent scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-80'}
                  `}
                >
                  {img.mediaType === 'video' && img.resultPreview ? (
                    <video 
                      src={img.resultPreview} 
                      className="w-full h-full object-cover"
                      autoPlay loop muted playsInline
                    />
                  ) : (
                    <img 
                      src={img.resultPreview || img.preview} 
                      className="w-full h-full object-cover"
                      alt="Thumb"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="w-full md:w-96 p-5 sm:p-8 flex-1 md:flex-none flex flex-col gap-6 text-white border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto no-scrollbar">
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
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`p-4 rounded-2xl transition-all flex flex-col items-start gap-1 border ${
                  !selectedImage.analysis && !isAnalyzing
                    ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-[1.02] hover:scale-[1.05]' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <p className={`text-[10px] uppercase tracking-widest font-bold ${!selectedImage.analysis && !isAnalyzing ? 'text-white/70' : 'text-gray-500'}`}>Analysis</p>
                <div className={`flex items-center gap-2 text-sm font-bold ${!selectedImage.analysis && !isAnalyzing ? 'text-white' : 'text-accent'}`}>
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{isAnalyzing ? 'Analyzing...' : selectedImage.analysis ? 'Re-Analyze' : 'Run Pre-Process'}</span>
                </div>
              </button>
            </div>

            {analysisResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-accent/5 border border-accent/20 text-[10px] leading-relaxed text-gray-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-accent uppercase tracking-widest flex items-center gap-1">
                    <Search size={10} /> Pre-Processing Analysis
                  </p>
                  <div className="px-2 py-0.5 bg-accent/10 rounded text-[8px] font-black uppercase text-accent">Studied</div>
                </div>
                
                <div className="prose prose-invert prose-xs max-w-none mb-4 space-y-4">
                  <ReactMarkdown>{analysisResult}</ReactMarkdown>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        setPrompt(prev => {
                          const header = "\n\n### ANALYSIS RECOMMENDATIONS:\n";
                          if (prev.includes(header)) return prev;
                          return prev + header + analysisResult;
                        });
                        alert("Recommendations added to global settings.");
                      }}
                      className="py-3 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl border border-accent/30 transition-all font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                    >
                      <Edit3 size={12} />
                      Apply Globally
                    </button>
                    <button 
                      onClick={() => {
                        const header = reprocessPrompt ? (reprocessPrompt.endsWith('\n') ? '' : '\n\n') : '';
                        setReprocessPrompt(reprocessPrompt + header + "ANALYSIS FIXES: " + analysisResult.replace(/\n/g, ' '));
                        alert("Added to this image's revision prompt.");
                      }}
                      className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 transition-all font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                    >
                      <Sparkles size={12} />
                      Refine Locally
                    </button>
                  </div>
                  <p className="text-[7px] text-gray-500 uppercase font-bold text-center tracking-tighter">
                    Apply globally for all photos, or refine locally for this specific frame
                  </p>
                </div>
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Refine Enhancement</p>
                  <p className="text-[8px] text-gray-600 font-medium uppercase tracking-wider">
                    {refineSource === 'original' ? "Source: Original Photo" : "Source: Last Result"}
                  </p>
                </div>
                <div className="flex items-center bg-black/20 rounded-lg p-0.5 border border-white/5">
                  <button 
                    onClick={() => setRefineSource('original')}
                    className={`px-2 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md transition-all ${refineSource === 'original' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Original
                  </button>
                  <button 
                    onClick={() => setRefineSource('result')}
                    disabled={!selectedImage.resultPreview}
                    className={`px-2 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md transition-all ${refineSource === 'result' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'}`}
                  >
                    Result
                  </button>
                </div>
              </div>
              <textarea 
                value={reprocessPrompt}
                onChange={(e) => setReprocessPrompt(e.target.value)}
                className="w-full h-24 bg-transparent border-0 outline-none text-xs text-gray-300 resize-none leading-relaxed placeholder:text-gray-700"
                placeholder={refineSource === 'original' ? "Prompt for new version from original source..." : "Iterate on the current enhanced result..."}
              />
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => reprocessSingle(false)}
                  disabled={selectedImage.status === 'processing' || (isProcessing && selectedImage.status !== 'completed')}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {selectedImage.status === 'processing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-white/50" />}
                  Redo
                </button>
                <button 
                  onClick={() => reprocessSingle(true)}
                  disabled={selectedImage.status === 'processing' || (isProcessing && selectedImage.status !== 'completed')}
                  className="flex-1 py-2 bg-accent/20 hover:bg-accent/30 text-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {selectedImage.status === 'processing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Variation
                </button>
              </div>
            </div>

            {selectedImage.status === 'completed' && (
              <button 
                onClick={async () => {
                  if (!selectedImage.resultPreview) return;
                  const response = await fetch(selectedImage.resultPreview);
                  const blob = await response.blob();
                  const isVideo = selectedImage.mediaType === 'video' || blob.type.startsWith('video/');
                  const ext = isVideo ? 'mp4' : 'jpg';
                  saveAs(blob, `${selectedImage.file.name.split('.')[0]}${suffix}.${ext}`);
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
                  setSelectedImage({ ...selectedImage, isFavorite: isFav });
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
        </div>
      </motion.div>
    </div>
  );
};
