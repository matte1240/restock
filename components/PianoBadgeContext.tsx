"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PianoBadgeValue {
  count: number;
  setCount: (n: number) => void;
}

const PianoBadgeContext = createContext<PianoBadgeValue>({ count: 0, setCount: () => {} });

export function PianoBadgeProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  return <PianoBadgeContext.Provider value={{ count, setCount }}>{children}</PianoBadgeContext.Provider>;
}

export function usePianoBadge() {
  return useContext(PianoBadgeContext);
}
