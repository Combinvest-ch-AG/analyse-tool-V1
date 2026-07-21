export function Wordmark({
  className = "",
  variant = "dark",
}: {
  className?: string
  variant?: "dark" | "light"
}) {
  const base = variant === "light" ? "text-white" : "text-foreground"
  const accent = variant === "light" ? "text-white/80" : "text-primary"
  return (
    <span className={`inline-flex items-baseline text-2xl font-extrabold tracking-tight ${base} ${className}`}>
      <span>comb</span>
      <span className={accent}>invest</span>
    </span>
  )
}
