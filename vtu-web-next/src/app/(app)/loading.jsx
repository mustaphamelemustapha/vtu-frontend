export default function Loading() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
        <span>Loading page...</span>
      </div>
    </div>
  );
}
