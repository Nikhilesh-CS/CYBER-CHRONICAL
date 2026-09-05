export type TierId = "beginner" | "intermediate" | "advanced";
export type AnimationTemplate = "flow" | "transform" | "compare" | "timeline";

export type QuizQuestion = { id: string; prompt: string; options: { id: string; label: string }[]; correctId: string; explanation: string };
export type Exercise = { type: "decode" | "spot" | "match" | "short"; prompt: string; answer: string; explanation: string; options?: string[] };
export type Lesson = { id: string; title: string; summary: string; keyPoints: string[]; animation: { template: AnimationTemplate; steps: string[]; caution: string }; quiz: { questions: QuizQuestion[]; passThreshold: number }; exercise: Exercise };
export type CourseModule = { id: string; title: string; summary: string; lessons: Lesson[] };
export type Tier = { id: TierId; title: string; summary: string; modules: CourseModule[] };
export type Course = { id: string; title: string; description: string; tiers: Tier[] };
