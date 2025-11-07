'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeOnboardingAction } from '@/lib/onboarding-actions';
import { Loader2, Target, TrendingUp, PiggyBank, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  redirectTo: string;
  initialAmount: number;
  riskTolerance: 'low' | 'medium' | 'high';
};

const GOAL_OPTIONS = [
  {
    key: 'EMERGENCY',
    title: 'Emergency cushion',
    description: 'Build a 3–6 month safety net.',
    icon: ShieldCheck,
  },
  {
    key: 'SHORT_TERM',
    title: 'Upcoming purchase',
    description: 'Plan for a trip, gadget, or major expense.',
    icon: Target,
  },
  {
    key: 'LONG_TERM',
    title: 'Long-term wealth',
    description: 'Grow capital for retirement or milestones.',
    icon: TrendingUp,
  },
  {
    key: 'PASSIVE',
    title: 'Passive income',
    description: 'Build recurring income streams.',
    icon: PiggyBank,
  },
];

const HORIZON_OPTIONS = [
  { key: 'UNDER_YEAR', label: '< 1 year' },
  { key: 'ONE_THREE', label: '1 – 3 years' },
  { key: 'THREE_FIVE', label: '3 – 5 years' },
  { key: 'FIVE_PLUS', label: '5+ years' },
];

const STYLE_OPTIONS = [
  { key: 'sip', label: 'SIP / recurring' },
  { key: 'lumpsum', label: 'Lumpsum when ready' },
  { key: 'both', label: 'Mix of both' },
];

const RISK_OPTIONS: Array<{ key: 'low' | 'medium' | 'high'; label: string; desc: string }> = [
  { key: 'low', label: 'Conservative', desc: 'Prefer stability over returns.' },
  { key: 'medium', label: 'Balanced', desc: 'Comfortable with moderate ups & downs.' },
  { key: 'high', label: 'Growth seeker', desc: 'Chasing higher returns with volatility.' },
];

export default function OnboardingClient({ redirectTo, initialAmount, riskTolerance }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(GOAL_OPTIONS[2].key);
  const [horizon, setHorizon] = useState(HORIZON_OPTIONS[1].key);
  const [style, setStyle] = useState<'sip' | 'lumpsum' | 'both'>('sip');
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>(riskTolerance);
  const [amount, setAmount] = useState(initialAmount || 500);
  const [pending, startTransition] = useTransition();

  const steps = useMemo(
    () => [
      {
        title: 'Welcome! What are you investing towards?',
        description: 'Choose the outcome you’d like InvestoScope to keep in mind.',
      },
      {
        title: 'What’s your time horizon?',
        description: 'This helps us prioritise instruments that fit your timeline.',
      },
      {
        title: 'How much will you set aside?',
        description: 'We’ll use this as your default search amount (change anytime).',
      },
      {
        title: 'Risk comfort & style',
        description: 'Tell us how you like to invest so we can tailor suggestions.',
      },
    ],
    []
  );

  function next() {
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function back() {
    setStep((prev) => Math.max(prev - 1, 0));
  }

  function handleComplete() {
    if (amount <= 0) {
      toast.error('Enter an investment amount greater than zero.');
      return;
    }

    startTransition(async () => {
      try {
        await completeOnboardingAction({
          defaultAmount: Math.round(amount),
          riskTolerance: risk,
          investmentGoal: goal,
          timeHorizon: horizon,
          investmentStyle: style,
        });
        toast.success('Preferences saved.');
        router.replace(redirectTo || '/dashboard');
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || 'Failed to save preferences');
      }
    });
  }

  return (
    <main className="min-h-[70vh] flex flex-col justify-between">
      <div className="space-y-8 max-w-3xl mx-auto w-full">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">Personalised setup</p>
          <h1 className="text-4xl font-bold text-white">Let’s customise InvestoScope for you</h1>
          <p className="text-white/60 text-sm sm:text-base">Answer a few quick questions so we can bring forward the most relevant ideas and defaults.</p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Step {step + 1} of {steps.length}</p>
            <h2 className="text-2xl font-semibold text-white mt-2">{steps[step].title}</h2>
            <p className="text-white/60 text-sm mt-2">{steps[step].description}</p>
          </div>

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {GOAL_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = goal === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setGoal(option.key)}
                    className={`card px-4 py-5 text-left transition border ${active ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/40'}`}
                  >
                    <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border ${active ? 'border-primary text-primary' : 'border-white/20 text-white/60'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-white font-semibold">{option.title}</p>
                    <p className="text-white/60 text-sm mt-1">{option.description}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-wrap gap-3">
              {HORIZON_OPTIONS.map((option) => {
                const active = horizon === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setHorizon(option.key)}
                    className={`px-4 py-2 rounded-full border text-sm transition ${active ? 'bg-primary/10 border-primary text-primary' : 'border-white/20 text-white/70 hover:border-primary/40'}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-white/80 block">Monthly amount (₹)</label>
              <input
                type="number"
                className="input-field w-full sm:w-64"
                value={amount}
                min={100}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <p className="text-xs text-white/50">You can change this from Discover anytime.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-white/80 mb-3">Risk comfort</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {RISK_OPTIONS.map((option) => {
                    const active = risk === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setRisk(option.key)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-primary bg-primary/10 text-primary' : 'border-white/20 text-white/70 hover:border-primary/40'}`}
                      >
                        <p className="font-semibold">{option.label}</p>
                        <p className="text-xs text-white/50 mt-1">{option.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white/80 mb-3">Investing style</p>
                <div className="flex flex-wrap gap-3">
                  {STYLE_OPTIONS.map((option) => {
                    const active = style === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setStyle(option.key as 'sip' | 'lumpsum' | 'both')}
                        className={`px-4 py-2 rounded-full border text-sm transition ${active ? 'bg-primary/10 border-primary text-primary' : 'border-white/20 text-white/70 hover:border-primary/40'}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={back}
              disabled={pending || step === 0}
              className="text-sm text-white/50 hover:text-white transition disabled:opacity-40"
            >
              Back
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={next}
                disabled={pending}
                className="btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={pending}
                className="btn-primary inline-flex items-center gap-2"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} Complete setup
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}


