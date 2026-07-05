// ============================================================================
// CLASS LEVEL PROGRESS - GV theo dõi tiến độ level của cả lớp theo chuyên đề
// - Ma trận: Học sinh × Chuyên đề, mỗi ô là level đã mở (1-5)
// - Bấm vào ô để MỞ KHÓA THỦ CÔNG level cho học sinh (trường hợp đặc biệt)
//
// Cách dùng trong AdminPanel (thêm 1 chế độ mới vào tab "Theo dõi học sinh"):
//   <ClassLevelProgress classOptions={classOptions} grade={12} />
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Loader2, RefreshCw, TrendingUp, Lock, Unlock, CheckCircle, XCircle } from 'lucide-react';
import { fetchClassTopicProgress, setStudentTopicLevel, StudentTopicProgressRow } from '../services/levelService';

const MAX_LEVEL = 5;

interface Props {
  classOptions: string[];
  /** Khối lớp mặc định để lọc key progress `${grade}_${topic}` */
  defaultGrade?: number;
}

const levelColor = (lv: number) => {
  if (lv >= MAX_LEVEL) return 'bg-emerald-500 text-white';
  if (lv >= 4) return 'bg-teal-500 text-white';
  if (lv >= 3) return 'bg-blue-500 text-white';
  if (lv >= 2) return 'bg-amber-400 text-white';
  return 'bg-slate-200 text-slate-600';
};

const ClassLevelProgress: React.FC<Props> = ({ classOptions, defaultGrade = 12 }) => {
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState(defaultGrade);
  const [rows, setRows] = useState<StudentTopicProgressRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null); // `${email}|${topic}`

  const load = async () => {
    if (!className.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchClassTopicProgress(className.trim(), grade);
      setRows(data);
      if (data.length === 0) setMessage({ type: 'error', text: 'Không tìm thấy học sinh nào trong lớp này.' });
    } catch {
      setRows([]);
      setMessage({ type: 'error', text: 'Lỗi khi tải tiến độ lớp.' });
    }
    setLoading(false);
  };

  // Tập hợp tất cả chuyên đề (theo grade) mà học sinh trong lớp đã có tiến độ
  const topics = useMemo(() => {
    const set = new Set<string>();
    const prefix = `${grade}_`;
    rows.forEach(r => {
      Object.keys(r.progress || {}).forEach(k => {
        if (k.startsWith(prefix)) set.add(k.slice(prefix.length));
      });
    });
    return Array.from(set).sort();
  }, [rows, grade]);

  const getLevel = (r: StudentTopicProgressRow, topic: string) =>
    Math.max(1, Number(r.progress?.[`${grade}_${topic}`]) || 1);

  const handleUnlock = async (r: StudentTopicProgressRow, topic: string) => {
    const current = getLevel(r, topic);
    const input = prompt(
      `Mở khóa thủ công cho ${r.name}\nChuyên đề: ${topic}\nLevel hiện tại: ${current}\n\nNhập level muốn mở (1-${MAX_LEVEL}):`,
      String(Math.min(MAX_LEVEL, current + 1))
    );
    if (input === null) return;
    const lv = Math.max(1, Math.min(MAX_LEVEL, Number(input) || 1));

    const key = `${r.email}|${topic}`;
    setUnlocking(key);
    const ok = await setStudentTopicLevel(r.email, grade, topic, lv);
    setUnlocking(null);
    if (ok) {
      setRows(prev => prev.map(row =>
        row.email === r.email
          ? { ...row, progress: { ...row.progress, [`${grade}_${topic}`]: lv } }
          : row
      ));
      setMessage({ type: 'success', text: `Đã đặt level ${lv} cho ${r.name} — ${topic}` });
    } else {
      setMessage({ type: 'error', text: 'Mở khóa thất bại. Kiểm tra backend.' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Bộ lọc */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Lớp</label>
          <select value={className} onChange={(e) => setClassName(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 min-w-[160px]">
            <option value="">-- Chọn lớp --</option>
            {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Khối</label>
          <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700">
            {[6, 7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Lớp {g}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={!className.trim() || loading}
          className="px-6 py-3 rounded-2xl bg-teal-600 text-white font-black hover:bg-teal-700 disabled:opacity-40 flex items-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
          Xem tiến độ
        </button>
        {rows.length > 0 && (
          <button onClick={load} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:bg-teal-50 text-teal-600" title="Tải lại">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs font-bold text-slate-500 self-center flex-wrap">
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-slate-200 inline-block" /> Lv 1</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-amber-400 inline-block" /> Lv 2</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-blue-500 inline-block" /> Lv 3</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-teal-500 inline-block" /> Lv 4</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-500 inline-block" /> Lv 5 ✓</span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex justify-between items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="font-bold flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />} {message.text}
          </span>
          <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100"><XCircle size={16} /></button>
        </div>
      )}

      {/* Ma trận tiến độ */}
      {rows.length > 0 && (
        topics.length === 0 ? (
          <div className="text-center py-14 text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Lock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Học sinh lớp này chưa làm chuyên đề nào của khối {grade}.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 min-w-[200px]">Học sinh</th>
                  {topics.map(t => (
                    <th key={t} className="p-4 text-xs font-black text-slate-500 uppercase tracking-wide text-center min-w-[110px]" title={t}>
                      <div className="max-w-[140px] mx-auto leading-tight normal-case font-bold">{t}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(r => (
                  <tr key={r.email} className="hover:bg-teal-50/10 transition">
                    <td className="p-4 sticky left-0 bg-white z-10">
                      <div className="font-black text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{r.email}</div>
                    </td>
                    {topics.map(t => {
                      const lv = getLevel(r, t);
                      const key = `${r.email}|${t}`;
                      const done = lv >= MAX_LEVEL;
                      return (
                        <td key={t} className="p-3 text-center">
                          <button
                            onClick={() => handleUnlock(r, t)}
                            disabled={unlocking === key}
                            title={`Level đã mở: ${lv}${done ? ' (hoàn thành)' : ''} — bấm để mở khóa thủ công`}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-sm transition hover:scale-105 hover:shadow ${levelColor(lv)}`}
                          >
                            {unlocking === key
                              ? <Loader2 size={13} className="animate-spin" />
                              : done ? <CheckCircle size={13} /> : <Unlock size={12} className="opacity-70" />}
                            Lv {lv}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default ClassLevelProgress;
