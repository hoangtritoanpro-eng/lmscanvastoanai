// ============================================================================
// ADMIN PANEL - COMPLETE FULL FEATURES VERSION
// All 4 Tabs: Questions, Theory, Exam Creator, Students
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Trash2, Edit, Plus, CheckCircle, XCircle, RefreshCw, Loader2, 
  Sparkles, Eye, Link as LinkIcon, Copy, Send, LayoutList, GraduationCap, 
  ClipboardList, UserCheck, FileUp, Save, FileType, Layers, AlertCircle, 
  BookOpen, Ban, Clock, TrendingUp, AlertTriangle, Target, 
  User as UserIcon, ArrowLeft, Zap
} from 'lucide-react';

import { 
  GOOGLE_SCRIPT_URL, createInstantExam, uploadPDFToGAS, 
  fetchAllTheories, saveTheory, deleteTheory, 
  fetchStudentDetail, fetchResultDetail,
  getAssignmentsByClass,
} from '../services/sheetService';

import { parseWordToSheetQuestions } from '../services/wordToSheetService';
import ContentWithInlineImages from './ContentWithInlineImages';
import ExamAssignmentManager from './ExamAssignmentManager';
import ClassLevelProgress from './ClassLevelProgress';
import { performOCR, parseQuestionsFromMarkdown, generateTheoryFromAI, generateQuestionFromAI } from '../services/geminiService';
import MathText from './MathText';
import Button from './Button';
import Loading from './Loading';
import { Question, Theory, StudentDetail, ResultDetail } from '../types';
import { flattenTopics, TOPIC_DATA, type TopicItem } from '../data/topicData';

interface AdminProps {
  onLogout: () => void;
}

const GRADES = [6, 7, 8, 9, 10, 11, 12];
const LEVELS = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
const THEORY_LEVELS = [1, 2, 3, 4, 5];

type AdminTab = 'questions' | 'theory' | 'exam-creator' | 'students';

const ADMIN_TABS: Array<{
  id: AdminTab;
  icon: typeof ClipboardList;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
}> = [
  { id: 'questions', icon: ClipboardList, label: 'Ngân hàng câu hỏi', shortLabel: 'Câu hỏi', description: 'Biên tập câu hỏi, nhập OCR/Word và kiểm tra dữ liệu', accent: 'from-teal-500 to-emerald-500' },
  { id: 'theory', icon: BookOpen, label: 'Ngân hàng lý thuyết', shortLabel: 'Lý thuyết', description: 'Quản lý học liệu, ví dụ, mẹo và nội dung theo level', accent: 'from-violet-500 to-purple-500' },
  { id: 'exam-creator', icon: Sparkles, label: 'Tạo & giao đề', shortLabel: 'Tạo đề', description: 'Lập ma trận, tạo mã đề và giao đề cho lớp', accent: 'from-amber-500 to-orange-500' },
  { id: 'students', icon: UserCheck, label: 'Theo dõi học sinh', shortLabel: 'Học sinh', description: 'Xem bài đã giao, rà bài làm, theo dõi tiến độ level', accent: 'from-sky-500 to-blue-500' },
];

const adminTealGlassCss = `
  .tp-admin-theme {
    --primary-color: #0d9488;
    --primary-dark: #0f766e;
    --primary-light: #ccfbf1;
    --secondary-color: #14b8a6;
    --accent-color: #5eead4;
    --success-color: #16a34a;
    --warning-color: #d97706;
    --danger-color: #dc2626;
    --text-color: #1f2937;
    --light-text: #6b7280;
    --border-color: rgba(94, 234, 212, 0.65);
    --background-light: #f0fdfa;
    --shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2);
    --teal-gradient: linear-gradient(135deg, #0d9488 0%, #14b8a6 52%, #5eead4 100%);
    --teal-gradient-dark: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
    --shadow-3d: 0 18px 50px rgba(13, 148, 136, 0.28);
    min-height: 100vh;
    background:
      radial-gradient(circle at 12% 8%, rgba(255,255,255,0.88) 0, rgba(255,255,255,0.18) 28%, transparent 46%),
      radial-gradient(circle at 88% 5%, rgba(94,234,212,0.55) 0, rgba(94,234,212,0.12) 33%, transparent 54%),
      linear-gradient(135deg, #ccfbf1 0%, #99f6e4 45%, #5eead4 100%);
  }
  .tp-admin-theme * { scrollbar-width: thin; scrollbar-color: #14b8a6 #f0fdfa; }
  .tp-admin-theme ::-webkit-scrollbar { width: 8px; height: 8px; }
  .tp-admin-theme ::-webkit-scrollbar-track { background: var(--background-light); }
  .tp-admin-theme ::-webkit-scrollbar-thumb { background: var(--teal-gradient); border-radius: 999px; }
  .tp-admin-theme aside {
    background: linear-gradient(160deg, rgba(15,118,110,0.98) 0%, rgba(13,148,136,0.96) 55%, rgba(20,184,166,0.92) 100%) !important;
    border-right: 2px solid rgba(94,234,212,0.55) !important;
    box-shadow: var(--shadow-3d) !important;
  }
  .tp-admin-theme aside::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top left, rgba(255,255,255,0.28), transparent 34%);
    pointer-events: none;
  }
  .tp-admin-theme header {
    background: rgba(255,255,255,0.88) !important;
    backdrop-filter: blur(18px) saturate(1.25);
    border-bottom: 2px solid rgba(94,234,212,0.72) !important;
    box-shadow: 0 12px 34px rgba(13,148,136,0.16) !important;
  }
  .tp-admin-theme main {
    background: rgba(255,255,255,0.82);
    backdrop-filter: blur(14px);
    border: 2px solid rgba(94,234,212,0.55);
    border-radius: 28px;
    box-shadow: var(--shadow-3d);
    margin-top: 1.5rem;
    margin-bottom: 2rem;
  }
  .tp-admin-theme .tp-stat-card {
    background: var(--teal-gradient) !important;
    color: white !important;
    border: 2px solid rgba(13,148,136,0.35) !important;
    box-shadow: 0 14px 34px rgba(13,148,136,0.25) !important;
    transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
    position: relative;
    overflow: hidden;
  }
  .tp-admin-theme .tp-stat-card::after {
    content: '';
    position: absolute;
    right: -32px;
    top: -42px;
    width: 120px;
    height: 120px;
    border-radius: 999px;
    background: rgba(255,255,255,0.18);
  }
  .tp-admin-theme .tp-stat-card:hover {
    transform: translateY(-7px) scale(1.015);
    box-shadow: 0 24px 54px rgba(13,148,136,0.36) !important;
  }
  .tp-admin-theme .tp-stat-card .text-slate-950,
  .tp-admin-theme .tp-stat-card .opacity-70,
  .tp-admin-theme .tp-stat-card svg { color: white !important; }
  .tp-admin-theme .tp-stat-card .bg-white\/80 { background: rgba(255,255,255,.18) !important; }
  .tp-admin-theme input,
  .tp-admin-theme textarea,
  .tp-admin-theme select {
    border: 2px solid rgba(94,234,212,0.72) !important;
    border-radius: 14px !important;
    background: rgba(255,255,255,0.94) !important;
    transition: box-shadow .22s ease, border-color .22s ease, transform .22s ease;
  }
  .tp-admin-theme input:focus,
  .tp-admin-theme textarea:focus,
  .tp-admin-theme select:focus {
    outline: none !important;
    border-color: var(--primary-color) !important;
    box-shadow: 0 0 0 4px rgba(13,148,136,0.18), 0 12px 28px rgba(13,148,136,0.13) !important;
  }
  .tp-admin-theme button {
    transition: transform .22s ease, box-shadow .22s ease, background .22s ease, border-color .22s ease;
  }
  .tp-admin-theme button:hover:not(:disabled) { transform: translateY(-1.5px); }
  .tp-admin-theme button:active:not(:disabled) { transform: translateY(0); }
  .tp-admin-theme table {
    border-collapse: separate !important;
    border-spacing: 0;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 10px 26px rgba(13,148,136,0.10);
  }
  .tp-admin-theme thead th,
  .tp-admin-theme table thead td {
    background: var(--teal-gradient-dark) !important;
    color: white !important;
    border: none !important;
    font-weight: 900 !important;
    letter-spacing: .02em;
  }
  .tp-admin-theme tbody tr {
    transition: background .18s ease, transform .18s ease;
  }
  .tp-admin-theme tbody tr:hover {
    background: #f0fdfa !important;
  }
  .tp-admin-theme .admin-card,
  .tp-admin-theme .content-card {
    background: rgba(255,255,255,0.96) !important;
    border: 2px solid rgba(94,234,212,0.55) !important;
    border-radius: 24px !important;
    box-shadow: 0 12px 32px rgba(13,148,136,0.14) !important;
  }
  .tp-admin-theme .swal2-popup,
  .tp-admin-theme .modal-content {
    border-radius: 24px !important;
    border: 2px solid rgba(94,234,212,0.55) !important;
    box-shadow: var(--shadow-3d) !important;
  }
  .tp-admin-theme .fade-in, .tp-admin-theme .animate-fade-in {
    animation: tpFadeIn .45s ease both;
  }
  @keyframes tpFadeIn {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (max-width: 1024px) {
    .tp-admin-theme main {
      margin-top: 0.75rem;
      border-radius: 22px;
    }
  }
`;

interface ExamStructureItem {
  id: string;
  topic: string;
  level: string;
  count: number;
}


interface GeneratedExamLink {
  name: string;
  link: string;
  examId?: string;
  examTitle?: string;
  grade?: number;
  studentEmail?: string;
  studentName?: string;
}

interface AssignmentItem {
  assignmentId: string;
  examId: string;
  examTitle: string;
  grade: number | string;
  className: string;
  assignedBy: string;
  openAt: string;
  dueAt: string;
  durationMinutes: number;
  maxAttempts: number;
  settings?: any;
  status?: string;
  createdAt?: string;
}


export const AdminPanel: React.FC<AdminProps> = ({ onLogout }) => {
  // ==================== STATE MANAGEMENT ====================
  
  const [activeTab, setActiveTab] = useState<'questions' | 'theory' | 'exam-creator' | 'students'>('questions');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Data states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [theories, setTheories] = useState<Theory[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [topics, setTopics] = useState<string[]>([]);

  const classOptions = Array.from(new Set(
    students
      .map((s: any) => String((s.className ?? s.class ?? s.lop ?? s.class_name ?? '')).trim())
      .filter(Boolean)
  )).sort();
  
  // Edit states
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [editingTheory, setEditingTheory] = useState<Partial<Theory> | null>(null);

  // ★ Question Bank filters
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('');

  // ★ Topic Picker states (cascading selector inside edit modal)
  const [pickerGrade, setPickerGrade] = useState<string>('');
  const [pickerDomain, setPickerDomain] = useState<string>('');
  const [pickerChapter, setPickerChapter] = useState<string>('');
  const [topicSearchText, setTopicSearchText] = useState<string>('');

  // ★ AI Question Generator
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPickerGrade, setAiPickerGrade] = useState<string>('');
  const [aiPickerDomain, setAiPickerDomain] = useState<string>('');
  const [aiPickerChapter, setAiPickerChapter] = useState<string>('');
  const [aiTopicSearch, setAiTopicSearch] = useState<string>('');
  const [aiSelectedTopic, setAiSelectedTopic] = useState<TopicItem | null>(null);
  const [aiGenConfig, setAiGenConfig] = useState<{
    type: 'Trắc nghiệm' | 'Đúng/Sai' | 'Trả lời ngắn';
    level: string;
    count: number;
    extraPrompt: string;
  }>({ type: 'Trắc nghiệm', level: 'Thông hiểu', count: 3, extraPrompt: '' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratingIndex, setAiGeneratingIndex] = useState(0);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Partial<Question>[]>([]);
  const [aiEditingIndex, setAiEditingIndex] = useState<number | null>(null);
  
  // Student detail states
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentDetailData, setStudentDetailData] = useState<StudentDetail | null>(null);
  const [selectedResult, setSelectedResult] = useState<ResultDetail | null>(null);
  const [studentViewMode, setStudentViewMode] = useState<'list' | 'overview' | 'result-detail'>('list');

  // ★ Filter-by-assignment states
  const [studentFilterMode, setStudentFilterMode] = useState<'by-student' | 'by-assignment' | 'by-topic' | 'by-level'>('by-student');
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [assignmentAttempts, setAssignmentAttempts] = useState<any[]>([]);
  const [assignmentAttemptsLoading, setAssignmentAttemptsLoading] = useState(false);
  const [attemptsSortBy, setAttemptsSortBy] = useState<'percentage' | 'studentName' | 'timeSpent'>('percentage');
  const [attemptsSortDir, setAttemptsSortDir] = useState<'asc' | 'desc'>('desc');
  const [assignmentListClass, setAssignmentListClass] = useState<string>('');
  const [assignmentList, setAssignmentList] = useState<AssignmentItem[]>([]);
  const [assignmentListLoading, setAssignmentListLoading] = useState(false);
  // topics[attemptId] = string[] — lấy từ result detail sau khi load xong
  const [topicsByAttemptId, setTopicsByAttemptId] = useState<Record<string, string[]>>({});
  const [topicsLoading, setTopicsLoading] = useState(false);

  // ★ Filter-by-topic states
  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [allTopicsLoading, setAllTopicsLoading] = useState(false);
  const [topicFilterText, setTopicFilterText] = useState<string>('');
  const [topicResults, setTopicResults] = useState<any[]>([]);
  const [topicResultsLoading, setTopicResultsLoading] = useState(false);
  const [topicSortBy, setTopicSortBy] = useState<'bestPercentage' | 'avgPercentage' | 'attempts' | 'studentName'>('bestPercentage');
  const [topicSortDir, setTopicSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  
  // AI Theory Generator
  const [theoryGenConfig, setTheoryGenConfig] = useState({ grade: 12, topic: '', level: 1 });
  const [isGeneratingTheory, setIsGeneratingTheory] = useState(false);
  
  // OCR Import
  const [importMode, setImportMode] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState<Partial<Question>[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importDefaultGrade, setImportDefaultGrade] = useState(12);
  const [importDefaultTopic, setImportDefaultTopic] = useState('Tổng hợp');
  const [showSettings, setShowSettings] = useState(false);
  // Exam Creator
  const [examConfig, setExamConfig] = useState({ 
    grade: 12, 
    generationMode: 'batch' as 'batch' | 'personalized', 
    batchCount: 4 
  });
  const [builderSelection, setBuilderSelection] = useState({ topic: '', level: 'Thông hiểu', count: 1 });
  const [examStructure, setExamStructure] = useState<ExamStructureItem[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [generatedBatchResult, setGeneratedBatchResult] = useState<GeneratedExamLink[]>([]);


  // ==================== LOAD DATA ====================
  
  useEffect(() => {
    if (questions.length === 0) loadQuestions();
    if (activeTab === 'theory' && theories.length === 0) loadTheories();

    const needStudents =
      (activeTab === 'students' && studentViewMode === 'list') ||
      activeTab === 'exam-creator';

    if (needStudents && students.length === 0) loadStudents();

    if (activeTab === 'exam-creator') loadTopics(examConfig.grade);
  }, [activeTab, studentViewMode, examConfig.grade]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAllQuestions`);
      const data = await res.json();
      if (data.status === 'success') setQuestions(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadTheories = async () => {
    setLoading(true);
    try {
      const data = await fetchAllTheories();
      setTheories(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAllStudents`);
      const data = await res.json();
      if (data.status === 'success') setStudents(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadTopics = async (grade: number) => {
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getTopics&grade=${grade}`);
      const data = await res.json();
      if (data.status === 'success') setTopics(data.data);
    } catch (e) { console.error(e); }
  };

  // ==================== QUESTION HANDLERS ====================

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    setLoading(true);
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveQuestion', ...editingQuestion })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessage({ type: 'success', text: 'Đã lưu câu hỏi thành công!' });
        setEditingQuestion(null);
        loadQuestions();
      }
    } catch (e) { setMessage({ type: 'error', text: 'Lỗi khi lưu câu hỏi' }); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xác nhận xóa câu hỏi này?')) return;
    setLoading(true);
    await fetch(`${GOOGLE_SCRIPT_URL}?action=deleteQuestion&exam_id=${id}`);
    loadQuestions();
  };

  // ★ Mở modal và tự động populate topic picker từ câu hỏi hiện có
  const openEditModal = (q: Partial<Question>) => {
    setEditingQuestion(q);
    setTopicSearchText('');
    if (q.grade && q.topic) {
      const gradeStr = `Lớp ${q.grade}`;
      const allTopics = flattenTopics();
      const matched = allTopics.find(t => t.grade === gradeStr && t.topic === q.topic);
      if (matched) {
        setPickerGrade(gradeStr);
        setPickerDomain(matched.domain);
        setPickerChapter(matched.chapter);
      } else {
        setPickerGrade(gradeStr);
        setPickerDomain('');
        setPickerChapter('');
      }
    } else {
      setPickerGrade(q.grade ? `Lớp ${q.grade}` : '');
      setPickerDomain('');
      setPickerChapter('');
    }
  };

  // ==================== AI QUESTION GENERATOR HANDLERS ====================

  const handleAIGenerate = async () => {
    if (!aiSelectedTopic) { alert('Vui lòng chọn chủ đề trước!'); return; }
    if (aiGenConfig.count < 1 || aiGenConfig.count > 10) { alert('Số lượng câu hỏi phải từ 1 đến 10'); return; }

    setAiGenerating(true);
    setAiGeneratedQuestions([]);
    setAiGeneratingIndex(0);

    const gradeNum = parseInt(aiSelectedTopic.grade.replace('Lớp ', ''));
    const results: Partial<Question>[] = [];

    for (let i = 0; i < aiGenConfig.count; i++) {
      setAiGeneratingIndex(i + 1);
      try {
        const sourceHint = aiGenConfig.extraPrompt ? `Yêu cầu thêm từ giáo viên: ${aiGenConfig.extraPrompt}` : undefined;
        const q = await generateQuestionFromAI(
          gradeNum,
          aiSelectedTopic.topic,
          aiGenConfig.level,
          aiGenConfig.type,
          sourceHint
        );
        if (q) {
          results.push({ ...q, grade: gradeNum, topic: aiSelectedTopic.topic, level: aiGenConfig.level, question_type: aiGenConfig.type, quiz_level: 1 });
        }
      } catch (e) { console.error(`Lỗi tạo câu ${i + 1}:`, e); }
    }

    setAiGeneratedQuestions(results);
    setAiGenerating(false);
    setAiGeneratingIndex(0);

    if (results.length > 0) {
      setMessage({ type: 'success', text: `✨ Đã tạo ${results.length}/${aiGenConfig.count} câu hỏi! Hãy kiểm tra và lưu vào ngân hàng.` });
    } else {
      setMessage({ type: 'error', text: 'AI không tạo được câu hỏi nào. Thử lại hoặc điều chỉnh yêu cầu.' });
    }
  };

  const handleSaveAIGenerated = async () => {
    if (aiGeneratedQuestions.length === 0) return;
    if (!confirm(`Lưu ${aiGeneratedQuestions.length} câu hỏi vào ngân hàng?`)) return;
    setLoading(true);
    let ok = 0;
    for (const q of aiGeneratedQuestions) {
      try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'saveQuestion', ...q }) });
        const data = await res.json();
        if (data.status === 'success') ok++;
      } catch (e) { console.error(e); }
    }
    setMessage({ type: 'success', text: `✅ Đã lưu ${ok}/${aiGeneratedQuestions.length} câu hỏi vào ngân hàng!` });
    setAiGeneratedQuestions([]);
    setShowAIGenerator(false);
    loadQuestions();
    setLoading(false);
  };

  const updateAIGeneratedQuestion = (index: number, updated: Partial<Question>) => {
    const newList = [...aiGeneratedQuestions];
    newList[index] = { ...newList[index], ...updated };
    setAiGeneratedQuestions(newList);
  };

  const removeAIGeneratedQuestion = (index: number) => {
    setAiGeneratedQuestions(aiGeneratedQuestions.filter((_, i) => i !== index));
  };

  // ==================== THEORY HANDLERS ====================

  const handleGenerateTheory = async () => {
    if (!theoryGenConfig.topic) {
      alert('Vui lòng nhập chủ đề');
      return;
    }

    setIsGeneratingTheory(true);
    try {
      const generated = await generateTheoryFromAI(
        theoryGenConfig.grade,
        theoryGenConfig.topic,
        theoryGenConfig.level
      );

      if (generated) {
        setEditingTheory(generated);
        setMessage({ type: 'success', text: 'Đã tạo lý thuyết từ AI! Hãy kiểm tra và chỉnh sửa.' });
      } else {
        setMessage({ type: 'error', text: 'Không thể tạo lý thuyết. Vui lòng thử lại.' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Lỗi khi gọi AI' });
    }
    setIsGeneratingTheory(false);
  };

  const handleSaveTheory = async () => {
    if (!editingTheory || !editingTheory.title || !editingTheory.content) {
      alert('Vui lòng điền đầy đủ tiêu đề và nội dung');
      return;
    }

    setLoading(true);
    try {
      const success = await saveTheory(editingTheory);
      if (success) {
        setMessage({ type: 'success', text: 'Đã lưu lý thuyết thành công!' });
        setEditingTheory(null);
        loadTheories();
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi lưu lý thuyết' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi khi lưu lý thuyết' });
    }
    setLoading(false);
  };

  const handleDeleteTheory = async (id: string) => {
    if (!confirm('Xác nhận xóa lý thuyết này?')) return;
    setLoading(true);
    const success = await deleteTheory(id);
    if (success) {
      setMessage({ type: 'success', text: 'Đã xóa lý thuyết' });
      loadTheories();
    } else {
      setMessage({ type: 'error', text: 'Lỗi khi xóa' });
    }
    setLoading(false);
  };

  // ==================== STUDENT DETAIL HANDLERS ====================

  const handleViewStudentDetail = async (email: string) => {
    setLoading(true);
    setSelectedStudent(email);
    const data = await fetchStudentDetail(email);
    setStudentDetailData(data);
    setStudentViewMode('overview');
    setLoading(false);
  };

  const handleViewResultDetail = async (resultId: string) => {
    setLoading(true);
    const detail = await fetchResultDetail(resultId);
    setSelectedResult(detail);
    setStudentViewMode('result-detail');
    setLoading(false);
  };

  const handleBackToStudentList = () => {
    setStudentViewMode('list');
    setSelectedStudent(null);
    setStudentDetailData(null);
    setSelectedResult(null);
  };

  const handleBackToStudentOverview = () => {
    setStudentViewMode('overview');
    setSelectedResult(null);
  };

  // ★ Handler: load danh sách bài tập theo lớp (cho tab "Theo bài tập")
  const loadAssignmentList = async (className: string) => {
    if (!className.trim()) return;
    setAssignmentListLoading(true);
    try {
      const res = await getAssignmentsByClass(className.trim());
      setAssignmentList(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setAssignmentList([]);
    }
    setAssignmentListLoading(false);
  };

  // ★ Handler: click vào bài tập → load tất cả học sinh đã làm
  const handleViewAssignmentAttempts = async (assignment: AssignmentItem) => {
    setSelectedAssignment(assignment);
    setAssignmentAttemptsLoading(true);
    setAssignmentAttempts([]);
    setTopicsByAttemptId({});
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAssignmentAttempts&assignmentId=${assignment.assignmentId}`);
      const data = await res.json();
      if (data.status === 'success') {
        const attemptsRaw: any[] = data.data;
        const enriched = attemptsRaw.map((a: any) => {
          const student = students.find((s: any) => s.email === a.email);
          return {
            ...a,
            studentName: student?.name || a.email,
            studentClass: student?.class || '',
          };
        });
        setAssignmentAttempts(enriched);
        setAssignmentAttemptsLoading(false);

        // ── Batch fetch topics từng result detail (chạy ngầm) ──
        const withResultId = enriched.filter((a: any) => a.resultId);
        if (withResultId.length > 0) {
          setTopicsLoading(true);
          const topicsMap: Record<string, string[]> = {};
          await Promise.all(
            withResultId.map(async (a: any) => {
              try {
                const r = await fetchResultDetail(a.resultId);
                if (r && r.detailedAnswers) {
                  const uniqueTopics = Array.from(
                    new Set(
                      r.detailedAnswers
                        .map((ans: any) => ans.questionDetails?.topic)
                        .filter(Boolean)
                    )
                  ) as string[];
                  topicsMap[a.attemptId] = uniqueTopics;
                }
              } catch (_) {}
            })
          );
          setTopicsByAttemptId(topicsMap);
          setTopicsLoading(false);
        }
      } else {
        setAssignmentAttemptsLoading(false);
      }
    } catch (e) {
      console.error(e);
      setAssignmentAttemptsLoading(false);
    }
  };

  // ★ Handler: tải danh sách chủ đề thực tế từ sheet
  const loadAllTopics = async () => {
    setAllTopicsLoading(true);
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAllTopicsFromResults`);
      const data = await res.json();
      if (data.status === 'success') setAllTopics(data.data);
    } catch (e) { console.error(e); }
    setAllTopicsLoading(false);
  };

  // ★ Handler: click vào chủ đề → load học sinh đã làm
  const loadResultsByTopic = async (topic: string) => {
    setTopicResultsLoading(true);
    setTopicResults([]);
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResultsByTopic&topic=${encodeURIComponent(topic)}`);
      const data = await res.json();
      if (data.status === 'success') setTopicResults(data.data);
    } catch (e) { console.error(e); }
    setTopicResultsLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}p ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('vi-VN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  const getViolationIcon = (type: string) => {
    switch(type) {
      case 'tab_switch': return <Ban className="text-orange-500" size={16} />;
      case 'session_conflict': return <AlertTriangle className="text-red-500" size={16} />;
      default: return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  const getViolationLabel = (type: string) => {
    const labels: Record<string, string> = {
      'tab_switch': 'Chuyển tab',
      'session_conflict': 'Đăng nhập đồng thời',
      'copy_paste': 'Copy/Paste',
      'devtools': 'Mở DevTools',
      'timeout': 'Hết giờ'
    };
    return labels[type] || type;
  };

  // ==================== FILE IMPORT HANDLERS ====================

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsProcessingFile(true);
  setImportedQuestions([]);
  setImportStatus('Đang phân tích file...');

  try {
    let extractedQs: Partial<Question>[] = [];

    if (file.name.endsWith('.docx')) {
      // ✨ MỚI: Dùng wordToSheetService
      setImportStatus('Đang đọc file Word...');
      
      extractedQs = await parseWordToSheetQuestions(
        file,
        importDefaultGrade,
        importDefaultTopic,
        (current, total, message) => {
          setImportStatus(`${message} (${current}%)`);
        }
      );
      
      console.log(`✓ Parsed ${extractedQs.length} questions from Word`);
    } 
    else if (file.name.toLowerCase().endsWith('.pdf')) {
      setImportStatus('Đang tải PDF lên Server OCR...');
      const ocrResult = await uploadPDFToGAS(file);
      setImportStatus('Đang xử lý kết quả OCR...');
      extractedQs = await parseQuestionsFromMarkdown(ocrResult.allMarkdownDataUri, importDefaultGrade, importDefaultTopic);
    } 
    else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(file.name)) {
      setImportStatus('Đang nhận diện hình ảnh...');
      const base64 = await fileToBase64(file);
      const mime = file.type || (file.name.endsWith('.png') ? 'image/png' : 'image/jpeg');
      const text = await performOCR(base64, mime);
      if (text) {
        setImportStatus('Đang chuẩn hóa LaTeX...');
        extractedQs = await parseQuestionsFromMarkdown(text, importDefaultGrade, importDefaultTopic);
      }
    }

    setImportedQuestions(extractedQs);
    
    if (extractedQs.length > 0) {
      setMessage({ 
        type: 'success', 
        text: `✓ Đã trích xuất ${extractedQs.length} câu hỏi! ${file.name.endsWith('.docx') ? '(Bao gồm ảnh inline)' : ''}` 
      });
    } else {
      setMessage({ 
        type: 'error', 
        text: 'Không tìm thấy câu hỏi nào hoặc cấu trúc file không hợp lệ.' 
      });
    }
  } catch (err: any) {
    console.error(err);
    setMessage({ 
      type: 'error', 
      text: `Lỗi: ${err.message || 'Không thể đọc file'}` 
    });
  } finally {
    setIsProcessingFile(false);
    setImportStatus('');
    e.target.value = ''; // Reset input
  }
};

  const handleSaveImported = async () => {
    if (importedQuestions.length === 0) return;
    if (!confirm(`Xác nhận lưu ${importedQuestions.length} câu hỏi vào ngân hàng?`)) return;

    setLoading(true);
    let successCount = 0;
    
    for (const q of importedQuestions) {
       try {
         await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'saveQuestion', ...q })
         });
         successCount++;
       } catch (e) { console.error(e); }
    }

    setLoading(false);
    setMessage({ type: 'success', text: `Đã lưu thành công ${successCount}/${importedQuestions.length} câu hỏi!` });
    setImportMode(false);
    setImportedQuestions([]);
    loadQuestions();
  };

  const removeImportedQuestion = (index: number) => {
    const newQs = [...importedQuestions];
    newQs.splice(index, 1);
    setImportedQuestions(newQs);
  };

  // ==================== EXAM CREATOR HANDLERS ====================

  const getAvailableCount = (topic: string, level: string) => {
    return questions.filter(q => 
      Number(q.grade) === examConfig.grade && 
      q.topic === topic && 
      q.level === level
    ).length;
  };

  const getTopicTotalCount = (topic: string) => {
    return questions.filter(q => 
      Number(q.grade) === examConfig.grade && 
      q.topic === topic
    ).length;
  };

  const handleAddStructure = () => {
    if (!builderSelection.topic) { alert('Vui lòng chọn chủ đề'); return; }
    
    const available = getAvailableCount(builderSelection.topic, builderSelection.level);
    if (available === 0) { alert('Không có câu hỏi nào trong kho cho lựa chọn này!'); return; }
    if (builderSelection.count > available) { alert(`Chỉ còn ${available} câu hỏi khả dụng!`); return; }
    if (builderSelection.count <= 0) { alert('Số lượng phải lớn hơn 0'); return; }

    const newItem: ExamStructureItem = {
      id: Date.now().toString(),
      topic: builderSelection.topic,
      level: builderSelection.level,
      count: Number(builderSelection.count)
    };

    setExamStructure([...examStructure, newItem]);
  };

  const handleRemoveStructure = (id: string) => {
    setExamStructure(examStructure.filter(item => item.id !== id));
  };

  const getTotalExamQuestions = () => examStructure.reduce((sum, item) => sum + item.count, 0);

  const generateExams = async () => {
    if (examStructure.length === 0) { alert('Vui lòng thêm ít nhất một nhóm câu hỏi vào cấu trúc đề.'); return; }
    
    setIsGeneratingBatch(true);
    setGeneratedBatchResult([]);

    try {
      const results: GeneratedExamLink[] = [];
      
      const masterPool: Record<string, Question[]> = {};
      examStructure.forEach(req => {
         const key = `${req.topic}_${req.level}`;
         if (!masterPool[key]) {
            masterPool[key] = questions.filter(q => 
               Number(q.grade) === examConfig.grade && 
               q.topic === req.topic && 
               q.level === req.level
            );
         }
      });

      const generateSingleExamSet = (): Question[] => {
         let examQuestions: Question[] = [];
         
         examStructure.forEach(req => {
            const key = `${req.topic}_${req.level}`;
            const pool = masterPool[key] || [];
            const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, req.count);
            examQuestions = [...examQuestions, ...selected];
         });
         
         return examQuestions.sort(() => 0.5 - Math.random());
      };

      if (examConfig.generationMode === 'batch') {
        for (let i = 1; i <= examConfig.batchCount; i++) {
          const examSet = generateSingleExamSet();
          const exam = await createInstantExam(`Đề ${100 + i} - Tổng hợp`, examConfig.grade, examSet);
          if (exam) {
            results.push({ 
              name: `Mã đề ${100 + i}`, 
              examId: exam.examId,
              examTitle: `Đề ${100 + i} - Tổng hợp`,
              grade: examConfig.grade,
              link: `${window.location.origin}${window.location.pathname}?examId=${exam.examId}` 
            });
          }
        }
      } else {
        for (const student of students) {
          const examSet = generateSingleExamSet();
          const exam = await createInstantExam(`Đề của: ${student.name}`, examConfig.grade, examSet);
          if (exam) {
            results.push({ 
              name: `HS: ${student.name}`, 
              studentName: student.name,
              studentEmail: student.email,
              examId: exam.examId,
              examTitle: `Đề của: ${student.name}`,
              grade: examConfig.grade,
              link: `${window.location.origin}${window.location.pathname}?examId=${exam.examId}` 
            });
          }
        }
      }
      
      setGeneratedBatchResult(results);
      setMessage({ type: 'success', text: `Đã tạo thành công ${results.length} đề thi!` });
    } catch (e) { 
        console.error(e);
        alert('Lỗi khi tạo đề thi'); 
    }
    setIsGeneratingBatch(false);
  };

// ==================== RENDER FUNCTIONS ====================

  const renderStudentResultDetail = () => {
    if (!selectedResult) return null;

    const isFromAssignment = studentFilterMode === 'by-assignment';
    const displayTitle = isFromAssignment
      ? (selectedAssignment?.examTitle ?? selectedResult.topic)
      : selectedResult.topic;

    const detailedAnswers = Array.isArray((selectedResult as any).detailedAnswers)
      ? (selectedResult as any).detailedAnswers
      : [];

    const getUserAnswer = (ans: any) => String(
      ans?.userAnswer ?? ans?.user_answer ?? ans?.selectedAnswer ?? ans?.selected_answer ?? ans?.answer ?? ans?.studentAnswer ?? ''
    ).trim();

    const getQuestion = (ans: any) => ans?.questionDetails || ans?.question || null;
    const getQuestionText = (q: any) => String(q?.question_text || q?.question || q?.text || '').trim();
    const getCorrectAnswer = (ans: any, q: any) => String(q?.answer_key || ans?.correctAnswer || ans?.answer_key || '').trim();
    const optionValue = (q: any, opt: string) => String(q?.[`option_${opt}`] ?? q?.options?.[opt] ?? q?.options?.[['A','B','C','D'].indexOf(opt)] ?? '').trim();
    const normalizeTF = (value: string) => String(value || '')
      .replace(/true/gi, 'Đ')
      .replace(/false/gi, 'S')
      .replace(/[|,;]/g, '-')
      .replace(/\s+/g, '')
      .split('-');

    const answerLabel = (v: string) => {
      const clean = String(v || '').trim();
      if (!clean) return 'Chưa chọn';
      if (clean === 'Đ') return 'Đúng';
      if (clean === 'S') return 'Sai';
      return clean;
    };

    const topicsFromAnswers: string[] = isFromAssignment
      ? Array.from(new Set(detailedAnswers.map((ans: any) => getQuestion(ans)?.topic).filter(Boolean)))
      : [];

    const correctCount = Number((selectedResult as any).score || 0);
    const totalCount = Number((selectedResult as any).totalQuestions || (selectedResult as any).total || detailedAnswers.length || 0);
    const wrongCount = Math.max(0, totalCount - correctCount);

    const handleBack = () => {
      if (isFromAssignment) {
        setSelectedResult(null);
        setStudentViewMode('list');
      } else {
        handleBackToStudentOverview();
      }
    };

    const renderAnswerPills = (ans: any, q: any) => {
      const userAnswer = getUserAnswer(ans);
      const correctAnswer = getCorrectAnswer(ans, q);
      const isCorrect = !!ans?.correct;
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className={`rounded-2xl border p-3 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Học sinh chọn</div>
            <div className={`text-lg font-black ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{answerLabel(userAnswer)}</div>
          </div>
          <div className="rounded-2xl border p-3 bg-emerald-50 border-emerald-200">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Đáp án đúng</div>
            <div className="text-lg font-black text-emerald-700">{answerLabel(correctAnswer)}</div>
          </div>
          <div className={`rounded-2xl border p-3 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Kết quả</div>
            <div className={`text-lg font-black flex items-center gap-2 ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isCorrect ? <CheckCircle size={18}/> : <XCircle size={18}/>} {isCorrect ? 'Đúng' : 'Sai'}
            </div>
          </div>
        </div>
      );
    };

    const renderMultipleChoice = (ans: any, q: any) => {
      const userAnswer = getUserAnswer(ans).toUpperCase();
      const correctAnswer = getCorrectAnswer(ans, q).toUpperCase();
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {['A', 'B', 'C', 'D'].map(opt => {
            const isUserAnswer = userAnswer === opt;
            const isCorrectAnswer = correctAnswer === opt;
            const cls = isCorrectAnswer
              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
              : isUserAnswer
                ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-200'
                : 'border-slate-200 bg-white';
            return (
              <div key={opt} className={`p-4 rounded-2xl border-2 transition ${cls}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${isCorrectAnswer ? 'bg-emerald-600 text-white' : isUserAnswer ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{opt}</span>
                    {isUserAnswer && !isCorrectAnswer && <span className="text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded-lg">HỌC SINH CHỌN</span>}
                    {isUserAnswer && isCorrectAnswer && <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg">CHỌN ĐÚNG</span>}
                  </div>
                  {isCorrectAnswer && <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-1 rounded-lg">ĐÁP ÁN ĐÚNG</span>}
                </div>
                <div className="text-slate-900 leading-relaxed">
                  <ContentWithInlineImages content={optionValue(q, opt)} />
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    const renderTrueFalse = (ans: any, q: any) => {
      const userParts = normalizeTF(getUserAnswer(ans));
      const correctParts = normalizeTF(getCorrectAnswer(ans, q));
      return (
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map((part, pIdx) => {
            const user = userParts[pIdx] || '';
            const correct = correctParts[pIdx] || '';
            const ok = user && correct && user === correct;
            return (
              <div key={part} className={`p-4 rounded-2xl border-2 ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex flex-col md:flex-row md:items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-700 shrink-0">{part}</div>
                  <div className="flex-1 text-slate-900 leading-relaxed">
                    <ContentWithInlineImages content={optionValue(q, part)} />
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Chọn: {answerLabel(user)}</span>
                    <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-700">Đáp án: {answerLabel(correct)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    const renderShortAnswer = (ans: any, q: any) => {
      const userAnswer = getUserAnswer(ans);
      const correctAnswer = getCorrectAnswer(ans, q);
      const isCorrect = !!ans?.correct;
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border-2 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Học sinh trả lời</div>
            <div className={`font-mono text-xl font-black ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{userAnswer || '(Không trả lời)'}</div>
          </div>
          <div className="p-4 rounded-2xl border-2 bg-emerald-50 border-emerald-200">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Đáp án đúng</div>
            <div className="font-mono text-xl font-black text-emerald-700">{correctAnswer || '—'}</div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <button onClick={handleBack} className="flex items-center gap-2 text-teal-600 hover:text-teal-800 font-bold">
          <ArrowLeft size={20} /> {isFromAssignment ? `Quay lại bảng bài đã giao` : 'Quay lại tổng quan'}
        </button>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-7 bg-gradient-to-r from-slate-900 via-teal-900 to-teal-700 text-white">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="min-w-0">
                <div className="text-xs font-black tracking-[0.2em] uppercase text-teal-100 mb-2">Chi tiết bài làm</div>
                <h2 className="text-2xl md:text-3xl font-black truncate">{displayTitle}</h2>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-white/85 font-semibold">
                  <span>👤 {selectedResult.email}</span>
                  {!isFromAssignment && <span>• Level {selectedResult.level}</span>}
                  <span>• {formatDate(selectedResult.timestamp)}</span>
                </div>
                {isFromAssignment && topicsFromAnswers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {topicsFromAnswers.map((t) => (
                      <span key={t} className="bg-white/15 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-white/20">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="bg-white/12 rounded-2xl p-4 text-center border border-white/15">
                  <div className="text-3xl font-black">{selectedResult.percentage}%</div>
                  <div className="text-xs font-bold text-white/70">Điểm</div>
                </div>
                <div className="bg-white/12 rounded-2xl p-4 text-center border border-white/15">
                  <div className="text-3xl font-black">{correctCount}/{totalCount}</div>
                  <div className="text-xs font-bold text-white/70">Đúng</div>
                </div>
                <div className="bg-white/12 rounded-2xl p-4 text-center border border-white/15">
                  <div className="text-3xl font-black">{wrongCount}</div>
                  <div className="text-xs font-bold text-white/70">Sai</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-7">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 text-blue-600 mb-1"><Clock size={18}/><span className="text-xs font-bold uppercase">Thời gian</span></div>
                <div className="text-xl font-black text-slate-800">{formatTime(selectedResult.timeSpent)}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-2 text-purple-600 mb-1"><Target size={18}/><span className="text-xs font-bold uppercase">Trạng thái</span></div>
                <div className="text-xl font-black text-slate-800">{selectedResult.status}</div>
              </div>
              <div className={`p-4 rounded-2xl border ${selectedResult.submissionReason === 'normal' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <div className={`flex items-center gap-2 mb-1 ${selectedResult.submissionReason === 'normal' ? 'text-emerald-600' : 'text-rose-600'}`}><AlertCircle size={18}/><span className="text-xs font-bold uppercase">Nộp bài</span></div>
                <div className="text-lg font-black text-slate-800">{selectedResult.submissionReason === 'normal' ? 'Bình thường' : selectedResult.submissionReason === 'cheat_tab' ? 'Thoát tab' : selectedResult.submissionReason === 'cheat_conflict' ? 'Đăng nhập khác' : selectedResult.submissionReason}</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
              <div>
                <h3 className="text-xl font-black text-slate-800">Chi tiết từng câu hỏi</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Mỗi câu thể hiện rõ học sinh đã chọn gì và đáp án đúng là gì.</p>
              </div>
              <div className="flex gap-2 text-xs font-black">
                <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">Đỏ: học sinh chọn sai</span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">Xanh: đáp án đúng</span>
              </div>
            </div>

            {detailedAnswers.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center text-slate-500 font-bold">
                Chưa có dữ liệu chi tiết câu trả lời trong kết quả này. Các bài làm mới sau khi cập nhật backend sẽ hiển thị đầy đủ.
              </div>
            ) : (
              <div className="space-y-5">
                {detailedAnswers.map((ans: any, idx: number) => {
                  const q = getQuestion(ans);
                  const questionType = String(q?.question_type || 'Trắc nghiệm');
                  const isCorrect = !!ans?.correct;
                  return (
                    <div key={ans.questionId || idx} className={`rounded-3xl border-2 overflow-hidden ${isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'}`}>
                      <div className="p-5 bg-white border-b border-slate-100">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shrink-0 ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}>{idx + 1}</div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-xl ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isCorrect ? 'Đúng' : 'Sai'}</span>
                                <span className="text-xs font-black bg-slate-100 text-slate-600 px-2.5 py-1 rounded-xl">{questionType}</span>
                                {q?.topic && <span className="text-xs font-black bg-teal-50 text-teal-700 px-2.5 py-1 rounded-xl">{q.topic}</span>}
                              </div>
                              {q ? (
                                <div className="text-slate-900 font-semibold leading-relaxed text-base">
                                  <ContentWithInlineImages content={getQuestionText(q)} />
                                </div>
                              ) : (
                                <div className="text-slate-500 italic font-medium">Không tìm thấy nội dung câu hỏi trong ngân hàng/đề JSON. Vẫn hiển thị được đáp án học sinh đã nộp bên dưới nếu có.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        {renderAnswerPills(ans, q)}
                        {q && questionType === 'Trắc nghiệm' && renderMultipleChoice(ans, q)}
                        {q && questionType === 'Đúng/Sai' && renderTrueFalse(ans, q)}
                        {(!q || questionType === 'Trả lời ngắn') && renderShortAnswer(ans, q)}
                        {q?.solution && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                            <div className="text-xs font-black text-blue-800 mb-2">💡 Lời giải</div>
                            <div className="text-sm text-slate-700 leading-relaxed">
                              <ContentWithInlineImages content={String(q.solution || '')} />
                            </div>
                          </div>
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

  const renderStudentOverview = () => {
    if (!studentDetailData) return null;

    const { student, results, violations, stats } = studentDetailData;

    return (
      <div className="space-y-6">
        <button onClick={handleBackToStudentList} className="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-bold">
          <ArrowLeft size={20} /> Quay lại danh sách
        </button>

        <div className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
              <UserIcon size={48} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-2">{student.name}</h1>
              <div className="flex gap-4 text-white/90">
                <span>📧 {student.email}</span>
                <span>🎓 Lớp {student.class}</span>
                <span>⭐ Điểm: {student.totalScore}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Target className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{stats.totalAttempts}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Lần làm bài</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{stats.passedAttempts}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Đạt yêu cầu</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 rounded-xl">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{stats.avgPercentage}%</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Điểm TB</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-3 rounded-xl ${stats.totalViolations > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={stats.totalViolations > 0 ? 'text-red-600' : 'text-gray-400'} size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{stats.totalViolations}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Vi phạm</div>
              </div>
            </div>
          </div>
        </div>

        {violations.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
            <h3 className="text-lg font-black text-red-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} /> Cảnh báo vi phạm
            </h3>
            <div className="space-y-2">
              {violations.slice(0, 5).map((v, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl">
                  {getViolationIcon(v.type)}
                  <div className="flex-1">
                    <span className="font-bold text-slate-800">{getViolationLabel(v.type)}</span>
                    {v.topic && <span className="text-slate-500 ml-2">• {v.topic}</span>}
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(v.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-[1.75rem] shadow-sm p-6 border border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-6">Lịch sử làm bài</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase">Thời gian</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase">Chủ đề</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase">Level</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase text-center">Kết quả</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase text-center">Tình trạng</th>
                  <th className="p-4 text-xs font-black text-slate-500 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((result, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-sm text-slate-600">{formatDate(result.timestamp)}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{result.topic}</div>
                      <div className="text-xs text-slate-400">Lớp {result.grade}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded">Level {result.level}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`text-2xl font-black ${result.passed ? 'text-green-600' : 'text-red-600'}`}>{result.percentage}%</div>
                      <div className="text-xs text-slate-500">{result.score}/{result.totalQuestions}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.submissionReason === 'normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {result.submissionReason === 'normal' ? '✓ Bình thường' : result.submissionReason === 'cheat_tab' ? '⚠ Thoát tab' : result.submissionReason === 'cheat_conflict' ? '⚠ Đa thiết bị' : 'Khác'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleViewResultDetail(result.resultId || '')} className="px-4 py-2 bg-teal-100 text-teal-700 rounded-xl font-bold hover:bg-teal-200 transition flex items-center gap-2 ml-auto">
                        <Eye size={16} /> Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  const currentTabMeta = ADMIN_TABS.find(tab => tab.id === activeTab) || ADMIN_TABS[0];
  const CurrentTabIcon = currentTabMeta.icon;
  const activeAssignments = assignmentList.filter(a => String(a.status || 'ACTIVE') === 'ACTIVE').length;
  const averageStudentScore = students.length > 0
    ? Math.round(students.reduce((sum: number, s: any) => sum + Number(s.totalScore || 0), 0) / students.length)
    : 0;
  const questionTypeCount = Array.from(new Set(questions.map(q => q.question_type).filter(Boolean))).length;
  const adminStatCards = [
    { label: 'Câu hỏi', value: questions.length, hint: `${questionTypeCount || 0} dạng câu`, icon: ClipboardList, tone: 'tp-stat-card' },
    { label: 'Lý thuyết', value: theories.length, hint: 'bài học', icon: BookOpen, tone: 'tp-stat-card' },
    { label: 'Học sinh', value: students.length, hint: `${classOptions.length} lớp`, icon: UserCheck, tone: 'tp-stat-card' },
    { label: 'Bài đã giao', value: assignmentList.length || activeAssignments, hint: activeAssignments ? `${activeAssignments} đang mở` : 'chọn lớp để tải', icon: ClipboardList, tone: 'tp-stat-card' },
  ];

  return (
    <div className="tp-admin-theme min-h-screen font-sans text-slate-900">
      <style>{adminTealGlassCss}</style>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="relative hidden xl:flex w-80 shrink-0 flex-col gap-5 border-r border-white/70 px-5 py-6 text-white shadow-2xl shadow-slate-200/70 sticky top-0 h-screen">
          <div className="rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-900/30">
                <GraduationCap size={27} className="text-white" />
              </div>
              <div>
                <div className="text-lg font-black leading-tight">LMS Thầy Phúc</div>
                <div className="text-xs font-bold text-teal-100/80">Bảng điều khiển giáo viên</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="px-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Quản trị</div>
            {ADMIN_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group w-full rounded-[1.35rem] px-4 py-4 text-left transition-all ${isActive ? 'bg-white text-slate-950 shadow-xl shadow-black/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl p-2.5 ${isActive ? `bg-gradient-to-br ${tab.accent} text-white` : 'bg-white/10 text-slate-200 group-hover:bg-white/15'}`}>
                      <Icon size={20}/>
                    </div>
                    <div className="min-w-0">
                      <div className="font-black leading-tight">{tab.label}</div>
                      <div className={`mt-1 text-xs leading-snug ${isActive ? 'text-slate-500' : 'text-slate-500 group-hover:text-slate-300'}`}>{tab.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto rounded-[2rem] bg-gradient-to-br from-teal-500 to-emerald-600 p-5 shadow-xl shadow-teal-950/30">
            <div className="text-xs font-black uppercase tracking-widest text-white/70">Tổng quan nhanh</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/15 p-3">
                <div className="text-2xl font-black">{questions.length}</div>
                <div className="text-[11px] font-bold text-white/80">Câu hỏi</div>
              </div>
              <div className="rounded-2xl bg-white/15 p-3">
                <div className="text-2xl font-black">{students.length}</div>
                <div className="text-[11px] font-bold text-white/80">Học sinh</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl shadow-sm">
            <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-13 w-13 rounded-[1.4rem] bg-gradient-to-br ${currentTabMeta.accent} p-3 text-white shadow-lg`}>
                    <CurrentTabIcon size={26}/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">Teacher workspace</div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950">{currentTabMeta.label}</h1>
                    <p className="text-sm font-semibold text-slate-500">{currentTabMeta.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                  <div className="xl:hidden flex gap-2 rounded-2xl bg-slate-100 p-1.5">
                    {ADMIN_TABS.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-black transition ${activeTab === tab.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                          <Icon size={16}/>{tab.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={onLogout} className="ml-auto whitespace-nowrap rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 font-black text-rose-600 transition hover:bg-rose-100">
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {adminStatCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`rounded-[1.5rem] border bg-white/90 p-5 shadow-sm ${card.tone}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-widest opacity-70">{card.label}</div>
                        <div className="mt-1 text-3xl font-black text-slate-950">{card.value}</div>
                        <div className="mt-1 text-xs font-bold opacity-70">{card.hint}</div>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                        <Icon size={22}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          {/* Message Alert */}
          {message && (
            <div className={`mb-6 rounded-[1.5rem] p-5 flex justify-between items-center animate-fade-in shadow-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className="font-bold flex items-center gap-2">
                {message.type === 'success' ? <CheckCircle size={20}/> : <XCircle size={20}/>} 
                {message.text}
              </span>
              <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100">
                <XCircle size={18}/>
              </button>
            </div>
          )}

          {/* TAB: QUESTIONS */}
          {activeTab === 'questions' && (() => {
            const allTopics = Array.from(new Set(questions.map(q => q.topic).filter(Boolean))).sort();
            const filteredQuestions = questions.filter(q => {
              if (filterGrade && String(q.grade) !== filterGrade) return false;
              if (filterTopic && q.topic !== filterTopic) return false;
              if (filterType && q.question_type !== filterType) return false;
              if (filterLevel && q.level !== filterLevel) return false;
              return true;
            });
            return (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">Ngân hàng câu hỏi</h2>
                  <p className="text-slate-400 font-medium">Quản lý và biên tập nội dung học liệu toán học</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setImportMode(true)} variant="secondary" className="flex items-center gap-2 border-2 border-teal-200 bg-white hover:bg-teal-50">
                    <FileUp size={20}/> Nhập từ File (OCR)
                  </Button>
                  <Button
                    onClick={() => { setShowAIGenerator(!showAIGenerator); setAiGeneratedQuestions([]); setAiEditingIndex(null); }}
                    className={`flex items-center gap-2 ${showAIGenerator ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'}`}>
                    <Sparkles size={20}/> {showAIGenerator ? 'Đóng AI' : '✨ Tạo bằng AI'}
                  </Button>
                  <Button onClick={() => openEditModal({ question_type: 'Trắc nghiệm', grade: 12, topic: '', level: 'Thông hiểu', quiz_level: 1 })} variant="primary" className="flex items-center gap-2">
                    <Plus size={20}/> Thêm thủ công
                  </Button>
                  <button onClick={loadQuestions} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-teal-50 text-teal-600 transition shadow-sm">
                    <RefreshCw size={22} className={loading ? 'animate-spin' : ''}/>
                  </button>
                </div>
              </div>

              {/* ★ AI GENERATOR PANEL */}
              {showAIGenerator && (() => {
                const allFlatTopics = flattenTopics();
                const gradeOptions = Object.keys(TOPIC_DATA);
                const domainOptions = aiPickerGrade ? Object.keys(TOPIC_DATA[aiPickerGrade] || {}) : [];
                const chapterOptions = aiPickerGrade && aiPickerDomain ? Object.keys(TOPIC_DATA[aiPickerGrade]?.[aiPickerDomain] || {}) : [];
                const topicOptions = allFlatTopics.filter(t => {
                  if (aiPickerGrade && t.grade !== aiPickerGrade) return false;
                  if (aiPickerDomain && t.domain !== aiPickerDomain) return false;
                  if (aiPickerChapter && t.chapter !== aiPickerChapter) return false;
                  if (aiTopicSearch && !t.topic.toLowerCase().includes(aiTopicSearch.toLowerCase())) return false;
                  return true;
                });
                const availableLevels = aiSelectedTopic ? aiSelectedTopic.levels : LEVELS as string[];
                return (
                  <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-3xl border-2 border-purple-200 shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                          <Sparkles className="text-white" size={22}/>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white">Tạo câu hỏi bằng AI (Gemini)</h3>
                          <p className="text-purple-200 text-xs font-medium">Chọn chủ đề → Cấu hình → Generate → Kiểm tra → Lưu vào ngân hàng</p>
                        </div>
                      </div>
                      {aiGeneratedQuestions.length > 0 && (
                        <div className="bg-white/20 text-white text-sm font-black px-4 py-2 rounded-2xl">
                          {aiGeneratedQuestions.length} câu đã tạo
                        </div>
                      )}
                    </div>

                    <div className="p-8 grid grid-cols-5 gap-8">
                      {/* LEFT: Topic Picker */}
                      <div className="col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                          <Layers size={15} className="text-purple-600"/>
                          <span className="text-xs font-black text-purple-700 uppercase tracking-widest">1. Chọn chủ đề CTGDPT</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Khối lớp</label>
                            <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 ring-purple-400"
                              value={aiPickerGrade}
                              onChange={e => { setAiPickerGrade(e.target.value); setAiPickerDomain(''); setAiPickerChapter(''); setAiSelectedTopic(null); setAiTopicSearch(''); }}>
                              <option value="">-- Chọn lớp --</option>
                              {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mạch kiến thức</label>
                            <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 ring-purple-400"
                              value={aiPickerDomain}
                              onChange={e => { setAiPickerDomain(e.target.value); setAiPickerChapter(''); setAiSelectedTopic(null); }}
                              disabled={!aiPickerGrade}>
                              <option value="">-- Tất cả --</option>
                              {domainOptions.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Chương</label>
                            <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 ring-purple-400"
                              value={aiPickerChapter}
                              onChange={e => { setAiPickerChapter(e.target.value); setAiSelectedTopic(null); }}
                              disabled={!aiPickerDomain}>
                              <option value="">-- Tất cả --</option>
                              {chapterOptions.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tìm nhanh</label>
                            <input className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 ring-purple-400"
                              placeholder="Gõ tên chủ đề..."
                              value={aiTopicSearch}
                              onChange={e => { setAiTopicSearch(e.target.value); setAiSelectedTopic(null); }}/>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Danh sách chủ đề ({topicOptions.length})</div>
                          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                            {topicOptions.length === 0 ? (
                              <div className="text-center text-slate-400 text-sm py-6 italic bg-white rounded-xl border border-dashed border-slate-200">
                                {aiPickerGrade ? 'Không tìm thấy chủ đề' : 'Chọn khối lớp để bắt đầu'}
                              </div>
                            ) : topicOptions.map(item => {
                              const isSel = aiSelectedTopic?.id === item.id;
                              return (
                                <button key={item.id} onClick={() => { setAiSelectedTopic(item); setAiGenConfig(c => ({ ...c, level: item.levels[0] || 'Thông hiểu' })); }}
                                  className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${isSel ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-100 bg-white hover:border-purple-200 hover:bg-purple-50/40'}`}>
                                  <div className={`text-sm font-bold leading-tight ${isSel ? 'text-purple-900' : 'text-slate-700'}`}>{item.topic}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-slate-400">{item.grade} · {item.chapter.replace(/^\d+\.\s*/, '')}</span>
                                    <div className="flex gap-1">
                                      {item.levels.map(l => (
                                        <span key={l} className={`text-[9px] font-black px-1 py-0.5 rounded ${l==='Nhận biết'?'bg-green-100 text-green-700':l==='Thông hiểu'?'bg-blue-100 text-blue-700':l==='Vận dụng'?'bg-orange-100 text-orange-700':'bg-red-100 text-red-700'}`}>
                                          {l==='Vận dụng cao'?'VDC':l==='Vận dụng'?'VD':l==='Thông hiểu'?'TH':'NB'}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {aiSelectedTopic && (
                          <div className="flex items-center gap-2 p-3 bg-purple-100 border border-purple-200 rounded-2xl">
                            <CheckCircle size={16} className="text-purple-600 shrink-0"/>
                            <div>
                              <div className="text-sm font-black text-purple-900 leading-tight">{aiSelectedTopic.topic}</div>
                              <div className="text-[10px] text-purple-600">{aiSelectedTopic.grade}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* RIGHT: Config + Generate */}
                      <div className="col-span-3 space-y-5">
                        <div className="flex items-center gap-2">
                          <Zap size={15} className="text-indigo-600"/>
                          <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">2. Cấu hình & tạo câu hỏi</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Loại câu hỏi */}
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Loại câu hỏi</label>
                            <div className="space-y-2">
                              {(['Trắc nghiệm', 'Đúng/Sai', 'Trả lời ngắn'] as const).map(t => (
                                <button key={t} onClick={() => setAiGenConfig(c => ({ ...c, type: t }))}
                                  className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all text-left ${aiGenConfig.type===t ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
                                  {t==='Trắc nghiệm'?'🔵 Trắc nghiệm':t==='Đúng/Sai'?'🟢 Đúng/Sai':'✏️ Trả lời ngắn'}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Mức độ */}
                          <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Mức độ tư duy</label>
                            <div className="space-y-2">
                              {(availableLevels as string[]).map(l => (
                                <button key={l} onClick={() => setAiGenConfig(c => ({ ...c, level: l }))}
                                  className={`w-full px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                                    aiGenConfig.level===l
                                      ? l==='Nhận biết'?'border-green-500 bg-green-50 text-green-800'
                                        :l==='Thông hiểu'?'border-blue-500 bg-blue-50 text-blue-800'
                                        :l==='Vận dụng'?'border-orange-500 bg-orange-50 text-orange-800'
                                        :'border-red-500 bg-red-50 text-red-800'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                  }`}>{l}</button>
                              ))}
                            </div>
                          </div>
                          {/* Số lượng + yêu cầu */}
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Số lượng câu (1-10)</label>
                              <input
                                type="number" min={1} max={10}
                                className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl text-2xl font-black text-indigo-700 text-center focus:ring-2 ring-indigo-400 focus:border-indigo-400"
                                value={aiGenConfig.count}
                                onChange={e => {
                                  const v = Math.max(1, Math.min(10, Number(e.target.value)));
                                  setAiGenConfig(c => ({ ...c, count: v }));
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Yêu cầu thêm (tùy chọn)</label>
                              <textarea
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 ring-indigo-400 text-slate-700 h-[88px]"
                                placeholder="VD: Tập trung ứng dụng thực tế, dùng số nguyên, có bối cảnh hình học..."
                                value={aiGenConfig.extraPrompt}
                                onChange={e => setAiGenConfig(c => ({ ...c, extraPrompt: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Generate button */}
                        <button
                          onClick={handleAIGenerate}
                          disabled={aiGenerating || !aiSelectedTopic}
                          className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 ${
                            aiGenerating || !aiSelectedTopic
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-200'
                          }`}>
                          {aiGenerating
                            ? <><Loader2 className="animate-spin" size={22}/>Đang tạo câu {aiGeneratingIndex}/{aiGenConfig.count}...</>
                            : <><Sparkles size={22}/>Tạo {aiGenConfig.count} câu hỏi{aiSelectedTopic ? ` · ${aiSelectedTopic.topic}` : ''}</>
                          }
                        </button>

                        {/* Progress bar */}
                        {aiGenerating && (
                          <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 rounded-full"
                              style={{ width: `${(aiGeneratingIndex / aiGenConfig.count) * 100}%` }}/>
                          </div>
                        )}

                        {/* Generated questions preview */}
                        {aiGeneratedQuestions.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-black text-slate-700 flex items-center gap-2">
                                <CheckCircle size={16} className="text-green-500"/>
                                {aiGeneratedQuestions.length} câu đã tạo — Kiểm tra trước khi lưu
                              </span>
                              <div className="flex gap-2">
                                <button onClick={() => setAiGeneratedQuestions([])} className="text-xs font-bold text-red-400 hover:text-red-600">Xóa tất cả</button>
                                <button onClick={handleSaveAIGenerated}
                                  className="bg-green-600 hover:bg-green-700 text-white font-black text-sm px-4 py-2 rounded-xl flex items-center gap-2 transition">
                                  <Save size={15}/> Lưu vào ngân hàng
                                </button>
                              </div>
                            </div>
                            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                              {aiGeneratedQuestions.map((q, idx) => (
                                <div key={idx} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:border-indigo-200 transition group">
                                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg flex items-center justify-center">{idx+1}</span>
                                      <span className="text-[10px] font-black text-slate-400 uppercase">{q.question_type}</span>
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${q.level==='Nhận biết'?'bg-green-100 text-green-700':q.level==='Thông hiểu'?'bg-blue-100 text-blue-700':q.level==='Vận dụng'?'bg-orange-100 text-orange-700':'bg-red-100 text-red-700'}`}>{q.level}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                      <button onClick={() => setAiEditingIndex(aiEditingIndex===idx?null:idx)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit size={14}/></button>
                                      <button onClick={() => removeAIGeneratedQuestion(idx)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                                    </div>
                                  </div>
                                  {aiEditingIndex === idx ? (
                                    <div className="p-4 space-y-3">
                                      <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none h-20 focus:ring-2 ring-indigo-400"
                                        value={q.question_text||''} onChange={e=>updateAIGeneratedQuestion(idx,{question_text:e.target.value})} placeholder="Nội dung câu hỏi..."/>
                                      {(q.question_type==='Trắc nghiệm'||q.question_type==='Đúng/Sai') && (
                                        <div className="grid grid-cols-2 gap-2">
                                          {['A','B','C','D'].map(opt=>(
                                            <input key={opt} className="p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-indigo-400"
                                              value={(q as any)[`option_${opt}`]||''} onChange={e=>updateAIGeneratedQuestion(idx,{[`option_${opt}`]:e.target.value} as any)}
                                              placeholder={`${q.question_type==='Trắc nghiệm'?'Lựa chọn':'Mệnh đề'} ${opt}`}/>
                                          ))}
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2">
                                        <input className="p-2.5 border border-teal-200 bg-teal-50 rounded-xl text-sm font-black text-teal-900 focus:ring-2 ring-teal-400"
                                          value={q.answer_key||''} onChange={e=>updateAIGeneratedQuestion(idx,{answer_key:e.target.value})} placeholder="Đáp án đúng"/>
                                        <input className="p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-indigo-400"
                                          value={q.solution||''} onChange={e=>updateAIGeneratedQuestion(idx,{solution:e.target.value})} placeholder="Lời giải..."/>
                                      </div>
                                      <button onClick={()=>setAiEditingIndex(null)} className="text-xs font-bold text-indigo-600 hover:underline">✓ Xong chỉnh sửa</button>
                                    </div>
                                  ) : (
                                    <div className="p-4">
                                      <div className="text-sm font-medium text-slate-800 mb-2 leading-relaxed"><MathText content={q.question_text||''}/></div>
                                      {q.question_type==='Trắc nghiệm' && (
                                        <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
                                          {['A','B','C','D'].map(opt=>(
                                            <div key={opt} className={`px-2.5 py-1.5 rounded-lg border ${q.answer_key===opt?'border-green-400 bg-green-50 text-green-800 font-bold':'border-slate-100'}`}>
                                              <span className="font-black mr-1">{opt}.</span><MathText content={(q as any)[`option_${opt}`]||''}/>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {q.question_type==='Trả lời ngắn' && q.answer_key && (
                                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-xs">
                                          <CheckCircle size={12} className="text-teal-600"/>
                                          <span className="font-black text-teal-800">Đáp án: {q.answer_key}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* FILTER BAR */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm mr-1">
                  <Target size={16}/> Lọc:
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Khối lớp</label>
                  <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700" value={filterGrade} onChange={e=>setFilterGrade(e.target.value)}>
                    <option value="">Tất cả</option>
                    {GRADES.map(g=><option key={g} value={String(g)}>Lớp {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Chủ đề</label>
                  <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 min-w-[180px]" value={filterTopic} onChange={e=>setFilterTopic(e.target.value)}>
                    <option value="">Tất cả</option>
                    {allTopics.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Loại câu hỏi</label>
                  <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700" value={filterType} onChange={e=>setFilterType(e.target.value)}>
                    <option value="">Tất cả</option>
                    {['Trắc nghiệm','Đúng/Sai','Trả lời ngắn','Tự luận'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mức độ</label>
                  <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700" value={filterLevel} onChange={e=>setFilterLevel(e.target.value)}>
                    <option value="">Tất cả</option>
                    {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                {(filterGrade||filterTopic||filterType||filterLevel) && (
                  <button onClick={()=>{setFilterGrade('');setFilterTopic('');setFilterType('');setFilterLevel('');}}
                    className="px-4 py-2.5 mt-4 text-sm font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 border border-red-100">
                    ✕ Xóa bộ lọc
                  </button>
                )}
                <div className="ml-auto text-sm font-bold text-slate-500 self-end pb-0.5">
                  <span className="text-teal-600 font-black">{filteredQuestions.length}</span> / {questions.length} câu hỏi
                </div>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                {loading ? <Loading message="Đang tải câu hỏi..." /> : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b">
                      <tr>
                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Phân loại</th>
                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Nội dung</th>
                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {filteredQuestions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-slate-400">
                            {questions.length === 0 ? 'Chưa có câu hỏi nào. Nhấn "Thêm thủ công" hoặc "Nhập từ File" để bắt đầu.' : 'Không có câu hỏi nào khớp với bộ lọc.'}
                          </td>
                        </tr>
                      ) : (
                        filteredQuestions.map(q => (
                          <tr key={q.exam_id} className="hover:bg-slate-50/30 transition group">
                            <td className="p-5">
                              <div className="font-bold text-slate-700">{q.question_type}</div>
                              <div className="text-[10px] text-teal-600 font-black uppercase mt-1 px-2 py-0.5 bg-teal-50 rounded-md inline-block">{q.level}</div>
                            </td>
                            <td className="p-5">
                              <div className="text-slate-600 font-medium max-w-2xl line-clamp-1">{q.question_text.replace(/<[^>]*>?/gm, '')}</div>
                              <div className="text-[10px] text-slate-300 italic mt-1 font-bold">{q.topic} • Lớp {q.grade}</div>
                            </td>
                            <td className="p-5 text-right">
                              <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => openEditModal(q)} className="p-2.5 text-teal-600 hover:bg-teal-50 rounded-xl transition">
                                  <Edit size={20}/>
                                </button>
                                <button onClick={() => handleDelete(q.exam_id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition">
                                  <Trash2 size={20}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            );
          })()}

          {/* TAB: THEORY */}
          {activeTab === 'theory' && (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">Ngân hàng lý thuyết</h2>
                  <p className="text-slate-400 font-medium">Quản lý tài liệu lý thuyết theo chủ đề và cấp độ</p>
                </div>
                <div className="flex gap-3">
                   <button onClick={loadTheories} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-teal-50 text-teal-600 transition shadow-sm">
                     <RefreshCw size={22} className={loading ? 'animate-spin' : ''}/>
                   </button>
                </div>
              </div>

              {/* AI Theory Generator Panel */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-3xl border-2 border-purple-100 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="text-purple-600" size={32} />
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">Tạo lý thuyết bằng AI</h3>
                    <p className="text-slate-500 text-sm">Gemini sẽ soạn bài giảng chi tiết theo yêu cầu</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-12 gap-4 mb-6">
                  <div className="col-span-3">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Khối lớp</label>
                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" value={theoryGenConfig.grade} onChange={e => setTheoryGenConfig({...theoryGenConfig, grade: Number(e.target.value)})}>
                      {GRADES.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                    </select>
                  </div>
                  <div className="col-span-5">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Chủ đề</label>
                    <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" placeholder="VD: Hàm số bậc hai" value={theoryGenConfig.topic} onChange={e => setTheoryGenConfig({...theoryGenConfig, topic: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Level</label>
                    <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" value={theoryGenConfig.level} onChange={e => setTheoryGenConfig({...theoryGenConfig, level: Number(e.target.value)})}>
                      {THEORY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-2 block opacity-0">Action</label>
                    <Button onClick={handleGenerateTheory} disabled={isGeneratingTheory} fullWidth className="bg-purple-600 hover:bg-purple-700 h-[48px]">
                      {isGeneratingTheory ? <><Loader2 className="animate-spin inline mr-2" size={18}/> Đang tạo...</> : <><Sparkles className="inline mr-2" size={18}/> Tạo AI</>}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Theories List */}
              <div className="bg-white rounded-[1.75rem] shadow-sm border border-slate-200 overflow-hidden">
                {loading ? <Loading message="Đang tải lý thuyết..." /> : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b">
                      <tr>
                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Phân loại</th>
                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Tiêu đề</th>
                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {theories.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-slate-400">
                            Chưa có lý thuyết nào. Sử dụng AI Generator để tạo lý thuyết mới.
                          </td>
                        </tr>
                      ) : (
                        theories.map(theory => (
                          <tr key={theory.id} className="hover:bg-slate-50/30 transition group">
                            <td className="p-5">
                              <div className="font-bold text-slate-700">Lớp {theory.grade}</div>
                              <div className="text-[10px] text-blue-600 font-black uppercase mt-1 px-2 py-0.5 bg-blue-50 rounded-md inline-block">Level {theory.level}</div>
                            </td>
                            <td className="p-5">
                              <div className="text-slate-800 font-bold">{theory.title}</div>
                              <div className="text-xs text-slate-400 mt-1">{theory.topic}</div>
                            </td>
                            <td className="p-5 text-right">
                              <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => setEditingTheory(theory)} className="p-2.5 text-teal-600 hover:bg-teal-50 rounded-xl transition">
                                  <Edit size={20}/>
                                </button>
                                <button onClick={() => handleDeleteTheory(theory.id || '')} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition">
                                  <Trash2 size={20}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB: EXAM CREATOR */}
          {activeTab === 'exam-creator' && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 opacity-30"></div>
                
                <h2 className="text-4xl font-black text-slate-800 mb-2 flex items-center gap-4">
                  <Sparkles className="text-teal-500" size={40}/> Trình tạo đề thi
                </h2>
                <p className="text-slate-400 font-medium mb-8">Xây dựng ma trận đề thi linh hoạt từ ngân hàng câu hỏi.</p>
                
                <div className="grid grid-cols-12 gap-8">
                    {/* LEFT: BUILDER CONTROLS */}
                    <div className="col-span-5 space-y-6">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                            <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2">
                              <Layers size={20}/> Cấu hình Khối & Chủ đề
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Khối lớp</label>
                                    <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700" 
                                        value={examConfig.grade} 
                                        onChange={e => {
                                            setExamConfig({...examConfig, grade: Number(e.target.value)}); 
                                            loadTopics(Number(e.target.value));
                                            setExamStructure([]);
                                        }}>
                                        {GRADES.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                      Chủ đề (Tổng số câu)
                                    </label>
                                    <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700" 
                                        value={builderSelection.topic} 
                                        onChange={e => setBuilderSelection({...builderSelection, topic: e.target.value})}>
                                        <option value="">-- Chọn chủ đề --</option>
                                        {topics.map(t => (
                                            <option key={t} value={t}>{t} ({getTopicTotalCount(t)})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mức độ</label>
                                        <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700" 
                                            value={builderSelection.level} 
                                            onChange={e => setBuilderSelection({...builderSelection, level: e.target.value})}>
                                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Số lượng</label>
                                        <input type="number" min="1" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700" 
                                            value={builderSelection.count} 
                                            onChange={e => setBuilderSelection({...builderSelection, count: Number(e.target.value)})}
                                        />
                                    </div>
                                </div>

                                {builderSelection.topic && (
                                    <div className="flex justify-between items-center text-xs font-bold px-1">
                                        <span className="text-slate-400">Khả dụng trong kho:</span>
                                        <span className={`px-2 py-1 rounded ${
                                          getAvailableCount(builderSelection.topic, builderSelection.level) >= builderSelection.count 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                            {getAvailableCount(builderSelection.topic, builderSelection.level)} câu
                                        </span>
                                    </div>
                                )}

                                <Button onClick={handleAddStructure} fullWidth className="bg-slate-800 text-white hover:bg-slate-900 shadow-slate-300">
                                    <Plus size={18} className="mr-2 inline"/> Thêm vào cấu trúc
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: MATRIX TABLE */}
                    <div className="col-span-7 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-slate-700 text-lg">Ma trận đề thi</h3>
                            <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-xl font-black text-sm">
                                Tổng: {getTotalExamQuestions()} câu
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {examStructure.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <LayoutList size={48} className="mb-2 opacity-50"/>
                                    <p className="font-medium text-sm">Chưa có thành phần nào.</p>
                                    <p className="text-xs">Hãy chọn chủ đề và thêm vào đây.</p>
                                </div>
                            ) : (
                                examStructure.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-teal-200 transition">
                                        <div>
                                            <div className="font-bold text-slate-800">{item.topic}</div>
                                            <div className="text-xs font-bold text-slate-400 uppercase mt-1">{item.level}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="font-mono font-black text-teal-600 text-lg bg-teal-50 px-3 py-1 rounded-lg">
                                                {item.count} câu
                                            </div>
                                            <button onClick={() => handleRemoveStructure(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTTOM: GENERATION ACTIONS */}
                <div className="mt-8 pt-8 border-t border-slate-100">
                    <div className="flex gap-6 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                              Chế độ xuất bản
                            </label>
                            <div className="flex gap-4">
                                <button onClick={() => setExamConfig({...examConfig, generationMode: 'batch'})} 
                                  className={`flex-1 p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 ${
                                    examConfig.generationMode === 'batch' 
                                      ? 'border-teal-500 bg-teal-50' 
                                      : 'border-slate-200 hover:border-teal-200'
                                  }`}>
                                    <div className={`p-2 rounded-lg ${
                                      examConfig.generationMode === 'batch' 
                                        ? 'bg-teal-200 text-teal-800' 
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      <LayoutList size={20}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Tạo mã đề</div>
                                        <div className="text-xs text-slate-400">Trộn ngẫu nhiên thành 4-6 đề</div>
                                    </div>
                                </button>
                                <button onClick={() => setExamConfig({...examConfig, generationMode: 'personalized'})} 
                                  className={`flex-1 p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 ${
                                    examConfig.generationMode === 'personalized' 
                                      ? 'border-teal-500 bg-teal-50' 
                                      : 'border-slate-200 hover:border-teal-200'
                                  }`}>
                                    <div className={`p-2 rounded-lg ${
                                      examConfig.generationMode === 'personalized' 
                                        ? 'bg-teal-200 text-teal-800' 
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      <UserCheck size={20}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Mỗi bạn 1 đề</div>
                                        <div className="text-xs text-slate-400">Đề riêng cho từng học sinh</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                        {examConfig.generationMode === 'batch' && (
                          <div className="w-32">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Số đề</label>
                            <input type="number" min="1" max="10" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-center" 
                              value={examConfig.batchCount} 
                              onChange={e => setExamConfig({...examConfig, batchCount: Number(e.target.value)})} 
                            />
                          </div>
                        )}
                        <div className="w-1/3">
                             <Button onClick={generateExams} disabled={isGeneratingBatch || examStructure.length === 0} fullWidth size="lg" className="bg-teal-600 h-[88px] text-xl rounded-2xl shadow-lg shadow-teal-100">
                                {isGeneratingBatch ? <><Loader2 className="animate-spin mr-3 inline"/> Đang xử lý...</> : <><Send className="mr-3 inline"/> Bắt đầu tạo đề</> }
                            </Button>
                        </div>
                    </div>
                </div>
              </div>

              {/* Generated Links */}
              {generatedBatchResult.length > 0 && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-teal-100 animate-slide-in shadow-lg">
                  <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-2xl">
                    <LinkIcon className="text-teal-500" size={28}/> Danh sách link đề thi:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedBatchResult.map((res, i) => (
                      <div key={i} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center border border-transparent hover:border-teal-200 transition-all">
                        <span className="font-bold text-slate-700 truncate mr-4">{res.name}</span>
                        <div className="flex gap-2">
                          <button onClick={() => window.open(res.link)} className="p-3 text-teal-600 bg-white rounded-xl border border-slate-200 hover:bg-teal-50 transition-all">
                            <Eye size={18}/>
                          </button>
                          <button onClick={() => {
                            navigator.clipboard.writeText(res.link); 
                            alert('Đã Copy Link!');
                          }} className="p-3 text-teal-600 bg-white rounded-xl border border-slate-200 hover:bg-teal-50 transition-all">
                            <Copy size={18}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


              {activeTab === 'exam-creator' && generatedBatchResult.length > 0 && (
                <div className="max-w-6xl mx-auto mt-8">
                  <ExamAssignmentManager
                    exams={generatedBatchResult}
                    generationMode={examConfig.generationMode}
                    grade={examConfig.grade}
                    students={students}
                    classOptions={classOptions}
                  />
                </div>
              )}

          {/* TAB: STUDENTS */}
          {activeTab === 'students' && (
            <>
              {studentViewMode === 'result-detail' && renderStudentResultDetail()}
              {studentViewMode === 'overview' && renderStudentOverview()}
              {studentViewMode === 'list' && (
                <div className="space-y-6">

                  {/* ── Header + Workspace modes ── */}
                  <div className="rounded-[2rem] bg-white/90 p-5 shadow-sm border border-white/80">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                          <UserCheck size={14}/> Teacher review dashboard
                        </div>
                        <h2 className="mt-3 text-3xl font-black text-slate-950">Theo dõi học sinh & bài làm</h2>
                        <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">Rà kết quả từng câu, xem bài đã giao theo lớp, so sánh chủ đề yếu và mở khóa level thủ công khi cần.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:w-[720px]">
                        {([
                          { id: 'by-student', icon: UserIcon, label: 'Học sinh', hint: `${students.length} em` },
                          { id: 'by-assignment', icon: ClipboardList, label: 'Bài đã giao', hint: assignmentListClass ? `Lớp ${assignmentListClass}` : 'Theo lớp' },
                          { id: 'by-topic', icon: BookOpen, label: 'Chủ đề', hint: allTopics.length ? `${allTopics.length} chủ đề` : 'Phân tích' },
                          { id: 'by-level', icon: TrendingUp, label: 'Tiến độ Level', hint: 'Ma trận lớp' },
                        ] as const).map(mode => {
                          const Icon = mode.icon;
                          const active = studentFilterMode === mode.id;
                          const handleClick = () => {
                            if (mode.id === 'by-student') { setStudentFilterMode('by-student'); setSelectedAssignment(null); setAssignmentAttempts([]); }
                            if (mode.id === 'by-assignment') { setStudentFilterMode('by-assignment'); setSelectedStudent(null); setStudentDetailData(null); setSelectedAssignment(null); setAssignmentAttempts([]); if (!assignmentListClass && classOptions.length === 1) { const onlyClass = String(classOptions[0]); setAssignmentListClass(onlyClass); loadAssignmentList(onlyClass); } }
                            if (mode.id === 'by-topic') { setStudentFilterMode('by-topic'); setSelectedStudent(null); setStudentDetailData(null); setSelectedAssignment(null); setAssignmentAttempts([]); setSelectedTopic(null); setTopicResults([]); if (allTopics.length === 0) loadAllTopics(); }
                            if (mode.id === 'by-level') { setStudentFilterMode('by-level'); setSelectedStudent(null); setStudentDetailData(null); setSelectedAssignment(null); setAssignmentAttempts([]); }
                          };
                          return (
                            <button key={mode.id} onClick={handleClick} className={`rounded-2xl border p-4 text-left transition-all ${active ? 'border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50 shadow-sm ring-2 ring-teal-100' : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`rounded-xl p-2 ${active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={17}/></div>
                                <div>
                                  <div className={`text-sm font-black ${active ? 'text-teal-800' : 'text-slate-700'}`}>{mode.label}</div>
                                  <div className="text-[11px] font-bold text-slate-400">{mode.hint}</div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ══════════════ CHẾ ĐỘ: THEO HỌC SINH ══════════════ */}
                  {studentFilterMode === 'by-student' && (
                    <>
                      <div className="flex justify-end items-center gap-3">
                        <div className="bg-teal-100 text-teal-700 px-5 py-2 rounded-2xl font-black text-sm">
                          Tổng: {students.length} học sinh
                        </div>
                        <button onClick={loadStudents} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-teal-50 text-teal-600 transition shadow-sm">
                          <RefreshCw size={22} className={loading ? 'animate-spin' : ''}/>
                        </button>
                      </div>
                      {loading ? (
                        <Loading message="Đang tải danh sách học sinh..." />
                      ) : (
                        <div className="bg-white rounded-[1.75rem] shadow-sm border border-slate-200 overflow-hidden">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b-2 border-slate-200">
                              <tr>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">STT</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Họ và Tên</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Email</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Lớp</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Điểm tích lũy</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {students.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-slate-400">
                                    Chưa có học sinh nào trong hệ thống
                                  </td>
                                </tr>
                              ) : (
                                students.map((s, i) => (
                                  <tr key={i} className="hover:bg-teal-50/10 transition-colors group">
                                    <td className="p-5 text-slate-500 font-bold">{i + 1}</td>
                                    <td className="p-5 font-black text-slate-800">{s.name}</td>
                                    <td className="p-5 text-slate-500 text-sm font-mono">{s.email}</td>
                                    <td className="p-5 text-slate-600 font-bold">{s.class}</td>
                                    <td className="p-5 text-right">
                                      <div className="font-mono font-black text-teal-600 text-xl">{s.totalScore}</div>
                                    </td>
                                    <td className="p-5 text-right">
                                      <button 
                                        onClick={() => handleViewStudentDetail(s.email)}
                                        className="opacity-100 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition inline-flex items-center gap-2 shadow-sm"
                                      >
                                        <Eye size={16} /> Xem chi tiết
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}

                  {/* ══════════════ CHẾ ĐỘ: THEO BÀI TẬP ══════════════ */}
                  {studentFilterMode === 'by-assignment' && (
                    <>
                      {/* Nếu chưa chọn bài tập → hiện danh sách bài tập */}
                      {!selectedAssignment ? (
                        <div className="space-y-4">
                          {/* Bộ lọc lớp */}
                          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                              <div className="flex-1 min-w-[220px]">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Chọn lớp để xem bài đã giao</label>
                                <select
                                  value={assignmentListClass}
                                  onChange={(e) => { const cls = e.target.value; setAssignmentListClass(cls); setSelectedAssignment(null); setAssignmentAttempts([]); if (cls) loadAssignmentList(cls); }}
                                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-700 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
                                >
                                  <option value="">-- Chọn lớp --</option>
                                  {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <button
                                onClick={() => loadAssignmentList(assignmentListClass)}
                                disabled={!assignmentListClass.trim() || assignmentListLoading}
                                className="px-6 py-3 rounded-2xl bg-teal-600 text-white font-black hover:bg-teal-700 disabled:opacity-40 transition flex items-center justify-center gap-2 shadow-lg shadow-teal-100"
                              >
                                {assignmentListLoading ? <Loader2 size={18} className="animate-spin"/> : <ClipboardList size={18}/>}
                                Tải bài đã giao
                              </button>
                            </div>
                            {classOptions.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <span className="mr-1 self-center text-[11px] font-black uppercase tracking-widest text-slate-400">Lớp nhanh:</span>
                                {classOptions.map((c: string) => (
                                  <button key={c} onClick={() => { setAssignmentListClass(c); setSelectedAssignment(null); setAssignmentAttempts([]); loadAssignmentList(c); }} className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${assignmentListClass === c ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700'}`}>
                                    {c}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Danh sách bài tập */}
                          {assignmentListLoading ? (
                            <Loading message="Đang tải danh sách bài tập..." />
                          ) : assignmentList.length === 0 && assignmentListClass ? (
                            <div className="text-center py-16 text-slate-400">
                              <ClipboardList size={48} className="mx-auto mb-3 opacity-30"/>
                              <p className="font-medium">Chưa có bài nào được giao cho lớp này</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {assignmentList.map((a) => (
                                <button
                                  key={a.assignmentId}
                                  onClick={() => { if (students.length === 0) loadStudents(); handleViewAssignmentAttempts(a); }}
                                  className="text-left bg-white rounded-[1.75rem] border border-slate-200 hover:border-teal-300 hover:shadow-xl hover:-translate-y-0.5 p-6 transition-all group"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-black text-slate-800 text-lg truncate group-hover:text-teal-700 transition">
                                        {a.examTitle}
                                      </div>
                                      <div className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                                        <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-lg font-bold text-xs">{a.className}</span>
                                        <span>Mở: {formatDate(a.openAt)}</span>
                                        {a.dueAt && <span>• Hạn: {formatDate(a.dueAt)}</span>}
                                      </div>
                                    </div>
                                    <div className="shrink-0 p-3 bg-teal-50 rounded-2xl group-hover:bg-teal-100 transition">
                                      <Eye size={20} className="text-teal-600"/>
                                    </div>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 font-medium">
                                    <Clock size={13}/> {a.durationMinutes} phút
                                    <span className="mx-1">·</span>
                                    <Target size={13}/> Tối đa {a.maxAttempts} lần
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ── Đã chọn bài đã giao → hiện kết quả các học sinh ── */
                        <div className="space-y-5">
                          {/* Back + tiêu đề */}
                          <button
                            onClick={() => { setSelectedAssignment(null); setAssignmentAttempts([]); }}
                            className="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-bold transition"
                          >
                            <ArrowLeft size={20}/> Quay lại danh sách bài đã giao
                          </button>

                          <div className="bg-gradient-to-r from-slate-900 via-teal-800 to-teal-600 rounded-[2rem] p-7 text-white shadow-xl shadow-teal-100">
                            <div className="flex items-center gap-4">
                              <div className="p-4 bg-white/20 rounded-2xl">
                                <ClipboardList size={32} className="text-white"/>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-black truncate">{selectedAssignment.examTitle}</h2>
                                <div className="flex gap-4 text-white/85 text-sm mt-1 flex-wrap">
                                  <span>🎓 Lớp {selectedAssignment.className}</span>
                                  <span>📅 Mở: {formatDate(selectedAssignment.openAt)}</span>
                                  {selectedAssignment.dueAt && <span>⏰ Hạn: {formatDate(selectedAssignment.dueAt)}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-4xl font-black">{assignmentAttempts.length}</div>
                                <div className="text-white/80 text-sm font-bold">lượt nộp</div>
                              </div>
                            </div>
                          </div>

                          {/* Bộ sắp xếp */}
                          {assignmentAttempts.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sắp xếp theo:</span>
                              {([
                                { key: 'percentage', label: '% Điểm' },
                                { key: 'studentName', label: 'Tên học sinh' },
                                { key: 'timeSpent', label: 'Thời gian' },
                              ] as const).map(({ key, label }) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    if (attemptsSortBy === key) setAttemptsSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    else { setAttemptsSortBy(key); setAttemptsSortDir(key === 'studentName' ? 'asc' : 'desc'); }
                                  }}
                                  className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-1.5 ${attemptsSortBy === key ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}
                                >
                                  {label}
                                  {attemptsSortBy === key && (
                                    <span className="text-xs">{attemptsSortDir === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Bảng kết quả */}
                          {assignmentAttemptsLoading ? (
                            <Loading message="Đang tải kết quả học sinh..." />
                          ) : assignmentAttempts.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200">
                              <GraduationCap size={48} className="mx-auto mb-3 opacity-30"/>
                              <p className="font-medium">Chưa có học sinh nào nộp bài cho bài tập này</p>
                            </div>
                          ) : (() => {
                            const sorted = [...assignmentAttempts].sort((a, b) => {
                              let va: any = a[attemptsSortBy];
                              let vb: any = b[attemptsSortBy];
                              if (typeof va === 'string') va = va.toLowerCase();
                              if (typeof vb === 'string') vb = vb.toLowerCase();
                              if (va < vb) return attemptsSortDir === 'asc' ? -1 : 1;
                              if (va > vb) return attemptsSortDir === 'asc' ? 1 : -1;
                              return 0;
                            });
                            return (
                              <div className="bg-white rounded-[1.75rem] shadow-sm border border-slate-200 overflow-hidden">
                                {topicsLoading && (
                                  <div className="px-6 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2 text-teal-700 text-sm font-bold">
                                    <Loader2 size={14} className="animate-spin"/> Đang phân tích chủ đề từng bài làm...
                                  </div>
                                )}
                                <table className="w-full text-left">
                                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                                    <tr>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Xếp hạng</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Học sinh</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Lớp</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Chủ đề</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Điểm</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Kết quả</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Thời gian</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Chi tiết</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {sorted.map((attempt, idx) => {
                                      const pct = Number(attempt.percentage) || 0;
                                      const isPassed = pct >= 80;
                                      const rankColors = idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400 border border-slate-200';
                                      const topics = topicsByAttemptId[attempt.attemptId] || [];
                                      return (
                                        <tr key={attempt.attemptId || idx} className="hover:bg-teal-50/10 transition-colors group">
                                          <td className="p-5">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${rankColors}`}>
                                              {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1}
                                            </div>
                                          </td>
                                          <td className="p-5">
                                            <div className="font-black text-slate-800">{attempt.studentName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{attempt.email}</div>
                                          </td>
                                          <td className="p-5 text-slate-600 font-bold">{attempt.studentClass}</td>
                                          <td className="p-5 max-w-[220px]">
                                            {topics.length > 0 ? (
                                              <div className="flex flex-wrap gap-1">
                                                {topics.map((t) => (
                                                  <span key={t} className="bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap">
                                                    {t}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : topicsLoading ? (
                                              <span className="text-slate-300 text-xs">Đang tải...</span>
                                            ) : (
                                              <span className="text-slate-300 text-xs">—</span>
                                            )}
                                          </td>
                                          <td className="p-5 text-center">
                                            <div className={`text-2xl font-black ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-teal-600' : 'text-red-500'}`}>
                                              {pct}%
                                            </div>
                                            <div className="text-xs text-slate-400">{attempt.score}/{attempt.totalQuestions} câu</div>
                                          </td>
                                          <td className="p-5 text-center">
                                            <span className={`px-3 py-1.5 rounded-xl font-black text-xs ${isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                              {isPassed ? '✓ Đạt' : '✗ Chưa đạt'}
                                            </span>
                                          </td>
                                          <td className="p-5 text-center text-slate-600 font-bold text-sm">
                                            {attempt.timeSpent ? formatTime(Number(attempt.timeSpent)) : '—'}
                                          </td>
                                          <td className="p-5 text-right">
                                            {attempt.resultId && (
                                              <button
                                                onClick={() => handleViewResultDetail(attempt.resultId)}
                                                className="opacity-100 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition inline-flex items-center gap-2 shadow-sm"
                                              >
                                                <Eye size={15}/> Xem bài
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </>
                  )}

                  {/* ══════════════ CHẾ ĐỘ: TIẾN ĐỘ LEVEL ══════════════ */}
                  {studentFilterMode === 'by-level' && (
                    <ClassLevelProgress classOptions={classOptions} defaultGrade={12} />
                  )}

                  {/* ══════════════ CHẾ ĐỘ: THEO CHỦ ĐỀ ══════════════ */}
                  {studentFilterMode === 'by-topic' && (
                    <div className="space-y-5">
                      {!selectedTopic ? (
                        <>
                          <div className="flex gap-3 items-center">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={topicFilterText}
                                onChange={(e) => setTopicFilterText(e.target.value)}
                                placeholder="Lọc nhanh tên chủ đề..."
                                className="w-full pl-5 pr-10 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 placeholder:font-normal focus:outline-none focus:border-teal-400 transition"
                              />
                              {topicFilterText && (
                                <button onClick={() => setTopicFilterText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                  <XCircle size={18}/>
                                </button>
                              )}
                            </div>
                            <button onClick={loadAllTopics} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:bg-teal-50 text-teal-600 transition shadow-sm" title="Tải lại">
                              <RefreshCw size={20} className={allTopicsLoading ? 'animate-spin' : ''}/>
                            </button>
                          </div>
                          {allTopicsLoading ? (
                            <Loading message="Đang tải danh sách chủ đề..." />
                          ) : allTopics.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200">
                              <BookOpen size={48} className="mx-auto mb-3 opacity-30"/>
                              <p className="font-medium">Chưa có dữ liệu bài làm nào trong hệ thống</p>
                            </div>
                          ) : (() => {
                            const filtered = allTopics.filter((t: any) =>
                              !topicFilterText || t.topic.toLowerCase().includes(topicFilterText.toLowerCase())
                            );
                            return (
                              <>
                                <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                                  <span className="bg-teal-100 text-teal-700 font-black px-3 py-1 rounded-xl">{filtered.length}</span>
                                  chủ đề có dữ liệu bài làm
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                  {filtered.map((t: any) => (
                                    <button
                                      key={t.topic}
                                      onClick={() => { setSelectedTopic(t); loadResultsByTopic(t.topic); }}
                                      className="text-left bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-400 hover:shadow-md p-5 transition-all group"
                                    >
                                      <div className="font-black text-slate-800 group-hover:text-teal-700 transition mb-3 leading-snug">{t.topic}</div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                          <GraduationCap size={13}/> {t.studentCount} học sinh
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                          <ClipboardList size={13}/> {t.attempts} lượt
                                        </span>
                                        {t.passedCount > 0 && (
                                          <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-lg">
                                            <CheckCircle size={13}/> {t.passedCount} đạt
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="space-y-5">
                          <button onClick={() => { setSelectedTopic(null); setTopicResults([]); }} className="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-bold transition">
                            <ArrowLeft size={20}/> Quay lại danh sách chủ đề
                          </button>
                          <div className="bg-gradient-to-r from-slate-900 via-teal-800 to-teal-600 rounded-[2rem] p-7 text-white shadow-xl shadow-teal-100">
                            <div className="flex items-center gap-4">
                              <div className="p-4 bg-white/20 rounded-2xl shrink-0"><BookOpen size={32} className="text-white"/></div>
                              <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-black truncate">{selectedTopic.topic}</h2>
                                <div className="flex gap-5 text-white/85 text-sm mt-1 flex-wrap">
                                  <span>👥 {selectedTopic.studentCount} học sinh</span>
                                  <span>📝 {selectedTopic.attempts} lượt làm</span>
                                  <span>✅ {selectedTopic.passedCount} lượt đạt</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {topicResults.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sắp xếp:</span>
                              {([
                                { key: 'bestPercentage', label: 'Điểm cao nhất' },
                                { key: 'avgPercentage',  label: 'Điểm TB' },
                                { key: 'attempts',       label: 'Số lần làm' },
                                { key: 'studentName',    label: 'Tên HS' },
                              ] as const).map(({ key, label }) => (
                                <button key={key}
                                  onClick={() => { if (topicSortBy === key) setTopicSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setTopicSortBy(key); setTopicSortDir(key === 'studentName' ? 'asc' : 'desc'); } }}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ${topicSortBy === key ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}
                                >
                                  {label}{topicSortBy === key && <span>{topicSortDir === 'desc' ? '↓' : '↑'}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                          {topicResultsLoading ? (
                            <Loading message="Đang tải dữ liệu học sinh..." />
                          ) : (() => {
                            const sorted = [...topicResults].sort((a, b) => {
                              let va: any = a[topicSortBy], vb: any = b[topicSortBy];
                              if (typeof va === 'string') va = va.toLowerCase();
                              if (typeof vb === 'string') vb = vb.toLowerCase();
                              if (va < vb) return topicSortDir === 'asc' ? -1 : 1;
                              if (va > vb) return topicSortDir === 'asc' ? 1 : -1;
                              return 0;
                            });
                            return sorted.length === 0 ? (
                              <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-200">
                                <GraduationCap size={40} className="mx-auto mb-3 opacity-30"/>
                                <p className="font-medium">Không có dữ liệu</p>
                              </div>
                            ) : (
                              <div className="bg-white rounded-[1.75rem] shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left">
                                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                                    <tr>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Xếp hạng</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Học sinh</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Lớp</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Điểm cao nhất</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Điểm TB</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Số lần làm</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Đạt</th>
                                      <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Bài tốt nhất</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {sorted.map((row, idx) => {
                                      const best = Number(row.bestPercentage) || 0;
                                      const avg  = Number(row.avgPercentage)  || 0;
                                      const rankColors = idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400 border border-slate-200';
                                      return (
                                        <tr key={row.email} className="hover:bg-teal-50/10 transition-colors group">
                                          <td className="p-5">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${rankColors}`}>
                                              {idx < 3 ? ['🥇','🥈','🥉'][idx] : idx + 1}
                                            </div>
                                          </td>
                                          <td className="p-5">
                                            <div className="font-black text-slate-800">{row.studentName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{row.email}</div>
                                          </td>
                                          <td className="p-5 text-slate-600 font-bold">{row.studentClass}</td>
                                          <td className="p-5 text-center">
                                            <div className={`text-2xl font-black ${best >= 80 ? 'text-green-600' : best >= 50 ? 'text-teal-600' : 'text-red-500'}`}>{best}%</div>
                                          </td>
                                          <td className="p-5 text-center">
                                            <div className={`text-lg font-black ${avg >= 80 ? 'text-green-500' : avg >= 50 ? 'text-teal-500' : 'text-orange-400'}`}>{avg}%</div>
                                          </td>
                                          <td className="p-5 text-center">
                                            <span className="bg-slate-100 text-slate-700 font-black text-sm px-3 py-1.5 rounded-xl">{row.attempts} lần</span>
                                          </td>
                                          <td className="p-5 text-center">
                                            {row.passedCount > 0 ? (
                                              <span className="bg-green-100 text-green-700 font-black text-xs px-3 py-1.5 rounded-xl">✓ {row.passedCount}/{row.attempts}</span>
                                            ) : (
                                              <span className="bg-red-50 text-red-400 font-bold text-xs px-3 py-1.5 rounded-xl">✗ Chưa đạt</span>
                                            )}
                                          </td>
                                          <td className="p-5 text-right">
                                            {row.bestResultId && (
                                              <button onClick={() => handleViewResultDetail(row.bestResultId)}
                                                className="opacity-100 px-4 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition inline-flex items-center gap-2 shadow-sm">
                                                <Eye size={15}/> Xem bài
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </>
          )}
          </main>
        </div>
      </div>

      {/* MODAL: EDIT QUESTION */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-7xl max-h-[92vh] overflow-hidden shadow-2xl flex border border-white/20 animate-fade-in">
            <div className="flex-1 p-10 overflow-y-auto border-r border-slate-100">
               <h3 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-4">
                 <Edit className="text-teal-600" size={32}/> Chỉnh sửa câu hỏi
               </h3>
               <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dạng câu hỏi</label>
                      <select className="w-full p-5 bg-white border border-slate-300 rounded-3xl font-bold text-slate-900 focus:ring-2 ring-teal-500" 
                        value={editingQuestion.question_type} 
                        onChange={e => setEditingQuestion({...editingQuestion, question_type: e.target.value as any})}>
                        <option value="Trắc nghiệm">Trắc nghiệm</option>
                        <option value="Đúng/Sai">Đúng/Sai</option>
                        <option value="Trả lời ngắn">Trả lời ngắn</option>
                        <option value="Tự luận">Tự luận</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mức độ tư duy</label>
                      <select className="w-full p-5 bg-white border border-slate-300 rounded-3xl font-bold text-slate-900 focus:ring-2 ring-teal-500" 
                        value={editingQuestion.level} 
                        onChange={e => setEditingQuestion({...editingQuestion, level: e.target.value})}>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nội dung (Hỗ trợ LaTeX $...$)
                    </label>
                    <textarea className="w-full p-6 bg-white border border-slate-300 rounded-[2rem] h-40 font-medium text-slate-900 focus:ring-2 ring-teal-500 outline-none leading-relaxed" 
                      value={editingQuestion.question_text} 
                      onChange={e => setEditingQuestion({...editingQuestion, question_text: e.target.value})} 
                      placeholder="Nhập đề bài tại đây..." 
                    />
                  </div>

                  {(editingQuestion.question_type === 'Trắc nghiệm' || editingQuestion.question_type === 'Đúng/Sai') && (
                    <div className="grid grid-cols-2 gap-6">
                       {['A', 'B', 'C', 'D'].map(opt => (
                         <div key={opt} className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {editingQuestion.question_type === 'Trắc nghiệm' ? `Lựa chọn ${opt}` : `Mệnh đề ${opt}`}
                            </label>
                            <input className="w-full p-5 bg-white border border-slate-300 rounded-3xl font-medium text-slate-900 focus:ring-2 ring-teal-500" 
                              value={editingQuestion[`option_${opt}` as keyof Question] as string} 
                              onChange={e => setEditingQuestion({...editingQuestion, [`option_${opt}` as keyof Question]: e.target.value})} 
                            />
                         </div>
                       ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đáp án đúng</label>
                      <input className="w-full p-5 bg-teal-50 border border-teal-200 rounded-3xl font-black text-teal-900 placeholder:text-teal-400 focus:ring-2 ring-teal-500"
                        value={editingQuestion.answer_key}
                        onChange={e => setEditingQuestion({...editingQuestion, answer_key: e.target.value})}
                        placeholder={editingQuestion.question_type === 'Đúng/Sai' ? 'Đ-S-Đ-S' : 'A'}
                      />
                    </div>

                    {/* ★ CASCADING TOPIC PICKER */}
                    {(() => {
                      const allFlatTopics = flattenTopics();
                      const gradeOptions = Object.keys(TOPIC_DATA);
                      const domainOptions = pickerGrade ? Object.keys(TOPIC_DATA[pickerGrade] || {}) : [];
                      const chapterOptions = pickerGrade && pickerDomain ? Object.keys(TOPIC_DATA[pickerGrade]?.[pickerDomain] || {}) : [];
                      const topicOptions = allFlatTopics.filter(t => {
                        if (pickerGrade && t.grade !== pickerGrade) return false;
                        if (pickerDomain && t.domain !== pickerDomain) return false;
                        if (pickerChapter && t.chapter !== pickerChapter) return false;
                        if (topicSearchText && !t.topic.toLowerCase().includes(topicSearchText.toLowerCase())) return false;
                        return true;
                      });
                      const selectedTopicItem = allFlatTopics.find(t => t.topic === editingQuestion.topic && t.grade === pickerGrade);
                      const availableLevels = selectedTopicItem ? selectedTopicItem.levels : LEVELS;

                      const handlePickerGradeChange = (g: string) => {
                        setPickerGrade(g); setPickerDomain(''); setPickerChapter(''); setTopicSearchText('');
                        setEditingQuestion({ ...editingQuestion, grade: parseInt(g.replace('Lớp ', '')), topic: '' });
                      };
                      const handleTopicSelect = (item: TopicItem) => {
                        const gradeNum = parseInt(item.grade.replace('Lớp ', ''));
                        const newLevel = item.levels.includes(editingQuestion.level as any) ? editingQuestion.level : item.levels[0];
                        setEditingQuestion({ ...editingQuestion, topic: item.topic, grade: gradeNum, level: newLevel });
                        setPickerGrade(item.grade);
                      };
                      return (
                        <div className="space-y-3 p-5 bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-3xl border-2 border-teal-100">
                          <div className="flex items-center gap-2">
                            <Layers className="text-teal-600" size={16}/>
                            <span className="text-xs font-black text-teal-700 uppercase tracking-widest">Chọn chủ đề CTGDPT 2018</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Khối lớp</label>
                              <select className="w-full p-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 text-sm focus:ring-2 ring-teal-400"
                                value={pickerGrade} onChange={e => handlePickerGradeChange(e.target.value)}>
                                <option value="">-- Chọn khối lớp --</option>
                                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Mạch kiến thức</label>
                              <select className="w-full p-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 text-sm focus:ring-2 ring-teal-400"
                                value={pickerDomain} onChange={e => { setPickerDomain(e.target.value); setPickerChapter(''); setTopicSearchText(''); }} disabled={!pickerGrade}>
                                <option value="">-- Chọn mạch KT --</option>
                                {domainOptions.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Chương</label>
                              <select className="w-full p-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 text-sm focus:ring-2 ring-teal-400"
                                value={pickerChapter} onChange={e => { setPickerChapter(e.target.value); setTopicSearchText(''); }} disabled={!pickerDomain}>
                                <option value="">-- Tất cả chương --</option>
                                {chapterOptions.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tìm kiếm</label>
                              <input className="w-full p-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 ring-teal-400"
                                placeholder="Gõ tên chủ đề..." value={topicSearchText} onChange={e => setTopicSearchText(e.target.value)}/>
                            </div>
                          </div>
                          {(pickerGrade || topicSearchText) && (
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Chọn chủ đề ({topicOptions.length} kết quả)</div>
                              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                                {topicOptions.length === 0 ? (
                                  <div className="text-center text-slate-400 text-sm py-4 italic">Không tìm thấy chủ đề</div>
                                ) : topicOptions.map(item => {
                                  const isSel = editingQuestion.topic === item.topic && `Lớp ${editingQuestion.grade}` === item.grade;
                                  return (
                                    <button key={item.id} onClick={() => handleTopicSelect(item)}
                                      className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-all flex items-start gap-3 ${isSel ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-100 bg-white hover:border-teal-200 hover:bg-teal-50/50'}`}>
                                      <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-bold truncate ${isSel ? 'text-teal-800' : 'text-slate-700'}`}>{item.topic}</div>
                                        <div className="text-[10px] text-slate-400">{item.grade} · {item.chapter}</div>
                                      </div>
                                      <div className="flex flex-wrap gap-1 shrink-0">
                                        {item.levels.map(l => (
                                          <span key={l} className={`text-[9px] font-black px-1.5 py-0.5 rounded ${l==='Nhận biết'?'bg-green-100 text-green-700':l==='Thông hiểu'?'bg-blue-100 text-blue-700':l==='Vận dụng'?'bg-orange-100 text-orange-700':'bg-red-100 text-red-700'}`}>
                                            {l.replace('Vận dụng cao','VDC').replace('Vận dụng','VD').replace('Thông hiểu','TH').replace('Nhận biết','NB')}
                                          </span>
                                        ))}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3 pt-2 border-t border-teal-100">
                            <div className="flex-1">
                              {editingQuestion.topic ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CheckCircle size={15} className="text-teal-500 shrink-0"/>
                                  <span className="text-sm font-black text-teal-800">{editingQuestion.topic}</span>
                                  <span className="text-xs text-slate-400">— Lớp {editingQuestion.grade}</span>
                                </div>
                              ) : <span className="text-sm text-slate-400 italic">Chưa chọn chủ đề</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <label className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Mức độ:</label>
                              <select className="p-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 ring-teal-400"
                                value={editingQuestion.level} onChange={e => setEditingQuestion({...editingQuestion, level: e.target.value})}>
                                {availableLevels.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Hoặc nhập chủ đề tùy chỉnh</label>
                            <input className="w-full p-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-sm"
                              placeholder="Nhập tên chủ đề nếu không có trong danh sách..."
                              value={editingQuestion.topic || ''}
                              onChange={e => setEditingQuestion({...editingQuestion, topic: e.target.value})}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
               </div>

               <div className="flex gap-4 mt-12">
                  <Button onClick={handleSaveEdit} className="bg-teal-600 flex-1 h-16 text-lg rounded-3xl shadow-lg shadow-teal-50">
                    Cập nhật hệ thống
                  </Button>
                  <Button onClick={() => setEditingQuestion(null)} variant="secondary" className="px-10 rounded-3xl h-16">
                    Hủy
                  </Button>
               </div>
            </div>

            {/* Preview Pane */}
            <div className="w-[450px] bg-white p-10 overflow-y-auto border-l border-slate-100">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                 <Eye size={16}/> Xem trước nội dung
               </h3>
               <div className="bg-slate-50 p-8 rounded-[2rem] shadow-inner border border-slate-200 min-h-[500px] flex flex-col">
                  <div className="text-[10px] font-black bg-teal-100 text-teal-700 px-3 py-1 rounded-lg inline-block mb-4 uppercase self-start">
                    {editingQuestion.question_type}
                  </div>
                  <div className="text-lg font-bold text-slate-900 leading-relaxed mb-8">
                    <MathText content={editingQuestion.question_text || 'Chưa có nội dung...'} />
                  </div>
                  
                  {editingQuestion.question_type === 'Trắc nghiệm' && (
                    <div className="space-y-3">
                       {['A', 'B', 'C', 'D'].map(opt => (
                         <div key={opt} className="p-4 border border-slate-200 rounded-2xl text-sm flex gap-3 bg-white shadow-sm">
                            <span className="font-black text-teal-700">{opt}.</span>
                            <div className="text-slate-900 font-medium w-full">
                                <MathText content={editingQuestion[`option_${opt}` as keyof Question] as string || ''} />
                            </div>
                         </div>
                       ))}
                    </div>
                  )}

                  {editingQuestion.question_type === 'Đúng/Sai' && (
                    <div className="space-y-4 mt-4">
                       {['A', 'B', 'C', 'D'].map(opt => (
                         <div key={opt} className="p-4 border border-slate-200 rounded-2xl text-xs bg-white shadow-sm">
                            <div className="font-black mb-2 text-teal-700">{opt})</div>
                            <div className="text-slate-900 font-medium w-full">
                                <MathText content={editingQuestion[`option_${opt}` as keyof Question] as string || ''} />
                            </div>
                         </div>
                       ))}
                    </div>
                  )}

                  {editingQuestion.question_type === 'Trả lời ngắn' && (
                    <div className="mt-auto pt-6 border-t border-dashed border-slate-300 text-xs text-slate-500 italic flex items-center gap-2">
                      <Send size={14}/> Ô nhập liệu của học sinh...
                    </div>
                  )}

                 {editingQuestion.question_type === 'Tự luận' && (
                    <div className="mt-auto pt-6 border-t border-dashed border-slate-300 text-xs text-slate-500 italic flex items-center gap-2">
                      <Send size={14}/> Câu trả lời
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT THEORY */}
      {editingTheory && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex border border-white/20">
            <div className="flex-1 p-10 overflow-y-auto">
               <h3 className="text-3xl font-black text-slate-800 mb-8 flex items-center gap-4">
                 <BookOpen className="text-purple-600" size={32}/> Chỉnh sửa lý thuyết
               </h3>
               <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-2 block">Khối lớp</label>
                      <select className="w-full p-3 bg-white border border-slate-300 rounded-2xl font-bold" 
                        value={editingTheory.grade} 
                        onChange={e => setEditingTheory({...editingTheory, grade: Number(e.target.value)})}>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-2 block">Chủ đề</label>
                      <input className="w-full p-3 bg-white border border-slate-300 rounded-2xl font-bold" 
                        value={editingTheory.topic} 
                        onChange={e => setEditingTheory({...editingTheory, topic: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-2 block">Level</label>
                      <select className="w-full p-3 bg-white border border-slate-300 rounded-2xl font-bold" 
                        value={editingTheory.level} 
                        onChange={e => setEditingTheory({...editingTheory, level: Number(e.target.value)})}>
                        {THEORY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">Tiêu đề</label>
                    <input className="w-full p-4 bg-white border border-slate-300 rounded-2xl font-bold text-lg" 
                      value={editingTheory.title} 
                      onChange={e => setEditingTheory({...editingTheory, title: e.target.value})} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">
                      Nội dung (Hỗ trợ LaTeX $...$)
                    </label>
                    <textarea className="w-full p-4 bg-white border border-slate-300 rounded-2xl h-48 font-medium leading-relaxed" 
                      value={editingTheory.content} 
                      onChange={e => setEditingTheory({...editingTheory, content: e.target.value})} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">Ví dụ minh họa</label>
                    <textarea className="w-full p-4 bg-white border border-slate-300 rounded-2xl h-32 font-medium" 
                      value={editingTheory.examples} 
                      onChange={e => setEditingTheory({...editingTheory, examples: e.target.value})} 
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">Mẹo & Lưu ý</label>
                    <textarea className="w-full p-4 bg-white border border-slate-300 rounded-2xl h-24 font-medium" 
                      value={editingTheory.tips} 
                      onChange={e => setEditingTheory({...editingTheory, tips: e.target.value})} 
                    />
                  </div>
               </div>

               <div className="flex gap-4 mt-8">
                  <Button onClick={handleSaveTheory} className="bg-purple-600 flex-1 h-14 text-lg rounded-2xl shadow-lg">
                    Lưu vào hệ thống
                  </Button>
                  <Button onClick={() => setEditingTheory(null)} variant="secondary" className="px-10 rounded-2xl h-14">
                    Hủy
                  </Button>
               </div>
            </div>

            {/* Preview Pane */}
            <div className="w-[450px] bg-slate-50 p-8 overflow-y-auto border-l border-slate-200">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Xem trước</h3>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="text-[10px] font-black bg-purple-100 text-purple-700 px-2 py-1 rounded inline-block mb-4">
                    Level {editingTheory.level}
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mb-4">
                    <MathText content={editingTheory.title || 'Chưa có tiêu đề'} />
                  </h4>
                  <div className="text-sm text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                    <MathText content={editingTheory.content || 'Chưa có nội dung...'} />
                  </div>
                  {editingTheory.examples && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                      <div className="font-bold text-xs text-blue-900 mb-2">VÍ DỤ</div>
                      <div className="text-sm text-slate-700">
                        <MathText content={editingTheory.examples} />
                      </div>
                    </div>
                  )}
                  {editingTheory.tips && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
                      <div className="font-bold text-xs text-yellow-900 mb-2">MẸO & LƯU Ý</div>
                      <div className="text-sm text-slate-700">{editingTheory.tips}</div>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT OCR */}
      {importMode && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-fade-in">
             <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl border border-white/20">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-[2rem]">
                   <div>
                      <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <FileUp className="text-teal-600"/> Nhập đề thi từ File
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">
                        Hỗ trợ Word (.docx), PDF và Ảnh. Hệ thống tự động nhận diện công thức LaTeX.
                      </p>
                   </div>
                   <button onClick={() => setImportMode(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 text-slate-500">
                     <XCircle size={24}/>
                   </button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                   {/* Left: Upload Area */}
                   <div className="w-1/3 bg-slate-50 p-8 border-r border-slate-100 flex flex-col">
                      <div className="border-2 border-dashed border-teal-300 bg-teal-50 rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-teal-100 transition relative group">
                          <input type="file" accept=".docx,.pdf,.png,.jpg,.jpeg" onChange={handleFileImport} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isProcessingFile} />
                          {isProcessingFile ? (
                              <div className="text-center">
                                  <Loader2 className="animate-spin text-teal-600 mx-auto mb-2" size={32}/>
                                  <span className="text-teal-700 font-bold text-sm">{importStatus}</span>
                              </div>
                          ) : (
                              <div className="text-center group-hover:scale-105 transition">
                                  <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3">
                                    <FileUp size={24} className="text-teal-600"/>
                                  </div>
                                  <p className="font-bold text-teal-800">Chọn file để tải lên</p>
                                  <p className="text-xs text-teal-600 mt-1">Word, PDF hoặc Ảnh</p>
                              </div>
                          )}
                      </div>
                      
                      
                    
                    {/* Trong render */}
                    <div className="mt-6">
                      <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-full flex items-center justify-between p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                      >
                        <span className="font-black text-slate-700 text-sm uppercase">
                          ⚙️ Cài đặt mặc định
                        </span>
                        <span className="text-xs text-slate-500">
                          {showSettings ? '▲ Thu gọn' : '▼ Mở rộng'}
                        </span>
                      </button>
                      
                      {showSettings && (
                        <div className="mt-3 space-y-3 animate-slide-in">
                          <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">Khối lớp</label>
                            <select 
                              value={importDefaultGrade}
                              onChange={(e) => setImportDefaultGrade(Number(e.target.value))}
                              className="w-full p-2 rounded-lg border border-slate-200 bg-white text-sm"
                            >
                              {GRADES.map(g => <option key={g} value={g}>Lớp {g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">Chủ đề</label>
                            <input 
                              type="text"
                              value={importDefaultTopic}
                              onChange={(e) => setImportDefaultTopic(e.target.value)}
                              className="w-full p-2 rounded-lg border border-slate-200 text-sm" 
                              placeholder="VD: Hàm số" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                      
                      <div className="mt-auto pt-6 border-t border-slate-200">
                         <div className="flex items-center gap-2 text-slate-500 text-xs mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                            <FileType size={16} className="text-yellow-600 shrink-0"/>
                            <span>Mẹo: File Word sẽ giữ định dạng tốt nhất. PDF/ảnh dùng AI để nhận diện.</span>
                         </div>
                         <Button onClick={handleSaveImported} disabled={importedQuestions.length === 0} fullWidth className="bg-teal-600 shadow-teal-200 h-12 rounded-xl flex items-center justify-center gap-2">
                            <Save size={18}/> Lưu {importedQuestions.length} câu hỏi
                         </Button>
                      </div>
                   </div>

                   {/* Right: Preview List */}
                   <div className="flex-1 bg-white p-8 overflow-y-auto">
                      <div className="flex justify-between items-center mb-6">
                         <h4 className="font-black text-slate-800 text-lg">
                           Xem trước kết quả ({importedQuestions.length})
                         </h4>
                         {importedQuestions.length > 0 && (
                           <button onClick={() => setImportedQuestions([])} className="text-red-500 text-sm font-bold hover:underline">
                             Xóa tất cả
                           </button>
                         )}
                      </div>
                      
                      {importedQuestions.length === 0 ? (
                         <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl">
                            <LayoutList size={48} className="mb-4 opacity-50"/>
                            <p className="font-medium">Chưa có câu hỏi nào được trích xuất.</p>
                         </div>
                      ) : (
                         <div className="space-y-4">
                            {importedQuestions.map((q, idx) => (
                               <div key={idx} className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-teal-300 transition group relative">
                                  <button onClick={() => removeImportedQuestion(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                    <Trash2 size={18}/>
                                  </button>
                                  <div className="flex gap-3 mb-3">
                                     <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-1 rounded uppercase">
                                       {q.question_type}
                                     </span>
                                     <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded">
                                       {q.level}
                                     </span>
                                  </div>
                                  <div className="font-medium text-slate-900 mb-3">
                                    {/* Hiển thị cả inline images nếu có */}
                                    {q.question_text?.includes('[IMAGE:') ? (
                                      <ContentWithInlineImages content={q.question_text || ''} className="" />
                                    ) : (
                                      <MathText content={q.question_text || ''} />
                                    )}
                                  </div>
                                  {q.question_type === 'Trắc nghiệm' && (
                                     <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                                        <div className={q.answer_key === 'A' ? 'text-teal-600 font-bold' : ''}>
                                          A. <MathText content={q.option_A || ''}/>
                                        </div>
                                        <div className={q.answer_key === 'B' ? 'text-teal-600 font-bold' : ''}>
                                          B. <MathText content={q.option_B || ''}/>
                                        </div>
                                        <div className={q.answer_key === 'C' ? 'text-teal-600 font-bold' : ''}>
                                          C. <MathText content={q.option_C || ''}/>
                                        </div>
                                        <div className={q.answer_key === 'D' ? 'text-teal-600 font-bold' : ''}>
                                          D. <MathText content={q.option_D || ''}/>
                                        </div>
                                     </div>
                                  )}
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                </div>
             </div>
         </div>
      )}
    </div>
  );
};
