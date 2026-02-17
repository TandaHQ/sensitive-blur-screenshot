const captureBtn = document.getElementById("capture");
const statusEl = document.getElementById("status");
const blurRange = document.getElementById("blur-strength");
const blurValue = document.getElementById("blur-value");

blurRange.addEventListener("input", () => {
  blurValue.textContent = `${blurRange.value}px`;
});

captureBtn.addEventListener("click", async () => {
  captureBtn.disabled = true;
  statusEl.textContent = "Blurring sensitive fields...";

  const blurPx = parseInt(blurRange.value, 10);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: applyBlur,
      args: [blurPx],
    });

    await new Promise((r) => setTimeout(r, 150));

    statusEl.textContent = "Capturing screenshot...";

    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: removeBlur,
    });

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();

    statusEl.textContent = "Done! Screenshot saved.";
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    captureBtn.disabled = false;
  }
});

function applyBlur(blurPx) {
  const elements = document.querySelectorAll(".sensitive");
  elements.forEach((el) => {
    el.dataset.originalFilter = el.style.filter || "";
    el.style.filter = `blur(${blurPx}px)`;
  });
}

function removeBlur() {
  const elements = document.querySelectorAll(".sensitive");
  elements.forEach((el) => {
    el.style.filter = el.dataset.originalFilter || "";
    delete el.dataset.originalFilter;
  });
}
