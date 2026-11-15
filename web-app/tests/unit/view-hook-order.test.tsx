// @vitest-environment jsdom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { WorkoutView } from "@/components/views/WorkoutView";
import type { PremiumStatus, WeeklyRoutine } from "@/types";

// Lets React's act() flush effects synchronously in this test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
// React 19 reports render errors (e.g. "Rendered more hooks than during the
// previous render") to onUncaughtError instead of throwing from root.render().
let uncaughtRenderErrors: unknown[];

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  uncaughtRenderErrors = [];
  root = createRoot(container, { onUncaughtError: (error) => uncaughtRenderErrors.push(error) });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));
  // React logs render errors before rethrowing them; keep test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render(element: ReactElement) {
  act(() => root.render(element));
}

const NO_ACCESS: PremiumStatus = {
  premium: false,
  access: false,
  trial_active: false,
  trial_end: null,
  status: null,
  subscription_id: null,
  current_end: null,
} as unknown as PremiumStatus;

const ACTIVE: PremiumStatus = { ...NO_ACCESS, premium: true, access: true, status: "active" } as PremiumStatus;

describe("AnalyticsView", () => {
  it("does not crash when access is granted while mounted (e.g. right after upgrading)", () => {
    render(<AnalyticsView premiumStatus={NO_ACCESS} onUpgrade={() => {}} />);
    expect(container.textContent).toContain("Analytics (Pro)");

    render(<AnalyticsView premiumStatus={ACTIVE} onUpgrade={() => {}} />);
    expect(uncaughtRenderErrors).toEqual([]);
    expect(container.textContent).not.toContain("Upgrade for");
    expect(container.textContent).not.toBe("");
  });

  it("does not crash when access is revoked while mounted (e.g. trial ends)", () => {
    render(<AnalyticsView premiumStatus={ACTIVE} onUpgrade={() => {}} />);
    render(<AnalyticsView premiumStatus={NO_ACCESS} onUpgrade={() => {}} />);
    expect(uncaughtRenderErrors).toEqual([]);
    expect(container.textContent).toContain("Analytics (Pro)");
  });
});

describe("WorkoutView", () => {
  const routine = {
    days: [{ day: "Monday - Push", exercises: [{ name: "Bench Press", sets_reps: "3 x 10", youtube_urls: [] }] }],
  } as unknown as WeeklyRoutine;

  function workoutView(currentRoutine: WeeklyRoutine | null) {
    return (
      <WorkoutView
        routine={currentRoutine}
        selectedDayIndex={0}
        currentRoutineId={1}
        exerciseCompletions={new Map()}
        dayCompletions={new Map()}
        onToggleExercise={() => {}}
        onToggleRestDay={async () => {}}
        onEnsureRoutineSaved={async () => 1}
        onBack={() => {}}
      />
    );
  }

  it("does not crash when the routine is removed while the workout is open", () => {
    render(workoutView(routine));
    expect(container.textContent).toContain("Bench Press");

    render(workoutView(null));
    expect(uncaughtRenderErrors).toEqual([]);
    expect(container.textContent).toContain("No Workout Selected");
  });

  it("does not crash when a routine arrives after the empty state", () => {
    render(workoutView(null));
    render(workoutView(routine));
    expect(uncaughtRenderErrors).toEqual([]);
    expect(container.textContent).toContain("Bench Press");
  });
});
