import { cn } from "@/lib/utils";
import { OpenAI } from '@lobehub/icons';
import { Bot } from "lucide-react";
import { getIcon } from '@/lib/config/icon-mappings';
import React, { useMemo, useRef, useEffect, useCallback } from 'react';

interface ModelIconProps {
  model?: string;
  provider?: string;
  avatar?: string;
  className?: string;
  size?: number;
  variant?: 'avatar' | 'color' | 'mono';
}

/**
 * 修复 SVG 渐变 ID 冲突的包装组件
 * 动态扫描 SVG 内部的渐变 ID 并赋予唯一后缀，确保页面上多个实例互不干扰
 */
const SafeSvgIcon = ({ Component, size, className, ...props }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasProcessedRef = useRef(false);

  const processSvgIds = useCallback(() => {
    if (!containerRef.current || hasProcessedRef.current) return;

    // 查找所有带 id 的渐变元素
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const gradients = svg.querySelectorAll('linearGradient, radialGradient, filter, mask, clipPath');
    if (gradients.length === 0) return;

    // 为每个 ID 生成唯一后缀
    const uniqueId = Math.random().toString(36).substr(2, 6);
    const idMap = new Map<string, string>();

    gradients.forEach((el) => {
      const oldId = el.getAttribute('id');
      if (oldId && !oldId.includes('-safe-')) {
        const newId = `${oldId}-safe-${uniqueId}`;
        el.setAttribute('id', newId);
        idMap.set(oldId, newId);
      }
    });

    // 更新所有引用这些 ID 的属性
    if (idMap.size > 0) {
      const elementsWithRefs = svg.querySelectorAll('[fill], [stroke], [filter], [mask], [clip-path]');
      elementsWithRefs.forEach((el) => {
        ['fill', 'stroke', 'filter', 'mask', 'clip-path'].forEach((attr) => {
          const val = el.getAttribute(attr);
          if (val && val.includes('url(#')) {
            const match = val.match(/url\(#([^)]+)\)/);
            if (match && idMap.has(match[1])) {
              el.setAttribute(attr, `url(#${idMap.get(match[1])})`);
            }
          }
        });
      });
    }
    hasProcessedRef.current = true;
  }, []);

  useEffect(() => {
    // 使用 requestAnimationFrame 避免在渲染期间同步访问 ref
    requestAnimationFrame(processSvgIds);
  }, [processSvgIds]);

  return (
    <div ref={containerRef} className="flex items-center justify-center w-full h-full overflow-visible">
      <Component size={size} className={className} {...props} />
    </div>
  );
};

export function ModelIcon({
  model,
  provider,
  avatar,
  className,
  size = 24,
  variant = 'avatar'
}: ModelIconProps) {

  // 使用集中的图标映射配置查找图标组件
  const TargetComponent = getIcon(avatar, provider, model); 

  if (!TargetComponent) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-sm text-muted-foreground", className)} style={{ width: size, height: size }}>
        <Bot size={size * 0.6} />
      </div>
    );
  }

  const isOpenAI = TargetComponent === OpenAI;
  const correctionClass = isOpenAI ? "origin-center scale-110" : "";

  const RenderIcon = () => {
    const baseClass = cn("w-full h-full", correctionClass, className);
    const IconComponent = TargetComponent as any;

    // 为每个实例生成一个相对唯一的 key，辅助 React 隔离
    const instanceKey = useMemo(() => 
      `${model}-${avatar}-${provider}-${variant}-${Math.random().toString(36).substr(2, 9)}`,
      [model, avatar, provider, variant]
    );

    switch (variant) {
      case 'color':
        if (isOpenAI) {
           const Comp = IconComponent.Mono || IconComponent;
           return <Comp size={size} className={baseClass} />;
        }
        
        const ColorComp = IconComponent.Color || IconComponent;
        return <SafeSvgIcon key={instanceKey} Component={ColorComp} size={size} className={baseClass} />;

      case 'mono':
        const MonoComp = IconComponent.Mono || IconComponent;
        return <SafeSvgIcon key={instanceKey} Component={MonoComp} size={size} className={baseClass} />;
        
      case 'avatar':
      default:
        if (IconComponent.Avatar) {
          return <SafeSvgIcon key={instanceKey} Component={IconComponent.Avatar} size={size} className={className} />;
        }
        
        const FallbackColorComp = IconComponent.Color || IconComponent;
        return (
          <div 
            className={cn("rounded-full flex items-center justify-center overflow-hidden bg-muted/30", className)}
            style={{ width: size, height: size }}
          >
            <SafeSvgIcon key={instanceKey} Component={FallbackColorComp} size={size * 0.7} />
          </div>
        );
    }
  };

  return (
    <div
      className={cn("flex items-center justify-center shrink-0 leading-none overflow-visible", variant !== 'avatar' && className)}
      style={variant !== 'avatar' ? { width: size, height: size } : undefined}
    >
      <RenderIcon />
    </div>
  );
}