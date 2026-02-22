"use client"

import * as React from "react"

interface ProfileContextType {
  onBack?: () => void
}

const ProfileContext = React.createContext<ProfileContextType>({})

export function useProfileContext() {
  return React.useContext(ProfileContext)
}

export function ProfileContentWrapper({
  children,
  onBack,
}: {
  children: React.ReactNode
  onBack?: () => void
}) {
  return (
    <ProfileContext.Provider value={{ onBack }}>
      {children}
    </ProfileContext.Provider>
  )
}
