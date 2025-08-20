let quiz, logView;

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
}

function draw() {
  quiz.update();

  // Show the log only when the notebook is fully shown & we're on the Log page
  const notebookReady =
    quiz.isNotebookShown() && quiz.currentNotebook === quiz.notebookLog;
  logView.setActive(notebookReady);

  // Always render so it can fade in/out smoothly
  logView.render(quiz.notebookX, quiz.notebookY);
}

function mousePressed() {
  quiz.mousePressed();
  logView.mousePressed();
}

function keyPressed() {
  quiz.keyPressed();
}
