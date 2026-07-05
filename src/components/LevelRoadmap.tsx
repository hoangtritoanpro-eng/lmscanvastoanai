// ============================================================================
// LEVEL ROADMAP - Lộ trình chuyên đề theo Level (khóa tuần tự)
// - Level N chỉ mở khi Level N-1 đạt >= PASS_THRESHOLD (mặc định 80%)
// - Mỗi level 20 câu (hiển thị thông tin, backend giới hạn thực tế)
// - 3 trạng thái: Hoàn thành (xanh lá) / Đang mở (teal, nổi bật) / Khóa (xám)
// ============================================================================

import React from 'react';
import { Lock, CheckCircle, Play, RotateCcw, Star, Target, Trophy, ChevronRight } from 'lucide-react';

export const PASS_THRESHOLD = 80;
export const QUESTIONS_PER_LEVEL = 20;
export const MAX_LEVEL = 5;

const LEVEL_NAMES: Record<number, string> = {
  1: 'Khởi động',
  2: 'Cơ bản',
  3: 'Thành thạo',
  4: 'Nâng cao',
  5: 'Chinh phục',
};

interface LevelRoadmapProps {
  topic: string;
  /** Level cao nhất học sinh được phép làm (từ Users.progress, mặc định 1) */
  unlockedLevel: number;
  /** Điểm % tốt nhất từng level (tùy chọn, key = level) */
  bestScores?: Record<number, number>;
  onStartLevel: (level: number) => void;
  loading?: boolean;
  totalLevels?: number;
}

const LevelRoadmap: React.FC<LevelRoadmapProps> = ({
  topic,
  unlockedLevel,
  bestScores = {},
  onStartLevel,
  loading = false,
  totalLevels = MAX_LEVEL,
}) => {
  const safeUnlocked = Math.max(1, Math.min(totalLevels, Number(unlockedLevel) || 1));
  const completedCount = safeUnlocked - 1;
  const allDone = completedCount >= totalLevels || (safeUnlocked === totalLevels && (bestScores[totalLevels] ?? 0) >= PASS_THRESHOLD);
  const progressPct = Math.round((completedCount / totalLevels) * 100);

  const levelState = (lv: number): 'completed' | 'current' | 'locked' => {
    if (lv < safeUnlocked) return 'completed';
    if (lv === safeUnlocked) return 'current';
    return 'locked';
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
      {/* Header + tổng tiến độ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Target size={20} className="text-teal-600" /> Lộ trình chinh phục
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Mỗi level gồm <span className="font-bold text-slate-700">{QUESTIONS_PER_LEVEL} câu</span> · Đạt từ{' '}
            <span className="font-bold text-teal-700">{PASS_THRESHOLD}%</span> trở lên để mở level tiếp theo
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-36 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-sm font-black text-slate-700 whitespace-nowrap">
            {completedCount}/{totalLevels} level
          </span>
        </div>
      </div>

      {allDone && (
        <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-400 text-white flex items-center justify-center shrink-0">
            <Trophy size={24} />
          </div>
          <div>
            <div className="font-black text-amber-900">Xuất sắc! Bạn đã chinh phục toàn bộ chuyên đề này 🎉</div>
            <div className="text-sm text-amber-700 font-medium">Ôn lại bất kỳ level nào để giữ vững phong độ.</div>
          </div>
        </div>
      )}

      {/* Đường lộ trình */}
      <div className="relative">
        {/* Đường nối (desktop: ngang, mobile: dọc) */}
        <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-1 bg-slate-100 rounded-full" />
        <div
          className="hidden md:block absolute top-7 left-[10%] h-1 bg-teal-500 rounded-full transition-all duration-700"
          style={{ width: `${Math.max(0, (completedCount / (totalLevels - 1)) * 80)}%` }}
        />
        <div className="md:hidden absolute left-7 top-8 bottom-8 w-1 bg-slate-100 rounded-full" />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-2 relative">
          {Array.from({ length: totalLevels }, (_, i) => i + 1).map((lv) => {
            const state = levelState(lv);
            const best = bestScores[lv];
            const isCompleted = state === 'completed';
            const isCurrent = state === 'current';
            const isLocked = state === 'locked';

            return (
              <div key={lv} className="flex md:flex-col items-center md:items-center gap-4 md:gap-3 relative">
                {/* Node */}
                <button
                  onClick={() => !isLocked && !loading && onStartLevel(lv)}
                  disabled={isLocked || loading}
                  title={
                    isLocked
                      ? `Hoàn thành Level ${lv - 1} với ít nhất ${PASS_THRESHOLD}% để mở khóa`
                      : isCompleted
                      ? `Ôn lại Level ${lv}`
                      : `Bắt đầu Level ${lv}`
                  }
                  className={`relative z-10 h-14 w-14 rounded-full flex items-center justify-center font-black text-lg border-4 transition-all shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-100 text-white hover:scale-105 shadow-md shadow-emerald-100'
                      : isCurrent
                      ? 'bg-teal-600 border-teal-100 text-white hover:scale-110 shadow-lg shadow-teal-200 ring-4 ring-teal-100'
                      : 'bg-slate-100 border-white text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? <CheckCircle size={26} /> : isLocked ? <Lock size={20} /> : lv}
                </button>

                {/* Nhãn */}
                <div className="flex-1 md:flex-none md:text-center min-w-0">
                  <div className={`font-black text-sm ${isLocked ? 'text-slate-400' : 'text-slate-800'}`}>
                    Level {lv}
                  </div>
                  <div className={`text-xs font-medium ${isLocked ? 'text-slate-300' : 'text-slate-500'}`}>
                    {LEVEL_NAMES[lv] || ''}
                  </div>
                  {isCompleted && best !== undefined && (
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-black">
                      <Star size={10} /> {best}%
                    </div>
                  )}
                  {/* Nút hành động inline trên mobile */}
                  <div className="md:hidden mt-1">
                    {isCurrent && (
                      <button
                        onClick={() => !loading && onStartLevel(lv)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-black text-xs hover:bg-teal-700"
                      >
                        <Play size={12} /> Vào làm
                      </button>
                    )}
                    {isCompleted && (
                      <button
                        onClick={() => !loading && onStartLevel(lv)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100"
                      >
                        <RotateCcw size={11} /> Ôn lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thẻ hành động cho level hiện tại (desktop) */}
      {!allDone && (
        <div className="hidden md:flex mt-8 p-5 rounded-3xl border-2 border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50 items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-xl shrink-0">
              {safeUnlocked}
            </div>
            <div className="min-w-0">
              <div className="font-black text-slate-900 truncate">
                Level {safeUnlocked} · {LEVEL_NAMES[safeUnlocked] || ''} — {topic}
              </div>
              <div className="text-sm text-slate-600 font-medium">
                {QUESTIONS_PER_LEVEL} câu hỏi · Đạt ≥ {PASS_THRESHOLD}% để mở{' '}
                {safeUnlocked < (totalLevels || MAX_LEVEL) ? `Level ${safeUnlocked + 1}` : 'danh hiệu chuyên đề'}
              </div>
            </div>
          </div>
          <button
            onClick={() => !loading && onStartLevel(safeUnlocked)}
            disabled={loading}
            className="px-7 py-4 rounded-2xl bg-teal-600 text-white font-black hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-lg shadow-teal-100"
          >
            <Play size={18} /> Bắt đầu Level {safeUnlocked} <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LevelRoadmap;
