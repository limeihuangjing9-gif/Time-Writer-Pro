import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { ArrowLeft, Play, X, Download, Undo2, Redo2, Clock, Save, Copy, Settings, ChevronDown, BookOpenText, Pause, RotateCcw, Monitor, Share2, Edit2, Smartphone, Palette, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { CanvasBgType } from '../types';

const themeColors = {
  black: {
    bg: '#0a0a0b',
    gradStart: 'rgba(79, 70, 229, 0.12)',
    gradEnd: 'rgba(245, 158, 11, 0.04)',
    text: '#FFFFFF',
    ruby: '#a5b4fc',
    cursor: '#6366f1'
  },
  gray: {
    bg: '#2e3035',
    gradStart: 'rgba(79, 70, 229, 0.15)',
    gradEnd: 'rgba(245, 158, 11, 0.04)',
    text: '#f3f4f6',
    ruby: '#a5b4fc',
    cursor: '#6366f1'
  },
  white: {
    bg: '#faf8f5',
    gradStart: 'rgba(79, 70, 229, 0.04)',
    gradEnd: 'rgba(245, 158, 11, 0.02)',
    text: '#0f172a',
    ruby: '#4f46e5',
    cursor: '#6366f1'
  }
};

interface PlaybackEntry {
  c: string; // content
  s: number; // scroll
  t: number; // timestamp
  p: number; // cursor position
}

interface EditorProps {
  title: string;
  initialContent: string;
  initialPlaybackLog?: PlaybackEntry[];
  initialLabels?: string[];
  onUpdateLabels?: (labels: string[]) => void;
  onBack: () => void;
  onSave: (content: string, playbackLog: PlaybackEntry[]) => void;
  onUpdateTitle?: (title: string) => void;
  canvasBg: CanvasBgType;
  onSetCanvasBg: (bg: CanvasBgType) => void;
}

const VERSION = '1.6.4';

const editorThemeStyles = {
  black: {
    bg: 'bg-[#0b0b0d]',
    headerBg: 'bg-[#0b0b0d]',
    headerBorder: 'border-white/5',
    toolbarBg: 'bg-[#111114]',
    toolbarBorder: 'border-white/5',
    toolbarBtn: 'text-neutral-500 hover:text-white hover:bg-white/5',
    toolbarActive: 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/10',
    titleText: 'text-neutral-300',
    subText: 'text-neutral-600',
    statLabel: 'text-neutral-500',
    statVal: 'text-neutral-400',
    textarea: 'text-[#f8fafc]',
    placeholder: 'placeholder:text-neutral-800',
    buttonGhost: 'text-neutral-500 hover:text-white hover:bg-white/5',
    divider: 'bg-white/5',
    dropdownBg: 'bg-[#121214] border-white/10 shadow-2xl',
    dropdownItem: 'text-neutral-300 hover:bg-white/5 hover:text-white',
    saveBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
  },
  gray: {
    bg: 'bg-[#2e3035]',
    headerBg: 'bg-[#2e3035]',
    headerBorder: 'border-white/5',
    toolbarBg: 'bg-[#24262a]',
    toolbarBorder: 'border-white/5',
    toolbarBtn: 'text-neutral-400 hover:text-white hover:bg-white/5',
    toolbarActive: 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/25',
    titleText: 'text-neutral-200',
    subText: 'text-neutral-400',
    statLabel: 'text-neutral-400',
    statVal: 'text-neutral-300',
    textarea: 'text-neutral-100',
    placeholder: 'placeholder:text-neutral-500',
    buttonGhost: 'text-neutral-400 hover:text-white hover:bg-white/5',
    divider: 'bg-white/5',
    dropdownBg: 'bg-[#24262a] border-white/10 shadow-2xl',
    dropdownItem: 'text-neutral-200 hover:bg-white/5 hover:text-white',
    saveBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
  },
  white: {
    bg: 'bg-[#faf8f5]',
    headerBg: 'bg-[#faf8f5]',
    headerBorder: 'border-slate-200',
    toolbarBg: 'bg-[#f4f1eb]',
    toolbarBorder: 'border-slate-200',
    toolbarBtn: 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50',
    toolbarActive: 'text-indigo-600 bg-indigo-500/10 border border-indigo-500/20',
    titleText: 'text-slate-800',
    subText: 'text-slate-400',
    statLabel: 'text-slate-400',
    statVal: 'text-slate-600',
    textarea: 'text-slate-900',
    placeholder: 'placeholder:text-slate-300',
    buttonGhost: 'text-slate-600 hover:text-slate-950 hover:bg-slate-100',
    divider: 'bg-slate-200',
    dropdownBg: 'bg-white border-slate-200 shadow-xl',
    dropdownItem: 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
    saveBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10'
  }
};

export default function Editor({ 
  title, 
  initialContent, 
  initialPlaybackLog, 
  initialLabels, 
  onUpdateLabels,
  onBack, 
  onSave, 
  onUpdateTitle, 
  canvasBg, 
  onSetCanvasBg 
}: EditorProps) {
  const st = editorThemeStyles[canvasBg] || editorThemeStyles.black;
  const [content, setContent] = useState(initialContent);
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const isComposingRef = useRef(false);
  
  // Create stable ref for onSave to prevent timer clearance on re-render
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Detect WebCodecs support natively for browser safety and responsive layoutフォールバック
  const isWebCodecsSupported = useMemo(() => {
    return typeof window !== 'undefined' && typeof window.VideoEncoder !== 'undefined' && typeof window.VideoFrame !== 'undefined';
  }, []);

  const [isIPhone, setIsIPhone] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isIP = /iPhone/i.test(navigator.userAgent);
      setIsIPhone(isIP);
    }
  }, []);

  const lineCharCount = isIPhone ? 24 : 26;

  // Use Ref for writing session to avoid massive state update lag (copying props array to prevent direct state mutation)
  const playbackLogRef = useRef<PlaybackEntry[]>(Array.isArray(initialPlaybackLog) ? [...initialPlaybackLog] : []);
  // Separate state for playback theater to avoid re-calculating processedLog during typing
  const [activePlaybackLog, setActivePlaybackLog] = useState<PlaybackEntry[]>([]);
  
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const [theaterAspect, setTheaterAspect] = useState<'portrait' | 'landscape'>('portrait');
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [showTimeLapseBgSelector, setShowTimeLapseBgSelector] = useState(false);
  const setCanvasBg = onSetCanvasBg;
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [labels, setLabels] = useState<string[]>(initialLabels || []);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [toast, setToast] = useState('');
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [exportRangeMode, setExportRangeMode] = useState<{show: boolean, type: 'download' | 'share' | null}>({ show: false, type: null });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exportCanceledRef = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  // --- 1. PERSISTENCE & DATA MANAGEMENT ---

  const recordState = useCallback((newContent: string, cursor: number) => {
    const scroll = textareaRef.current?.scrollTop || 0;
    const now = Date.now();
    
    // Update Ref (Immediate, no re-render)
    const log = playbackLogRef.current;
    if (log.length > 0) {
      const last = log[log.length - 1];
      if (last.c === newContent && last.p === cursor) return;
    }
    
    log.push({ c: newContent, s: scroll, t: now, p: cursor });
    
    // Amortized maintenance: only slice if it grows significantly beyond the limit
    if (log.length > 150000 + 1000) {
       playbackLogRef.current = log.slice(-150000);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    setContent(raw);
    
    // Skip saving history or recording steps while composing in Japanese IME
    if (isComposingRef.current || (e.nativeEvent as any).isComposing) return;
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(raw);
    if (newHistory.length > 100) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    const cursor = e.target.selectionEnd || 0;
    recordState(raw, cursor);
  };

  const latestContentRef = useRef(content);
  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  // Unified save handler
  const triggerSave = useCallback((silent: boolean = false) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    onSaveRef.current(latestContentRef.current, [...playbackLogRef.current]);
    setLastSavedTime(new Date());
    if (!silent) {
      setShowSavedIndicator(true);
      if (indicatorTimeoutRef.current) clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = setTimeout(() => setShowSavedIndicator(false), 2000);
    }
  }, []);

  // Auto-save debounced
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(false);
    }, 1500); // 1.5 seconds debounce
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content, triggerSave]);

  // Save immediately on unmount to prevent any data loss
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        onSaveRef.current(latestContentRef.current, [...playbackLogRef.current]);
      }
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

  // --- 2. WRITING SUPPORT (Auto-scroll & Toolbar) ---

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || isComposingRef.current) return;
    
    const textBeforeCursor = content.substring(0, textarea.selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;
    
    const fontSize = 24; 
    const lineHeight = fontSize * 1.8;
    const cursorY = currentLineIndex * lineHeight;
    const viewHeight = textarea.clientHeight;
    const targetScroll = cursorY - (viewHeight / 2) + (lineHeight / 2);
    
    textarea.scrollTop = Math.max(0, targetScroll);
  }, [content]);

  const insertBrackets = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + '「' + selectedText + '」' + content.substring(end);
    setContent(newContent);
    recordState(newContent, start + 1);
    
    // Defer focus and selection to ensure content update is processed
    textarea.focus();
    setTimeout(() => {
      textarea.setSelectionRange(start + 1, start + 1 + selectedText.length);
      if (selectedText.length === 0) {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }
    }, 0);
  };

  const insertRuby = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newContent: string;
    let newCursorPos: number;
    
    if (selectedText.length > 0) {
      newContent = content.substring(0, start) + `[${selectedText}|ルビ]` + content.substring(end);
      newCursorPos = start + selectedText.length + 2; 
    } else {
      newContent = content.substring(0, start) + '[|]' + content.substring(end);
      newCursorPos = start + 1;
    }
    
    setContent(newContent);
    recordState(newContent, newCursorPos);
    textarea.focus();
    setTimeout(() => {
      if (selectedText.length > 0) {
        textarea.setSelectionRange(start + selectedText.length + 2, start + selectedText.length + 4);
      } else {
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      }
    }, 0);
  };

  const handleCopyFull = () => {
    navigator.clipboard.writeText(content).then(() => {
      showToast('全文コピー完了');
    });
  };

  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + text + content.substring(end);
    setContent(newContent);
    recordState(newContent, start + text.length);
    textarea.focus();
    setTimeout(() => {
       textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const c = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setContent(c);
      recordState(c, c.length);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const c = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setContent(c);
      recordState(c, c.length);
    }
  };

  // --- 3. TIMELAPSE ENGINE (LOGIC & RENDERING) ---
  
  // Update playback log only when theater opens to avoid crash during writing
  useEffect(() => {
    if (showTimeLapse) {
      setActivePlaybackLog(playbackLogRef.current);
    }
  }, [showTimeLapse]);

  // RE-CALCULATE TIMESTAMPS FOR JUMP-CUT
  const processedLog = useMemo(() => {
    if (activePlaybackLog.length === 0) return [];
    const log: PlaybackEntry[] = [];
    let lastRealT = activePlaybackLog[0].t;
    let virtualT = 0;
    activePlaybackLog.forEach(e => {
        const delta = e.t - lastRealT;
        // Jump-cut: gaps > 0.5s are reduced to 0.1s
        const jumpValue = delta > 500 ? 100 : delta;
        virtualT += jumpValue;
        log.push({...e, t: virtualT});
        lastRealT = e.t;
    });
    return log;
  }, [activePlaybackLog]);

  const totalDuration = useMemo(() => {
    return processedLog.length > 0 ? processedLog[processedLog.length - 1].t : 0;
  }, [processedLog]);

  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, entry: PlaybackEntry, progress: number, isExport: boolean = false) => {
    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;

    const theme = themeColors[canvasBg] || themeColors.black;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // --- BACKGROUND WITH ATMOSPHERE ---
    ctx.fillStyle = theme.bg; 
    ctx.fillRect(0, 0, w, h);

    // Replicate App's atmosphere gradients
    ctx.save();
    const grad1 = ctx.createRadialGradient(w * 0.25, 0, 0, w * 0.25, 0, w * 0.8);
    grad1.addColorStop(0, theme.gradStart); // indigo
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);

    const grad2 = ctx.createRadialGradient(w * 0.75, h, 0, w * 0.75, h, w * 0.8);
    grad2.addColorStop(0, theme.gradEnd); // amber
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    if (!entry) return;

    // --- REPRESENT CELL DATA STRUCTURE FOR RUBY SUPPORT ---
    interface CharCell {
      char: string;
      ruby?: string;
      isClusterStart?: boolean;
      clusterWidth?: number;
      clusterRuby?: string;
    }

    // Parses custom ruby tag like [琥珀|こはく] aligning char index mappings
    const parseRubyWithMap = (text: string) => {
      const cells: CharCell[] = [];
      const rawToCellIdx: number[] = [];
      
      let i = 0;
      const len = text.length;
      
      while (i < len) {
        if (text[i] === '[') {
          const pipeIdx = text.indexOf('|', i);
          const closeIdx = text.indexOf(']', i);
          if (pipeIdx !== -1 && closeIdx !== -1 && pipeIdx < closeIdx) {
            const parentText = text.substring(i + 1, pipeIdx);
            const rubyText = text.substring(pipeIdx + 1, closeIdx);
            const parentChars = Array.from(parentText);
            
            rawToCellIdx.push(cells.length); // for '['
            
            const startCellIdx = cells.length;
            parentChars.forEach((char, cIdx) => {
              if (cIdx === 0) {
                cells.push({
                  char,
                  ruby: rubyText,
                  isClusterStart: true,
                  clusterWidth: parentChars.length,
                  clusterRuby: rubyText
                });
              } else {
                cells.push({
                  char,
                  isClusterStart: false,
                  clusterWidth: parentChars.length,
                  clusterRuby: rubyText
                });
              }
            });
            
            for (let r = i + 1; r <= closeIdx; r++) {
              const relativeOffset = r - (i + 1);
              if (relativeOffset < parentChars.length) {
                rawToCellIdx.push(startCellIdx + relativeOffset);
              } else {
                rawToCellIdx.push(startCellIdx + parentChars.length - 1);
              }
            }
            rawToCellIdx.push(startCellIdx + parentChars.length); // for ']'
            
            i = closeIdx + 1;
            continue;
          }
        }
        
        rawToCellIdx.push(cells.length);
        cells.push({ char: text[i] });
        i++;
      }
      
      rawToCellIdx.push(cells.length); // final boundary
      return { cells, rawToCellIdx };
    };

    // --- REPRODUCE EDITOR WRAPPING ---
    const logicalLines = entry.c.split('\n');
    const visualLines: CharCell[][] = [];
    let cursorVisualLine = 0;
    let cursorVisualCol = 0;
    let totalPrecedingRawChars = 0;

    logicalLines.forEach((l) => {
        const { cells, rawToCellIdx } = parseRubyWithMap(l);
        const segments: CharCell[][] = [];
        
        if (cells.length === 0) {
            segments.push([]);
        } else {
            for (let i = 0; i < cells.length; i += lineCharCount) {
                segments.push(cells.slice(i, i + lineCharCount));
            }
        }

        const currentLineRawLength = l.length;
        const lineStartRaw = totalPrecedingRawChars;
        const lineEndRaw = totalPrecedingRawChars + currentLineRawLength;
        
        if (entry.p >= lineStartRaw && entry.p <= lineEndRaw) {
            const localRawCursor = entry.p - lineStartRaw;
            const localCellCursor = rawToCellIdx[localRawCursor] !== undefined ? rawToCellIdx[localRawCursor] : cells.length;
            
            let accumCell = 0;
            segments.forEach((seg, sIdx) => {
                const segStartCell = accumCell;
                const segEndCell = accumCell + seg.length;
                if (localCellCursor >= segStartCell && localCellCursor <= segEndCell) {
                    cursorVisualLine = visualLines.length + sIdx;
                    cursorVisualCol = localCellCursor - segStartCell;
                }
                accumCell += seg.length;
            });
        }

        segments.forEach((seg) => {
            visualLines.push(seg);
        });
        
        totalPrecedingRawChars += currentLineRawLength + 1; 
    });

    const charSize = 32; 
    const lineHeight = charSize * 1.85; // Extra breathing room for rubies
    const rubySize = charSize * 0.44;   // Precise sizing for aesthetic readability
    const blockWidth = lineCharCount * charSize;
    const totalTextHeight = visualLines.length * lineHeight;
    
    // スケール計算（プレビュー・エクスポート動画共通で動作し、絶対に座標がズレない超堅牢なカメラロジック）
    // 1. 文章入力中：文字が文章として快適に読み取れ、はみ出さない美しいサイズ。
    const writingScale = (w * 0.72) / blockWidth;

    // 2. 完了時：文章全体（縦も横も）が画面の82%領域内に美しく綺麗に収まる引いたサイズ
    const fitWidthScale = (w * 0.82) / blockWidth;
    const fitHeightScale = (h * 0.82) / Math.max(totalTextHeight, 1);
    const targetScale = Math.min(fitWidthScale, fitHeightScale);

    let scale = 1.0;
    let tx = 0, ty = 0;

    // A. 入力・追従中の基本位置（カーソルを画面の縦42%付近に配置し、左右は中央揃え）
    const cursorY = cursorVisualLine * lineHeight + (lineHeight / 2);
    const startTx = (w / 2) - (blockWidth * writingScale / 2);
    const startTy = (h * 0.42) - (cursorY * writingScale);

    // B. 全体表示ズームアウト時の完璧な中央配置位置
    const endTx = (w / 2) - (blockWidth * targetScale / 2);
    const endTy = (h / 2) - (totalTextHeight * targetScale / 2);

    if (progress > 0.94) {
       // --- 最後のマージン：スムーズにスッと引く（ズームアウト）アニメーション演出 ---
       // 0.94〜1.0 にかけてカメラを滑らかに引く (Smoothstep イージング)
       const t = Math.min(1.0, (progress - 0.94) / 0.05);
       const easeT = t * t * (3 - 2 * t);
       
       scale = writingScale + (targetScale - writingScale) * easeT;
       tx = startTx + (endTx - startTx) * easeT;
       ty = startTy + (endTy - startTy) * easeT;
    } else {
       // --- 文章が紡がれる入力進行中：カーソルを美しく追従、行が増えれば自然にスクロール ---
       scale = writingScale;
       tx = startTx;
       ty = startTy;
    }

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    visualLines.forEach((line, i) => {
       line.forEach((cell, j) => {
           const x = j * charSize;
           const y = i * lineHeight;
           
           // Render primary character
           ctx.font = `${isExport ? 'bold ' : ''}${charSize}px "BIZ UDMincho Mono", "MS Mincho", monospace, serif`;
           ctx.textBaseline = 'top';
           ctx.fillStyle = theme.text;
           ctx.fillText(cell.char, x, y);
           
           // Render ruby if starting a cluster
           if (cell.isClusterStart && cell.clusterRuby) {
               ctx.save();
               ctx.font = `bold ${rubySize}px "BIZ UDMincho Mono", "MS Mincho", monospace, serif`;
               ctx.fillStyle = theme.ruby; // Ambient pastel indigo for the rubies
               ctx.textAlign = 'center';
               ctx.textBaseline = 'bottom';
               
               const clusterWidth = cell.clusterWidth || 1;
               const rubyBlockWidth = clusterWidth * charSize;
               const rx = x + (rubyBlockWidth / 2);
               const ry = y - 3; // Position closely and neatly above parent char cell
               
               ctx.fillText(cell.clusterRuby, rx, ry);
               ctx.restore();
           }
       });
    });

    if (progress <= 0.96) {
       ctx.fillStyle = theme.cursor;
       ctx.fillRect(cursorVisualCol * charSize, cursorVisualLine * lineHeight, 3, charSize);
    }
    ctx.restore();
  }, [lineCharCount, canvasBg]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // プレビューとエクスポートで同一ピクセル解像度の高精度バッファを強制
    const w = theaterAspect === 'landscape' ? 1280 : 720;
    const h = theaterAspect === 'landscape' ? 720 : 1280;
    
    canvas.width = w;
    canvas.height = h;
    
    // 描画初期化
    const ctx = canvas.getContext('2d');
    if (ctx && processedLog.length > 0) {
      const entry = processedLog.find(e => e.t >= currentTimeMs) || processedLog[processedLog.length - 1];
      renderFrame(ctx, entry, totalDuration > 0 ? currentTimeMs / totalDuration : 1);
    }
  }, [processedLog, currentTimeMs, totalDuration, renderFrame, theaterAspect]);

  // Sync playback refs for lightweight tick scheduler
  const isPausedRef = useRef(isPaused);
  const playbackSpeedRef = useRef(playbackSpeed);
  const totalDurationRef = useRef(totalDuration);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { totalDurationRef.current = totalDuration; }, [totalDuration]);

  // ANIMATION LOOP (Stable on-tick handler)
  const tick = useCallback((time: number) => {
    if (isPausedRef.current) return;
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;

    setCurrentTimeMs(prev => {
      const next = prev + (delta * playbackSpeedRef.current);
      if (next >= totalDurationRef.current) {
        setIsPaused(true);
        setIsFinished(true);
        return totalDurationRef.current;
      }
      return next;
    });

    animationRef.current = requestAnimationFrame(tick);
  }, []);

  // SYNC CANVAS WITH CURRENT TIME
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showTimeLapse) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const entry = processedLog.find(e => e.t >= currentTimeMs) || processedLog[processedLog.length - 1];
    if (entry) {
        renderFrame(ctx, entry, totalDuration > 0 ? currentTimeMs / totalDuration : 1);
    }
  }, [currentTimeMs, processedLog, totalDuration, renderFrame, showTimeLapse]);

  // Clean play/pause lifecycle bounds
  useEffect(() => {
    if (!isPaused && showTimeLapse) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(tick);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [isPaused, showTimeLapse, tick]);

  useEffect(() => {
    if (showTimeLapse) {
      setupCanvas();
      window.addEventListener('resize', setupCanvas);
      return () => window.removeEventListener('resize', setupCanvas);
    }
  }, [showTimeLapse, setupCanvas]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTimeMs(Number(e.target.value));
    setIsFinished(false);
  };

  const [exportResult, setExportResult] = useState<{ blob: Blob; filename: string; mimeType: string } | null>(null);

  const runExport = async (mode: 'download' | 'share' = 'download', range: 'all' | 'recent100' | 'today' = 'all') => {
    setExportError(null);
    if (!isWebCodecsSupported) {
      setExportError("お使いのブラウザはタイムラプス動画の生成(WebCodecs API)に対応していません。Chromeなど対応ブラウザをご利用ください。");
      setIsExporting(true);
      return;
    }

    setIsExporting(true);
    setExportRangeMode({ show: false, type: null }); // Close range modal
    setIsPaused(true);
    setExportProgress(0);
    setExportResult(null);
    exportCanceledRef.current = false;

    let videoEncoderInstance: VideoEncoder | null = null;

    try {
        let playbackLog = playbackLogRef.current;
        
        if (range === 'recent100' && playbackLog.length > 0) {
           const finalLen = playbackLog[playbackLog.length - 1].c.length;
           const targetLen = Math.max(0, finalLen - 100);
           const startIdx = playbackLog.findIndex(e => e.c.length >= targetLen);
           if (startIdx !== -1) {
              playbackLog = playbackLog.slice(startIdx);
           }
        } else if (range === 'today' && playbackLog.length > 0) {
           const today = new Date();
           today.setHours(0,0,0,0);
           const startOfToday = today.getTime();
           const startIdx = playbackLog.findIndex(e => e.t >= startOfToday);
           if (startIdx !== -1) {
              playbackLog = playbackLog.slice(startIdx);
           }
        }

        const safeLog = playbackLog && playbackLog.length > 0 ? playbackLog : [{ t: Date.now(), c: '', p: 0 }];
    
        const processedLog: PlaybackEntry[] = [];
        let lastRealT = safeLog[0].t;
        let virtualT = 0;
        safeLog.forEach((entry) => {
            const delta = entry.t - lastRealT;
            const jumpValue = delta > 500 ? 100 : delta;
            virtualT += jumpValue;
            processedLog.push({...entry, t: virtualT});
            lastRealT = entry.t;
        });
        
        const _totalDuration = processedLog.length > 0 ? processedLog[processedLog.length - 1].t : 0;
        const totalDuration = Math.max(1000, _totalDuration);
        const FPS = 30;
        
        const w = theaterAspect === 'landscape' ? 1280 : 720;
        const h = theaterAspect === 'landscape' ? 720 : 1280;

        const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                codec: 'avc',
                width: w,
                height: h
            },
            fastStart: 'in-memory'
        });

        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => { 
                console.error('VideoEncoder error:', e);
            }
        });
        videoEncoderInstance = videoEncoder;

        // Use a more widely supported Main Profile for better thumbnail/preview visibility on mobile
        videoEncoder.configure({
            codec: 'avc1.4d401f', // Main Profile, Level 3.1
            width: w,
            height: h,
            bitrate: 1_200_000, 
            framerate: FPS,
            latencyMode: 'quality'
        });

        const offscreen = new OffscreenCanvas(w, h);
        const ctx = offscreen.getContext('2d', { 
            alpha: false, 
            desynchronized: true,
            willReadFrequently: false
        }) as OffscreenCanvasRenderingContext2D;

        let exportVT = 0;
        let videoTime = 0;
        const VIDEO_FRAME_DUR = 1000 / Math.max(1, FPS);
        const VT_STEP = VIDEO_FRAME_DUR * Math.max(0.1, playbackSpeed);
        let framesEncoded = 0;
        let loops = 0;
        
        let lastEntryIndex = -1;

        if (videoEncoder.state === 'unconfigured') {
            throw new Error('VideoEncoder configuration failed');
        }

        const yieldToMain = () => new Promise(resolve => requestAnimationFrame(resolve));
        
        const INTRO_DUR = 4500; // 4.5s intro
        const OUTRO_DUR = 5000; // 5s hold outro (added 5s stay)
        const totalVideoDur = INTRO_DUR + totalDuration + OUTRO_DUR;

        while (exportVT <= totalVideoDur) {
            if (exportCanceledRef.current) {
                try {
                    if (videoEncoderInstance && videoEncoderInstance.state !== 'closed') {
                        videoEncoderInstance.close();
                    }
                } catch (e) {}
                try { muxer.finalize(); } catch {}
                setIsExporting(false);
                return;
            }

            if (exportVT < INTRO_DUR) {
                // --- RENDER TITLE INTRO ---
                const introProgress = exportVT / INTRO_DUR;
                
                const theme = themeColors[canvasBg] || themeColors.black;
                
                ctx.fillStyle = theme.bg; 
                ctx.fillRect(0, 0, w, h);
                
                // Atmosphere (Gradients)
                ctx.save();
                const g1 = ctx.createRadialGradient(w/4, 0, 0, w/4, 0, w*0.8);
                g1.addColorStop(0, theme.gradStart);
                g1.addColorStop(1, 'transparent');
                ctx.fillStyle = g1;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                let alpha = 1;
                if (exportVT < 500) {
                    alpha = exportVT / 500;
                } else if (exportVT > INTRO_DUR - 500) {
                    alpha = (INTRO_DUR - exportVT) / 500;
                }
                ctx.globalAlpha = Math.max(0, alpha);
                
                ctx.fillStyle = theme.text;
                // Dynamic font size: Start at 5% of width, but scale down if too long for a 85% safe-zone
                const baseFontSize = Math.floor(w * 0.05);
                const maxWidth = w * 0.85;
                const titleText = title || 'Untitled';
                
                ctx.font = `bold ${baseFontSize}px "BIZ UDMincho", serif`;
                let metrics = ctx.measureText(titleText);
                let finalFontSize = baseFontSize;
                
                if (metrics.width > maxWidth) {
                    finalFontSize = Math.floor(baseFontSize * (maxWidth / metrics.width));
                    ctx.font = `bold ${finalFontSize}px "BIZ UDMincho", serif`;
                }
                
                ctx.fillText(titleText, w / 2, h / 2 - 20);
                
                ctx.fillStyle = theme.cursor;
                // Adjust underline width relative to final font size
                const underlineWidth = Math.min(maxWidth, finalFontSize * 2.5);
                ctx.fillRect(w / 2 - underlineWidth / 2, h / 2 + 50, underlineWidth, 4);
                ctx.restore();

                try {
                    const frame = new VideoFrame(offscreen, { 
                        timestamp: Math.round(videoTime * 1000),
                        duration: Math.round(VIDEO_FRAME_DUR * 1000)
                    });
                    videoEncoder.encode(frame, { keyFrame: framesEncoded % 60 === 0 });
                    frame.close();
                    framesEncoded++;
                } catch (e) { console.warn(e); }

            } else if (exportVT < INTRO_DUR + totalDuration) {
                // --- RENDER TIMELAPSE ---
                const timelapseVT = exportVT - INTRO_DUR;
                const progress = timelapseVT / totalDuration;
                const entry = processedLog.find((e) => e.t >= timelapseVT) || processedLog[processedLog.length - 1];
                const entryIndex = processedLog.indexOf(entry);
                
                const isVisualChange = progress > 0.96 || entryIndex !== lastEntryIndex;

                if (isVisualChange) {
                    renderFrame(ctx as unknown as CanvasRenderingContext2D, entry, progress, true);
                    lastEntryIndex = entryIndex;
                    
                    try {
                        const frame = new VideoFrame(offscreen, { 
                            timestamp: Math.round(videoTime * 1000),
                            duration: Math.round(VIDEO_FRAME_DUR * 1000)
                        });
                        videoEncoder.encode(frame, { keyFrame: framesEncoded % 60 === 0 });
                        frame.close();
                        framesEncoded++;
                    } catch (e) {
                        console.warn('Frame encode failed:', e);
                    }
                }
            } else {
                // --- RENDER OUTRO (5s Hold with Zoomed Out complete state) ---
                const entry = processedLog[processedLog.length - 1];
                renderFrame(ctx as unknown as CanvasRenderingContext2D, entry, 1.0, true);
                
                try {
                    const frame = new VideoFrame(offscreen, { 
                        timestamp: Math.round(videoTime * 1000),
                        duration: Math.round(VIDEO_FRAME_DUR * 1000)
                    });
                    videoEncoder.encode(frame, { keyFrame: framesEncoded % 60 === 0 });
                    frame.close();
                    framesEncoded++;
                } catch (e) {
                    console.warn('Outro Frame encode failed:', e);
                }
            }

            exportVT += VT_STEP;
            videoTime += VIDEO_FRAME_DUR;
            loops++;

            if (loops % 30 === 0) {
                setExportProgress(Math.min(99, (exportVT / totalVideoDur) * 100));
                
                await yieldToMain();
                
                while (videoEncoder.encodeQueueSize > 60) {
                    await new Promise(r => setTimeout(r, 10));
                }
            }
        }

        if (processedLog.length > 0) {
            renderFrame(ctx as unknown as CanvasRenderingContext2D, processedLog[processedLog.length - 1], 1, true);
            try {
                const finalFrame = new VideoFrame(offscreen, { 
                    timestamp: Math.round(videoTime * 1000),
                    duration: Math.round(VIDEO_FRAME_DUR * 1000)
                });
                videoEncoder.encode(finalFrame, { keyFrame: true });
                finalFrame.close();
            } catch (e) {
                console.warn('Final frame encode failed:', e);
            }
        }

        setExportProgress(99.9);
        await yieldToMain();
        
        try {
            await videoEncoder.flush();
        } catch (e) {
            console.warn('Flush error (attempting to finalize anyway):', e);
        }

        try {
            muxer.finalize();
        } catch (e) {
            console.error('Muxer finalize error:', e);
        }

        const buffer = muxer.target.buffer;
        if (!buffer || buffer.byteLength === 0) {
            throw new Error('Generated video buffer is empty');
        }

        const blob = new Blob([buffer], { type: 'video/mp4' });
        const filename = `${title || 'timelapse'}_${new Date().getTime()}.mp4`;
        const mimeType = 'video/mp4';

        setExportProgress(100);
        setExportResult({ blob, filename, mimeType });

        const doDownload = () => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        if (mode === 'share' && navigator.share) {
            const file = new File([blob], filename, { type: mimeType });
            navigator.share({
                title: title,
                files: [file]
            }).catch(e => {
                console.log("Share failed or was cancelled", e);
                doDownload(); 
            }).finally(() => {
                setTimeout(() => { setIsExporting(false); setExportResult(null); }, 1500);
            });
        } else {
            doDownload();
            setTimeout(() => { setIsExporting(false); setExportResult(null); }, 1500);
        }

    } catch (error: any) {
        console.error('Export Error:', error);
        try {
            if (videoEncoderInstance && videoEncoderInstance.state !== 'closed') {
                videoEncoderInstance.close();
            }
        } catch (e) {}
        setIsExporting(true);
        setExportError('動画生成中にエラーが発生しました: ' + error.message);
    }
  };

  const finalizeShare = async () => {
    if (!exportResult || !navigator.share) return;
    try {
      const file = new File([exportResult.blob], exportResult.filename, { type: exportResult.mimeType });
      await navigator.share({
        files: [file],
        title: `Time×Writer：Pro - ${title}`,
        text: 'Time×Writer：Pro：タイム×ライターで執筆したタイムラプス動画です。#タイムライター #TimeWriter',
      });
      setIsExporting(false);
      setExportResult(null);
    } catch (e) {
      console.error('Share failed', e);
      finalizeDownload();
    }
  };

  const finalizeDownload = () => {
    if (!exportResult) return;
    const url = URL.createObjectURL(exportResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
    setExportResult(null);
  };

  const handleBackupText = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'backup'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSettings(false);
  };

  return (
    <div className={`${st.bg} min-h-screen flex flex-col items-center w-full overflow-hidden ${st.titleText}`}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-[10px] tracking-widest shadow-2xl border border-white/10 uppercase">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- EDITOR HEADER (image_24 Style) --- */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${st.headerBg} border-b ${st.headerBorder} pt-safe shadow-lg transition-colors`}>
        <div className={`h-16 px-4 flex items-center justify-between border-b ${st.headerBorder}`}>
          <div className="flex items-center gap-3">
             <button onClick={() => { triggerSave(true); onBack(); }} className="w-10 h-10 rounded-full hover:bg-neutral-500/10 flex items-center justify-center text-neutral-500 transition-colors">
               <ArrowLeft size={22} />
             </button>
             <div className="flex flex-col">
               <span className={`text-[8px] font-bold tracking-widest ${st.subText} uppercase`}>Manuscript</span>
               <div className="flex items-center gap-3">
                 <h1 className={`text-sm font-bold truncate max-w-[150px] ${st.titleText}`}>{title}</h1>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end mr-1">
               <span className={`text-[7px] font-bold ${st.subText} tracking-widest uppercase mb-0.5`}>CHARS</span>
               <span className={`text-[11px] font-mono font-bold ${st.statVal}`}>{content.replace(/[\s　]/g, '').length.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 relative">
              <AnimatePresence>
                {showSavedIndicator && (
                  <motion.span 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute -top-4 right-2 text-[8px] font-bold text-green-500 tracking-widest flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    SAVED
                  </motion.span>
                )}
                {lastSavedTime && !showSavedIndicator && (
                  <span className={`absolute -top-4 right-2 text-[7px] ${st.subText} uppercase tracking-widest whitespace-nowrap`}>
                     {lastSavedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </AnimatePresence>
              <button onClick={() => triggerSave(false)} className={`px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.2em] flex items-center gap-2 active:scale-95 transition-all text-white shadow-lg ${st.saveBtn}`}>
                 <Save size={14} className="text-white" /> SAVE
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar (Standard Header Style from image_24) */}
        <div className={`h-12 px-4 flex items-center ${st.toolbarBg} overflow-x-auto no-scrollbar gap-1 border-t ${st.toolbarBorder} transition-colors`}>
           <button onClick={undo} disabled={historyIndex <= 0} className={`w-9 h-9 flex items-center justify-center rounded-lg disabled:opacity-20 transition-all active:scale-90 ${st.toolbarBtn}`}><Undo2 size={18} /></button>
           <button onClick={redo} disabled={historyIndex >= history.length - 1} className={`w-9 h-9 flex items-center justify-center rounded-lg disabled:opacity-20 transition-all active:scale-90 ${st.toolbarBtn}`}><Redo2 size={18} /></button>
           
           <div className={`h-4 w-px mx-2 shrink-0 ${st.divider}`} />
           
           <button onClick={insertBrackets} className={`px-3 h-9 flex items-center justify-center text-[18px] font-serif font-bold rounded-lg transition-all group shrink-0 ${st.toolbarBtn}`}>
             <span className="group-hover:scale-110 transition-transform">「 」</span>
           </button>

           <button onClick={() => insertText('…')} className={`w-9 h-9 flex items-center justify-center text-[18px] font-serif font-bold rounded-lg transition-all active:scale-90 shrink-0 ${st.toolbarBtn}`}>…</button>
           <button onClick={() => insertText('――')} className={`w-9 h-9 flex items-center justify-center text-[18px] font-serif font-bold rounded-lg transition-all active:scale-90 shrink-0 ${st.toolbarBtn}`}>――</button>
           <button onClick={insertRuby} className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-90 shrink-0 ${st.toolbarBtn}`}><BookOpenText size={18} /></button>
           
           <div className="flex-1" /> 
           
           <button onClick={handleCopyFull} className={`px-3 h-9 flex items-center gap-2 rounded-lg transition-colors shrink-0 group ${st.toolbarBtn}`}>
             <Copy size={16} className="group-hover:scale-110 transition-transform" />
             <span className="text-[9px] font-bold tracking-widest uppercase">COPY</span>
           </button>
           
           {/* 背景色選択パレットトグル（ドロップダウンの外への露出処理） */}
           <button
             onClick={() => setShowBgSelector(!showBgSelector)}
             className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 shrink-0 ${st.toolbarBtn} ${showBgSelector ? 'text-indigo-500 bg-indigo-500/10' : ''}`}
             title="動画とエディタの背景色を変更"
           >
             <Palette size={18} className={showBgSelector ? "rotate-12 transition-transform duration-300" : "transition-transform duration-300 hover:rotate-6"} />
           </button>

           <button onClick={() => setShowSettings(!showSettings)} className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${st.toolbarBtn}`}>
             <Settings size={18} />
           </button>
           
           <div className={`h-6 w-px mx-2 shrink-0 ${st.divider}`} />

           <button 
             onClick={() => { setShowTimeLapse(true); setIsPaused(true); setCurrentTimeMs(0); }} 
             className="flex items-center gap-2 px-4 h-9 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-full text-[9px] font-bold tracking-[0.2em] transition-all active:scale-95 shrink-0"
           >
             <Play size={12} fill="currentColor" /> TIMELAPSE
           </button>
        </div>
         {/* ツールバー外の絶対配置ドロップダウン、overflowの影響を回避するため */}
         <AnimatePresence>
           {showBgSelector && (
             <>
               <div className="fixed inset-0 z-[60]" onClick={() => setShowBgSelector(false)} />
               <motion.div
                 initial={{ opacity: 0, y: -10, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: -10, scale: 0.95 }}
                 className={`absolute right-[135px] top-[106px] w-44 rounded-2xl border p-2 z-[70] flex flex-col gap-1 ${st.dropdownBg}`}
               >
                 <span className="text-[8px] font-bold tracking-widest text-[#7c7e85] uppercase px-2 py-1">BACKGROUND THEME</span>
                 {[
                   { key: 'black' as CanvasBgType, label: 'Cosmic Slate', css: 'bg-[#0a0a0b] border-white/10' },
                   { key: 'gray' as CanvasBgType, label: 'Silent Mist', css: 'bg-[#2e3035] border-white/5' },
                   { key: 'white' as CanvasBgType, label: 'Pure Ivory', css: 'bg-[#faf8f5] border-slate-200' },
                 ].map((item) => (
                   <button
                     key={item.key}
                     onClick={() => {
                       setCanvasBg(item.key);
                       showToast(`背景を${item.label}に変更しました`);
                       setShowBgSelector(false);
                     }}
                     className={`flex items-center gap-3 px-2 py-2 rounded-xl text-[11px] font-bold transition-all relative ${st.dropdownItem} ${canvasBg === item.key ? 'bg-indigo-500/10 text-indigo-500' : ''}`}
                   >
                     <span className={`w-3.5 h-3.5 rounded-full border ${item.css} flex items-center justify-center shrink-0`}>
                       {canvasBg === item.key && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                     </span>
                     {item.label}
                   </button>
                 ))}
               </motion.div>
             </>
           )}
         </AnimatePresence>
       </header>


      {/* --- MAIN EDITOR --- */}
      <main className="w-full h-[calc(100dvh-112px)] mt-[112px] flex flex-col items-center relative overflow-hidden">
        <textarea
          ref={textareaRef}
          className={`editor-26 ${isIPhone ? 'iphone-editor !w-[24em]' : '!w-[26em]'} max-w-full flex-1 bg-transparent ${st.textarea} caret-indigo-500 leading-[1.8] text-[24px] font-serif outline-none resize-none overflow-y-auto block touch-pan-y ${st.placeholder} px-4 pb-20`}
          value={content}
          onChange={handleInput}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            const raw = e.currentTarget.value;
            setContent(raw);
            
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(raw);
            if (newHistory.length > 100) newHistory.shift();
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
            
            const cursor = e.currentTarget.selectionEnd || 0;
            recordState(raw, cursor);
          }}
          onSelect={(e) => {
            if (isComposingRef.current) return;
            recordState(content, (e.target as HTMLTextAreaElement).selectionEnd);
          }}
          placeholder="物語を始めましょう..."
          spellCheck={false}
        />
      </main>



      {/* --- TIMELAPSE THEATER --- */}
      <AnimatePresence>
        {showTimeLapse && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-[#050506] flex flex-col overflow-hidden">
             
             {/* Timelapse Controls Bar */}
             <div className="h-16 px-6 flex items-center justify-between shrink-0 bg-black/60 border-b border-white/5 z-20">
               <button onClick={() => { setShowTimeLapse(false); setIsPaused(true); }} className="w-12 h-12 rounded-full hover:bg-white/5 flex items-center justify-center text-neutral-500 transition-all active:scale-75">
                 <X size={32} />
               </button>
               
               <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-full border border-white/10 shadow-inner">
                 {[0.5, 1, 2, 4, 8].map(s => (
                   <button key={s} onClick={() => setPlaybackSpeed(s)} className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${playbackSpeed === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}>
                     {s}x
                   </button>
                 ))}
               </div>

                <div className="flex items-center gap-2">
                  {/* 動画背景色選択（パレット） */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowTimeLapseBgSelector(!showTimeLapseBgSelector)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 shrink-0 bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 ${showTimeLapseBgSelector ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' : ''}`}
                      title="動画背景色を変更"
                    >
                      <Palette size={18} className={showTimeLapseBgSelector ? "rotate-12 transition-transform duration-300" : "transition-transform duration-300 hover:rotate-6"} />
                    </button>
                    
                    <AnimatePresence>
                      {showTimeLapseBgSelector && (
                        <>
                          <div className="fixed inset-0 z-[120]" onClick={() => setShowTimeLapseBgSelector(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 top-11 w-44 rounded-2xl border p-2 z-[130] flex flex-col gap-1 bg-[#121214] border-white/10 shadow-2xl"
                          >
                            <span className="text-[8px] font-bold tracking-widest text-neutral-500 uppercase px-2 py-1">BACKGROUND THEME</span>
                            {[
                              { key: 'black' as CanvasBgType, label: 'Cosmic Slate', css: 'bg-[#0a0a0b] border-white/10' },
                              { key: 'gray' as CanvasBgType, label: 'Silent Mist', css: 'bg-[#2e3035] border-white/5' },
                              { key: 'white' as CanvasBgType, label: 'Pure Ivory', css: 'bg-[#faf8f5] border-slate-200' },
                            ].map((item) => (
                              <button
                                key={item.key}
                                onClick={() => {
                                  setCanvasBg(item.key);
                                  showToast(`背景を${item.label}に変更しました`);
                                  setShowTimeLapseBgSelector(false);
                                }}
                                className={`flex items-center gap-3 px-2 py-2 rounded-xl text-[11px] font-bold transition-all relative text-neutral-300 hover:bg-white/5 hover:text-white ${canvasBg === item.key ? 'bg-indigo-500/10 text-indigo-400' : ''}`}
                              >
                                <span className={`w-3.5 h-3.5 rounded-full border ${item.css} flex items-center justify-center shrink-0`}>
                                  {canvasBg === item.key && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                                </span>
                                {item.label}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => {
                      if (!isWebCodecsSupported) {
                        showToast('お使いのブラウザは動画生成非対応です');
                        return;
                      }
                      setExportRangeMode({ show: true, type: 'download' });
                    }} 
                    disabled={isExporting} 
                    title="ダウンロード" 
                    className={`w-12 h-12 rounded-full hover:bg-white/5 flex items-center justify-center text-indigo-400 transition-all ${!isWebCodecsSupported ? 'opacity-30 cursor-not-allowed' : 'active:scale-75'}`}
                  >
                    <Download size={32} />
                  </button>
                </div>
             </div>

             {/* Canvas Container */}
             <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-black overflow-hidden relative w-full h-full">
               <div 
                 ref={wrapperRef}
                 className="bg-[#0a0a0c] rounded-2xl overflow-hidden shadow-[0_0_120px_-30px_rgba(99,102,241,0.25)] border border-white/5 relative ring-1 ring-white/10 mx-auto active:scale-100 transition-all flex items-center justify-center"
                 style={{
                   aspectRatio: theaterAspect === 'landscape' ? '16/9' : '9/16',
                   width: theaterAspect === 'landscape' ? 'min(100%, (80vh * 16 / 9))' : 'min(100%, (80vh * 9 / 16))',
                   maxHeight: '100%',
                   display: 'block'
                 }}
               >
                  <canvas ref={canvasRef} className="w-full h-full object-contain block" style={{ aspectRatio: theaterAspect === 'landscape' ? '16/9' : '9/16' }} />
                  {isExporting && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6 z-30">
                       {exportError ? (
                         <div className="flex flex-col items-center gap-6 max-w-[320px] text-center p-4 animate-fade-in">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                               <X size={28} />
                            </div>
                            <div className="flex flex-col items-center gap-1.5">
                               <span className="text-[12px] font-bold tracking-[0.2em] text-red-500 uppercase">Error</span>
                               <span className="text-[11px] text-neutral-300 leading-relaxed">
                                 {exportError}
                               </span>
                            </div>
                            <button onClick={() => { setIsExporting(false); setExportError(null); }} className="mt-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-[11px] font-bold tracking-widest transition-colors uppercase">CLOSE</button>
                         </div>
                       ) : !exportResult ? (
                         <>
                           <div className="w-14 h-14 border-[5px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-2xl" />
                           <div className="flex flex-col items-center gap-1.5 text-center">
                             <span className="text-[12px] font-bold tracking-[0.2em] text-white uppercase">
                               動画を生成中... {Math.floor(exportProgress)}%
                             </span>
                             <span className="text-[9px] text-neutral-500 tracking-widest uppercase">
                               {exportProgress < 100 ? 'Recording frames...' : 'Finalizing...'}
                             </span>
                           </div>
                           <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                             <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                           </div>
                           <button onClick={() => { exportCanceledRef.current = true; setIsExporting(false); setExportResult(null); }} className="mt-4 text-[10px] text-neutral-600 hover:text-white transition-colors uppercase tracking-widest font-bold">CANCEL</button>
                         </>
                       ) : (
                         <div className="flex flex-col items-center gap-8 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                               <Clock className="animate-pulse" size={32} />
                            </div>
                            <div className="flex flex-col items-center gap-1 text-center">
                               <span className="text-[14px] font-bold tracking-[0.3em] text-white uppercase">Ready to Share</span>
                               <span className="text-[10px] text-neutral-500 tracking-widest uppercase italic">The recording is finalized.</span>
                            </div>
                            <div className="flex gap-4">
                               <button onClick={finalizeShare} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[12px] font-bold tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-3">
                                 <Share2 size={18} /> SNS SHARE
                               </button>
                               <button onClick={finalizeDownload} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full text-[12px] font-bold tracking-widest transition-all active:scale-95 flex items-center gap-3">
                                 <Download size={18} /> DOWNLOAD
                               </button>
                            </div>
                            <button onClick={() => { exportCanceledRef.current = true; setIsExporting(false); setExportResult(null); }} className="mt-4 text-[10px] text-neutral-600 hover:text-white transition-colors uppercase tracking-widest font-bold">CLOSE</button>
                         </div>
                       )}
                    </div>
                  )}
               </div>
             </div>

             {/* Interactive Playback Bar */}
             <div className="h-48 px-10 pb-10 flex flex-col items-center justify-center shrink-0 max-w-5xl mx-auto w-full gap-8">
                <div className="w-full flex items-center gap-8">
                   <button onClick={() => isPaused ? setIsPaused(false) : setIsPaused(true)} className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-all active:scale-90 shadow-[0_15px_30px_rgba(99,102,241,0.3)]">
                     {isPaused ? (isFinished ? <RotateCcw size={28} /> : <Play size={28} fill="currentColor" />) : <Pause size={28} fill="currentColor" />}
                   </button>
                   
                   <div className="flex-1 flex flex-col gap-4">
                     <div className="flex justify-between items-end px-1">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-bold text-neutral-600 tracking-[0.2em] uppercase mb-1">Elapsed</span>
                           <span className="text-[13px] font-mono text-indigo-400 font-bold">{new Date(currentTimeMs).toISOString().substr(14, 5)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] font-bold text-neutral-600 tracking-[0.2em] uppercase mb-1">Total Duration</span>
                           <span className="text-[13px] font-mono text-neutral-500 font-bold">{new Date(totalDuration).toISOString().substr(14, 5)}</span>
                        </div>
                     </div>
                     <input 
                       type="range" 
                       min="0" 
                       max={totalDuration} 
                       value={currentTimeMs} 
                       onChange={handleSeek}
                       className="w-full h-2 bg-white/5 rounded-full appearance-none accent-indigo-500 cursor-pointer transition-all shadow-inner relative z-10 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-lg"
                       style={{ 
                         background: `linear-gradient(to right, #6366f1 ${totalDuration > 0 ? (currentTimeMs / totalDuration) * 100 : 0}%, rgba(255, 255, 255, 0.05) ${totalDuration > 0 ? (currentTimeMs / totalDuration) * 100 : 0}%)` 
                       }}
                     />
                   </div>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10 shadow-inner">
                   <button
                      onClick={() => setTheaterAspect('portrait')}
                      className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 ${theaterAspect === 'portrait' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                    >
                      <Smartphone size={14} /> 縦画面 (9:16)
                    </button>
                    <button
                      onClick={() => setTheaterAspect('landscape')}
                      className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 ${theaterAspect === 'landscape' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                    >
                      <Monitor size={14} /> 横画面 (16:9)
                    </button>
                   <span className="hidden" style={{ display: 'none' }}></span>
                    <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />
                    <button
                      onClick={() => {
                        if (!isWebCodecsSupported) {
                          showToast('お使いのブラウザは動画生成非対応です');
                          return;
                        }
                        setExportRangeMode({ show: true, type: 'share' });
                      }}
                      disabled={isExporting}
                      className="px-4 py-2 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 text-indigo-400 hover:bg-white/5 hover:text-indigo-300 disabled:opacity-30"
                      title="動画をSNS等に共有"
                    >
                      <Share2 size={14} /> 動画を共有
                    </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .editor-26 { font-family: "BIZ UDMincho Mono", "MS Mincho", serif; word-break: break-all; white-space: pre-wrap; box-sizing: border-box; }
        textarea::placeholder { opacity: 0.1; font-style: italic; }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: #6366f1;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.6);
          transition: transform 0.2s;
        }
        input[type='range']::-webkit-slider-thumb:hover { transform: scale(1.2); }
      `}</style>
      {/* --- SETTINGS MENU --- */}
      <AnimatePresence>
        {showSettings && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setShowSettings(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed right-6 top-16 w-52 bg-[#111111] border border-[#333333] rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col py-1"
            >
              <button 
                onClick={handleBackupText}
                className="flex text-left items-center gap-3 px-4 py-3 text-sm font-bold text-neutral-200 hover:bg-white/10 transition-colors"
              >
                <Download size={16} className="text-white" />
                テキストバックアップ
              </button>
              <div className="px-4 py-2 text-[9px] text-neutral-500 font-bold uppercase tracking-widest border-t border-white/5">
                Version {VERSION}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- EXPORT RANGE MODAL --- */}
      <AnimatePresence>
        {exportRangeMode.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-xs bg-[#111111] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-sm font-black text-white text-center mb-6 tracking-[0.2em] uppercase">書き出し範囲を選択</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: '全文', value: 'all' as const },
                  { label: '直近の100文字', value: 'recent100' as const },
                  { label: '今日書いた分', value: 'today' as const },
                ].map((range) => (
                  <button
                    key={range.value}
                    onClick={() => runExport(exportRangeMode.type || 'download', range.value)}
                    className="w-full py-4 text-[11px] font-bold text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                  >
                    {range.label}
                  </button>
                ))}
                <button
                  onClick={() => setExportRangeMode({ show: false, type: null })}
                  className="w-full py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-2"
                >
                  キャンセル
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
