// public/sketch.js
let audioMgr;
let quiz, logView, dialog;

// Track notebook/log overlay activation like before
let _prevNotebookReady = false;
let _prevNotebookImage = null;

function preload() {
  // --- audio manager (new) ---
  audioMgr = new AudioManager({ masterVolume: 1 });

  // (optional) warm up frequently used SFX/BGM so first play is snappy
  // audioMgr.load("assets/audio/bg_ara.mp3", { loop: true, volume: 1.0 });
  // audioMgr.load("assets/audio/dia_step.mp3");

  // --- core scenes ---
  quiz = new Day0Quiz({ nbInDur: 700, nbOutDur: 450 });
  logView = new Day0QuizLog();

  // Dialog uses the audio manager
  dialog = new Dialog({
    audio: audioMgr,
    x: 137,
    y: 396,
    w: 750,
    h: 141,
    boxImage: "assets/ui_diaBox.png",
    // timing knobs (use your tuned defaults)
    fadeInMs: 250,
    fadeOutMs: 200,
    cgFadeMs: 250,
    bgFadeMs: 300,
    // hold the last VN background briefly to avoid any flashing
    holdBgAfterFinishMs: 150, // can tweak up/down
  });

  // preload assets for each class
  quiz.preload();
  logView.preload();
  dialog.preload();
}

function setup() {
  createCanvas(1024, 576);

  // normal setup
  quiz.setup();
  logView.setup();

  // start with the quiz "not shown" — we'll reveal after VN
  // (we will also simply not render the quiz while VN is active)
  quiz.setQuizState(false);

  // load the VN script from your dialog.js (ensure it’s included before this)
  // e.g., <script src="dialog.js"></script> defines global vnScript
  if (typeof vnScript === "undefined") {
    console.warn("vnScript is not defined. Did you include dialog.js?");
  } else {
    dialog.setScript(vnScript);
  }

  // when VN finishes, slide the quiz notebook into view
  dialog.onFinish = () => {
    // reveal quiz
    quiz.setQuizState(true);
  };

  // start VN
  dialog.start();

  _prevNotebookReady = quiz.isNotebookShown();
  _prevNotebookImage = quiz.currentNotebook;
}

function draw() {
  // --- VN layer (updates and renders even if it’s in its end hold-BG window) ---
  dialog.update();
  dialog.render();

  // --- QUIZ LAYER ---
  // Hide the quiz entirely while VN is actively running or fading its UI,
  // but once VN has finished (even if it’s still holding the last BG),
  // go ahead and render quiz. This prevents a hard cut and avoids a flash.
  if (!dialog.isActive()) {
    quiz.update();

    // notebook/log overlay logic (unchanged)
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

  // If VN still active, we do NOT call quiz.update() at all,
  // which keeps the attic background hidden under the VN.
}

function mousePressed() {
  // While VN is running, clicks advance the dialog only
  if (dialog.isActive()) {
    dialog.mousePressed();
    return;
  }

  // VN is done → normal quiz inputs
  quiz.mousePressed();
  logView.mousePressed();
}

function keyPressed() {
  // While VN is running, keys advance the dialog only
  if (dialog.isActive()) {
    dialog.keyPressed(key);
    return;
  }

  // normal quiz hotkeys
  quiz.keyPressed();
}
