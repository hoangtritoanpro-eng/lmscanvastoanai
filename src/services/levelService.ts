// ============================================================================
// LEVEL SERVICE - API bổ sung cho tính năng Level Gating + Giao đề cá nhân hóa
// Import từ sheetService để dùng chung GOOGLE_SCRIPT_URL
// ============================================================================

import { GOOGLE_SCRIPT_URL } from './sheetService';

interface APIResponse<T = unknown> {
  status: 'success' | 'error';
  data: T;
  message?: string;
}

async function callGET<T>(action: string, data: Record<string, unknown> = {}): Promise<APIResponse<T>> {
  try {
    const params = new URLSearchParams({ action, payload: JSON.stringify(data) });
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, { method: 'GET', redirect: 'follow' });
    return await res.json();
  } catch (e) {
    return { status: 'error', data: null as T, message: e instanceof Error ? e.message : 'Network error' };
  }
}

async function callPOST<T>(payload: Record<string, unknown>): Promise<APIResponse<T>> {
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    return await res.json();
  } catch (e) {
    return { status: 'error', data: null as T, message: e instanceof Error ? e.message : 'Network error' };
  }
}

// ==================== LEVEL PROGRESS ====================

export interface TopicLevelProgress {
  /** Level cao nhất được mở (1-5) */
  unlockedLevel: number;
  /** Điểm % tốt nhất từng level, key = level */
  bestScores: Record<number, number>;
}

/**
 * HS: Lấy tiến độ level của 1 chuyên đề (unlockedLevel + bestScores từng level)
 * GAS action: getTopicLevelProgress
 */
export const fetchTopicLevelProgress = async (
  email: string,
  grade: number,
  topic: string
): Promise<TopicLevelProgress> => {
  const result = await callGET<TopicLevelProgress>('getTopicLevelProgress', { email, grade, topic });
  if (result.status === 'success' && result.data) {
    return {
      unlockedLevel: Math.max(1, Number(result.data.unlockedLevel) || 1),
      bestScores: result.data.bestScores || {},
    };
  }
  return { unlockedLevel: 1, bestScores: {} };
};

// ==================== ADMIN: TIẾN ĐỘ LEVEL CẢ LỚP ====================

export interface StudentTopicProgressRow {
  email: string;
  name: string;
  className: string;
  /** key = `${grade}_${topic}`, value = unlockedLevel */
  progress: Record<string, number>;
}

/**
 * GV: Lấy ma trận tiến độ level của cả lớp
 * GAS action: getClassTopicProgress
 */
export const fetchClassTopicProgress = async (
  className: string,
  grade?: number
): Promise<StudentTopicProgressRow[]> => {
  const result = await callGET<StudentTopicProgressRow[]>('getClassTopicProgress', {
    className,
    ...(grade !== undefined ? { grade } : {}),
  });
  return result.status === 'success' && Array.isArray(result.data) ? result.data : [];
};

/**
 * GV: Mở khóa thủ công level cho 1 học sinh (trường hợp đặc biệt)
 * GAS action: setStudentTopicLevel
 */
export const setStudentTopicLevel = async (
  email: string,
  grade: number,
  topic: string,
  level: number
): Promise<boolean> => {
  const result = await callPOST<{ ok: boolean }>({
    action: 'setStudentTopicLevel',
    email,
    grade,
    topic,
    level,
  });
  return result.status === 'success';
};

// ==================== GIAO ĐỀ CÁ NHÂN HÓA (MỖI BẠN 1 ĐỀ) ====================

export interface PersonalizedExamItem {
  examId: string;
  examTitle: string;
  studentEmail: string;
  studentName?: string;
}

export interface AssignPersonalizedPayload {
  className: string;
  grade: number | string;
  openAt?: string; // ISO, trống = mở ngay
  dueAt?: string; // ISO, trống = không giới hạn
  durationMinutes?: number;
  /** Cho phép làm lại: maxAttempts > 1 */
  maxAttempts?: number;
  settings?: {
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showAnswerAfter?: boolean;
    /** Cho phép làm lại hay không (bổ trợ cho maxAttempts) */
    allowRetake?: boolean;
    /** Cách tính điểm khi làm nhiều lần: 'best' (cao nhất) | 'last' (lần cuối) */
    scorePolicy?: 'best' | 'last';
  };
  exams: PersonalizedExamItem[];
  assignedBy?: string;
}

export interface AssignPersonalizedResult {
  total: number;
  success: number;
  failed: Array<{ studentEmail: string; reason: string }>;
  assignments: Array<{ assignmentId: string; examId: string; studentEmail: string }>;
}

/**
 * GV: Giao tự động mỗi học sinh 1 đề riêng (1 lần gọi, backend xử lý cả lớp)
 * GAS action: assignPersonalizedExams
 */
export const assignPersonalizedExams = async (
  payload: AssignPersonalizedPayload
): Promise<AssignPersonalizedResult | null> => {
  const result = await callPOST<AssignPersonalizedResult>({
    action: 'assignPersonalizedExams',
    ...payload,
  });
  if (result.status === 'success' && result.data) return result.data;
  throw new Error(result.message || 'assignPersonalizedExams failed');
};

/**
 * GV: Thu hồi (ẩn) một bài đã giao
 * GAS action: archiveAssignment
 */
export const archiveAssignment = async (assignmentId: string): Promise<boolean> => {
  const result = await callPOST<{ ok: boolean }>({ action: 'archiveAssignment', assignmentId });
  return result.status === 'success';
};
