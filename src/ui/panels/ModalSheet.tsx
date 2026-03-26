import React, { useEffect } from "react";
import {
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";

type ModalSheetProps = {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  subtitle?: string;
  title: string;
};

export function ModalSheet({ children, onClose, open, subtitle, title }: ModalSheetProps) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      aria-hidden={false}
      onClick={onClose}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.56)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
        zIndex: 40
      }}
    >
      <div
        aria-label={title}
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{
          width: "min(860px, 100%)",
          maxHeight: "min(82vh, 920px)",
          overflow: "auto",
          borderRadius: 18,
          border: `1px solid ${PLAY_SCREEN_THEME.border}`,
          background: PLAY_SCREEN_THEME.surfaceRaised,
          color: PLAY_SCREEN_THEME.ink,
          fontFamily: PLAY_SCREEN_THEME.bodyFont,
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28)"
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            padding: "16px 18px 12px",
            borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
            background: "rgba(255, 250, 241, 0.96)",
            backdropFilter: "blur(8px)"
          }}
        >
          <div>
            <div style={{ fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", opacity: 0.6 }}>Detail sheet</div>
            <h3 style={{ margin: "4px 0 0", fontFamily: PLAY_SCREEN_THEME.bodyFont }}>{title}</h3>
            {subtitle ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{subtitle}</div> : null}
          </div>
          <button onClick={onClose} style={{ ...PLAY_SCREEN_SECONDARY_BUTTON_STYLE, whiteSpace: "nowrap" }}>
            Close
          </button>
        </div>

        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}
