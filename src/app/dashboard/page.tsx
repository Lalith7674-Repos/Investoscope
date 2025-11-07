import DiscoverClient from "@/components/DiscoverClient";
import AffordablePicks from "@/components/AffordablePicks";
import FeatureDiscovery from "@/components/FeatureDiscovery";
import TopMovers from "@/components/TopMovers";

export default async function DashboardPage() {
  return (
    <main className="space-y-12 animate-fade-in">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-50">Discover investments by your budget</h1>
        <p className="text-slate-300 text-lg">Enter an amount, pick a category, and we'll show what's actually available — or the nearest range.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">What would you like to do?</h2>
        <FeatureDiscovery />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">Search by Budget</h2>
        <DiscoverClient />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">Today's top movers</h2>
        <TopMovers />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">Affordable Picks</h2>
        <AffordablePicks />
      </div>
    </main>
  );
}



