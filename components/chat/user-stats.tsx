"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { Loader2, Calendar, MessageSquare, Send, Zap } from "lucide-react"
import { CalendarPicker } from "./calendar-picker"

interface DailyTokenStat {
  date: string
  [modelName: string]: any // tokens for each model
}

interface DailyMessageStat {
  date: string
  count: number
}

interface UserStatsData {
  usageDays: number
  sessionCount: number
  messageCount: number
  totalTokens: number
  dailyTokenData: DailyTokenStat[]
  dailyMessageData: DailyMessageStat[]
  allModels: string[]
  availableYearMonths: Record<number, number[]> // year -> array of months
}

const MODEL_COLORS: Record<string, string> = {
  'gpt-4o': '#10a37f',
  'gpt-4o-mini': '#74aa9c',
  'deepseek-chat': '#4d6df1',
  'deepseek-reasoner': '#6e85e8',
  'claude-3-5-sonnet-20241022': '#d97757',
  'gemini-1.5-pro': '#4285f4',
  'gemini-1.5-flash': '#7baaf7',
  'unknown': '#94a3b8'
}

const COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

function getModelColor(model: string, index: number) {
  if (MODEL_COLORS[model]) return MODEL_COLORS[model]
  // 模糊匹配
  for (const key in MODEL_COLORS) {
    if (model.toLowerCase().includes(key.toLowerCase())) return MODEL_COLORS[key]
  }
  return COLORS[index % COLORS.length]
}

export function UserStats() {
  const [data, setData] = React.useState<UserStatsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [chartType, setChartType] = React.useState<"tokens" | "messages">("tokens")
  
  // 日历选择器状态
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth() + 1)
  const [chartViewMode, setChartViewMode] = React.useState<"month" | "year">("month")

  // 计算有数据的年月组合 - 必须在所有条件渲染之前调用
  const availableData = React.useMemo(() => {
    if (!data) {
      return { 
        yearMonths: new Map<number, Set<number>>(), // year -> Set of months
        years: new Set<number>()
      }
    }
    
    // 使用 API 返回的 availableYearMonths 数据
    const yearMonths = new Map<number, Set<number>>()
    const years = new Set<number>()
    
    Object.entries(data.availableYearMonths || {}).forEach(([year, months]) => {
      const yearNum = Number(year)
      years.add(yearNum)
      yearMonths.set(yearNum, new Set(months))
    })
    
    return { yearMonths, years }
  }, [data])

  const { yearMonths, years: availableYears } = availableData
  
  // 获取指定年份有数据的月份
  const getAvailableMonthsForYear = (year: number) => {
    return yearMonths.get(year) || new Set<number>()
  }

  React.useEffect(() => {
    fetch("/api/user/stats")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.stats)
        }
      })
      .catch(err => console.error("Failed to fetch stats:", err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const statsCards = [
    { title: "使用天数", value: data.usageDays, icon: Calendar, unit: "天" },
    { title: "对话数", value: data.sessionCount, icon: MessageSquare, unit: "个" },
    { title: "消息数", value: data.messageCount, icon: Send, unit: "条" },
    { title: "Token 总数", value: (data.totalTokens / 1000).toFixed(1), icon: Zap, unit: "k" },
  ]

  // 对模型按 token 数从大到小排序（仅用于 token 视图）
  const modelTotalTokens: Record<string, number> = {}
  const dailyTokenData = data.dailyTokenData || []
  data.allModels.forEach(model => {
    modelTotalTokens[model] = dailyTokenData.reduce((sum, day) => sum + (day[model] || 0), 0)
  })
  const sortedModels = [...data.allModels].sort((a, b) => modelTotalTokens[b] - modelTotalTokens[a])

  // 根据 chartViewMode 聚合数据
  const chartData: any[] = []

  if (chartViewMode === "month") {
    // 月视图：展示选定月份的每一天
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      const dataPoint: any = { date: `${day}日` }
      if (chartType === "tokens") {
        const rawData = data.dailyTokenData || []
        const dayData = rawData.find(d => d.date === dateStr)
        data.allModels.forEach(model => {
          dataPoint[model] = dayData ? (dayData[model] || 0) : 0
        })
      } else {
        const rawData = data.dailyMessageData || []
        const dayData = rawData.find(d => d.date === dateStr)
        dataPoint.count = dayData ? (dayData.count || 0) : 0
      }
      chartData.push(dataPoint)
    }
  } else {
    // 年视图：展示选定年份的12个月
    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0')

      const dataPoint: any = { date: `${month}月` }
      if (chartType === "tokens") {
        const rawData = data.dailyTokenData || []
        const monthRecords = rawData.filter(d => d.date.startsWith(`${selectedYear}-${monthStr}`))
        data.allModels.forEach(model => {
          dataPoint[model] = monthRecords.reduce((sum, d) => sum + (d[model] || 0), 0)
        })
      } else {
        const rawData = data.dailyMessageData || []
        const monthRecords = rawData.filter(d => d.date.startsWith(`${selectedYear}-${monthStr}`))
        dataPoint.count = monthRecords.reduce((sum, d) => sum + (d.count || 0), 0)
      }
      chartData.push(dataPoint)
    }
  }

  // 处理日历选择
  const handleCalendarSelect = (year: number, month: number, viewMode: "month" | "year") => {
    setSelectedYear(year)
    setSelectedMonth(month)
    setChartViewMode(viewMode)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsCards.map((stat, i) => (
          <Card key={i} className="bg-white dark:bg-card border shadow-none">
            <CardContent className="px-3 py-2 flex flex-col items-center text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="p-1 bg-muted/50 dark:bg-muted/50 rounded-md">
                  <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-xs font-semibold text-foreground">{stat.title}</p>
              </div>
              <p className="text-base font-bold leading-none mt-1.5">
                {stat.value}
                <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{stat.unit}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Select value={chartType} onValueChange={(v) => setChartType(v as "tokens" | "messages")}>
          <SelectTrigger className="w-[210px] !h-7 text-xs rounded-md px-2 py-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="tokens" className="text-xs h-7 rounded-md">每日 Token 用量</SelectItem>
            <SelectItem value="messages" className="text-xs h-7 rounded-md">每日消息数</SelectItem>
          </SelectContent>
        </Select>
        
        {/* 日历选择器 */}
        <CalendarPicker
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          availableYears={availableYears}
          getAvailableMonthsForYear={getAvailableMonthsForYear}
          onSelect={handleCalendarSelect}
        />
      </div>

      <Card className="bg-white dark:bg-card border shadow-none">
        <CardContent className="px-4 py-3">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-border/50" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  dy={5}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                />
                <Tooltip
                  cursor={{ fill: '#f4f4f5' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-[10px] shadow-xl text-xs p-1 min-w-[140px]">
                          <p className="font-semibold px-2 py-1.5 border-b border-border/50">{label}</p>
                          <div className="p-1 space-y-0.5">
                            {payload.map((entry: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 justify-between px-2 py-1.5 rounded-[6px] hover:bg-accent cursor-default">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-muted-foreground">{entry.name}</span>
                                </div>
                                <span className="font-mono font-medium">{entry.value.toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="pt-1 border-t border-border/50 mt-1 flex items-center justify-between px-2 py-1.5 font-semibold">
                              <span>总计</span>
                              <span>{payload.reduce((sum: number, entry: any) => sum + entry.value, 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {chartType === "tokens" ? (
                  sortedModels.map((model, index) => (
                    <Bar
                      key={model}
                      dataKey={model}
                      stackId="a"
                      fill={getModelColor(model, index)}
                      radius={index === sortedModels.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                      barSize={16}
                    />
                  ))
                ) : (
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                    barSize={16}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
