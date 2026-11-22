import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMY_LESSONS, COURSE_PATH } from "../lib/courses/curriculum/index.ts";
import { completeLesson, DEFAULT_ACADEMY_PROGRESS, loadCourseProgress } from "../lib/courses/progress.ts";
import { JARGON_DICTIONARY, lessonForJargon } from "../lib/jargon.ts";

test("every Academy tier has five or more lessons with three reviewable questions", () => {
  const allIds = new Set();
  for (const tier of COURSE_PATH.tiers) {
    const lessons = tier.modules.flatMap((module) => module.lessons);
    assert.ok(lessons.length >= 5);
    for (const lesson of lessons) {
      assert.ok(!allIds.has(lesson.id));
      allIds.add(lesson.id);
      assert.ok(lesson.quiz.questions.length >= 3);
      assert.ok(lesson.newsKeywords.length > 0);
      for (const question of lesson.quiz.questions) {
        assert.equal(question.options.length, 3);
        assert.equal(new Set(question.options.map(({ label }) => label)).size, 3);
        assert.equal(question.options.filter(({ id }) => id === question.correctId).length, 1);
        assert.ok(question.explanation.length > 20);
      }
    }
  }
  for (const entry of JARGON_DICTIONARY) assert.ok(allIds.has(lessonForJargon(entry.term)));
});

test("local progress records completed practice and counts successive local days", () => {
  const lesson = ACADEMY_LESSONS[0];
  const firstDay = new Date(2026, 10, 22, 12);
  assert.equal(completeLesson(DEFAULT_ACADEMY_PROGRESS, lesson, 0.5, true, firstDay), DEFAULT_ACADEMY_PROGRESS);
  const first = completeLesson(DEFAULT_ACADEMY_PROGRESS, lesson, 1, true, firstDay);
  const repeat = completeLesson(first, lesson, 1, true, firstDay);
  const next = completeLesson(repeat, ACADEMY_LESSONS[1], 1, true, new Date(2026, 10, 23, 12));
  assert.equal(next.streak.count, 2);
  assert.equal(Object.keys(next.completedLessons).length, 2);
  assert.deepEqual(loadCourseProgress({ getItem: () => JSON.stringify(next) }), next);
});
