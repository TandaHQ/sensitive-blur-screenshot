const captureBtn = document.getElementById("capture");
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

captureBtn.addEventListener("click", async () => {
  captureBtn.disabled = true;
  statusEl.textContent = "Detecting & blurring...";

  const blurPx = parseInt(blurRange.value, 10);
  const detectors = getActiveDetectors();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: applyBlur,
      args: [blurPx, detectors],
    });

    await new Promise((r) => setTimeout(r, 200));

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

function applyBlur(blurPx, detectors) {
  const MARKER = "data-blur-applied";
  const BLUR_STYLE = `blur(${blurPx}px)`;

  function mark(el) {
    if (el.getAttribute(MARKER)) return;
    el.setAttribute(MARKER, "1");
    el.dataset.originalFilter = el.style.filter || "";
    el.style.filter = BLUR_STYLE;
  }

  // 1. Always blur .sensitive elements
  document.querySelectorAll(".sensitive").forEach(mark);

  // 2. Auto-detect patterns in leaf elements
  const patterns = {
    dollars: /\$[\d,]+\.\d{2}/,
    emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    phones: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/,
    tfn: /\b\d{3}\s?\d{3}\s?\d{3}\b/,
    ird: /\b\d{2,3}[-\s]?\d{3}[-\s]?\d{3}\b/,
  };

  const activePatterns = detectors
    .filter((d) => patterns[d])
    .map((d) => patterns[d]);

  if (activePatterns.length > 0) {
    const combined = new RegExp(
      activePatterns.map((p) => `(${p.source})`).join("|")
    );

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    const matched = new Set();
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent;
      if (combined.test(text)) {
        const el = walker.currentNode.parentElement;
        if (el && !el.closest("script, style, noscript")) {
          matched.add(el);
        }
      }
    }

    matched.forEach((el) => {
      // Walk up to the nearest table cell or block element for cleaner blurring
      const cell = el.closest("td, th, li, dd");
      mark(cell || el);
    });
  }

  // 3. Table header inference for names
  if (detectors.includes("tableNames")) {
    const nameKeywords =
      /^(name|full\s?name|employee|first\s?name|last\s?name|staff|worker|member)$/i;

    document.querySelectorAll("table").forEach((table) => {
      const headers = table.querySelectorAll("thead th, thead td, tr:first-child th");
      const nameColumns = [];

      headers.forEach((th, index) => {
        const text = th.textContent.trim();
        if (nameKeywords.test(text)) {
          nameColumns.push(index);
        }
      });

      if (nameColumns.length === 0) return;

      table.querySelectorAll("tbody tr").forEach((row) => {
        const cells = row.querySelectorAll("td");
        nameColumns.forEach((colIdx) => {
          if (cells[colIdx]) mark(cells[colIdx]);
        });
      });
    });
  }
}

function removeBlur() {
  document.querySelectorAll("[data-blur-applied]").forEach((el) => {
    el.style.filter = el.dataset.originalFilter || "";
    delete el.dataset.originalFilter;
    el.removeAttribute("data-blur-applied");
  });
}
