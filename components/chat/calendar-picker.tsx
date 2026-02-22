"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarPickerProps {
  selectedYear: number
  selectedMonth: number
  availableYears: Set<number>
  getAvailableMonthsForYear: (year: number) => Set<number>
  onSelect: (year: number, month: number, viewMode: "month" | "year") => void
}

export function CalendarPicker({ 
  selectedYear, 
  selectedMonth, 
  availableYears,
  getAvailableMonthsForYear,
  onSelect 
}: CalendarPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<"month" | "year">("month")
  const [displayYear, setDisplayYear] = React.useState(selectedYear)
  const [yearPage, setYearPage] = React.useState(0)

  // 获取当前年份
  const currentYear = new Date().getFullYear()

  // 计算年份范围（每页12年，最后一页的最后一年是当前年份）
  const getYearRange = (page: number) => {
    const endYear = currentYear - page * 12
    const startYear = endYear - 11
    return { startYear, endYear }
  }

  // 生成年份列表
  const generateYears = (page: number) => {
    const { startYear, endYear } = getYearRange(page)
    const years = []
    for (let year = endYear; year >= startYear; year--) {
      years.push(year)
    }
    return years.reverse()
  }

  // 月份列表
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // 处理年份切换
  const handlePrevYear = () => {
    setDisplayYear(prev => prev - 1)
  }

  const handleNextYear = () => {
    setDisplayYear(prev => prev + 1)
  }

  // 处理年份分页切换
  const handlePrevYearPage = () => {
    setYearPage(prev => prev + 1)
  }

  const handleNextYearPage = () => {
    setYearPage(prev => Math.max(0, prev - 1))
  }

  // 选择月份
  const handleSelectMonth = (month: number) => {
    const availableMonths = getAvailableMonthsForYear(displayYear)
    if (!availableMonths.has(month)) return
    onSelect(displayYear, month, "month")
    setOpen(false)
  }

  // 选择年份
  const handleSelectYear = (year: number) => {
    if (!availableYears.has(year)) return
    onSelect(year, 1, "year")
    setOpen(false)
  }

  // 切换视图模式
  const toggleViewMode = () => {
    setViewMode(prev => prev === "month" ? "year" : "month")
    if (viewMode === "year") {
      // 切换到月视图时，重置显示年份为选中年份
      setDisplayYear(selectedYear)
    } else {
      // 切换到年视图时，计算当前选中年份所在的页
      const yearsFromCurrent = currentYear - selectedYear
      const page = Math.floor(yearsFromCurrent / 12)
      setYearPage(Math.max(0, page))
    }
  }

  // 获取当前年份范围的显示文本
  const getYearRangeText = () => {
    const { startYear, endYear } = getYearRange(yearPage)
    return `${startYear}-${endYear}`
  }

  // 格式化显示文本
  const getDisplayText = () => {
    return `${selectedYear}年${selectedMonth}月`
  }

  // 获取当前显示年份的可用月份
  const currentAvailableMonths = getAvailableMonthsForYear(displayYear)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs rounded-md min-w-[100px] border"
        >
          {getDisplayText()}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[280px] p-3" align="end">
        {viewMode === "month" ? (
          // 月视图
          <div className="space-y-3">
            {/* 头部 */}
            <div className="flex items-center justify-center relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs absolute left-0"
                onClick={toggleViewMode}
              >
                年
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handlePrevYear}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                  {displayYear}年
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleNextYear}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* 月份网格 */}
            <div className="grid grid-cols-4 gap-2">
              {months.map((month) => {
                const hasData = currentAvailableMonths.has(month)
                const isSelected = selectedYear === displayYear && selectedMonth === month
                return (
                  <button
                    key={month}
                    onClick={() => handleSelectMonth(month)}
                    disabled={!hasData}
                    className={cn(
                      "h-8 text-xs rounded-md transition-colors",
                      !hasData && "text-muted-foreground/40 cursor-not-allowed",
                      hasData && "hover:bg-muted",
                      isSelected
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : hasData
                        ? "bg-transparent"
                        : "bg-muted/30"
                    )}
                  >
                    {month}月
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          // 年视图
          <div className="space-y-3">
            {/* 头部 */}
            <div className="flex items-center justify-center relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs absolute left-0"
                onClick={toggleViewMode}
              >
                月
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handlePrevYearPage}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium min-w-[80px] text-center">
                  {getYearRangeText()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleNextYearPage}
                  disabled={yearPage === 0}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* 年份网格 */}
            <div className="grid grid-cols-4 gap-2">
              {generateYears(yearPage).map((year) => {
                const hasData = availableYears.has(year)
                const isSelected = selectedYear === year
                return (
                  <button
                    key={year}
                    onClick={() => handleSelectYear(year)}
                    disabled={!hasData}
                    className={cn(
                      "h-8 text-xs rounded-md transition-colors",
                      !hasData && "text-muted-foreground/40 cursor-not-allowed",
                      hasData && "hover:bg-muted",
                      isSelected
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : hasData
                        ? "bg-transparent"
                        : "bg-muted/30"
                    )}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
