(async () => {
  const config = await chrome.storage.local.get(["blurPx", "detectors"]);
  const blurPx = config.blurPx || 8;
  const detectors = config.detectors || [];

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    background: "rgba(0,0,0,0.2)",
    cursor: "crosshair",
  });

  const selection = document.createElement("div");
  Object.assign(selection.style, {
    position: "fixed",
    border: "2px solid #2563eb",
    background: "rgba(37,99,235,0.08)",
    borderRadius: "2px",
    zIndex: "2147483647",
    display: "none",
  });

  const hint = document.createElement("div");
  Object.assign(hint.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "rgba(0,0,0,0.7)",
    color: "white",
    padding: "12px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "-apple-system, sans-serif",
    zIndex: "2147483647",
    pointerEvents: "none",
  });
  hint.textContent = "Drag to select area — Esc to cancel";

  document.body.appendChild(overlay);
  document.body.appendChild(selection);
  document.body.appendChild(hint);

  let startX, startY, dragging = false;

  function cleanup() {
    overlay.remove();
    selection.remove();
    hint.remove();
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") cleanup();
  }
  document.addEventListener("keydown", onKey);

  overlay.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    hint.style.display = "none";
    selection.style.display = "block";
    selection.style.left = startX + "px";
    selection.style.top = startY + "px";
    selection.style.width = "0";
    selection.style.height = "0";
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    Object.assign(selection.style, {
      left: x + "px",
      top: y + "px",
      width: w + "px",
      height: h + "px",
    });
  });

  overlay.addEventListener("mouseup", async (e) => {
    if (!dragging) return;
    dragging = false;

    const rect = {
      x: Math.min(e.clientX, startX),
      y: Math.min(e.clientY, startY),
      w: Math.abs(e.clientX - startX),
      h: Math.abs(e.clientY - startY),
    };

    cleanup();

    if (rect.w < 10 || rect.h < 10) return;

    applyBlur(blurPx, detectors);
    await new Promise((r) => setTimeout(r, 200));

    const { dataUrl } = await chrome.runtime.sendMessage({ action: "capture" });

    removeBlur();

    const dpr = window.devicePixelRatio || 1;
    const img = new Image();
    img.src = dataUrl;
    await new Promise((r) => (img.onload = r));

    const canvas = document.createElement("canvas");
    canvas.width = rect.w * dpr;
    canvas.height = rect.h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      img,
      rect.x * dpr,
      rect.y * dpr,
      rect.w * dpr,
      rect.h * dpr,
      0,
      0,
      rect.w * dpr,
      rect.h * dpr
    );

    const croppedUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = croppedUrl;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  });
})();
