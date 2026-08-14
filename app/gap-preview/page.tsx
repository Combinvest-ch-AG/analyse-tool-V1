import { PensionGapCalc } from "@/components/portal/rechner/pension-gap-calc"

export default function GapPreview() {
  return (
    <div className="min-h-screen bg-background p-6">
      <PensionGapCalc defaults={{ salary: 90000, age: 40, children: 2 }} />
    </div>
  )
}
