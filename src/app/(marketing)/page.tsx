import Link from "next/link";

export default function MarketingPage() {
  return (
    <main className="py-12">
      <section className="relative card p-12 text-center overflow-hidden animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-50"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)`
        }}></div>
        <div className="relative z-10">
          <h1 className="h1-gradient text-5xl sm:text-6xl font-bold leading-tight mb-4">
            Discover investments that fit your budget
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/70 text-lg">
            Enter any amount (₹10, ₹50, ₹500) and instantly see real options across Mutual Funds, SIPs, ETFs, and Stocks.
            Tooltips explain everything. No advice. No jargon.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link href="/dashboard" className="btn-primary">
              Start discovering
            </Link>
            <Link href="/dashboard/quiz" className="btn-outline">
              Take the quiz
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="card p-5 card-hover">
          <h3 className="font-semibold">Budget-first</h3>
          <p className="text-sm text-white/70">Type your amount, we show what’s actually available.</p>
        </div>
        <div className="card p-5 card-hover">
          <h3 className="font-semibold">Beginner-friendly</h3>
          <p className="text-sm text-white/70">Short tooltips and risk labels. No overload.</p>
        </div>
        <div className="card p-5 card-hover">
          <h3 className="font-semibold">Transparent</h3>
          <p className="text-sm text-white/70">Historical charts only. No predictions, no advice.</p>
        </div>
      </section>
    </main>
  );
}



