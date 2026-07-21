import Image from "next/image"

export function Wordmark({
  className = "",
  variant = "dark",
}: {
  className?: string
  variant?: "dark" | "light"
}) {
  const logo = (
    <Image
      src="/combinvest-logo.png"
      alt="Combinvest"
      width={168}
      height={34}
      priority
      className="h-7 w-auto"
    />
  )

  // On dark/coloured backgrounds the black-and-blue wordmark needs a light
  // surface to stay legible, so we wrap it in a clean white chip.
  if (variant === "light") {
    return (
      <span
        className={`inline-flex items-center rounded-xl bg-white px-4 py-2.5 shadow-sm ${className}`}
      >
        {logo}
      </span>
    )
  }

  return <span className={`inline-flex items-center ${className}`}>{logo}</span>
}
