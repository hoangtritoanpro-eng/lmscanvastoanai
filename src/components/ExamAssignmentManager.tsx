// ============================================================================
// EXAM ASSIGNMENT MANAGER - Giao đề cho lớp (LMS) - Phiên bản tối ưu
// - Batch: giao 1 mã đề cho cả lớp
// - Personalized: TỰ ĐỘNG giao mỗi học sinh 1 đề riêng (1 nút bấm)
// - Tùy chỉnh làm lại: bật/tắt, số lần tối đa, cách tính điểm (cao nhất/lần cuối)
// - Danh sách đề đã giao: copy link assignmentId (chuẩn LMS), thu hồi
//
// Cách dùng trong AdminPanel (thay thế toàn bộ khối "LMS: Giao đề cho lớp"):
//   <ExamAssignmentManager
//     exams={generatedBatchResult}
//     generationMode={examConfig.generationMode}
//     grade={examConfig.grade}
//     students={students}
//     classOptions={classOptions}
//   />
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  ClipboardList, LayoutList, Loader2, CheckCircle, XCircle, Copy, Eye,
  Send, UserCheck, AlertTriangle, RotateCcw, Trash2, RefreshCw, Users,
} from 'lucide-react';
import { assignExamToClass, getAssignmentsByClass, AssignmentItem } from '../services/sheetService';
import { assignPersonalizedExams, archiveAssignment, AssignPersonalizedResult } from '../services/levelService';

export interface ManagedExam {
  name: string;
  link: string;
  examId?: string;
  examTitle?: string;
  grade?: number;
  studentEmail?: string;
  studentName?: string;
}

interface Props {
  exams: ManagedExam[];
  generationMode: 'batch' | 'personalized';
  grade: number;
  students: any[];
  classOptions: string[];
  assignedBy?: string;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
};

const ExamAssignmentManager: React.FC<Props> = ({
  exams, generationMode, grade, students, classOptions, assignedBy,
}) => {
  // ==================== CẤU HÌNH GIAO ĐỀ ====================
  const [className, setClassName] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);

  // ★ TÙY CHỈNH LÀM LẠI
  const [allowRetake, setAllowRetake] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [scorePolicy, setScorePolicy] = useState<'best' | 'last'>('best');

  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showAnswerAfter, setShowAnswerAfter] = useState(false);

  // ==================== TRẠNG THÁI ====================
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assignResult, setAssignResult] = useState<AssignPersonalizedResult | null>(null);

  const [listClass, setListClass] = useState('');
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const effectiveMaxAttempts = allowRetake ? Math.max(2, maxAttempts) : 1;

  const settings = useMemo(() => ({
    shuffleQuestions, shuffleOptions, showAnswerAfter,
    allowRetake, scorePolicy,
  }), [shuffleQuestions, shuffleOptions, showAnswerAfter, allowRetake, scorePolicy]);

  // Học sinh của lớp đã chọn
  const classStudents = useMemo(() => {
    if (!className.trim()) return [];
    const cls = className.trim().toLowerCase();
    return students.filter((s: any) =>
      String(s.class ?? s.className ?? '').trim().toLowerCase() === cls
    );
  }, [students, className]);

  // Ghép đề cá nhân hóa ↔ học sinh trong lớp
  const personalizedMatch = useMemo(() => {
    if (generationMode !== 'personalized') return { matched: [] as any[], missingStudents: [] as any[], orphanExams: [] as ManagedExam[] };
    const byEmail = new Map<string, ManagedExam>();
    exams.forEach(e => { if (e.studentEmail) byEmail.set(e.studentEmail.toLowerCase(), e); });

    const matched: Array<{ student: any; exam: ManagedExam }> = [];
    const missingStudents: any[] = [];
    classStudents.forEach((s: any) => {
      const ex = byEmail.get(String(s.email || '').toLowerCase());
      if (ex && ex.examId) { matched.push({ student: s, exam: ex }); byEmail.delete(String(s.email).toLowerCase()); }
      else missingStudents.push(s);
    });
    const orphanExams = Array.from(byEmail.values());
    return { matched, missingStudents, orphanExams };
  }, [exams, classStudents, generationMode]);

  // ==================== HANDLERS ====================

  const toISO = (local: string) => (local ? new Date(local).toISOString() : '');

  const handleAssignBatch = async (exam: ManagedExam) => {
    if (!exam.examId) { setMessage({ type: 'error', text: 'Thiếu examId' }); return; }
    if (!className.trim()) { setMessage({ type: 'error', text: 'Vui lòng chọn lớp trước' }); return; }
    setBusy(true);
    setMessage(null);
    try {
      const res = await assignExamToClass({
        examId: exam.examId,
        examTitle: exam.examTitle || exam.name,
        grade: exam.grade ?? grade,
        className: className.trim(),
        assignedBy,
        openAt: toISO(openAt) || new Date().toISOString(),
        dueAt: toISO(dueAt),
        durationMinutes: Number(durationMinutes) || 45,
        maxAttempts: effectiveMaxAttempts,
        settings,
      });
      if (res) {
        setMessage({ type: 'success', text: `✅ Đã giao "${exam.examTitle || exam.name}" cho lớp ${className}${allowRetake ? ` (được làm ${effectiveMaxAttempts} lần, tính điểm ${scorePolicy === 'best' ? 'cao nhất' : 'lần cuối'})` : ' (làm 1 lần)'}` });
        if (listClass.trim() === className.trim()) loadAssignments(listClass);
      } else {
        setMessage({ type: 'error', text: 'Giao đề thất bại' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Lỗi khi giao đề' });
    }
    setBusy(false);
  };

  const handleAssignPersonalized = async () => {
    const { matched } = personalizedMatch;
    if (matched.length === 0) { setMessage({ type: 'error', text: 'Không có cặp Học sinh ↔ Đề nào khớp. Kiểm tra lại lớp đã chọn.' }); return; }
    if (!confirm(`Giao tự động ${matched.length} đề riêng cho ${matched.length} học sinh lớp ${className}?`)) return;

    setBusy(true);
    setMessage(null);
    setAssignResult(null);
    try {
      const result = await assignPersonalizedExams({
        className: className.trim(),
        grade,
        assignedBy,
        openAt: toISO(openAt) || new Date().toISOString(),
        dueAt: toISO(dueAt),
        durationMinutes: Number(durationMinutes) || 45,
        maxAttempts: effectiveMaxAttempts,
        settings,
        exams: matched.map(({ student, exam }) => ({
          examId: exam.examId!,
          examTitle: exam.examTitle || exam.name,
          studentEmail: student.email,
          studentName: student.name,
        })),
      });
      if (result) {
        setAssignResult(result);
        setMessage({
          type: result.failed.length === 0 ? 'success' : 'error',
          text: result.failed.length === 0
            ? `✅ Đã giao thành công ${result.success}/${result.total} đề — mỗi bạn 1 đề riêng!`
            : `⚠ Giao được ${result.success}/${result.total} đề. ${result.failed.length} đề lỗi (xem chi tiết bên dưới).`,
        });
        if (listClass.trim() === className.trim()) loadAssignments(listClass);
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Lỗi khi giao đề cá nhân hóa' });
    }
    setBusy(false);
  };

  const loadAssignments = async (cls: string) => {
    if (!cls.trim()) return;
    setListLoading(true);
    try {
      const res = await getAssignmentsByClass(cls.trim());
      setAssignments(Array.isArray(res) ? res : []);
    } catch { setAssignments([]); }
    setListLoading(false);
  };

  const handleArchive = async (a: AssignmentItem) => {
    if (!confirm(`Thu hồi bài "${a.examTitle}"? Học sinh sẽ không thấy bài này nữa.`)) return;
    setBusy(true);
    const ok = await archiveAssignment(a.assignmentId);
    setMessage(ok
      ? { type: 'success', text: `Đã thu hồi "${a.examTitle}"` }
      : { type: 'error', text: 'Thu hồi thất bại' });
    if (ok) loadAssignments(listClass);
    setBusy(false);
  };

  const copyAssignmentLink = (assignmentId: string) => {
    const link = `${window.location.origin}${window.location.pathname}?assignmentId=${assignmentId}`;
    navigator.clipboard.writeText(link);
    setMessage({ type: 'success', text: 'Đã copy link bài được giao (học sinh cần đăng nhập, hệ thống tự kiểm soát số lần làm).' });
  };

  if (exams.length === 0) return null;

  // ==================== RENDER ====================
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="font-black text-slate-800 flex items-center gap-3 text-2xl">
          <ClipboardList className="text-teal-500" size={28} /> Giao đề cho lớp
        </h3>
        <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${generationMode === 'personalized' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
          {generationMode === 'personalized' ? '👤 Chế độ: Mỗi bạn 1 đề (tự động)' : '📋 Chế độ: Mã đề chung'}
        </span>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex justify-between items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="font-bold flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />} {message.text}
          </span>
          <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100"><XCircle size={16} /></button>
        </div>
      )}

      {/* ── CẤU HÌNH CHUNG ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Lớp *</label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700"
          >
            <option value="">-- Chọn lớp --</option>
            {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Mở đề lúc</label>
          <input type="datetime-local" value={openAt} onChange={(e) => setOpenAt(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700" />
          <div className="text-xs text-slate-400 mt-1">Trống = mở ngay</div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Hạn nộp</label>
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700" />
          <div className="text-xs text-slate-400 mt-1">Trống = không giới hạn</div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Thời lượng (phút)</label>
          <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700" />
        </div>
      </div>

      {/* ── ★ TÙY CHỈNH LÀM LẠI ── */}
      <div className={`p-5 rounded-3xl border-2 transition-all ${allowRetake ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`relative w-12 h-7 rounded-full transition ${allowRetake ? 'bg-indigo-500' : 'bg-slate-300'}`}
              onClick={() => setAllowRetake(v => !v)}>
              <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${allowRetake ? 'left-6' : 'left-1'}`} />
            </div>
            <span className="font-black text-slate-800 flex items-center gap-2">
              <RotateCcw size={16} className={allowRetake ? 'text-indigo-600' : 'text-slate-400'} /> Cho phép làm lại
            </span>
          </label>

          {allowRetake ? (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 uppercase">Số lần tối đa</span>
                <input type="number" min={2} max={10} value={effectiveMaxAttempts}
                  onChange={(e) => setMaxAttempts(Math.max(2, Math.min(10, Number(e.target.value))))}
                  className="w-20 px-3 py-2 rounded-xl border border-indigo-200 bg-white font-black text-indigo-700 text-center" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 uppercase">Tính điểm</span>
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-indigo-200">
                  <button onClick={() => setScorePolicy('best')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${scorePolicy === 'best' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50'}`}>
                    Lần cao nhất
                  </button>
                  <button onClick={() => setScorePolicy('last')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${scorePolicy === 'last' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-indigo-50'}`}>
                    Lần cuối cùng
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-500 font-medium">Học sinh chỉ được làm <b>1 lần duy nhất</b></span>
          )}
        </div>
      </div>

      {/* ── Cài đặt khác ── */}
      <div className="flex flex-wrap gap-5 items-center text-sm">
        <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} className="w-4 h-4 accent-teal-600" />
          Đảo câu hỏi
        </label>
        <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} className="w-4 h-4 accent-teal-600" />
          Đảo đáp án
        </label>
        <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={showAnswerAfter} onChange={(e) => setShowAnswerAfter(e.target.checked)} className="w-4 h-4 accent-teal-600" />
          Hiện đáp án sau khi nộp
        </label>
      </div>

      {/* ══════════ CHẾ ĐỘ CÁ NHÂN HÓA: GIAO TỰ ĐỘNG ══════════ */}
      {generationMode === 'personalized' ? (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl border-2 border-purple-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-200 flex items-center justify-between flex-wrap gap-3">
            <div className="font-black text-purple-900 flex items-center gap-2">
              <UserCheck size={18} /> Ghép Học sinh ↔ Đề riêng
            </div>
            {className && (
              <div className="text-sm font-bold text-purple-700">
                Khớp: {personalizedMatch.matched.length}/{classStudents.length} học sinh lớp {className}
              </div>
            )}
          </div>

          {!className ? (
            <div className="p-8 text-center text-purple-400 font-medium">
              <Users size={40} className="mx-auto mb-2 opacity-40" />
              Chọn lớp ở trên để hệ thống tự động ghép đề với từng học sinh
            </div>
          ) : (
            <>
              {personalizedMatch.missingStudents.length > 0 && (
                <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium flex gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    {personalizedMatch.missingStudents.length} học sinh chưa có đề: {personalizedMatch.missingStudents.slice(0, 5).map((s: any) => s.name).join(', ')}
                    {personalizedMatch.missingStudents.length > 5 ? '...' : ''}. Hãy tạo lại đề ở chế độ "Mỗi bạn 1 đề" nếu thiếu.
                  </div>
                </div>
              )}

              <div className="p-6 max-h-80 overflow-y-auto space-y-2">
                {personalizedMatch.matched.map(({ student, exam }, i) => {
                  const rowResult = assignResult?.assignments.find(a => a.studentEmail === student.email);
                  const rowFail = assignResult?.failed.find(f => f.studentEmail === student.email);
                  return (
                    <div key={student.email} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-purple-100">
                      <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 truncate">{student.name}</div>
                        <div className="text-xs text-slate-400 font-mono truncate">{student.email}</div>
                      </div>
                      <div className="text-xs text-slate-500 font-medium truncate max-w-[200px] hidden md:block">↔ {exam.examTitle || exam.name}</div>
                      {rowResult && <CheckCircle size={18} className="text-green-500 shrink-0" />}
                      {rowFail && <span title={rowFail.reason}><XCircle size={18} className="text-red-500 shrink-0" /></span>}
                    </div>
                  );
                })}
              </div>

              <div className="px-6 pb-6">
                <button
                  onClick={handleAssignPersonalized}
                  disabled={busy || personalizedMatch.matched.length === 0}
                  className="w-full py-4 rounded-2xl font-black text-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 flex items-center justify-center gap-3 shadow-lg shadow-purple-100 transition"
                >
                  {busy ? <><Loader2 className="animate-spin" size={20} /> Đang giao đề...</>
                    : <><Send size={20} /> Giao tự động {personalizedMatch.matched.length} đề — mỗi bạn 1 đề riêng</>}
                </button>
                <div className="text-xs text-purple-500 mt-2 text-center font-medium">
                  Mỗi học sinh sẽ chỉ nhìn thấy đúng đề của mình trong mục "Đề được giao"
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ══════════ CHẾ ĐỘ BATCH: GIAO MÃ ĐỀ CHUNG ══════════ */
        <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 font-black text-slate-800">Chọn đề để giao cho cả lớp</div>
          <div className="divide-y divide-slate-200">
            {exams.map((ex, i) => (
              <div key={i} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-slate-800 truncate">{ex.examTitle || ex.name}</div>
                  <div className="text-sm text-slate-500 font-medium truncate">{ex.link}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => window.open(ex.link)}
                    className="px-4 py-3 rounded-2xl border border-slate-200 bg-white font-black text-teal-600 hover:bg-teal-50">
                    <Eye size={16} className="inline mr-1" /> Xem
                  </button>
                  <button
                    onClick={() => handleAssignBatch(ex)}
                    disabled={busy || !className.trim() || !ex.examId}
                    className="px-5 py-3 rounded-2xl bg-teal-600 text-white font-black hover:bg-teal-700 disabled:opacity-50"
                  >
                    Giao cho lớp {className || '...'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ DANH SÁCH ĐỀ ĐÃ GIAO ══════════ */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="font-black text-slate-800 flex items-center gap-2">
            <LayoutList size={18} className="text-slate-500" /> Danh sách đề đã giao
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={listClass} onChange={(e) => setListClass(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700">
              <option value="">-- Chọn lớp --</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => loadAssignments(listClass)}
              disabled={!listClass.trim() || listLoading}
              className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2">
              {listLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Tải danh sách
            </button>
          </div>
        </div>

        <div className="p-6">
          {listLoading ? (
            <div className="flex items-center gap-3 text-slate-500 font-medium"><Loader2 className="animate-spin" size={18} /> Đang tải...</div>
          ) : assignments.length === 0 ? (
            <div className="text-slate-500 font-medium">Chưa có dữ liệu. Chọn lớp và bấm "Tải danh sách".</div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a: any) => {
                const personal = a.studentEmail && String(a.studentEmail).trim();
                const archived = String(a.status || '').toUpperCase() === 'ARCHIVED';
                return (
                  <div key={a.assignmentId}
                    className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${archived ? 'border-slate-200 bg-slate-100 opacity-60' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="min-w-0">
                      <div className="font-black text-slate-800 truncate flex items-center gap-2 flex-wrap">
                        {a.examTitle}
                        {personal && <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg">👤 {a.studentEmail}</span>}
                        {archived && <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">ĐÃ THU HỒI</span>}
                      </div>
                      <div className="text-sm text-slate-500 font-medium mt-1">
                        Lớp <span className="font-bold text-slate-700">{a.className}</span>
                        {' '}• Mở: {formatDate(a.openAt)} • Hạn: {a.dueAt ? formatDate(a.dueAt) : '—'}
                        {' '}• {a.maxAttempts > 1 ? `Được làm ${a.maxAttempts} lần` : 'Làm 1 lần'}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => copyAssignmentLink(a.assignmentId)}
                        className="px-4 py-3 rounded-2xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                        <Copy size={15} /> Copy link
                      </button>
                      {!archived && (
                        <button onClick={() => handleArchive(a)}
                          className="px-4 py-3 rounded-2xl border border-red-100 bg-red-50 font-black text-red-500 hover:bg-red-100 flex items-center gap-1.5">
                          <Trash2 size={15} /> Thu hồi
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamAssignmentManager;
