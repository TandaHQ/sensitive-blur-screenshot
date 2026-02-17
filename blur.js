function applyBlur(blurPx, detectors) {
  const MARKER = "data-blur-applied";
  const BLUR_STYLE = `blur(${blurPx}px)`;

  function mark(el) {
    if (el.getAttribute(MARKER)) return;
    el.setAttribute(MARKER, "1");
    el.dataset.originalFilter = el.style.filter || "";
    el.style.filter = BLUR_STYLE;
  }

  document.querySelectorAll(".sensitive").forEach(mark);

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
      const cell = el.closest("td, th, li, dd");
      mark(cell || el);
    });
  }

  if (detectors.includes("tableNames")) {
    const nameKeywords =
      /^(name|full\s?name|employee|first\s?name|last\s?name|staff|worker|member)$/i;

    document.querySelectorAll("table").forEach((table) => {
      const headers = table.querySelectorAll(
        "thead th, thead td, tr:first-child th"
      );
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
