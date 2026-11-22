"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, RotateCcw, Play, Pause } from "lucide-react";
import { ACADEMY_LESSONS, COURSE_PATH } from "../../../lib/courses/curriculum";
import { completeLesson, saveCourseProgress, type AcademyProgress } from "../../../lib/courses/progress";
import type { Lesson, Tier } from "../../../lib/courses/types";
import type { RealIntelligenceItem } from "../../../lib/models";
import { matchesStoryQuery, plainTitle } from "../../../lib/editorial";

function LessonAnimation({ lesson }: { lesson: Lesson }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const lastStep = lesson.animation.steps.length - 1;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setStep(step + 1);
      if (step + 1 >= lastStep) setPlaying(false);
    }, 1_100);
    return () => window.clearTimeout(timer);
  }, [playing, step, lastStep]);

  return <section className="academy-animation" aria-label="Lesson walkthrough">
    <ol className="academy-flow">{lesson.animation.steps.map((label, index) => (
      <li key={label} aria-current={index === step ? "step" : undefined} className={index === step ? "academy-node active" : "academy-node"}>
        <span>{index + 1}</span>{label}{index < lastStep && <ChevronRight size={16} aria-hidden="true" />}
      </li>
    ))}</ol>
    <div className="academy-controls">
      <button onClick={() => { if (step === lastStep) setStep(0); setPlaying(!playing); }}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "Pause" : "Play"}</button>
      <button disabled={step === 0} onClick={() => { setPlaying(false); setStep(step - 1); }}>Previous step</button>
      <button disabled={step === lastStep} onClick={() => { setPlaying(false); setStep(step + 1); }}>Next step</button>
      <button onClick={() => { setPlaying(false); setStep(0); }}><RotateCcw size={14} />Reset</button>
    </div>
    <p className="academy-caution">{lesson.animation.caution}</p>
  </section>;
}

function LessonView({ lesson, progress, stories, onOpenStory, onComplete, onBack }: {
  lesson: Lesson;
  progress: AcademyProgress;
  stories: RealIntelligenceItem[];
  onOpenStory: (story: RealIntelligenceItem) => void;
  onComplete: (next: AcademyProgress) => void;
  onBack: () => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);
  const correctCount = lesson.quiz.questions.filter((question) => choices[question.id] === question.correctId).length;
  const quizScore = correctCount / lesson.quiz.questions.length;
  const passed = quizSubmitted && quizScore >= lesson.quiz.passThreshold;
  const exerciseCorrect = exerciseSubmitted && answer.trim().toLowerCase() === lesson.exercise.answer.toLowerCase();
  const related = stories.filter((story) => lesson.newsKeywords.some((term) => matchesStoryQuery(story, term))).slice(0, 3);

  return <section className="academy-page">
    <button className="text-button" onClick={onBack}>← Academy roadmap</button>
    <h1>{lesson.title}</h1>
    <p className="academy-lede">{lesson.summary}</p>
    <section className="academy-card"><h2>Understand it</h2><ul>{lesson.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></section>
    <LessonAnimation lesson={lesson} />
    <section className="academy-card">
      <h2>Quick check</h2>
      {lesson.quiz.questions.map((question, index) => <fieldset className="academy-question" key={question.id}>
        <legend>{index + 1}. {question.prompt}</legend>
        {question.options.map((option) => <label className="academy-choice" key={option.id}>
          <input type="radio" name={question.id} checked={choices[question.id] === option.id} onChange={() => {
            setChoices({ ...choices, [question.id]: option.id });
            setQuizSubmitted(false);
          }} />{option.label}
        </label>)}
        {quizSubmitted && <p className={choices[question.id] === question.correctId ? "academy-success" : "academy-error"}>{question.explanation}</p>}
      </fieldset>)}
      <button className="primary-button" disabled={Object.keys(choices).length < lesson.quiz.questions.length} onClick={() => setQuizSubmitted(true)}>Check quiz</button>
      {quizSubmitted && <p role="status">{correctCount} of {lesson.quiz.questions.length} correct. {passed ? "Quiz passed." : "Review the feedback and try again."}</p>}
    </section>
    <section className="academy-card">
      <h2>Apply it</h2>
      <fieldset className="academy-question">
        <legend>{lesson.exercise.prompt}</legend>
        {lesson.exercise.options?.map((option) => <label className="academy-choice" key={option}>
          <input type="radio" name="exercise" value={option} checked={answer === option} onChange={() => { setAnswer(option); setExerciseSubmitted(false); }} />{option}
        </label>)}
      </fieldset>
      <button className="primary-button" disabled={!answer} onClick={() => setExerciseSubmitted(true)}>Check exercise</button>
      {exerciseSubmitted && <p role="status" className={exerciseCorrect ? "academy-success" : "academy-error"}>{exerciseCorrect ? lesson.exercise.explanation : "Try again and apply the principle from the walkthrough."}</p>}
    </section>
    {related.length > 0 && <section className="academy-card">
      <h2>See it in the news</h2>
      <ul>{related.map((story) => <li key={story.id}><button className="text-button" onClick={() => onOpenStory(story)}>{plainTitle(story)}</button> · {story.primaryPublisher}</li>)}</ul>
    </section>}
    <button className="primary-button academy-complete" disabled={!passed || !exerciseCorrect}
      onClick={() => onComplete(completeLesson(progress, lesson, quizScore, exerciseCorrect))}>Complete lesson</button>
  </section>;
}

function downloadBadge(tier: Tier, completed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#f7f5ef";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#07554f";
  context.lineWidth = 7;
  context.strokeRect(40, 40, 1120, 680);
  context.textAlign = "center";
  context.fillStyle = "#07554f";
  context.font = "bold 40px system-ui";
  context.fillText("CYBER ACADEMY", 600, 200);
  context.fillStyle = "#151718";
  context.font = "bold 86px Georgia";
  context.fillText(tier.title + " complete", 600, 380);
  context.font = "32px system-ui";
  context.fillText(completed + " lessons completed", 600, 470);
  context.fillText("Cyber Chronicle", 600, 615);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cyber-academy-" + tier.id + ".png";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
  });
}

export function AcademyView({ progress, onProgressChange, stories, onOpenStory }: {
  progress: AcademyProgress;
  onProgressChange: (next: AcademyProgress) => void;
  stories: RealIntelligenceItem[];
  onOpenStory: (story: RealIntelligenceItem) => void;
}) {
  const [lessonId, setLessonId] = useState(progress.currentLessonId);

  function save(next: AcademyProgress) {
    saveCourseProgress(window.localStorage, next);
    onProgressChange(next);
  }

  function openLesson(id: string) {
    setLessonId(id);
    save({ ...progress, currentLessonId: id });
  }

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("lesson");
    if (!requested || !ACADEMY_LESSONS.some((lesson) => lesson.id === requested)) return;
    const timer = window.setTimeout(() => setLessonId(requested), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const lesson = ACADEMY_LESSONS.find((item) => item.id === lessonId);
  if (lesson) return <LessonView key={lesson.id} lesson={lesson} progress={progress} stories={stories} onOpenStory={onOpenStory}
    onBack={() => setLessonId(null)} onComplete={(next) => { save(next); setLessonId(null); }} />;

  return <section className="academy-page">
    <h1>Cyber Academy</h1>
    <p className="academy-lede">Learn the basics, practice defensive decisions, and see where the concepts appear in current reporting.</p>
    <div className="academy-streak">{progress.streak.count}-day learning streak</div>
    {COURSE_PATH.tiers.map((tier) => {
      const lessons = tier.modules.flatMap((module) => module.lessons);
      const completed = lessons.filter((item) => progress.completedLessons[item.id]).length;
      return <section className="academy-tier" key={tier.id}>
        <div><h2>{tier.title}</h2><p>{tier.summary}</p><small>{completed} of {lessons.length} lessons complete</small></div>
        {tier.modules.map((module) => <div className="academy-module" key={module.id}>
          <div><strong>{module.title}</strong><small>{module.summary}</small></div>
          {module.lessons.map((item) => {
            const done = Boolean(progress.completedLessons[item.id]);
            return <button className="academy-lesson" key={item.id} onClick={() => openLesson(item.id)}>
              <span className={done ? "academy-check done" : "academy-check"} aria-label={done ? "Complete" : "Incomplete"}>{done && <Check size={15} />}</span>
              <span>{item.title}<small>{item.summary}</small></span><ChevronRight size={17} aria-hidden="true" />
            </button>;
          })}
        </div>)}
        {completed === lessons.length && <button className="primary-button" onClick={() => downloadBadge(tier, completed)}>Download {tier.title} completion card</button>}
      </section>;
    })}
  </section>;
}
