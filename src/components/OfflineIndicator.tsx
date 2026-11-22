import React from "react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-cartridge fixed bottom-[16px] left-[16px] z-50 flex items-center gap-[8px] border-[var(--deck-amber)] bg-[var(--deck-panel)] px-[12px] py-[7px] font-mono text-[11px] font-bold text-[var(--deck-amber)]"
    >
      <span className="h-[8px] w-[8px] shrink-0 bg-[var(--deck-amber)]" />
      <span>Offline Mode — local decks &amp; editing available</span>
    </div>
  );
};
