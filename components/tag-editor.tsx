"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagEditor({ tags, onChange, placeholder = "Add tag..." }: TagEditorProps) {
  const [input, setInput] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput("")
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border border-input rounded-lg bg-background">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => removeTag(tag)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {tag}</span>
          </Button>
        </Badge>
      ))}
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-6"
      />
    </div>
  )
}
