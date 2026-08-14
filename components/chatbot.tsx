'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon,
  Bot,
  User as UserIcon,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { MODELS } from '@/lib/gemini';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'voice';
}

interface ChatbotProps {
  uploadedImages: { url: string; name: string }[];
  onUpdatePrompt: (newPrompt: string) => void;
  onProcessBatch: () => void;
}

export default function Chatbot({ uploadedImages, onUpdatePrompt, onProcessBatch }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I can help you analyze your photos, refine your enhancement prompts, or tune processing parameters. Just tell me what you want to achieve!',
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initChat = useCallback(() => {
    // Client-side direct SDK chat is disabled. Using server-side proxy instead.
  }, []);

  useEffect(() => {
    initChat();
  }, [initChat]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Proxy through server endpoint /api/chat
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          uploadedImages
        })
      });

      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();
      
      if (data.text) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.text,
          type: 'text'
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Live API (Voice) Logic - Requires server-side implementation.
  const startLiveMode = async () => {
    alert("Voice Mode requires server-side configuration. This feature is currently disabled in the preview.");
  };

  const stopLiveMode = () => {
    setIsLiveMode(false);
    setIsListening(false);
    setIsSpeaking(false);
    
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    liveSessionRef.current?.close();
    audioContextRef.current?.close();
    
    processorRef.current = null;
    sourceRef.current = null;
    liveSessionRef.current = null;
    audioContextRef.current = null;
  };

  const playAudio = (base64: string) => {
    if (!audioContextRef.current) return;
    
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }
    
    const buffer = audioContextRef.current.createBuffer(1, floatData.length, 16000);
    buffer.getChannelData(0).set(floatData);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    source.start();
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-border"
          >
            {/* Header */}
            <div className="bg-accent p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <h3 className="font-bold">Photo Consultant</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => isLiveMode ? stopLiveMode() : startLiveMode()}
                  className={`p-2 rounded-full transition-colors ${isLiveMode ? 'bg-red-500' : 'hover:bg-white/20'}`}
                  title={isLiveMode ? 'Stop Voice Mode' : 'Start Voice Mode'}
                >
                  {isLiveMode ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-accent text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 shadow-sm border border-border rounded-tl-none'
                    }`}>
                      {msg.content}
                      {msg.type === 'voice' && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
                          <Volume2 size={10} /> Voice Response
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center bg-white p-3 rounded-2xl shadow-sm border border-border">
                    <Loader2 size={16} className="animate-spin text-accent" />
                    <span className="text-xs text-gray-500">Thinking...</span>
                  </div>
                </div>
              )}
              {isLiveMode && (
                <div className="flex justify-center">
                  <div className="bg-accent/10 text-accent px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 animate-pulse">
                    <Mic size={14} />
                    {isSpeaking ? 'Assistant is speaking...' : 'Listening to you...'}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your photos..."
                  className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                  disabled={isLiveMode}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || isLiveMode}
                  className="p-2 bg-accent text-white rounded-xl disabled:opacity-50 hover:bg-accent/90 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              {uploadedImages.length > 0 && (
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[10px] text-gray-400 flex-shrink-0">Context:</span>
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="flex-shrink-0 w-6 h-6 rounded border border-border overflow-hidden">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
