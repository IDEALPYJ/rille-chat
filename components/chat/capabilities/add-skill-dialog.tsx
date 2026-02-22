"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n/context"
import { Skill, CreateSkillInput, SkillResource, SkillScript } from "@/lib/types/skill"
import { Plus, Trash2, FileText } from "lucide-react"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 常用 Lucide 图标列表（已验证存在于 lucide-react 中）
const COMMON_ICONS: string[] = [
  "FileText", "File", "Files", "Folder", "FolderOpen", "FileCode", "FileJson", "FileSpreadsheet",
  "Search", "ZoomIn", "ZoomOut", "Filter", "Eye", "EyeOff",
  "Settings", "Cog", "SlidersHorizontal", "Wrench", "Hammer",
  "Zap", "Lightbulb", "Sparkles", "Star", "Heart",
  "Rocket", "Plane", "Target", "Flag", "FlagTriangleRight",
  "Palette", "Brush", "PenTool", "Pencil", "Highlighter",
  "Monitor", "Laptop", "Smartphone", "Tablet", "Cpu", "HardDrive", "Database",
  "Mail", "Inbox", "Send", "MessageSquare", "MessagesSquare",
  "Calendar", "Clock", "Timer", "Hourglass", "Bell",
  "Bookmark", "Book", "BookOpen", "Library", "GraduationCap",
  "User", "Users", "UserPlus", "UserMinus", "UserCheck",
  "Lock", "Unlock", "Key", "Shield", "ShieldCheck",
  "Home", "Building", "Building2", "Factory", "Store",
  "Map", "MapPin", "Navigation", "Compass", "Globe",
  "Image", "Images", "Camera", "Video", "Film", "Music", "Mic",
  "Play", "Pause", "SkipForward", "SkipBack", "Repeat",
  "BarChart", "BarChart2", "PieChart", "LineChart", "TrendingUp", "TrendingDown",
  "Calculator", "CreditCard", "Wallet", "DollarSign",
  "ShoppingCart", "ShoppingBag", "Package", "Truck",
  "Cloud", "CloudRain", "CloudSun", "Sun", "Moon",
  "Umbrella", "Thermometer", "Wind", "Droplets", "Snowflake",
  "Anchor", "Ship", "Fish",
  "TreePine", "TreeDeciduous", "Flower", "Leaf", "Mountain",
  "Car", "Bus", "Train", "PlaneTakeoff", "PlaneLanding",
  "Phone", "PhoneCall", "Printer", "ScanLine",
  "Wifi", "Bluetooth", "Battery", "BatteryCharging", "BatteryFull",
  "Plug", "Power",
  "Clipboard", "ClipboardList", "ClipboardCheck",
  "Paperclip", "Link", "ExternalLink",
  "Share", "Share2", "Upload", "Download",
  "Trash2", "X", "XCircle",
  "Check", "CheckCircle", "CheckSquare",
  "Plus", "PlusCircle", "Minus", "MinusCircle",
  "AlertCircle", "AlertTriangle", "Info", "HelpCircle",
  "Layout", "LayoutGrid", "LayoutList", "LayoutDashboard",
  "Grid", "Grid3X3", "Rows", "Columns",
  "List", "ListOrdered", "ListChecks", "ListTodo",
  "Table", "Table2", "AlignLeft", "AlignCenter", "AlignRight",
  "Type", "Heading", "Heading1", "Heading2", "Heading3",
  "Bold", "Italic", "Underline", "Code2", "Quote",
  "Terminal", "Command",
  "Bug", "BugOff", "Beaker", "FlaskConical",
  "Microscope", "Telescope",
  "SunDim", "MoonStar",
  "CloudLightning", "CloudFog", "CloudDrizzle", "CloudSnow",
  "Bike", "Footprints",
  "Glasses", "Smile", "Frown", "Meh",
  "Activity",
  "Tv", "Speaker", "Headphones",
  "Gamepad", "Gamepad2", "Dices", "Puzzle",
  "Brain", "BrainCircuit",
  "Flashlight", "CandlestickChart",
  "Coins", "Receipt",
  "Percent", "Divide", "Equal",
  "Sigma", "Infinity",
  "Ruler",
  "Scale", "Square", "Circle", "Triangle", "Hexagon",
  "Box", "Crop", "Maximize", "Minimize",
  "Move", "RotateCcw", "RotateCw",
  "Layers",
  "PanelTop", "PanelBottom", "PanelLeft", "PanelRight",
  "Sidebar", "SidebarClose", "SidebarOpen",
  "AppWindow",
  "Chrome", "Github", "Gitlab",
  "GitBranch", "GitCommit", "GitMerge", "GitPullRequest",
  "Code", "Codepen", "Codesandbox",
  "Server",
  "Cloudy", "Sunrise", "Sunset",
  "Trees",
  "Apple", "Banana", "Cherry", "Grape",
  "Carrot", "Pizza", "Hamburger", "IceCream", "Cookie",
  "Coffee", "Wine", "Beer", "GlassWater",
  "Utensils",
  "Bed", "Bath",
  "DoorOpen", "Lamp", "LightbulbOff",
  "Fan", "AirVent",
  "WashingMachine", "Microwave",
  "Briefcase", "Backpack",
  "Ticket", "IdCard",
  "Landmark", "Castle", "Church", "School",
  "BookMarked",
  "Newspaper",
  "FileType", "FileAudio", "FileVideo", "FileImage",
  "FileArchive", "FileCheck", "FileLock", "FileSearch",
  "FolderClosed", "FolderGit", "FolderHeart",
  "Archive", "ArchiveRestore",
  "Container",
  "LifeBuoy",
  "MapPinned",
  "Locate",
  "Fingerprint",
  "Notebook", "NotebookPen",
  "StickyNote",
  "ClipboardCopy", "ClipboardPaste",
  "Copy", "Scissors",
  "Paintbrush", "PaintBucket", "SprayCan", "SwatchBook",
  "Wand2", "Sparkle",
  "CloudRainWind", "CloudHail",
  "Waves",
  "MountainSnow",
  "TreePalm",
  "Flower2", "LeafyGreen",
  "Lollipop",
  "Drumstick",
  "ShowerHead",
  "Blinds",
  "LampDesk", "LampFloor",
  "Heater",
  "Refrigerator",
  "Toilet",
  "BriefcaseBusiness",
  "Luggage",
  "ReceiptText",
  "Scroll",
  "FilePieChart", "FileBarChart", "FileLineChart",
  "FileDigit", "FileMusic",
  "FolderGit2",
  "FolderKey", "FolderLock", "FolderPlus",
  "FolderTree",
  "Package2", "PackageCheck",
  "Navigation2",
  "LocateFixed",
  "Radar",
  "ScanEye", "ScanFace", "ScanSearch",
  "Contact",
  "NotebookText",
  "ClipboardPen", "ClipboardType",
  "CopyCheck",
  "Pen", "PenLine",
  "PencilLine", "PencilRuler",
  "Blend",
  "SunMedium",
  "CloudMoon",
  "ThermometerSun", "ThermometerSnowflake",
  "Droplet",
  "UmbrellaOff",
  "Citrus",
  "Sandwich",
  "IceCream2", "Croissant",
  "CupSoda", "Milk",
  "FishSymbol", "Shrimp",
  "Turtle",
  "Bird", "Feather",
  "Cat", "Dog", "Rabbit",
  "Squirrel",
  "Shell", "Snail",
  "Ghost",
]

// 动态获取图标组件
function getIconComponent(iconName: string): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[iconName]
  return IconComponent || Icons.FileText
}

interface AddSkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingSkill?: Skill | null
}

export function AddSkillDialog({ open, onOpenChange, onSuccess, editingSkill }: AddSkillDialogProps) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState("basic")
  
  const [formData, setFormData] = useState<CreateSkillInput>({
    name: "",
    displayName: "",
    description: "",
    instructions: "",
    triggerKeywords: [],
    tags: [],
  })
  
  const [resources, setResources] = useState<SkillResource[]>([])
  const [scripts, setScripts] = useState<SkillScript[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [tagInput, setTagInput] = useState("")

  // 使用 useEffect 避免 React Compiler 的 "Calling setState synchronously within an effect" 错误
  useEffect(() => {
    if (open && editingSkill) {
      // 使用 setTimeout 延迟状态更新
      const timer = setTimeout(() => {
        setFormData({
          name: editingSkill.name,
          displayName: editingSkill.displayName,
          description: editingSkill.description,
          icon: editingSkill.icon || undefined,
          instructions: editingSkill.instructions,
          triggerKeywords: editingSkill.triggerKeywords,
          tags: editingSkill.tags,
          version: editingSkill.version,
          author: editingSkill.author || undefined,
        })
        setResources((editingSkill.resources as SkillResource[] | null) || [])
        setScripts((editingSkill.scripts as SkillScript[] | null) || [])
      }, 0)
      return () => clearTimeout(timer)
    } else if (open) {
      const timer = setTimeout(() => {
        setFormData({
          name: "",
          displayName: "",
          description: "",
          instructions: "",
          triggerKeywords: [],
          tags: [],
        })
        setResources([])
        setScripts([])
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [open, editingSkill])

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.displayName.trim() || !formData.instructions.trim()) return

    try {
      const url = "/api/skills"
      const method = editingSkill ? "PATCH" : "POST"
      const body = editingSkill
        ? JSON.stringify({ id: editingSkill.id, ...formData, resources, scripts })
        : JSON.stringify({ ...formData, resources, scripts })

      const res = await fetch(url, { method, body })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
        resetForm()
      }
    } catch {
      // 保存失败，不处理错误
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      instructions: "",
      triggerKeywords: [],
      tags: [],
    })
    setResources([])
    setScripts([])
    setActiveTab("basic")
  }

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.triggerKeywords?.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        triggerKeywords: [...(prev.triggerKeywords || []), keywordInput.trim()]
      }))
      setKeywordInput("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      triggerKeywords: prev.triggerKeywords?.filter(k => k !== keyword) || []
    }))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }))
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }))
  }

  const addResource = () => {
    setResources(prev => [...prev, { name: "", content: "", type: "markdown" }])
  }

  const updateResource = (index: number, field: keyof SkillResource, value: string) => {
    setResources(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const removeResource = (index: number) => {
    setResources(prev => prev.filter((_, i) => i !== index))
  }

  const addScript = () => {
    setScripts(prev => [...prev, { name: "", content: "", language: "python" }])
  }

  const updateScript = (index: number, field: keyof SkillScript, value: string) => {
    setScripts(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const removeScript = (index: number) => {
    setScripts(prev => prev.filter((_, i) => i !== index))
  }

  const [iconPopoverOpen, setIconPopoverOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent
        className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <DialogHeader>
          <DialogTitle>{editingSkill ? t("skill.edit") : t("skill.create")}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-transparent p-0 gap-[2px]">
            <TabsTrigger value="basic" className="h-7 text-xs font-normal rounded-md hover:bg-muted/50 dark:hover:bg-muted/30 data-[state=active]:bg-muted data-[state=active]:dark:bg-muted/50">{t("skill.basicInfo")}</TabsTrigger>
            <TabsTrigger value="instructions" className="h-7 text-xs font-normal rounded-md hover:bg-muted/50 dark:hover:bg-muted/30 data-[state=active]:bg-muted data-[state=active]:dark:bg-muted/50">{t("skill.instructions")}</TabsTrigger>
            <TabsTrigger value="resources" className="h-7 text-xs font-normal rounded-md hover:bg-muted/50 dark:hover:bg-muted/30 data-[state=active]:bg-muted data-[state=active]:dark:bg-muted/50">{t("skill.resources")}</TabsTrigger>
            <TabsTrigger value="scripts" className="h-7 text-xs font-normal rounded-md hover:bg-muted/50 dark:hover:bg-muted/30 data-[state=active]:bg-muted data-[state=active]:dark:bg-muted/50">{t("skill.scripts")}</TabsTrigger>
          </TabsList>

          <div className="h-[400px] overflow-y-auto py-4">
            <TabsContent value="basic" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>{t("skill.nameLabel")} <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="pdf-processing"
                  disabled={!!editingSkill}
                  className="bg-background/50 h-7 min-h-[28px] text-xs"
                />
                <p className="text-xs text-muted-foreground">{t("skill.nameHint")}</p>
              </div>

              {/* 显示名称和图标在同一行 */}
              <div className="space-y-2">
                <Label>{t("skill.displayNameLabel")} <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  {/* 图标选择器 - 移到左侧，无边框 */}
                  <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted transition-colors"
                      >
                        {formData.icon ? (
                          (() => {
                            const IconComponent = getIconComponent(formData.icon);
                            return <IconComponent className="h-4 w-4 text-foreground" strokeWidth={1.5} />;
                          })()
                        ) : (
                          <FileText className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2" align="start" onWheel={(e) => e.stopPropagation()}>
                      <div 
                        className="h-[240px] overflow-y-auto overflow-x-hidden pr-2"
                        style={{ overscrollBehavior: 'contain' }}
                      >
                        <div className="grid grid-cols-8 gap-1">
                          {COMMON_ICONS.map((iconName) => {
                            const IconComponent = getIconComponent(iconName)
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, icon: iconName }))
                                  setIconPopoverOpen(false)
                                }}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors cursor-pointer",
                                  formData.icon === iconName && "bg-primary/10 ring-1 ring-primary"
                                )}
                                title={iconName}
                              >
                                <IconComponent className="h-4 w-4 text-foreground" />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder={t("skill.displayNamePlaceholder")}
                    className="flex-1 bg-background/50 h-7 min-h-[28px] text-xs"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t("skill.descriptionLabel")} <span className="text-destructive">*</span></Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t("skill.descriptionPlaceholder")}
                  rows={3}
                  className="bg-background/50 text-xs"
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t("skill.triggerKeywordsLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder={t("skill.keywordPlaceholder")}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    className="h-7 min-h-[28px] text-xs"
                  />
                  <Button type="button" onClick={addKeyword} variant="ghost" size="icon" className="h-7 w-7 p-0">
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.triggerKeywords?.map((keyword) => (
                    <span key={keyword} className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded-md text-xs border border-border/50">
                      {keyword}
                      <button onClick={() => removeKeyword(keyword)} className="hover:text-destructive">
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("skill.tagsLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder={t("skill.tagPlaceholder")}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="h-7 min-h-[28px] text-xs"
                  />
                  <Button type="button" onClick={addTag} variant="ghost" size="icon" className="h-7 w-7 p-0">
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags?.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded-md text-xs border border-border/50">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="instructions" className="mt-0">
              <div className="space-y-2">
                <Label>{t("skill.instructionsLabel")} <span className="text-destructive">*</span></Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder={t("skill.instructionsPlaceholder")}
                  className="h-[340px] min-h-[340px] text-xs"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="resources" className="mt-0 space-y-4">
              <div className="flex justify-between items-center">
                <Label>{t("skill.resourcesLabel")}</Label>
                <Button type="button" onClick={addResource} variant="outline" className="h-7 px-2 text-xs rounded-md">
                  <Plus className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                  {t("skill.addResource")}
                </Button>
              </div>
              {resources.map((resource, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex gap-2">
                    <Input
                      value={resource.name}
                      onChange={(e) => updateResource(index, "name", e.target.value)}
                      placeholder={t("skill.resourceNamePlaceholder")}
                      className="flex-1 h-7 min-h-[28px] text-xs"
                    />
                    <Select
                      value={resource.type}
                      onValueChange={(value) => updateResource(index, "type", value)}
                    >
                      <SelectTrigger className="w-[140px] !h-7 text-xs rounded-md px-2 py-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="markdown" className="text-xs h-7 rounded-md">Markdown</SelectItem>
                        <SelectItem value="json" className="text-xs h-7 rounded-md">JSON</SelectItem>
                        <SelectItem value="text" className="text-xs h-7 rounded-md">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={() => removeResource(index)} variant="ghost" size="icon" className="h-7 w-7 p-0 rounded-md">
                      <Trash2 className="h-4 w-4 text-destructive" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <Textarea
                    value={resource.content}
                    onChange={(e) => updateResource(index, "content", e.target.value)}
                    placeholder={t("skill.resourceContentPlaceholder")}
                    rows={5}
                    className="text-xs"
                  />
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="scripts" className="mt-0 space-y-4">
              <div className="flex justify-between items-center">
                <Label>{t("skill.scriptsLabel")}</Label>
                <Button type="button" onClick={addScript} variant="outline" className="h-7 px-2 text-xs rounded-md">
                  <Plus className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                  {t("skill.addScript")}
                </Button>
              </div>
              {scripts.map((script, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex gap-2">
                    <Input
                      value={script.name}
                      onChange={(e) => updateScript(index, "name", e.target.value)}
                      placeholder={t("skill.scriptNamePlaceholder")}
                      className="flex-1 h-7 min-h-[28px] text-xs"
                    />
                    <Select
                      value={script.language}
                      onValueChange={(value) => updateScript(index, "language", value)}
                    >
                      <SelectTrigger className="w-[140px] !h-7 text-xs rounded-md px-2 py-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="python" className="text-xs h-7 rounded-md">Python</SelectItem>
                        <SelectItem value="javascript" className="text-xs h-7 rounded-md">JavaScript</SelectItem>
                        <SelectItem value="bash" className="text-xs h-7 rounded-md">Bash</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={() => removeScript(index)} variant="ghost" size="icon" className="h-7 w-7 p-0 rounded-md">
                      <Trash2 className="h-4 w-4 text-destructive" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <Textarea
                    value={script.content}
                    onChange={(e) => updateScript(index, "content", e.target.value)}
                    placeholder={t("skill.scriptContentPlaceholder")}
                    rows={5}
                    className="text-xs"
                  />
                </div>
              ))}
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || !formData.displayName.trim() || !formData.instructions.trim()}
            className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
