// public/sketch.js
let quiz, logView;

let _prevNotebookReady = false;
let _prevNotebookImage = null;

function preload() {
  quiz = new Day0Quiz();
  logView = new Day0QuizLog();
  quiz.preload();
  logView.preload();
}

function setup() {
  createCanvas(1024, 576);

  quiz.setup();
  logView.setup();

  _prevNotebookReady = quiz.isNotebookShown();
  _prevNotebookImage = quiz.currentNotebook;
}

function draw() {
  quiz.update();

  const notebookReady = quiz.isNotebookShown();
  const onLogPage = quiz.currentNotebook === quiz.notebookLog;
  const shouldBeActive = notebookReady && onLogPage;

  let profile = null;

  if (notebookReady !== _prevNotebookReady) {
    profile = "move";
  } else if (notebookReady && quiz.currentNotebook !== _prevNotebookImage) {
    profile = "page";
  }
  if (profile) {
    logView.setActive(shouldBeActive, profile);
  } else {
    if (shouldBeActive !== logView.active) {
      logView.setActive(shouldBeActive, "page");
    }
  }
  logView.render(quiz.notebookX, quiz.notebookY);

  _prevNotebookReady = notebookReady;
  _prevNotebookImage = quiz.currentNotebook;
}

function mousePressed() {
  quiz.mousePressed();
  logView.mousePressed();
}

function keyPressed() {
  quiz.keyPressed();
}
