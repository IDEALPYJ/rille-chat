"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Zap, Check } from "lucide-react"
import { Skill } from "@/lib/types/skill"

interface SkillPickerProps {
  sessionId: string
  selectedSkills: string[]
  onSkillsChange: (skillIds: string[]) => void
}

export function SkillPicker({ sessionId: _sessionId, selectedSkills, onSkillsChange }: SkillPickerProps) {
  void _sessionId; // 保留供将来使用
  const [skills, setSkills] = useState<Skill[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch("/api/skills")
      .then(res => res.json())
      .then(data => setSkills(data.skills || []))
  }, [])

  const toggleSkill = (skillId: string) => {
    const newSelection = selectedSkills.includes(skillId)
      ? selectedSkills.filter(id => id !== skillId)
      : [...selectedSkills, skillId]
    onSkillsChange(newSelection)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Skills
          {selectedSkills.length > 0 && (
            <Badge variant="secondary" className="ml-1">{selectedSkills.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-medium">选择技能</h4>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {skills.map(skill => (
              <div
                key={skill.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                onClick={() => toggleSkill(skill.id)}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{skill.displayName}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{skill.description}</div>
                </div>
                {selectedSkills.includes(skill.id) && <Check className="h-4 w-4 text-primary" />}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
