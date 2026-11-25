import type { Lesson } from "./types.ts";
import { isRecord, readStoredJson } from "../storage.ts";

export const COURSE_PROGRESS_KEY = "cyber-academy-progress-v1";
export type LessonCompletion = { quizScore: number; exerciseCorrect: boolean; completedAt: string };
export type AcademyProgress = { completedLessons: Record<string, LessonCompletion>; currentLessonId: string | null; streak: { lastVisitedDate: string | null; count: number } };
export const DEFAULT_ACADEMY_PROGRESS: AcademyProgress = { completedLessons: {}, currentLessonId: null, streak: { lastVisitedDate: null, count: 0 } };

export function loadCourseProgress(storage: Pick<Storage, "getItem"> | undefined): AcademyProgress {
  const value = readStoredJson(storage, COURSE_PROGRESS_KEY);
  if (!isRecord(value)) return DEFAULT_ACADEMY_PROGRESS;
  const completedLessons: AcademyProgress["completedLessons"] = {};
  for (const [id, entry] of Object.entries(isRecord(value.completedLessons) ? value.completedLessons : {})) {
    if (!validLessonId(id) || !isRecord(entry)) continue;
    const { quizScore, exerciseCorrect, completedAt } = entry;
    if (typeof quizScore === "number" && quizScore >= 0 && quizScore <= 1
      && exerciseCorrect === true && typeof completedAt === "string" && Number.isFinite(Date.parse(completedAt))) {
      completedLessons[id] = { quizScore, exerciseCorrect, completedAt };
    }
  }
  const { lastVisitedDate, count } = isRecord(value.streak) ? value.streak : {};
  const validStreak = typeof lastVisitedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(lastVisitedDate)
    && Number.isFinite(Date.parse(lastVisitedDate)) && typeof count === "number" && Number.isSafeInteger(count) && count > 0;
  return {
    completedLessons,
    currentLessonId: validLessonId(value.currentLessonId) ? value.currentLessonId : null,
    streak: validStreak ? { lastVisitedDate, count } : DEFAULT_ACADEMY_PROGRESS.streak,
  };
}

function validLessonId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{1,100}$/i.test(value) && !Object.hasOwn(Object.prototype, value);
}

export function saveCourseProgress(storage: Pick<Storage, "setItem">, progress: AcademyProgress) {
  storage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(progress));
}

function localDay(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function completeLesson(progress: AcademyProgress, lesson: Lesson, quizScore: number, exerciseCorrect: boolean, now = new Date()): AcademyProgress {
  if (!(quizScore >= lesson.quiz.passThreshold && quizScore <= 1) || !exerciseCorrect) return progress;
  const today = localDay(now);
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const previous = progress.streak.lastVisitedDate;
  const streak = {
    lastVisitedDate: today,
    count: previous === today ? progress.streak.count : previous === yesterday ? progress.streak.count + 1 : 1,
  };
  return {
    completedLessons: { ...progress.completedLessons, [lesson.id]: { quizScore, exerciseCorrect, completedAt: now.toISOString() } },
    currentLessonId: null,
    streak,
  };
}
