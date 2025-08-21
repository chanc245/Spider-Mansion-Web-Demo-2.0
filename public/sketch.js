// Global scene objects
let quiz, logView, dialog;

// Track notebook state for smooth log overlay behavior
let _prevNotebookReady = false;
let _prevNotebookImage = null;

function preload() {
  // Instantiate classes
  quiz = new Day0Quiz({ nbInDur: 700, nbOutDur: 450 });
  logView = new Day0QuizLog();
  dialog = new Dialog({
    x: 137,
    y: 396,
    w: 750,
    h: 141,
    boxImage: "assets/ui_diaBox.png",
    fadeInMs: 250,
    fadeOutMs: 200,
    // font: loadFont("assets/fonts/BradleyHandITCTT-Bold.ttf"), // optional
  });

  // Preload assets
  quiz.preload();
  logView.preload();
  dialog.preload();
}

function setup() {
  createCanvas(1024, 576);

  // Set up quiz & log
  quiz.setup();
  logView.setup();

  // Force quiz hidden until dialog is done
  quiz.setQuizState(false);

  // Provide the VN script and start dialog
  dialog.setScript(vnScript);
  dialog.onFinish = () => {
    // Once dialog finishes, enable quiz
    quiz.setQuizState(true);
  };
  dialog.start();

  _prevNotebookReady = quiz.isNotebookShown();
  _prevNotebookImage = quiz.currentNotebook;
}

function draw() {
  background(0);

  // ------------------
  // DIALOG PHASE
  // ------------------
  if (dialog.isActive() || !dialog.isFinished()) {
    // Update and render dialog only
    dialog.update();
    dialog.render();
    return; // 🚨 STOP DRAWING QUIZ UNTIL VN IS DONE
  }

  // ------------------
  // QUIZ PHASE
  // ------------------
  quiz.update();

  // Log overlay visibility
  const notebookReady = quiz.isNotebookShown();
  const onLogPage = quiz.currentNotebook === quiz.notebookLog;
  const shouldBeActive = notebookReady && onLogPage;

  let profile = null;
  if (notebookReady !== _prevNotebookReady) profile = "move";
  else if (notebookReady && quiz.currentNotebook !== _prevNotebookImage)
    profile = "page";

  if (profile) logView.setActive(shouldBeActive, profile);
  else if (shouldBeActive !== logView.active)
    logView.setActive(shouldBeActive, "page");

  logView.render(quiz.notebookX, quiz.notebookY);

  _prevNotebookReady = notebookReady;
  _prevNotebookImage = quiz.currentNotebook;
}

function mousePressed() {
  // While dialog is active, clicks advance it.
  if (dialog.isActive()) {
    dialog.mousePressed();
    return;
  }
  quiz.mousePressed();
  logView.mousePressed();
}

function keyPressed() {
  if (dialog.isActive()) {
    dialog.keyPressed(key);
    return;
  }
  quiz.keyPressed();
}
