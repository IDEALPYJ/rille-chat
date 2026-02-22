"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react";

interface ArtifactViewProps {
  code: string;
  language: string;
  onClose: () => void;
}

// Helper to create the files object for Sandpack
const createSandpackFiles = (code: string, language: string) => {
  const isTsx = language === 'tsx' || language === 'typescript';
  const entryFileName = isTsx ? "/App.tsx" : "/index.js";
  const indexHtml = `<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
  </body>
</html>`;

  if (isTsx) {
    return {
      "/App.tsx": code,
      "/index.js": `import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));`,
      "/index.html": { code: indexHtml, hidden: true },
    };
  }

  return {
    [entryFileName]: code,
    "/index.html": { code: indexHtml, hidden: true },
  };
};

export function ArtifactView({ code, language, onClose }: ArtifactViewProps) {
  const files = createSandpackFiles(code, language);

  return (
    <div className="fixed top-0 right-0 h-full w-1/2 bg-background/80 backdrop-blur-sm z-50 flex flex-col p-4 shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Artifact Preview</h2>
        <button
          onClick={onClose}
          className="text-white hover:text-muted-foregroundtransition-colors"
        >
          &times; Close
        </button>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg">
        <SandpackProvider
          template="react"
          files={files}
          theme="dark"
        >
          <SandpackLayout>
            {/* <SandpackFileExplorer /> */}
            <SandpackCodeEditor wrapContent={true} />
            <SandpackPreview />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}