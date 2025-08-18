class Day0QuizLog {
  constructor() {
    // Background
    this.bg = null;

    // Left box
    this.x1 = 135;
    this.y1 = 105;
    this.w1 = 345;
    this.h1 = 300;
    // Right box
    this.x2 = 546;
    this.y2 = 105;
    this.w2 = 345;
    this.h2 = 300;

    this.notebookContent = [
      "Day 0 - Question:",
      "I built a house, but the guests didn’t realize it was there and accidentally entered. Afterward, the guests, who were trapped in the house, became my dinner.",
      "Who am I?",
      "*********** QnA Log ***********",
    ];

    this.userFont = null;
    this.fontSize = 20;
    this.leading = 30;

    // Input panel
    this.panelX = 87;
    this.panelY = 420;
    this.panelW = 850;
    this.panelH = 120;
    this.promptY = 438;
    this.inputW = 720;
    this.inputH = 40;
    this.inputX = 0;
    this.inputY = 0;
    this.input = null;
    this.placeholder = "write whatever you want to ask....";

    this.questionCount = 0; // counter for Qn
  }

  preload() {
    this.userFont = loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf");
    this.bg = loadImage("assets/bg_quiz_day0_attic_bot.png");
  }

  setup() {
    // Position input
    this.inputX = this.panelX + (this.panelW - this.inputW) / 2 - 10;
    this.inputY = this.panelY + 50;

    this.input = createInput("");
    this.input.size(this.inputW, this.inputH);
    this.input.position(this.inputX, this.inputY);
    this.input.attribute("placeholder", this.placeholder);

    // Style
    this.input.style("font-family", "Bradley Hand, cursive");
    this.input.style("font-size", "18px");
    this.input.style("padding", "6px 10px");
    this.input.style("border", "2px solid #000");
    this.input.style("border-radius", "8px");
    this.input.style("outline", "none");
    this.input.style("background", "#ffffff");

    // Submit with Enter
    this.input.elt.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = this.input.value().trim();
        if (val.length > 0) {
          this.addLine(val);
          this.input.value("");
        }
      }
    });
  }

  addLine(text) {
    this.questionCount++;
    const label = `Q${this.questionCount}: ${text}`;
    this.notebookContent.push(label);
  }

  mousePressed() {
    // Focus when clicking the panel
    if (
      this._inRect(
        mouseX,
        mouseY,
        this.panelX,
        this.panelY,
        this.panelW,
        this.panelH
      )
    ) {
      this.input.elt.focus();
    }
  }

  update() {
    // Draw background first
    if (this.bg) {
      image(this.bg, 0, 0, width, height);
    } else {
      background(220);
    }

    // Styles each frame (so other code can’t mess it up)
    if (this.userFont) textFont(this.userFont);
    textSize(this.fontSize);
    textLeading(this.leading);
    fill(0);
    noStroke();

    // 1) Wrap content to lines for a given width (use left-box width)
    const wrappedLines = this._wrapParagraphs(this.notebookContent, this.w1);

    // 2) Split lines into columns by how many fit per box
    const maxLinesPerBox = Math.floor(this.h1 / this.leading);
    const col1 = wrappedLines.slice(0, maxLinesPerBox);
    const col2 = wrappedLines.slice(maxLinesPerBox, maxLinesPerBox * 2); // clip remainder

    // 3) Draw columns
    this._drawLines(col1, this.x1, this.y1, this.w1, this.h1);
    this._drawLines(col2, this.x2, this.y2, this.w2, this.h2);

    // 4) Draw input panel & prompt
    this._drawInputPanel();
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

  _drawInputPanel() {
    push();
    noStroke();
    fill(255, 255, 255, 230);
    rect(this.panelX, this.panelY, this.panelW, this.panelH, 12);

    stroke(0);
    strokeWeight(2);
    noFill();
    rect(this.panelX, this.panelY, this.panelW, this.panelH, 12);

    if (this.userFont) textFont(this.userFont);
    textSize(22);
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    const cx = this.panelX + this.panelW / 2;
    text("What should I ask....", cx, this.promptY);
    pop();

    this.input.position(this.inputX, this.inputY);
    this.input.size(this.inputW, this.inputH);
  }

  _inRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
}
