"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, translations } from "./translations";

type TranslationPath =
  | `common.${keyof typeof translations.zh.common}`
  | `buttons.${keyof typeof translations.zh.buttons}`
  | `webSearchPopover.${keyof typeof translations.zh.webSearchPopover}`
  | `settings.${keyof typeof translations.zh.settings}`
  | `input.${keyof typeof translations.zh.input}`
  | `prompt.${keyof typeof translations.zh.prompt}`
  | `reasoningEffort.${keyof typeof translations.zh.reasoningEffort}`
  | `sidebar.${keyof typeof translations.zh.sidebar}`
  | `dialog.${keyof typeof translations.zh.dialog}`
  | `errors.${keyof typeof translations.zh.errors}`
  | `time.${keyof typeof translations.zh.time}`
  | `profile.${keyof typeof translations.zh.profile}`
  | `chat.${keyof typeof translations.zh.chat}`
  | `search.${keyof typeof translations.zh.search}`
  | `searchDialog.${keyof typeof translations.zh.searchDialog}`
  | `aiProvider.${keyof typeof translations.zh.aiProvider}`
  | `aiProvider.providerNames.${keyof typeof translations.zh.aiProvider.providerNames}`
  | `modelList.${keyof typeof translations.zh.modelList}`
  | `modelEdit.${keyof typeof translations.zh.modelEdit}`
  | `modelDetail.${keyof typeof translations.zh.modelDetail}`
  | `modelDetail.pricingTypes.${keyof typeof translations.zh.modelDetail.pricingTypes}`
  | `modelDetail.pricingNames.${keyof typeof translations.zh.modelDetail.pricingNames}`
  | `modelDetail.pricingUnits.${keyof typeof translations.zh.modelDetail.pricingUnits}`
  | `modelDetail.modalityTypes.${keyof typeof translations.zh.modelDetail.modalityTypes}`
  | `modelDetail.features.${keyof typeof translations.zh.modelDetail.features}`
  | `modelDetail.tools.${keyof typeof translations.zh.modelDetail.tools}`
  | `mcp.${keyof typeof translations.zh.mcp}`
  | `voice.${keyof typeof translations.zh.voice}`
  | `auth.${keyof typeof translations.zh.auth}`
  | `message.${keyof typeof translations.zh.message}`
  | `messageDisplay.${keyof typeof translations.zh.messageDisplay}`
  | `advancedSettings.${keyof typeof translations.zh.advancedSettings}`
  | `memory.${keyof typeof translations.zh.memory}`
  | `mcpDialog.${keyof typeof translations.zh.mcpDialog}`
  | `modelPicker.${keyof typeof translations.zh.modelPicker}`
  | `mcp.pluginPicker.${keyof typeof translations.zh.mcp.pluginPicker}`
  | `mcpApi.${keyof typeof translations.zh.mcpApi}`
  | `imageChat.${keyof typeof translations.zh.imageChat}`
  | `project.${keyof typeof translations.zh.project}`
  | `projectApi.${keyof typeof translations.zh.projectApi}`
  | `userApi.${keyof typeof translations.zh.userApi}`
  | `chatApi.${keyof typeof translations.zh.chatApi}`
  | `errors.voiceRecognition.${keyof typeof translations.zh.errors.voiceRecognition}`
  | `capabilities.${keyof typeof translations.zh.capabilities}`
  | `skill.${keyof typeof translations.zh.skill}`
  | `chatSettings.${keyof typeof translations.zh.chatSettings}`;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationPath, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  // 初始状态总是 "zh"，确保服务端和客户端一致
  const [language, setLanguageState] = useState<Language>("zh");
  const [isMounted, setIsMounted] = useState(false);

  // 在客户端挂载后，从 localStorage 读取语言设置
  useEffect(() => {
    // 使用 requestAnimationFrame 避免同步调用 setState 导致的级联渲染问题
    const rafId = requestAnimationFrame(() => {
      setIsMounted(true);
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("system-language");
        if (saved === "zh" || saved === "en") {
          setLanguageState(saved);
        }
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  // 保存语言设置到 localStorage
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      localStorage.setItem("system-language", language);
    }
  }, [language, isMounted]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // 使用 useMemo 确保 t 函数稳定，并正确访问翻译
  const t = React.useMemo(() => {
    return (key: TranslationPath, params?: Record<string, string | number>): string => {
      try {
        const keys = key.split(".");

        // 确保语言值有效
        const currentLanguage = language === "zh" || language === "en" ? language : "zh";

        // 直接访问翻译对象
        const langTranslations = translations[currentLanguage];
        if (!langTranslations) {
          // 开发环境记录警告，生产环境静默处理
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[i18n] Language "${currentLanguage}" not found in translations`);
          }
          return key;
        }

        // 递归访问嵌套的翻译对象
        let translation: unknown = langTranslations;
        for (const k of keys) {
          if (translation === undefined || translation === null) {
            // 开发环境记录警告，生产环境静默处理
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[i18n] Translation path "${key}" not found for language "${currentLanguage}" at key "${k}"`);
            }
            return key;
          }
          if (typeof translation === 'object' && translation !== null) {
            translation = (translation as Record<string, unknown>)[k];
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[i18n] Translation path "${key}" invalid for language "${currentLanguage}" at key "${k}"`);
            }
            return key;
          }
        }

        if (translation === undefined || translation === null) {
          // 开发环境记录警告，生产环境静默处理
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[i18n] Translation key "${key}" not found for language "${currentLanguage}"`);
          }
          return key;
        }

        if (typeof translation !== "string") {
          // 开发环境记录警告，生产环境静默处理
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`[i18n] Translation key "${key}" is not a string, got:`, typeof translation);
          }
          return key;
        }

        if (params) {
          return translation.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
            return params[paramKey]?.toString() || match;
          });
        }

        return translation;
      } catch (error: unknown) {
        // 开发环境记录错误，生产环境静默处理
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[i18n] Translation error for key "${key}":`, error);
        }
        return key;
      }
    };
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

