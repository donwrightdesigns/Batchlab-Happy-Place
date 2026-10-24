'use client';

import React, { useRef, useState } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  User, 
  Sparkles, 
  Check, 
  Info, 
  Layers, 
  Plus, 
  Eye, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CharacterContextImage } from '@/lib/gemini';

interface CharacterContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characterContextImages: CharacterContextImage[];
  setCharacterContextImages: React.Dispatch<React.SetStateAction<CharacterContextImage[]>>;
  characterContextEnabled: boolean;
  setCharacterContextEnabled: (enabled: boolean) => void;
  characterName: string;
  setCharacterName: (name: string) => void;
  characterNotes: string;
  setCharacterNotes: (notes: string) => void;
}

const DEFAULT_SLOT_LABELS = [
  "Primary Face / Headshot",
  "3/4 Profile Angle",
  "Full Body / Build",
  "Expression / Alternate View"
];

export const CharacterContextDrawer: React.FC<CharacterContextDrawerProps> = ({
  isOpen,
  onClose,
  characterContextImages,
  setCharacterContextImages,
  characterContextEnabled,
  setCharacterContextEnabled,
  characterName,
  setCharacterName,
  characterNotes,
  setCharacterNotes
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);

  const activeCount = characterContextImages.filter(img => img.enabled !== false).length;

  const handleFileUpload = async (files: FileList | File[], slotIndex?: number) => {
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    const readAsBase64 = (file: File): Promise<{ base64: string; mimeType: string; name: string }> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            base64: reader.result as string,
            mimeType: file.type || 'image/jpeg',
            name: file.name
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    if (slotIndex !== undefined && slotIndex >= 0 && slotIndex < 4 && fileList[0]) {
      const data = await readAsBase64(fileList[0]);
      setCharacterContextImages(prev => {
        const next = [...prev];
        while (next.length <= slotIndex) {
          next.push({
            id: crypto.randomUUID(),
            label: DEFAULT_SLOT_LABELS[next.length] || `Reference ${next.length + 1}`,
            base64: '',
            enabled: true
          });
        }
        next[slotIndex] = {
          id: next[slotIndex]?.id || crypto.randomUUID(),
          name: data.name,
          label: next[slotIndex]?.label || DEFAULT_SLOT_LABELS[slotIndex] || `Reference ${slotIndex + 1}`,
          base64: data.base64,
          mimeType: data.mimeType,
          enabled: true
        };
        return next;
      });
      setCharacterContextEnabled(true);
      return;
    }

    // Bulk upload up to 4
    const newItems: CharacterContextImage[] = [];
    for (let i = 0; i < Math.min(4, fileList.length); i++) {
      const data = await readAsBase64(fileList[i]);
      newItems.push({
        id: crypto.randomUUID(),
        name: data.name,
        label: DEFAULT_SLOT_LABELS[i] || `Reference ${i + 1}`,
        base64: data.base64,
        mimeType: data.mimeType,
        enabled: true
      });
    }

    setCharacterContextImages(newItems);
    setCharacterContextEnabled(true);
  };

  const handleSlotClick = (index: number) => {
    setTargetSlotIndex(index);
    fileInputRef.current?.click();
  };

  const removeSlotImage = (index: number) => {
    setCharacterContextImages(prev => {
      const next = [...prev];
      if (next[index]) {
        next.splice(index, 1);
      }
      return next;
    });
  };

  const toggleSlotEnabled = (index: number) => {
    setCharacterContextImages(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          enabled: next[index].enabled === false ? true : false
        };
      }
      return next;
    });
  };

  const updateSlotLabel = (index: number, label: string) => {
    setCharacterContextImages(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          label
        };
      }
      return next;
    });
  };

  const clearAll = () => {
    setCharacterContextImages([]);
    setCharacterName('');
    setCharacterNotes('');
  };

  // Ensure we display 4 distinct slots in the UI
  const slots = Array.from({ length: 4 }).map((_, i) => {
    const existing = characterContextImages[i];
    return {
      index: i,
      defaultLabel: DEFAULT_SLOT_LABELS[i],
      data: existing && existing.base64 ? existing : null
    };
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-border"
          >
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files, targetSlotIndex !== null ? targetSlotIndex : undefined);
                  e.target.value = '';
                }
              }}
            />

            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between bg-black text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <User size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black uppercase tracking-widest text-white">
                      Character Anchors
                    </h2>
                    <span className="bg-white/20 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tight">
                      Up to 4
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Preserve subject likeness across batch generation & single edits
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Master Consistency Switch */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-black">
                      Character Likeness Lock
                    </span>
                    {activeCount > 0 && characterContextEnabled && (
                      <span className="inline-flex items-center gap-1 text-[8px] font-black bg-black text-white px-2 py-0.5 rounded-full uppercase">
                        <CheckCircle2 size={9} /> {activeCount} Active
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">
                    Automatically inject reference images into batches and edit prompts.
                  </p>
                </div>
                <button
                  onClick={() => setCharacterContextEnabled(!characterContextEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex items-center cursor-pointer ${
                    characterContextEnabled && activeCount > 0 ? 'bg-accent' : 'bg-gray-300'
                  }`}
                >
                  <motion.div
                    animate={{ x: characterContextEnabled && activeCount > 0 ? 20 : 2 }}
                    className="w-5 h-5 rounded-full bg-white shadow-xs"
                  />
                </button>
              </div>

              {/* Character Identity Info */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-gray-50 border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                    Subject Profile
                  </label>
                  {characterContextImages.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-[9px] font-bold text-gray-400 hover:text-red-600 flex items-center gap-1 uppercase transition-colors cursor-pointer"
                    >
                      <Trash2 size={11} /> Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Character Name (e.g. Tad Craig / Lead Agent)"
                    className="w-full px-3 py-2 text-xs bg-white border border-border rounded-xl font-medium focus:outline-hidden focus:border-black transition-colors"
                  />
                  <textarea
                    rows={2}
                    value={characterNotes}
                    onChange={(e) => setCharacterNotes(e.target.value)}
                    placeholder="Likeness notes: (e.g. 35yo male, athletic build, short brown hair, tailored navy suit)"
                    className="w-full p-2.5 text-xs bg-white border border-border rounded-xl font-medium focus:outline-hidden focus:border-black transition-colors resize-none"
                  />
                </div>
              </div>

              {/* 4 Image Slots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                    Reference Anchors
                  </label>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">
                    {activeCount} of 4 Ready
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {slots.map((slot) => {
                    const item = slot.data;
                    return (
                      <div
                        key={slot.index}
                        className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col ${
                          item 
                            ? (item.enabled !== false ? 'border-border bg-white shadow-xs' : 'border-gray-200 bg-gray-50 opacity-60')
                            : 'border-dashed border-gray-300 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-400 cursor-pointer'
                        }`}
                      >
                        {item ? (
                          <div className="flex flex-col h-full">
                            {/* Thumbnail Area */}
                            <div className="relative aspect-4/3 w-full bg-black/5 overflow-hidden group">
                              <img
                                src={item.base64}
                                alt={item.label || `Reference ${slot.index + 1}`}
                                className="w-full h-full object-cover"
                              />

                              {/* Slot Tag */}
                              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white rounded-md text-[8px] font-black uppercase tracking-wider">
                                Slot {slot.index + 1}
                              </div>

                              {/* Hover actions */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleSlotClick(slot.index)}
                                  className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg text-[9px] font-bold uppercase transition-colors cursor-pointer"
                                  title="Replace Image"
                                >
                                  Replace
                                </button>
                                <button
                                  onClick={() => removeSlotImage(slot.index)}
                                  className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer"
                                  title="Remove Image"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Slot Meta & Controls */}
                            <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                              <input
                                type="text"
                                value={item.label || slot.defaultLabel}
                                onChange={(e) => updateSlotLabel(slot.index, e.target.value)}
                                className="w-full text-[10px] font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black focus:outline-hidden py-0.5 truncate"
                                placeholder={slot.defaultLabel}
                              />
                              <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-bold text-gray-600 select-none">
                                  <input
                                    type="checkbox"
                                    checked={item.enabled !== false}
                                    onChange={() => toggleSlotEnabled(slot.index)}
                                    className="rounded-sm accent-black"
                                  />
                                  <span>Active</span>
                                </label>
                                <button
                                  onClick={() => handleSlotClick(slot.index)}
                                  className="text-[9px] font-bold text-gray-400 hover:text-black uppercase transition-colors cursor-pointer"
                                >
                                  Change
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={() => handleSlotClick(slot.index)}
                            className="p-4 flex flex-col items-center justify-center text-center gap-1.5 aspect-4/3"
                          >
                            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                              <Plus size={14} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-gray-700">
                                Slot {slot.index + 1}
                              </p>
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">
                                {slot.defaultLabel}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guidance Box */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-border text-gray-600 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-black">
                  <Info size={12} className="text-gray-500" />
                  <span>How Anchors Work</span>
                </div>
                <p className="text-[10px] text-gray-500 font-normal leading-relaxed">
                  Uploaded reference photos guide Gemini to maintain matching face geometry, hairstyle, and body build across different prompts, multi-slide batches, and single image refinements.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-border bg-gray-50 flex items-center justify-between">
              <div className="text-[10px] text-gray-500 font-medium">
                {activeCount > 0 ? `${activeCount} anchor${activeCount > 1 ? 's' : ''} ready for generation` : 'No anchors uploaded'}
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-black hover:bg-accent text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
