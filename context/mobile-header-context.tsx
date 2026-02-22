"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface MobileHeaderContextType {
  title: string | null
  setTitle: (title: string | null) => void
  selectedProvider: string | null
  setSelectedProvider: (provider: string | null) => void
  selectedModel: string | null
  setSelectedModel: (model: string | null) => void
  onModelSelect?: (provider: string, model: string) => void
  setOnModelSelect: (handler: ((provider: string, model: string) => void) | undefined) => void
}

const MobileHeaderContext = createContext<MobileHeaderContextType | undefined>(undefined)

export function MobileHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [onModelSelect, setOnModelSelect] = useState<((provider: string, model: string) => void) | undefined>(undefined)

  return (
    <MobileHeaderContext.Provider value={{ 
      title, 
      setTitle, 
      selectedProvider, 
      setSelectedProvider, 
      selectedModel, 
      setSelectedModel,
      onModelSelect,
      setOnModelSelect
    }}>
      {children}
    </MobileHeaderContext.Provider>
  )
}

export function useMobileHeader() {
  const context = useContext(MobileHeaderContext)
  if (context === undefined) {
    throw new Error("useMobileHeader must be used within a MobileHeaderProvider")
  }
  return context
}

