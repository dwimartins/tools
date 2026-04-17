/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Image as ImageIcon, 
  Clipboard, 
  Copy, 
  Trash2, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Quote
} from "lucide-react";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image processing from File or Blob
  const processImage = (file: File | Blob) => {
    if (!file.type.startsWith('image/')) {
      setError("Hanya file gambar yang didukung.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle click upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle paste from clipboard (Ctrl+V)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) processImage(blob);
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Extract text using Gemini
  const extractQuote = async () => {
    if (!image) return;

    setIsLoading(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      const prompt = `Ekstrak teks kutipan (quote) dari gambar ini secara akurat.
      Instruksi:
      1. Tulis ulang kutipan dengan rapi.
      2. Perbaiki typo ringan, terutama jika teks berasal dari font tegak bersambung atau tulisan tangan yang sulit dibaca.
      3. Abaikan teks yang tidak relevan seperti watermark, username sosial media, jumlah like, atau elemen UI lainnya.
      4. Kembalikan HANYA teks kutipan tersebut. Jangan berikan kalimat pembuka atau penutup. 
      5. Jika kutipan memiliki penulis, sertakan di baris baru dengan format "- Nama Penulis".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      });

      const text = response.text || "Tidak ada teks yang terdeteksi.";
      setExtractedText(text.trim());
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError("Gagal mengekstrak teks. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // UI Actions
  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReset = () => {
    setImage(null);
    setExtractedText("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-bg text-ink p-6 flex flex-col font-sans">
      <div className="max-w-[1200px] w-full mx-auto flex flex-col grow">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Quote className="text-accent" size={24} />
            <span className="font-bold text-2xl tracking-tight">AI Quotes Extractor</span>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 bg-success text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            AI Engine Online
          </motion.div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] grid-rows-none lg:grid-rows-3 gap-5 flex-grow mb-6">
          
          {/* Main Card: Image Upload & Preview (Spans 3 rows in desktop) */}
          <section className="row-span-3">
            {!image ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  h-full min-h-[400px] bg-card border-2 border-dashed border-border rounded-xl
                  flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                  ${isDragging ? 'border-accent bg-blue-50/30' : 'hover:bg-slate-50/50'}
                `}
              >
                <div className="p-5 rounded-full bg-blue-50 text-accent mb-4">
                  <Upload size={40} />
                </div>
                <h3 className="text-lg font-semibold text-ink">Pratinjau Gambar</h3>
                <p className="text-ink-secondary text-sm px-8 text-center mt-2 max-w-xs leading-relaxed">
                  Seret gambar ke sini, klik untuk memilih file, atau tekan <span className="font-mono text-xs font-bold bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Ctrl+V</span> untuk menempel.
                </p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[400px] bg-card border border-border rounded-xl p-4 flex flex-col shadow-sm"
              >
                <div className="relative flex-grow flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                  <img 
                    src={image} 
                    alt="Current upload" 
                    className="max-h-[600px] w-auto object-contain shadow-2xl shadow-black/10"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm border border-slate-100/50">
                      Pratinjau Gambar Aktif
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </section>

          {/* Analysis Panel (Row 1 on desktop) */}
          <section className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <h4 className="text-xs font-bold text-ink-secondary uppercase tracking-widest mb-3">Panel Analisis</h4>
            <p className="text-sm text-ink-secondary mb-5 leading-snug">
              AI akan membersihkan watermark dan memperbaiki teks secara otomatis.
            </p>
            <button
              onClick={extractQuote}
              disabled={!image || isLoading}
              className={`
                w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-bold text-sm transition-all
                ${!image 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-accent text-white hover:brightness-110 active:scale-[0.98] shadow-md shadow-accent/20'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Mengekstrak...
                </>
              ) : (
                <>
                  <ImageIcon size={18} />
                  Mulai Ekstrak Teks
                </>
              )}
            </button>
            <div className="mt-5 space-y-2">
              <div className="flex justify-between items-center text-xs py-1 border-b border-bg">
                <span className="text-ink-secondary">Kualitas Gambar</span>
                <span className="font-bold">{image ? 'Optimal' : '-'}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-ink-secondary">Deteksi Bahasa</span>
                <span className="font-bold">Auto (ID/EN)</span>
              </div>
            </div>
          </section>

          {/* Result Card (Spans rows 2 & 3 on desktop) */}
          <section className="lg:row-span-2 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-ink-secondary uppercase tracking-widest">Hasil Review & Koreksi</h4>
              {error && (
                <div className="flex items-center gap-1.5 text-rose-500 font-bold text-[10px] uppercase">
                  <AlertCircle size={12} />
                  Error
                </div>
              )}
            </div>
            
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="Hasil ekstraksi akan muncul di sini..."
              className="flex-grow w-full bg-transparent border-none resize-none font-medium text-lg leading-relaxed text-ink focus:outline-none placeholder:text-slate-200"
              readOnly={isLoading}
            />

            <div className="flex gap-2 mt-4 pt-4 border-t border-bg">
              <button
                onClick={copyToClipboard}
                disabled={!extractedText || isLoading}
                className={`
                  flex-grow flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all
                  ${isCopied 
                    ? 'bg-success text-white' 
                    : 'bg-slate-100 text-ink hover:bg-slate-200 active:scale-[0.98]'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                {isCopied ? (
                  <>
                    <CheckCircle size={16} />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Salin Teks
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={(!image && !extractedText) || isLoading}
                className="px-4 py-3 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Bersihkan Semua"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-center text-ink-secondary text-[11px] py-4 gap-2">
          <span>Tip: Gunakan Ctrl+V untuk menempel gambar langsung dari clipboard.</span>
          <div className="flex items-center gap-3">
            <span>Versi 2.1.0</span>
            <span className="w-1 h-1 bg-border rounded-full" />
            <span>Powered by Gemini 3 AI</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
