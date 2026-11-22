import type { Lesson } from "./types.ts";

export const COURSE_PROGRESS_KEY = "cyber-academy-progress-v1";
export type LessonCompletion = { quizScore: number; exerciseCorrect: boolean; completedAt: string };
export type AcademyProgress = { completedLessons: Record<string, LessonCompletion>; currentLessonId: string | null; streak: { lastVisitedDate: string | null; count: number } };
export const DEFAULT_ACADEMY_PROGRESS: AcademyProgress = { completedLessons: {}, currentLessonId: null, streak: { lastVisitedDate: null, count: 0 } };

export function loadCourseProgress(storage: Pick<Storage, "getItem"> | undefined): AcademyProgress {
  if (!storage) return DEFAULT_ACADEMY_PROGRESS;
  try {
    const value: Partial<AcademyProgress> | null = JSON.parse(storage.getItem(COURSE_PROGRESS_KEY) || "null");
    if (!value || typeof value !== "object") return DEFAULT_ACADEMY_PROGRESS;
    const completedLessons = Object.fromEntries(Object.entries(value.completedLessons ?? {}).filter(([, entry]) =>
      entry && typeof entry.quizScore === "number" && entry.exerciseCorrect === true && typeof entry.completedAt === "string",
    ));
    return {
      completedLessons,
      currentLessonId: typeof value.currentLessonId === "string" ? value.currentLessonId : null,
      streak: value.streak && typeof value.streak.lastVisitedDate === "string" && Number.isInteger(value.streak.count) && value.streak.count > 0
        ? value.streak : DEFAULT_ACADEMY_PROGRESS.streak,
    };
  } catch {
    return DEFAULT_ACADEMY_PROGRESS;
  }
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
