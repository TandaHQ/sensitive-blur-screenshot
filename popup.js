const fullBtn = document.getElementById("capture-full");
const areaBtn = document.getElementById("capture-area");
const statusEl = document.getElementById("status");
const blurRange = document.getElementById("blur-strength");
const blurValue = document.getElementById("blur-value");

blurRange.addEventListener("input", () => {
  blurValue.textContent = `${blurRange.value}px`;
});

const outputButtons = document.querySelectorAll(".output-toggle button");
outputButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    outputButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

function getOutputMode() {
  return document.querySelector(".output-toggle button.active").dataset.mode;
}

async function outputScreenshot(dataUrl, mode) {
  if (mode === "clipboard") {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
  } else {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  }
}

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
  const outputMode = getOutputMode();

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

    await outputScreenshot(dataUrl, outputMode);

    statusEl.textContent =
      outputMode === "clipboard" ? "Copied to clipboard!" : "Downloaded!";
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

  const outputMode = getOutputMode();
  await chrome.storage.local.set({ blurPx, detectors, outputMode });

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
