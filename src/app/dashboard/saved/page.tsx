import SavedClient from "@/components/SavedClient";

export default async function SavedPage() {
  return (
    <main className="space-y-8 animate-fade-in">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white">Saved investments</h1>
        <p className="text-white/60 text-sm">All the options you bookmarked live here. Prices stay fresh thanks to the automated sync jobs.</p>
      </div>
      <SavedClient />
    </main>
  );
}


