'use client';

import React from 'react';
import { 
  History, 
  Settings, 
  Download, 
  Loader2,
  Info,
  X,
  User as UserIcon,
  Sparkles,
  Clapperboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';

interface AppHeaderProps {
  user: User | null;
  isAuthLoading: boolean;
  showMemory: boolean;
  setShowMemory: (show: boolean) => void;
  showSettingsDrawer: boolean;
  setShowSettingsDrawer: (show: boolean) => void;
  showCharacterDrawer: boolean;
  setShowCharacterDrawer: (show: boolean) => void;
  showDirectorDrawer?: boolean;
  setShowDirectorDrawer?: (show: boolean) => void;
  characterContextCount: number;
  characterContextEnabled: boolean;
  isProcessing: boolean;
  activeTasksCount?: number;
  queuedTasksCount?: number;
  processedCount: number;
  totalToProcess: number;
  hasCompletedImages: boolean;
  downloadAll: () => void;
  handleLogin: () => void;
  handleLogout: () => void;
  isQuotaExceeded: boolean;
  showQuotaBanner: boolean;
  setShowQuotaBanner: (show: boolean) => void;
  handleRetrySync: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  isAuthLoading,
  showMemory,
  setShowMemory,
  showSettingsDrawer,
  setShowSettingsDrawer,
  showCharacterDrawer,
  setShowCharacterDrawer,
  showDirectorDrawer = false,
  setShowDirectorDrawer,
  characterContextCount,
  characterContextEnabled,
  isProcessing,
  activeTasksCount = 0,
  queuedTasksCount = 0,
  processedCount,
  totalToProcess,
  hasCompletedImages,
  downloadAll,
  handleLogin,
  handleLogout,
  isQuotaExceeded,
  showQuotaBanner,
  setShowQuotaBanner,
  handleRetrySync
}) => {
  return (
    <>
      {isQuotaExceeded && showQuotaBanner && (
        <div className="bg-amber-50 border-b border-amber-200 p-2 text-center relative group">
          <div className="text-[10px] text-amber-800 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Info size={12} className="text-amber-500" />
              <span>Firestore daily read quota exceeded. Cloud sync is paused until tomorrow, but local history still works.</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRetrySync}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-black uppercase tracking-widest text-[9px] transition-colors border border-amber-300/50"
              >
                Retry Sync
              </button>
              <button 
                onClick={() => setShowQuotaBanner(false)}
                className="p-1 hover:bg-amber-200 rounded text-amber-600 transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-black sticky top-0 z-40 px-6 py-4 flex flex-col gap-3 shadow-2xl">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {/* Mobile Logo: B icon in square */}
            <div className="sm:hidden flex items-center">
              <div className="w-9 h-9 rounded-lg border-2 border-white flex items-center justify-center bg-white/5 shadow-inner">
                <span className="font-sans font-black italic tracking-tighter text-2xl text-white">B</span>
              </div>
            </div>

            {/* Desktop / Tablet Logo */}
            <div className="hidden sm:flex flex-col items-center">
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
            {/* Live Task Queue Indicator */}
            {(activeTasksCount > 0 || queuedTasksCount > 0) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-white shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {activeTasksCount > 0 && `${activeTasksCount} Active`}
                  {activeTasksCount > 0 && queuedTasksCount > 0 && ' • '}
                  {queuedTasksCount > 0 && `${queuedTasksCount} Queued`}
                </span>
              </div>
            )}

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

            {/* AI Creative Director Button */}
            {setShowDirectorDrawer && (
              <button 
                onClick={() => setShowDirectorDrawer(!showDirectorDrawer)}
                className={`p-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all border cursor-pointer ${
                  showDirectorDrawer 
                    ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/25' 
                    : 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border-amber-400/30'
                }`}
                title="AI Creative Director (Gemini 3.8 Flash)"
              >
                <Clapperboard className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Director</span>
                <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 text-[8px] font-mono rounded font-black hidden md:inline">
                  3.8
                </span>
              </button>
            )}

            {/* Character Context Button */}
            <button 
              onClick={() => setShowCharacterDrawer(!showCharacterDrawer)}
              className={`p-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border cursor-pointer ${
                showCharacterDrawer 
                  ? 'bg-white text-black border-white' 
                  : (characterContextCount > 0 && characterContextEnabled
                      ? 'bg-white/15 text-white border-accent/60 shadow-xs' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10')
              }`}
              title="Character Reference Anchors (Up to 4 Images)"
            >
              <UserIcon className={`w-4 h-4 ${characterContextCount > 0 && characterContextEnabled ? 'text-accent' : 'text-gray-300'}`} />
              <span className="hidden md:inline">
                {characterContextCount > 0 && characterContextEnabled ? `Character (${characterContextCount})` : 'Character'}
              </span>
              {characterContextCount > 0 && characterContextEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse hidden sm:block" />
              )}
            </button>

            <button 
              onClick={() => setShowMemory(!showMemory)}
              className={`p-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border cursor-pointer ${showMemory ? 'bg-white text-black border-white' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
              title="History"
            >
              <History className="w-4 h-4" />
              <span className="hidden lg:inline">History</span>
            </button>
            <button 
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`p-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border ${showSettingsDrawer ? 'bg-white text-black border-white' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
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

            {hasCompletedImages && (
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
    </>
  );
};
