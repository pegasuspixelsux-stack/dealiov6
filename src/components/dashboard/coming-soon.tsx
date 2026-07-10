export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center">
      <h1 className="text-xl font-semibold">403 — Not authorized</h1>
      <p className="text-sm text-muted-foreground">
        Your role doesn&apos;t have access to this page.
      </p>
    </div>
  );
}
