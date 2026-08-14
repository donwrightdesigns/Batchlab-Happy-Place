'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X } from 'lucide-react';

interface BatchIdentifyModalProps {
  showAddressPrompt: boolean;
  setShowAddressPrompt: (show: boolean) => void;
  pendingImagesCount: number;
  propertyAddress: string;
  setPropertyAddress: (addr: string) => void;
  onStartSession: () => void;
  onSkip: () => void;
}

export const BatchIdentifyModal: React.FC<BatchIdentifyModalProps> = ({
  showAddressPrompt,
  setShowAddressPrompt,
  pendingImagesCount,
  propertyAddress,
  setPropertyAddress,
  onStartSession,
  onSkip
}) => {
  return (
    <AnimatePresence>
      {showAddressPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-black/60 backdrop-blur-md"
             onClick={onSkip}
           />
           <motion.div 
             initial={{ scale: 0.9, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             exit={{ scale: 0.9, opacity: 0, y: 20 }}
             className="relative bg-white rounded-[40px] p-10 w-full max-w-lg shadow-2xl overflow-hidden"
           >
              <div className="absolute top-0 right-0 p-8">
                 <button 
                   onClick={onSkip}
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">GROUP THESE {pendingImagesCount} PHOTOS UNDER A BATCH OR COLLECTION NAME.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Batch / Collection Name</label>
                    <input 
                      autoFocus
                      type="text"
                      value={propertyAddress}
                      onChange={(e) => setPropertyAddress(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onStartSession();
                        }
                      }}
                      className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm font-medium transition-all"
                      placeholder="e.g. Summer Portfolio, Studio Shoot, Project Alpha..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={onStartSession}
                      className="flex-1 py-4 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
                    >
                      Start Session
                    </button>
                    <button 
                       onClick={onSkip}
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
  );
};
