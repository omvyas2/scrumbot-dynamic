"use client"

import { useStore } from "@/lib/store"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

export function WeightTuner() {
  const { weights, setWeights } = useStore()

  const total = weights.alpha + weights.beta + weights.gamma + weights.delta

  const updateWeight = (key: keyof typeof weights, value: number) => {
    setWeights({ ...weights, [key]: value })
  }

  return (
    <Card className="p-6 rounded-2xl">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Ranking Weights</h3>
          <p className="text-sm text-muted-foreground">Adjust how much each factor influences owner suggestions</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="alpha" className="text-sm font-medium">
                α Competence
              </Label>
              <span className="text-sm text-muted-foreground">{weights.alpha.toFixed(2)}</span>
            </div>
            <Slider
              id="alpha"
              min={0}
              max={1}
              step={0.05}
              value={[weights.alpha]}
              onValueChange={([value]) => updateWeight("alpha", value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="beta" className="text-sm font-medium">
                β Availability
              </Label>
              <span className="text-sm text-muted-foreground">{weights.beta.toFixed(2)}</span>
            </div>
            <Slider
              id="beta"
              min={0}
              max={1}
              step={0.05}
              value={[weights.beta]}
              onValueChange={([value]) => updateWeight("beta", value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="gamma" className="text-sm font-medium">
                γ Growth Potential
              </Label>
              <span className="text-sm text-muted-foreground">{weights.gamma.toFixed(2)}</span>
            </div>
            <Slider
              id="gamma"
              min={0}
              max={1}
              step={0.05}
              value={[weights.gamma]}
              onValueChange={([value]) => updateWeight("gamma", value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="delta" className="text-sm font-medium">
                δ Continuity
              </Label>
              <span className="text-sm text-muted-foreground">{weights.delta.toFixed(2)}</span>
            </div>
            <Slider
              id="delta"
              min={0}
              max={1}
              step={0.05}
              value={[weights.delta]}
              onValueChange={([value]) => updateWeight("delta", value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total Weight</span>
            <span className={total > 1.1 || total < 0.9 ? "text-destructive font-semibold" : "text-foreground"}>
              {total.toFixed(2)}
            </span>
          </div>
          {(total > 1.1 || total < 0.9) && (
            <p className="text-xs text-destructive mt-1">Weights should sum to approximately 1.0</p>
          )}
        </div>
      </div>
    </Card>
  )
}
