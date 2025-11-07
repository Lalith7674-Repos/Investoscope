import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-20 py-8">
      <div className="container-xl">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold mb-3">InvestoScope</h3>
            <p className="text-sm text-white/60">
              Discover investments that fit your budget. No advice. No jargon.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">Discover</Link></li>
              <li><Link href="/dashboard/goal" className="text-white/60 hover:text-white transition-colors">Goal Mode</Link></li>
              <li><Link href="/dashboard/quiz" className="text-white/60 hover:text-white transition-colors">Quiz</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">About</h3>
            <p className="text-sm text-white/60">
              Budget-first investment discovery. Historical data only. Transparent and beginner-friendly.
            </p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-white/40">
          © {new Date().getFullYear()} InvestoScope. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

