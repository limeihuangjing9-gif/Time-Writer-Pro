import React, { useState, useEffect } from 'react';
import { Novel, CanvasBgType } from '../types';
import { Plus, Trash2, ChevronRight, ArrowUpDown, Check, Settings, Pin, PinOff, Edit2, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShelfProps {
  novels: Novel[];
  onSelectNovel: (id: string) => void;
  onAddNovel: (title: string) => void;
  onDeleteNovel: (ids: Set<string>) => void;
  onSwapNovels: (idxA: number, idxB: number) => void;
  onTogglePin: (id: string) => void;
  onUpdateNovelTitle: (id: string, newTitle: string) => void;
  canvasBg: CanvasBgType;
  onSetCanvasBg: (bg: CanvasBgType) => void;
}

const shelfThemeStyles = {
  black: {
    bg: 'bg-[#0a0a0b]',
    text: 'text-neutral-300',
    titleText: 'text-white',
    subText: 'text-neutral-500',
    quoteBox: 'bg-white/5 border-white/5 text-indigo-200/90',
    quoteTitle: 'text-indigo-400',
    card: 'bg-[#141417] border-white/5 hover:bg-[#1c1c22]',
    cardBorder: 'border-white/5',
    cardHover: 'hover:border-indigo-500/30',
    cardText: 'text-neutral-300',
    cardCount: 'text-neutral-500',
    buttonBg: 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white',
    buttonActive: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
    dropdownBg: 'bg-[#121214] border-white/10 shadow-2xl',
    dropdownItem: 'text-neutral-300 hover:bg-white/5 hover:text-white',
    modalBg: 'bg-[#121214] border-white/10'
  },
  gray: {
    bg: 'bg-[#2e3035]',
    text: 'text-neutral-200',
    titleText: 'text-white',
    subText: 'text-neutral-400',
    quoteBox: 'bg-white/5 border border-white/5 text-indigo-200/90',
    quoteTitle: 'text-indigo-400',
    card: 'bg-[#3b3d44] border hover:bg-[#454850]',
    cardBorder: 'border-white/5',
    cardHover: 'hover:border-indigo-500/30',
    cardText: 'text-neutral-200',
    cardCount: 'text-neutral-400',
    buttonBg: 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white',
    buttonActive: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    dropdownBg: 'bg-[#24262a] border-white/10 shadow-2xl',
    dropdownItem: 'text-neutral-200 hover:bg-white/5 hover:text-white',
    modalBg: 'bg-[#24262a] border-white/10 shadow-2xl'
  },
  white: {
    bg: 'bg-[#faf8f5]',
    text: 'text-slate-800',
    titleText: 'text-slate-950',
    subText: 'text-slate-400',
    quoteBox: 'bg-slate-50 border border-slate-200 text-slate-700',
    quoteTitle: 'text-indigo-600',
    card: 'bg-white border border-slate-200/80 hover:bg-slate-50 shadow-md',
    cardBorder: 'border-slate-100',
    cardHover: 'hover:border-indigo-500/40',
    cardText: 'text-slate-700',
    cardCount: 'text-slate-400',
    buttonBg: 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900',
    buttonActive: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/30',
    dropdownBg: 'bg-white border border-slate-200 shadow-xl',
    dropdownItem: 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
    modalBg: 'bg-white border border-slate-200 shadow-2xl'
  }
};

export default function Shelf({ novels, onSelectNovel, onAddNovel, onDeleteNovel, onSwapNovels, onTogglePin, onUpdateNovelTitle, canvasBg, onSetCanvasBg }: ShelfProps) {
  const st = shelfThemeStyles[canvasBg] || shelfThemeStyles.black;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [renameTarget, setRenameTarget] = useState<{id: string, title: string} | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [swapSelectedIdx, setSwapSelectedIdx] = useState<number | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pickupData, setPickupData] = useState<{quote: string, novelTitle: string, episodeTitle: string} | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showBgSelector, setShowBgSelector] = useState(false);

  useEffect(() => {
    if (novels.length > 0) {
      const candidates: {quote: string, novelTitle: string, episodeTitle: string}[] = [];
      novels.forEach(n => {
        if (!n || !Array.isArray(n.episodes)) return;
        n.episodes.forEach(e => {
          if (!e.content) return;
          const rawSentences = e.content.split(/([。！？\n])/);
          const sentences: string[] = [];
          for (let i = 0; i < rawSentences.length; i += 2) {
            const s = (rawSentences[i] || '').trim();
            const p = rawSentences[i+1] || '';
            if (s.length > 5) sentences.push(s + p);
          }
          sentences.forEach(s => {
            candidates.push({ quote: s, novelTitle: n.title, episodeTitle: e.title });
          });
        });
      });
      if (candidates.length > 0) {
        const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
        setPickupData(randomItem);
      }
    }
  }, [novels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAddNovel(newTitle.trim());
      setNewTitle('');
      setIsModalOpen(false);
    }
  };

  const handleItemClick = (novelId: string, index: number, title: string) => {
    if (editMode) {
      setRenameTarget({ id: novelId, title });
      return;
    }
    if (deleteMode) {
      const next = new Set(selectedIds);
      if (next.has(novelId)) next.delete(novelId);
      else next.add(novelId);
      setSelectedIds(next);
      return;
    }

    if (reorderMode) {
      if (swapSelectedIdx === null) {
        setSwapSelectedIdx(index);
      } else {
        if (swapSelectedIdx !== index) {
          onSwapNovels(swapSelectedIdx, index);
        }
        setSwapSelectedIdx(null);
      }
    } else {
      onSelectNovel(novelId);
    }
  };

  const executeDelete = () => {
    onDeleteNovel(selectedIds);
    setSelectedIds(new Set());
    setDeleteMode(false);
    setIsDeleteConfirmOpen(false);
  };

  return (
    <div className={`min-h-screen p-4 sm:p-6 pt-6 sm:pt-8 animate-fade-in relative z-10 ${st.bg} ${st.text}`}>
      <header className="mb-4 flex justify-between items-start relative z-30">
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex flex-[0_0_auto] flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 relative ${st.titleText}`}>
          <div className="flex items-baseline relative">
            <span className="font-sans italic pr-1">Time<span className="text-indigo-500">×</span>Writer<span className="text-indigo-400 not-italic font-bold ml-0.5">：Pro</span></span>
            <span className={`text-[10px] font-mono absolute -right-6 -bottom-1 ${st.subText}`}>v1.6.4</span>
          </div>
          <span className={`text-sm sm:text-base font-serif font-bold sm:ml-4 ${st.subText}`}>タイム×ライター</span>
        </h1>
        <div className="flex items-center gap-3">
          {!deleteMode && (
            <div className="flex items-center gap-2">
              {/* 背景色選択パレットトグル */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowBgSelector(!showBgSelector)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${st.buttonBg} ${showBgSelector ? 'text-indigo-500 bg-indigo-500/10' : ''}`}
                  title="背景色を切り替え"
                >
                  <Palette size={20} className={showBgSelector ? "rotate-12 transition-transform duration-300" : "transition-transform duration-300 hover:rotate-6"} />
                </button>
                
                <AnimatePresence>
                  {showBgSelector && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowBgSelector(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className={`absolute right-0 top-12 w-44 rounded-2xl border p-2 z-[70] flex flex-col gap-1 ${st.dropdownBg}`}
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
                              onSetCanvasBg(item.key);
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
              </div>

              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${st.buttonBg}`}>
                <Settings size={20} />
              </button>
            </div>
          )}

          {deleteMode && (
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setDeleteMode(false)}
                className="px-4 h-10 bg-white/5 text-neutral-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
              >
                キャンセル
              </button>
              <button 
                type="button"
                onClick={() => selectedIds.size > 0 && setIsDeleteConfirmOpen(true)}
                disabled={selectedIds.size === 0}
                className={`px-4 h-10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.size > 0 ? 'bg-red-600 text-white shadow-lg cursor-pointer' : 'bg-red-600/20 text-red-600/50 cursor-not-allowed'}`}
              >
                削除 ({selectedIds.size})
              </button>
            </div>
          )}
          
          <AnimatePresence>
            {isMenuOpen && !deleteMode && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={`absolute right-0 top-12 w-52 border rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col py-1 ${st.dropdownBg}`}
                >
                  <button 
                    onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); setEditMode(false); }}
                    className={`flex text-left items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${st.dropdownItem}`}
                  >
                    <Plus size={16} strokeWidth={3} />
                    新規プロジェクト
                  </button>
                  <button 
                    onClick={() => { setEditMode(!editMode); setIsMenuOpen(false); setReorderMode(false); setDeleteMode(false); }}
                    className={`flex text-left items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${editMode ? 'bg-indigo-500/20 text-indigo-400' : st.dropdownItem}`}
                  >
                    <Edit2 size={16} strokeWidth={3} />
                    現在のプロジェクト名を変更
                  </button>
                  <div className={`h-[1px] w-full my-1 ${st.cardBorder}`} />
                  <button 
                    onClick={() => { setReorderMode(!reorderMode); setIsMenuOpen(false); setSwapSelectedIdx(null); setDeleteMode(false); setEditMode(false); }}
                    className={`flex text-left items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${reorderMode ? 'bg-indigo-500/20 text-indigo-400' : st.dropdownItem}`}
                  >
                    <ArrowUpDown size={16} />
                    並び替えモード
                  </button>
                  <button 
                    onClick={() => { setDeleteMode(true); setReorderMode(false); setIsMenuOpen(false); setSelectedIds(new Set()); setEditMode(false); }}
                    className={`flex text-left items-center gap-3 px-4 py-3 text-sm font-bold hover:text-red-400 transition-colors group ${st.dropdownItem}`}
                  >
                    <Trash2 size={16} className="text-neutral-500 group-hover:text-red-400 transition-colors" />
                    削除モード
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {pickupData && !deleteMode && !reorderMode && (
        <div className={`mb-4 px-3 py-2 rounded-lg border flex flex-col gap-1.5 shadow-none ${st.quoteBox}`}>
          <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-wide uppercase">
            <span className="truncate max-w-[140px] opacity-80">{pickupData.novelTitle}</span>
            <span className="opacity-40">/</span>
            <span className="truncate max-w-[140px] opacity-60">{pickupData.episodeTitle}</span>
          </div>
          <p className="font-serif italic text-xs leading-snug">
            {pickupData.quote}{!pickupData.quote.match(/[。！？\.\?!]$/) ? '。' : ''}
          </p>
        </div>
      )}

      {(!deleteMode && !reorderMode && !editMode) && (
        <div className={`h-[1px] w-full mb-3 shadow-none hidden ${st.cardBorder}`} />
      )}

      {(reorderMode || deleteMode || editMode) && (
        <div className="mb-6 py-2 px-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest text-center">
            {editMode ? "名前を変更する作品を選択してください" : deleteMode ? "削除する作品を選択してください" : swapSelectedIdx === null ? "入れ替える作品を1つ選んでください" : "入れ換え先の作品を選んでください"}
          </p>
        </div>
      )}

      <div className="pb-24">
        {novels.length === 0 ? (
          <div className={`text-center py-20 font-sans italic text-sm border border-dashed rounded-3xl ${st.cardBorder} opacity-65`}>
            本棚は空です。
          </div>
        ) : (
          <div className="space-y-3">
            {(reorderMode ? novels : [...novels].sort((a, b) => Number(b.isPinned || false) - Number(a.isPinned || false))).map((novel) => {
              const originalIndex = novels.findIndex(n => n.id === novel.id);
              return (
                <ProjectCard 
                  key={novel.id} 
                  novel={novel} 
                  isSelected={deleteMode ? selectedIds.has(novel.id) : (reorderMode && swapSelectedIdx === originalIndex)}
                  reorderMode={reorderMode}
                  deleteMode={deleteMode}
                  editMode={editMode}
                  onClick={() => handleItemClick(novel.id, originalIndex, novel.title)}
                  onTogglePin={() => onTogglePin(novel.id)}
                  onUpdateTitle={(newTitle) => onUpdateNovelTitle(novel.id, newTitle)}
                  canvasBg={canvasBg}
                />
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
            <motion.form initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onSubmit={handleSubmit} className={`w-full max-w-sm p-8 rounded-[40px] border shadow-2xl ${st.modalBg}`}>
              <h2 className={`text-lg font-black mb-6 tracking-tight text-center ${st.titleText}`}>作品を立ち上げる</h2>
              <input autoFocus type="text" placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={`w-full border rounded-2xl p-4 outline-none focus:border-indigo-500 transition-all mb-6 font-sans text-center text-base font-bold bg-neutral-500/10 ${st.cardBorder} ${st.titleText}`} />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] ${st.subText}`}>Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-transform">Create</button>
              </div>
            </motion.form>
          </motion.div>
        )}

        {renameTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-6">
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              onSubmit={(e) => {
                e.preventDefault();
                if (renameTarget.title.trim()) {
                  onUpdateNovelTitle(renameTarget.id, renameTarget.title.trim());
                }
                setRenameTarget(null);
                setEditMode(false);
              }} 
              className={`w-full max-w-sm p-8 rounded-[40px] border shadow-2xl ${st.modalBg}`}
            >
              <h2 className={`text-lg font-black mb-6 tracking-tight text-center ${st.titleText}`}>プロジェクト名を変更</h2>
              <input 
                autoFocus 
                type="text" 
                value={renameTarget.title} 
                onChange={(e) => setRenameTarget({...renameTarget, title: e.target.value})} 
                className={`w-full border rounded-2xl p-4 outline-none focus:border-indigo-500 transition-all mb-6 font-sans text-center text-base font-bold bg-neutral-500/10 ${st.cardBorder} ${st.titleText}`} 
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => { setRenameTarget(null); setEditMode(false); }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] ${st.subText}`}>Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-transform">Save</button>
              </div>
            </motion.form>
          </motion.div>
        )}

        {isDeleteConfirmOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`w-full max-w-xs p-8 rounded-[40px] border border-red-500/20 shadow-2xl text-center ${st.modalBg}`}>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h2 className={`text-lg font-black mb-2 tracking-tight ${st.titleText}`}>本当に削除しますか？</h2>
              <p className={`text-xs mb-8 leading-relaxed italic ${st.subText}`}>選択した {selectedIds.size} 件の作品を完全に削除します。この操作は取り消せません。</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={executeDelete}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-transform shadow-lg shadow-red-600/20"
                >
                  削除する
                </button>
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] ${st.subText}`}
                >
                  戻る
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CardProps {
  novel: Novel;
  isSelected: boolean;
  reorderMode: boolean;
  deleteMode: boolean;
  editMode: boolean;
  onClick: () => void;
  onTogglePin: () => void;
  onUpdateTitle: (newTitle: string) => void;
  canvasBg?: CanvasBgType;
  key?: React.Key;
}

function ProjectCard({ novel, isSelected, reorderMode, deleteMode, editMode, onClick, onTogglePin, onUpdateTitle, canvasBg }: CardProps) {
  const st = shelfThemeStyles[canvasBg || 'black'] || shelfThemeStyles.black;
  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick()}
      className={`relative z-10 p-4 rounded-[20px] flex justify-between items-center group transition-all cursor-pointer select-none border \
        ${isSelected ? (deleteMode ? 'border-red-500 bg-red-500/10' : 'border-indigo-500 bg-indigo-500/10') : `${st.card} ${st.cardBorder} opacity-95 ${st.cardHover}`}`}
    >
      <div className="flex-1 flex items-center gap-3 pointer-events-none">
        {deleteMode && (
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-red-500 border-red-500' : 'border-white/10'}`}>
            {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
          </div>
        )}
        {editMode && !deleteMode && (
          <div className="w-4 h-4 flex items-center justify-center transition-all text-neutral-400">
            <Edit2 size={14} className="text-indigo-400" />
          </div>
        )}
        <div className="flex-1 pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[7px] font-black tracking-[0.2em] px-1.5 py-0.5 rounded transition-colors ${isSelected ? (deleteMode ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white') : 'bg-indigo-500/10 text-indigo-400'}`}>PROJECT</span>
            <span className={`text-[7px] font-bold tracking-widest ${st.subText}`}>{novel.id.slice(0, 8).toUpperCase()}</span>
            {novel.isPinned && !reorderMode && !deleteMode && (
              <Pin size={10} className="text-indigo-300 fill-indigo-300" />
            )}
          </div>
          
          <div className="flex items-center gap-2 group/title">
            <h3 className={`text-base font-bold tracking-tight line-clamp-1 leading-snug ${st.titleText}`}>
              {novel.title}
            </h3>
          </div>

          <div className="flex items-center gap-3 mt-2 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 bg-green-500/80 rounded-full animate-pulse" />
              <span className={`text-[8px] font-black uppercase tracking-widest ${st.cardText}`}>{novel.episodes.length} Episodes</span>
            </div>
            <div className={`w-[1px] h-2 ${st.cardBorder}`} />
            <span className={`text-[7px] font-bold tracking-[0.05em] uppercase ${st.subText}`}>
              Update: {new Date(novel.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      {!deleteMode && !reorderMode && !editMode && (
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${novel.isPinned ? 'hover:bg-indigo-500/20' : 'hover:bg-white/10'}`}
          >
            <Pin size={14} className={novel.isPinned ? 'text-indigo-400 fill-indigo-400' : 'text-neutral-400 hover:text-neutral-200'} />
          </button>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors pointer-events-none ${isSelected ? 'bg-indigo-500/20' : st.buttonBg}`}>
            <ChevronRight size={14} className={isSelected ? 'text-indigo-300' : 'text-neutral-400'} />
          </div>
        </div>
      )}
      {reorderMode && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors pointer-events-none ${st.buttonBg}`}>
          <ArrowUpDown size={14} className={isSelected ? 'text-indigo-300' : 'text-neutral-400'} />
        </div>
      )}
    </motion.div>
  );
}
