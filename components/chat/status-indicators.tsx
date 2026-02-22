"use client";

import { Brain, Globe, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReasoningSettings } from "@/lib/types";

interface StatusIndicatorsProps {
  isMultiline: boolean;
  reasoning: ReasoningSettings | boolean;
  webSearch: boolean;
  vectorSearch: boolean;
}

export function StatusIndicators({
  isMultiline,
  reasoning,
  webSearch,
  vectorSearch,
}: StatusIndicatorsProps) {
  // 定义所有指示器（按从上到下的显示顺序）
  // 注意：prompt 提示词图标已移除，不再在输入框左侧显示
  const allIndicators = [
    {
      key: "reasoning",
      enabled: typeof reasoning === 'boolean' ? reasoning : reasoning.enabled,
      icon: <Brain className="w-2 h-2" />,
      color: "purple",
    },
    {
      key: "vectorSearch",
      enabled: vectorSearch,
      icon: <Database className="w-2 h-2" />,
      color: "green",
    },
    {
      key: "webSearch",
      enabled: webSearch,
      icon: <Globe className="w-2 h-2" />,
      color: "blue",
    },
  ];

  // 过滤出启用的指示器，保持原有顺序
  const activeIndicators = allIndicators.filter((item) => item.enabled);

  // 弧形位置定义 - 根据启用的数量选择对应的位置配置
  // 位置数组按从下到上排列（索引0是最下面，索引3是最上面）
  const arcPositions = !isMultiline
    ? {
        // 单行模式：弧形更紧凑
        // 排列：下(内) -> 中(外) -> 中(外) -> 上(内)
        1: [
          { bottom: "40px", left: "-20px" },   // 最下面（内）
        ],
        2: [
          { bottom: "40px", left: "-20px" },   // 最下面（内）
          { bottom: "20px", left: "-28px" },  // 上面（外）
        ],
        3: [
          { bottom: "40px", left: "-20px" },   // 最下面（内）
          { bottom: "20px", left: "-28px" },  // 中间（外）
          { bottom: "0px", left: "-20px" },  // 最上面（内）
        ]
      }
    : {
        // 多行模式：弧形更舒展
        1: [
          { bottom: "0px", left: "-20px" },
        ],
        2: [
          { bottom: "0px", left: "-20px" },
          { bottom: "26px", left: "-28px" },
        ],
        3: [
          { bottom: "42px", left: "-28px" },
          { bottom: "20px", left: "-28px" },
          { bottom: "0px", left: "-20px" },
        ]
      };

  const count = activeIndicators.length as 1 | 2 | 3;
  const positions = arcPositions[count] || arcPositions[1];

  return (
    <div className="absolute left-0 bottom-0 z-10 pointer-events-none select-none">
      {activeIndicators.map((indicator, index) => {
        // activeIndicators[0] 是最上面的，需要取 positions 的最后一个
        // activeIndicators[最后一个] 是最下面的，需要取 positions[0]
        const posIndex = positions.length - 1 - index;
        const pos = positions[posIndex];
        
        const colorClass =
          indicator.color === "amber"
            ? "bg-white dark:bg-card border-amber-200 dark:border-amber-900/50 text-amber-600"
            : indicator.color === "purple"
            ? "bg-white dark:bg-card border-purple-200 dark:border-purple-900/50 text-purple-600"
            : indicator.color === "green"
            ? "bg-white dark:bg-card border-green-200 dark:border-green-900/50 text-green-600"
            : "bg-white dark:bg-card border-blue-200 dark:border-blue-900/50 text-blue-600";

        return (
          <div
            key={indicator.key}
            className={cn(
              "absolute flex items-center justify-center w-3.5 h-3.5 rounded-full border transition-all duration-300",
              colorClass,
              "opacity-100 scale-100"
            )}
            style={{
              bottom: pos.bottom,
              left: pos.left,
            }}
          >
            {indicator.icon}
          </div>
        );
      })}
    </div>
  );
}
