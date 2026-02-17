const fullBtn = document.getElementById("capture-full");
const areaBtn = document.getElementById("capture-area");
const statusEl = document.getElementById("status");
const blurRange = document.getElementById("blur-strength");
const blurValue = document.getElementById("blur-value");

blurRange.addEventListener("input", () => {
  blurValue.textContent = `${blurRange.value}px`;
});

document.querySelectorAll(".detector").forEach((btn) => {
  btn.addEventListener("click", () => btn.classList.toggle("active"));
});

function getActiveDetectors() {
  return Array.from(document.querySelectorAll(".detector.active")).map(
    (btn) => btn.dataset.detector
  );
}

function getBlurPx() {
  return parseInt(blurRange.value, 10);
}

// Full page capture — runs entirely from the popup
fullBtn.addEventListener("click", async () => {
  fullBtn.disabled = true;
  areaBtn.disabled = true;
  statusEl.textContent = "Detecting & blurring...";

  const blurPx = getBlurPx();
  const detectors = getActiveDetectors();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["blur.js"],
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (px, det) => applyBlur(px, det),
      args: [blurPx, detectors],
    });

    await new Promise((r) => setTimeout(r, 200));
    statusEl.textContent = "Capturing...";

    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => removeBlur(),
    });

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();

    statusEl.textContent = "Done!";
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    fullBtn.disabled = false;
    areaBtn.disabled = false;
  }
});

// Area select — stores config, injects scripts, then popup closes naturally
areaBtn.addEventListener("click", async () => {
  const blurPx = getBlurPx();
  const detectors = getActiveDetectors();

  await chrome.storage.local.set({ blurPx, detectors });

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["blur.js"],
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["selector.js"],
  });

  window.close();
});
