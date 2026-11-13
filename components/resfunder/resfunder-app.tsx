"use client";

import { useEffect } from "react";

/** Mount points for the ResFunder app. The vanilla engine renders into them once on the client. */
export function ResFunderApp() {
  useEffect(() => {
    void import("./engine.js").then((m) => m.startResFunder());
  }, []);

  return (
    <>
      <div className="banner">
        <b>BSC Testnet</b> · test tokens only, no real money
      </div>
      <div id="root" />
      <div id="drawerRoot" />
      <div id="modalRoot" />
      <div id="svRoot" />
      <div id="toast" role="status" aria-live="polite">
        <span id="toastMsg" />
        <button id="toastUndo">Undo</button>
      </div>
    </>
  );
}
