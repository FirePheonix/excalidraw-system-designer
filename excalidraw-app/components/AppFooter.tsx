import { Footer } from "@excalidraw/excalidraw/index";
import React from "react";

import { isExcalidrawPlusSignedUser } from "../app_constants";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";

export const AppFooter = React.memo(
  ({
    onChange,
    onSavePage,
    onNewPage,
    onOpenPage,
    pageLabel,
    saveState,
  }: {
    onChange: () => void;
    onSavePage: () => void;
    onNewPage: () => void;
    onOpenPage: () => void;
    pageLabel: string;
    saveState: "idle" | "saving" | "saved" | "error";
  }) => {
    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {!isExcalidrawPlusSignedUser && <EncryptedIcon />}
          <span style={{ fontSize: ".85rem", opacity: 0.75 }}>{pageLabel}</span>
          <button type="button" onClick={onNewPage}>
            New Page
          </button>
          <button type="button" onClick={onOpenPage}>
            Open Page
          </button>
          <button type="button" onClick={onSavePage} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </Footer>
    );
  },
);
