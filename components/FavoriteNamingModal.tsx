'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X } from 'lucide-react';

interface FavoriteNamingModalProps {
  showNamingFavorite: boolean;
  setShowNamingFavorite: (show: boolean) => void;
  favoriteName: string;
  setFavoriteName: (name: string) => void;
  pendingFavoritePrompt: string;
  handleSaveFavorite: () => void;
}

export const FavoriteNamingModal: React.FC<FavoriteNamingModalProps> = ({
  showNamingFavorite,
  setShowNamingFavorite,
  favoriteName,
  setFavoriteName,
  pendingFavoritePrompt,
  handleSaveFavorite
}) => {
  return (
    <AnimatePresence>
      {showNamingFavorite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="bg-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-100">
              <div className="flex items-center gap-2">
                <Star className="text-amber-600 w-5 h-5 fill-amber-600" />
                <h3 className="text-sm font-black uppercase tracking-widest text-amber-900">Name Favorite Prompt</h3>
              </div>
              <button onClick={() => setShowNamingFavorite(false)} className="text-amber-900/40 hover:text-amber-900">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">Favorite Name</label>
                <input 
                  type="text" 
                  value={favoriteName}
                  onChange={(e) => setFavoriteName(e.target.value)}
                  autoFocus
                  placeholder="e.g. Sunny Day Preset"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveFavorite()}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">Prompt Applied</label>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 max-h-32 overflow-y-auto">
                  <p className="text-[10px] text-gray-600 leading-relaxed font-medium">{pendingFavoritePrompt}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button 
                  onClick={() => setShowNamingFavorite(false)}
                  className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveFavorite}
                  disabled={!favoriteName.trim()}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Save Favorite
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
