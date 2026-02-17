# Sensitive Blur Screenshot

Chrome extension that takes screenshots with sensitive information automatically blurred out.

<p align="center">
  <img width="340" height="272" alt="image" src="https://github.com/user-attachments/assets/4a82c24f-d65d-4bee-8bca-a6d5a749df1a" />
</p>

<img width="2147" height="1294" alt="screenshot-1771311836580" src="https://github.com/user-attachments/assets/7c620c1b-df1c-436b-8b4f-7452a5052b3e" />

## Install

1. Clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the cloned folder
5. Pin the extension to your toolbar for easy access

To update, `git pull` and click the refresh icon on the extension card in `chrome://extensions/`.

## Usage

Click the extension icon to open the popup:

- **Full Page** — captures the entire visible viewport
- **Select Area** — lets you drag a rectangle over the page, captures just that region

### Auto-detect toggles

Toggle which patterns are automatically detected and blurred:

| Detector | What it matches |
|---|---|
| $ Amounts | Dollar values like `$1,234.56` |
| Emails | Email addresses |
| Phones | Phone numbers (international formats) |
| TFN | Australian Tax File Numbers (9 digits) |
| IRD | NZ IRD numbers (8-9 digits) |
| Names (tables) | Table columns with headers like "Name", "Employee", etc. |

### Manual tagging

Add the CSS class `sensitive` to any HTML element to always blur it in screenshots, regardless of auto-detect settings.

```html
<td class="sensitive">Jane Smith</td>
```

### Blur strength

Use the slider to control how strong the blur effect is (2px to 20px).

## How it works

The extension **temporarily modifies the DOM** to blur sensitive content, takes a screenshot, then immediately restores the page to its original state. Nothing is permanently changed.

The sequence:

1. Walks the DOM looking for elements matching the active detectors (regex patterns on text nodes, table header inference for names, and any elements with the `.sensitive` class)
2. Applies a CSS `filter: blur()` to matched elements
3. Captures the visible tab using Chrome's `captureVisibleTab` API
4. Removes all blur filters, restoring original styles
5. Downloads the screenshot as a PNG (for area select, it crops using a canvas before downloading)

The page is only blurred for a fraction of a second. If you cancel (Esc during area select, or close the popup), no changes persist.

No data leaves your browser. The extension has no network permissions and doesn't communicate with any external services.
