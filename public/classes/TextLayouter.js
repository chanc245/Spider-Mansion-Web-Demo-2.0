class TextLayouter {
  constructor({ font = null, fontSize = 20, leading = 30 } = {}) {
    this.font = font;
    this.fontSize = fontSize;
    this.leading = leading;
  }
  wrap(paragraphs, maxWidth) {
    if (this.font) textFont(this.font);
    textSize(this.fontSize);
    const out = [];
    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (textWidth(test) <= maxWidth) line = test;
        else {
          if (line) out.push(line);
          if (textWidth(w) > maxWidth) {
            for (const chunk of this.hardBreak(w, maxWidth)) out.push(chunk);
            line = out.pop();
          } else line = w;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }
  hardBreak(word, maxWidth) {
    const parts = [];
    let chunk = "";
    for (const ch of Array.from(word)) {
      const test = chunk + ch;
      if (textWidth(test) <= maxWidth) chunk = test;
      else {
        if (chunk) parts.push(chunk);
        chunk = ch;
      }
    }
    if (chunk) parts.push(chunk);
    return parts;
  }
}
window.TextLayouter = TextLayouter;
