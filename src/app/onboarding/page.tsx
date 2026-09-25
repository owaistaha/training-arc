"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NumberField } from "@/components/NumberField";
import { OptionCard, OptionGroup } from "@/components/OptionCard";
import { StepShell } from "@/components/StepShell";
import { LoadingScreen } from "@/components/ui";
import { DraftProfileSchema, type DraftProfile, type Profile } from "@/lib/planSchema";
import { weightDirection } from "@/lib/stats";
import { KEYS, writeJSON } from "@/lib/storage";
import { useStored } from "@/lib/useStored";

type NumberKey = "age" | "heightCm" | "weightKg" | "targetWeightKg";
type ChoiceKey = "sex" | "bodyShape" | "bodyType" | "experience" | "daysPerWeek" | "equipment";

interface BaseStep {
  kicker: string;
  title: string;
  subtitle?: string;
}
interface NumberStep extends BaseStep {
  kind: "number";
  field: NumberKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  decimals?: boolean;
  placeholder: (d: DraftProfile) => number;
  rangeError: string;
  tooLow?: string;
}
interface ChoiceStep extends BaseStep {
  kind: "choice";
  field: ChoiceKey;
  grid?: boolean;
  options: { value: string | number; title: string; description?: string }[];
}
type Step = NumberStep | ChoiceStep;

const STEPS: Step[] = [
  {
    kind: "choice",
    field: "sex",
    kicker: "Ep. 01 · Origin",
    title: "Who's starting this arc?",
    subtitle: "Only used for the calorie formula.",
    options: [
      { value: "male", title: "Male" },
      { value: "female", title: "Female" },
    ],
  },
  {
    kind: "number",
    field: "age",
    kicker: "Ep. 02 · Age",
    title: "How old are you?",
    label: "Age",
    unit: "yrs",
    min: 18,
    max: 90,
    placeholder: () => 25,
    rangeError: "Enter an age between 18 and 90.",
    tooLow: "Training Arc is for adults 18 and over.",
  },
  {
    kind: "number",
    field: "heightCm",
    kicker: "Ep. 03 · Height",
    title: "How tall are you?",
    label: "Height",
    unit: "cm",
    min: 130,
    max: 230,
    placeholder: (d) => (d.sex === "female" ? 165 : 178),
    rangeError: "Enter a height between 130 and 230 cm.",
  },
  {
    kind: "number",
    field: "weightKg",
    kicker: "Ep. 04 · Weight",
    title: "What do you weigh today?",
    subtitle: "Morning weight is most accurate, but a rough number is fine.",
    label: "Current weight",
    unit: "kg",
    min: 35,
    max: 250,
    decimals: true,
    placeholder: (d) => (d.sex === "female" ? 62 : 75),
    rangeError: "Enter a weight between 35 and 250 kg.",
  },
  {
    kind: "number",
    field: "targetWeightKg",
    kicker: "Ep. 05 · Goal",
    title: "Where do you want to land?",
    subtitle: "Your target weight decides whether we cut, bulk or recomp.",
    label: "Target weight",
    unit: "kg",
    min: 35,
    max: 250,
    decimals: true,
    placeholder: (d) => d.weightKg ?? 75,
    rangeError: "Enter a target between 35 and 250 kg.",
  },
  {
    kind: "choice",
    field: "bodyShape",
    kicker: "Ep. 06 · Shape",
    title: "Your shape right now?",
    subtitle: "Be honest. It's just your starting point.",
    options: [
      { value: "slim", title: "Slim", description: "Light frame, not much muscle or fat" },
      { value: "average", title: "Average", description: "Some muscle, some softness" },
      { value: "athletic", title: "Athletic", description: "Visible muscle, fairly lean" },
      { value: "heavy", title: "Heavy", description: "Carrying extra weight" },
    ],
  },
  {
    kind: "choice",
    field: "bodyType",
    kicker: "Ep. 07 · Build",
    title: "Which sounds most like you?",
    subtitle: "This only nudges reps and cardio. It never changes your calories.",
    options: [
      { value: "ectomorph", title: "Naturally lean", description: "Hard to gain weight (ectomorph)" },
      { value: "mesomorph", title: "Builds easily", description: "Gains muscle fairly quickly (mesomorph)" },
      { value: "endomorph", title: "Gains easily", description: "Puts on weight and fat easily (endomorph)" },
    ],
  },
  {
    kind: "choice",
    field: "experience",
    kicker: "Ep. 08 · Level",
    title: "How long have you trained?",
    options: [
      { value: "beginner", title: "Beginner", description: "New, or under a year of regular training" },
      { value: "intermediate", title: "Intermediate", description: "1–3 years, comfortable with the main lifts" },
      { value: "advanced", title: "Advanced", description: "3+ years of consistent, structured training" },
    ],
  },
  {
    kind: "choice",
    field: "daysPerWeek",
    kicker: "Ep. 09 · Schedule",
    title: "Days per week you can train?",
    subtitle: "Pick what you can actually keep up. Consistency beats volume.",
    grid: true,
    options: [2, 3, 4, 5, 6].map((n) => ({ value: n, title: String(n), description: "days" })),
  },
  {
    kind: "choice",
    field: "equipment",
    kicker: "Ep. 10 · Dojo",
    title: "Where will you train?",
    options: [
      { value: "gym", title: "Gym", description: "Barbells, machines, cables, dumbbells" },
      { value: "home", title: "Home", description: "Bodyweight, dumbbells, kettlebells, bands" },
    ],
  },
];

export default function OnboardingPage() {
  const { ready, value } = useStored(KEYS.profile, DraftProfileSchema);
  if (!ready) return <LoadingScreen />;
  return <OnboardingFlow initial={value ?? {}} />;
}

function OnboardingFlow({ initial }: { initial: DraftProfile }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<DraftProfile>(initial);
  const [texts, setTexts] = useState<Partial<Record<NumberKey, string>>>(() => ({
    age: initial.age?.toString() ?? "",
    heightCm: initial.heightCm?.toString() ?? "",
    weightKg: initial.weightKg?.toString() ?? "",
    targetWeightKg: initial.targetWeightKg?.toString() ?? "",
  }));
  const [index, setIndex] = useState(() => {
    const firstMissing = STEPS.findIndex((s) => initial[s.field] === undefined);
    return firstMissing === -1 ? 0 : firstMissing;
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const save = (next: DraftProfile) => {
    setAnswers(next);
    writeJSON(KEYS.profile, next);
  };

  const goBack = () => {
    setError(null);
    if (index === 0) {
      router.push("/");
      return;
    }
    setDir(-1);
    setIndex(index - 1);
  };

  const goNext = () => {
    let next = answers;
    if (step.kind === "number") {
      const raw = texts[step.field] ?? "";
      const n = Number(raw);
      if (raw === "" || !Number.isFinite(n)) {
        setError(`Enter your ${step.label.toLowerCase()}.`);
        return;
      }
      if (n < step.min) {
        setError(step.tooLow ?? step.rangeError);
        return;
      }
      if (n > step.max) {
        setError(step.rangeError);
        return;
      }
      next = { ...answers, [step.field]: n };
      save(next);
    } else if (answers[step.field] === undefined) {
      setError("Pick one to continue.");
      return;
    }
    setError(null);

    if (isLast) {
      router.push("/arc");
      return;
    }
    setDir(1);
    setIndex(index + 1);
  };

  const targetHint = (() => {
    if (step.kind !== "number" || step.field !== "targetWeightKg") return null;
    const t = Number(texts.targetWeightKg);
    const w = answers.weightKg;
    const h = answers.heightCm;
    if (!texts.targetWeightKg || !Number.isFinite(t) || !w || !h) return null;
    const direction = weightDirection(w, t as Profile["targetWeightKg"]);
    const diff = Math.round((t - w) * 10) / 10;
    const bmi = t / (h / 100) ** 2;
    const label = direction === "cut" ? "Cut" : direction === "bulk" ? "Bulk" : "Recomp";
    return {
      text: `${diff > 0 ? "+" : ""}${diff} kg · ${label}`,
      warn:
        bmi < 18.5
          ? "That target is in the underweight BMI range. You can continue, but consider a higher target."
          : bmi > 30
            ? "That target is in the obese BMI range. You can continue, but consider a lower target."
            : null,
    };
  })();

  return (
    <StepShell
      step={index}
      total={STEPS.length}
      kicker={step.kicker}
      title={step.title}
      subtitle={step.subtitle}
      direction={dir}
      onBack={goBack}
      error={error}
      cta={{ label: isLast ? "Choose my arc" : "Continue", onClick: goNext }}
    >
      {step.kind === "number" ? (
        <div>
          <NumberField
            id={`field-${step.field}`}
            label={step.label}
            unit={step.unit}
            min={step.min}
            max={step.max}
            decimals={step.decimals}
            placeholder={step.placeholder(answers)}
            value={texts[step.field] ?? ""}
            onChange={(v) => {
              setError(null);
              setTexts((t) => ({ ...t, [step.field]: v }));
            }}
            onSubmit={goNext}
          />
          {targetHint && (
            <div className="mt-4 space-y-2 text-center">
              <p className="font-display text-2xl tracking-wide text-power">{targetHint.text}</p>
              {targetHint.warn && <p className="text-sm leading-snug text-gold">{targetHint.warn}</p>}
            </div>
          )}
        </div>
      ) : (
        <OptionGroup label={step.title} grid={step.grid}>
          {step.options.map((o) => (
            <OptionCard
              key={String(o.value)}
              compact={step.grid}
              title={o.title}
              description={o.description}
              selected={answers[step.field] === o.value}
              onSelect={() => {
                setError(null);
                save({ ...answers, [step.field]: o.value });
              }}
            />
          ))}
        </OptionGroup>
      )}
    </StepShell>
  );
}
