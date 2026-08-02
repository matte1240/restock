"use client";

import type { CSSProperties, ReactNode } from "react";

interface DialogProps {
  children: ReactNode;
  onClose: () => void;
  width?: CSSProperties["width"];
}

export function Dialog({ children, onClose, width }: DialogProps) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={width ? { width } : undefined} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
