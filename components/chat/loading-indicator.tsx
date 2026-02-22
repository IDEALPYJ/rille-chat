import React from "react";

export const LoadingIndicator = () => (
  <div className="flex items-center gap-1 h-6 py-2 px-1">
    <div className="w-1.5 h-1.5 bg-muted dark:bg-mutedrounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
    <div className="w-1.5 h-1.5 bg-muted dark:bg-mutedrounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
    <div className="w-1.5 h-1.5 bg-muted dark:bg-mutedrounded-full animate-bounce" />
  </div>
);

LoadingIndicator.displayName = "LoadingIndicator";
