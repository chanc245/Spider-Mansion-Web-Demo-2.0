class Day0QuizLog {
  constructor() {
    // Background
    this.bg = null;

    // Left box
    this.x1 = 135;
    this.y1 = 110;
    this.w1 = 345;
    this.h1 = 450;
    // Right box
    this.x2 = 546;
    this.y2 = 110;
    this.w2 = 345;
    this.h2 = 450;

    this.notebookContent = [
      "Day 0 - Question:",
      "I built a house, but the guests didn’t realize it was there and accidentally entered. Afterward, the guests, who were trapped in the house, became my dinner.",
      "Who am I?",
      "*********** QnA Log ***********",
    ];

    this.userFont = null;
    this.fontSize = 20;
    this.leading = 30;

    // Input element (will be positioned on the next available line)
    this.input = null;
    this.inputPaddingX = 5; // left/right padding inside column
    this.inputH = 26; // height of DOM input (fits a line)
    this.placeholderBase = "write whatever you want to ask....";

    this.questionCount = 0; // counter for Qn
    this._justSubmitted = false; // tiny flag to hide input right after submit
  }

  preload() {
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
    this.bg = loadImage("assets/bg_quiz_day0_attic_bot.png");
  }

  setup() {
    // Create input once; we’ll position/resize every frame
    this.input = createInput("");
    this.input.attribute("placeholder", this._placeholderText());
    this.input.class("notebook-input"); // <-- attach CSS class

    // Submit with Enter
    this.input.elt.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = this.input.value().trim();
        if (val.length > 0) {
          this.addLine(val);
          this.input.value("");
          // Briefly hide so it looks like it disappears then reappears on the new line
          this._justSubmitted = true;
          this.input.hide();
          setTimeout(() => {
            this._justSubmitted = false;
            this.input.show();
          }, 30); // one frame-ish
        }
      }
    });
  }

  addLine(text) {
    this.questionCount++;
    const label = `Q${this.questionCount}: ${text}`;
    this.notebookContent.push(label);
    this.input.attribute("placeholder", this._placeholderText());
  }

  update() {
    // Background
    if (this.bg) image(this.bg, 0, 0, width, height);
    else background(220);

    // Styles each frame for drawing
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);
    textLeading(this.leading);
    fill(0);
    noStroke();

    // 1) Wrap content to lines for a given width (use left-box width)
    const wrappedLines = this._wrapParagraphs(this.notebookContent, this.w1);

    // 2) Split into two columns by how many fit per box
    const maxLinesPerBox = Math.floor(this.h1 / this.leading);
    const col1 = wrappedLines.slice(0, maxLinesPerBox);
    const col2 = wrappedLines.slice(maxLinesPerBox, maxLinesPerBox * 2);

    // 3) Draw the columns
    this._drawLines(col1, this.x1, this.y1, this.w1, this.h1);
    this._drawLines(col2, this.x2, this.y2, this.w2, this.h2);

    // 4) Position the input at the next available line
    this._positionInputAtNextLine(wrappedLines.length, maxLinesPerBox);
  }

  // ---- Compute where the input should go (Qn position) ----
  _positionInputAtNextLine(totalLines, maxLinesPerBox) {
    // If the last submission just happened, keep it hidden for a frame
    if (this._justSubmitted) return;

    const colWidth = this.w1;
    const colPad = this.inputPaddingX;
    const nextIndex = totalLines; // next line index in the flow
    const maxLinesAll = maxLinesPerBox * 2;

    if (nextIndex >= maxLinesAll) {
      // No space left in both boxes—hide input
      this.input.hide();
      return;
    }

    // Determine column and row within that column
    let x, y, w;
    if (nextIndex < maxLinesPerBox) {
      // Left column
      x = this.x1 + colPad;
      y = this.y1 + nextIndex * this.leading + (this.leading - this.inputH) / 2;
      w = colWidth - 2 * colPad;
    } else {
      // Right column
      const row = nextIndex - maxLinesPerBox;
      x = this.x2 + colPad;
      y = this.y2 + row * this.leading + (this.leading - this.inputH) / 2;
      w = this.w2 - 2 * colPad;
    }

    // Show and place input
    this.input.show();
    this.input.position(x - 15, y - 20);
    this.input.size(w, this.inputH);
  }

  // ---- Text layout helpers ----
  _wrapParagraphs(paragraphs, maxWidth) {
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);

    const lines = [];
    paragraphs.forEach((para) => {
      const words = para.split(/\s+/);
      let line = "";

      words.forEach((word) => {
        const test = line.length ? line + " " + word : word;
        if (textWidth(test) <= maxWidth) {
          line = test;
        } else {
          if (line.length) lines.push(line);
          if (textWidth(word) > maxWidth) {
            const pieces = this._hardBreakWord(word, maxWidth);
            pieces.forEach((p, i) => {
              if (i < pieces.length - 1) lines.push(p);
              else line = p;
            });
          } else {
            line = word;
          }
        }
      });

      if (line.length) lines.push(line);
    });

    return lines;
  }

  _hardBreakWord(word, maxWidth) {
    const chars = Array.from(word);
    let chunk = "";
    const out = [];
    chars.forEach((ch) => {
      const test = chunk + ch;
      if (textWidth(test) <= maxWidth) {
        chunk = test;
      } else {
        if (chunk.length) out.push(chunk);
        chunk = ch;
      }
    });
    if (chunk.length) out.push(chunk);
    return out;
  }

  _drawLines(lines, x, y, w, h) {
    const maxLines = Math.floor(h / this.leading);
    const drawCount = Math.min(maxLines, lines.length);
    for (let i = 0; i < drawCount; i++) {
      const ly = y + i * this.leading;
      text(lines[i], x, ly, w, this.leading);
    }
  }

  _placeholderText() {
    const next = this.questionCount + 1;
    return `Q${next}: ${this.placeholderBase}`;
  }
}
