import React, { useEffect, useMemo, useState } from 'react';

type TourStep = {
  title: string;
  description: string;
  bullets?: string[];
};

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Reliability Twin',
    description: 'This quick tour will walk you through building, validating, and simulating an incident response scenario.',
    bullets: [
      'You can restart this tour any time from the header.',
      'Open the Learner’s Guide for deeper explanations and examples.'
    ]
  },
  {
    title: 'Build your system in the sidebar',
    description: 'Drag building blocks into the canvas to model detection, response, and recovery.',
    bullets: [
      'Signals represent detection sources.',
      'Responders and Systems represent operational actors.'
    ]
  },
  {
    title: 'Connect the flow',
    description: 'Draw connections between blocks to describe how information and actions propagate.',
    bullets: [
      'Use directional links to show dependencies.',
      'Watch the connection counter in the header for quick feedback.'
    ]
  },
  {
    title: 'Configure details in the inspector',
    description: 'Select any block to set timing, staffing, and evidence settings.',
    bullets: [
      'The inspector updates live as you click different blocks.',
      'Use templates if you want a fast starting point.'
    ]
  },
  {
    title: 'Run simulations and review results',
    description: 'Kick off a simulation run or sweep to see performance metrics and bottlenecks.',
    bullets: [
      'Simulation results appear in the analytics panel.',
      'Use sweeps to understand sensitivity to key parameters.'
    ]
  }
];

type OnboardingTourProps = {
  isOpen: boolean;
  onClose: () => void;
};

function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const totalSteps = TOUR_STEPS.length;

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  const step = useMemo(() => TOUR_STEPS[stepIndex], [stepIndex]);
  const isLastStep = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Live onboarding</p>
            <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close onboarding tour"
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-700">{step.description}</p>
          {step.bullets && (
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              {step.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true"></span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800">
            Need more detail? Open the{' '}
            <a
              href="/LEARNERS_GUIDE.md"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              Learner’s Guide
            </a>{' '}
            for a full walkthrough.
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              Step {stepIndex + 1} of {totalSteps}
            </span>
            <div className="h-1.5 w-32 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={stepIndex === 0}
              className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLastStep) {
                  onClose();
                } else {
                  setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
                }
              }}
              className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
