'use client';

import { Settings2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface AdvancedSettingsButtonContentProps {
  hasChanges: boolean;
}

export function AdvancedSettingsButtonContent({ hasChanges: _hasChanges }: AdvancedSettingsButtonContentProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-[6.4px]">
      <Settings2 className="h-[12.8px] w-[12.8px] text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground" />
      <span className="text-xs font-medium text-gray-600 dark:text-foreground/70 group-hover:text-gray-800 dark:group-hover:text-foreground/70">{t("advancedSettings.title")}</span>
    </div>
  );
}
