export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-md place-items-center p-6">
      <div className="rounded-2xl border p-6 text-center">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground mt-1">Try the dashboard or quiz.</p>
      </div>
    </main>
  );
}
