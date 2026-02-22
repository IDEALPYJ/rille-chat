"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/context";

interface ImageCopyButtonProps {
  content: string;
}

export function ImageCopyButton({ content }: ImageCopyButtonProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.type === 'image_generation' && Array.isArray(parsed.images)) {
        // 复制所有图片URL，每行一个
        const urls = parsed.images.join('\n');
        await navigator.clipboard.writeText(urls);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // 解析失败，尝试直接复制内容
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{copied ? t("message.copied") : t("messageDisplay.copyImageLink")}</p>
      </TooltipContent>
    </Tooltip>
  );
}





