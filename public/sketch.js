// public/sketch.js
let audioMgr;
let quiz, logView, dialog;

let showQuizAfterDialog = true;
const QUIZ_AUTO_RETURN_DELAY_MS = 3000;

// Track notebook/log overlay activation like before
let _prevNotebookReady = false;
let _prevNotebookImage = null;

function preload() {
  // --- audio manager (new) ---
  audioMgr = new AudioManager({ masterVolume: 1 });

  // (optional) warm up frequently used SFX/BGM so first play is snappy
  audioMgr.load("assets/audio/bg_ara.mp3", { loop: true, volume: 1.0 });
  audioMgr.load("assets/audio/dia_step.mp3");

  audioMgr.load("assets/audio/ui_clickDia.mp3", { volume: 1.0 });

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
    fadeInMs: 250,
    fadeOutMs: 200,
    cgFadeMs: 250,
    bgFadeMs: 300,
    holdBgAfterFinishMs: 150,

    // pass the SFX path (optional tuning)
    clickSfxPath: "assets/audio/ui_clickDia.mp3",
    clickSfxVolume: 0.5,
  });

  // preload assets for each class
  quiz.preload();
  logView.preload();
  dialog.preload();
}

function setup() {
  createCanvas(1024, 576);

  quiz.setup();
  logView.setup();

  quiz.setQuizState(false);

  if (typeof vnScript === "undefined") {
    console.warn("vnScript is not defined. Did you include dialog.js?");
  } else {
    dialog.setScript(vnScript);
  }

  dialog.onFinish = () => {
    // After intro VN, reveal quiz
    if (showQuizAfterDialog) {
      quiz.setQuizState(true);
    }
  };

  // GOOD path
  logView.onSolved = () => {
    setTimeout(() => {
      showQuizAfterDialog = false;

      // Hide the log overlay immediately (optional)
      logView.setActive(false, "page");

      // Start scroll-up animation; when it finishes, start the post-quiz VN
      const startGoodVN = () => {
        // clear handler so it doesn't fire again later
        quiz.onScrollEnd = null;
        dialog.setScript(vnScript_postQuiz_Good);
        dialog.start();
      };

      // Set a one-shot listener that waits until the scroll completes at the top
      quiz.onScrollEnd = (state /* false */, yOffset /* ~0 */, visible) => {
        // We only care about the transition to top (quizState=false)
        if (state === false) startGoodVN();
      };

      // Trigger the scroll (true -> false)
      quiz.setQuizState(false);
    }, QUIZ_AUTO_RETURN_DELAY_MS);
  };

  // BAD path
  logView.onExhausted = () => {
    setTimeout(() => {
      showQuizAfterDialog = false;
      logView.setActive(false, "page");

      const startBadVN = () => {
        quiz.onScrollEnd = null;
        dialog.setScript(vnScript_postQuiz_Bad);
        dialog.start();
      };

      quiz.onScrollEnd = (state, yOffset, visible) => {
        if (state === false) startBadVN();
      };

      quiz.setQuizState(false);
    }, QUIZ_AUTO_RETURN_DELAY_MS);
  };

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
