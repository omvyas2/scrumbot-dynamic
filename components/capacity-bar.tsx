import { cn } from "@/lib/utils"

interface CapacityBarProps {
  assigned: number
  capacity: number
  className?: string
}

export function CapacityBar({ assigned, capacity, className }: CapacityBarProps) {
  const percentage = (assigned / capacity) * 100
  const isOverCapacity = assigned > capacity
  const isNearCapacity = percentage >= 80 && percentage <= 100

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", isOverCapacity && "text-orange-500")}>
          {assigned}h / {capacity}h
        </span>
        <span className={cn("text-muted-foreground", isOverCapacity && "text-orange-500 font-semibold")}>
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            isOverCapacity ? "bg-orange-500" : isNearCapacity ? "bg-yellow-500" : "bg-primary",
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
