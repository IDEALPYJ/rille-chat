import React, { useState, memo } from "react";
import { Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/context";

interface CopyButtonProps {
  content: string;
}

export const CopyButton = memo(({ content }: CopyButtonProps) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleCopy}
          className={`size-8 p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer ${copied ? "text-green-500" : ""}`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{copied ? t("message.copied") : t("message.copy")}</p>
      </TooltipContent>
    </Tooltip>
  );
});

CopyButton.displayName = "CopyButton";
