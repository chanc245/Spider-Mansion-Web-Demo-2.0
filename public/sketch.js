// public/sketch.js
let audioMgr;
let quiz, logView, dialog;

let showQuizAfterDialog = true;
const QUIZ_AUTO_RETURN_DELAY_MS = 3000;

let tutorial; // NEW
let tutorialHasRun = false; // ensure it only runs once

// --- Title/End screens ---
let imgTitle, imgEnd;
let appState = "TITLE"; // "TITLE" | "VN" | "QUIZ" | "END"

// Track notebook/log overlay activation
let _prevNotebookReady = false;
let _prevNotebookImage = null;

function preload() {
  // --- tutorial images ---
  tutorial = new TutorialOverlay({
    imagePaths: [
      "assets/tutorial/tut_1.png",
      "assets/tutorial/tut_2.png",
      "assets/tutorial/tut_3.png",
      "assets/tutorial/tut_4.png",
      "assets/tutorial/tut_5.png",
      "assets/tutorial/tut_6.png",
      "assets/tutorial/tut_7.png",
      "assets/tutorial/tut_8.png",
    ],
    fadeOutMs: 450,
  });
  tutorial.preload();

  // --- title/end images ---
  imgTitle = loadImage("assets/cg_titlePage.png");
  imgEnd = loadImage("assets/cg_endPage.png");

  // --- audio manager ---
  audioMgr = new AudioManager({ masterVolume: 1 });

  // (optional) warm up frequently used SFX/BGM so first play is snappy
  audioMgr.load("assets/audio/bg_ara.mp3", { loop: true, volume: 0.3 });
  audioMgr.load("assets/audio/dia_step.mp3");
  audioMgr.load("assets/audio/ui_clickDia.mp3", { volume: 0.5 });

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
    boxImageNormal: "assets/ui/ui_diaBox_nor.png",
    boxImageChar: "assets/ui/ui_diaBox_char.png",
    fadeInMs: 400,
    fadeOutMs: 200,
    cgFadeMs: 250,
    bgFadeMs: 300,
    holdBgAfterFinishMs: 150,
    clickSfxPath: "assets/audio/ui_clickDia.mp3",
    clickSfxVolume: 0.3,
  });

  // preload assets for each class
  quiz.preload();
  logView.preload();
  dialog.preload();
}

function setup() {
  const cnv = createCanvas(1024, 576);
  cnv.parent("canvas-container");

  quiz.setup();
  logView.setup();

  // Start with quiz hidden (we begin on Title, then VN)
  quiz.setQuizState(false);

  if (typeof vnScript === "undefined") {
    console.warn("vnScript is not defined. Did you include dialog.js?");
  } else {
    dialog.setScript(vnScript);
  }

  // When the INTRO VN finishes, reveal the quiz and enter QUIZ state
  dialog.onFinish = () => {
    if (showQuizAfterDialog) {
      quiz.setQuizState(true);
      appState = "QUIZ";
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

        // For post-quiz good path, end on END screen
        dialog.onFinish = () => {
          appState = "END";
        };

        appState = "VN";
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

        // For post-quiz bad path, end on END screen
        dialog.onFinish = () => {
          appState = "END";
        };

        appState = "VN";
        dialog.start();
      };

      quiz.onScrollEnd = (state, yOffset, visible) => {
        if (state === false) startBadVN();
      };

      quiz.setQuizState(false);
    }, QUIZ_AUTO_RETURN_DELAY_MS);
  };

  // NOTE: We do NOT auto-start the VN here.
  // We begin on the TITLE screen. Click → start VN in mousePressed().

  _prevNotebookReady = quiz.isNotebookShown();
  _prevNotebookImage = quiz.currentNotebook;
}

function draw() {
  // --- High-level state screens first ---
  if (appState === "TITLE") {
    background(0);
    if (imgTitle) image(imgTitle, 0, 0, 1024, 576);
    return;
  }

  if (appState === "END") {
    background(0);
    if (imgEnd) image(imgEnd, 0, 0, 1024, 576);
    return;
  }

  // --- VN layer (updates and renders even if it’s in its end hold-BG window) ---
  dialog.update();
  dialog.render();

  // --- QUIZ LAYER ---
  // Hide the quiz entirely while VN is actively running or fading its UI,
  // but once VN has finished (even if it’s still holding the last BG),
  // go ahead and render quiz. This prevents a hard cut and avoids a flash.
  if (appState === "QUIZ" && !dialog.isActive()) {
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

    // --- Tutorial overlay: start once when notebook is visible at bottom ---
    if (notebookReady && !tutorialHasRun && !tutorial.active) {
      tutorial.start();
    }
    tutorial.update();
    tutorial.render();
    if (tutorial.done && !tutorialHasRun) {
      tutorialHasRun = true;
    }

    if (tutorial && tutorial.active) {
      logView.input.hide();
    } else if (
      logView.alpha > 200 && // log view is visible
      logView._canShowInputThisPage()
    ) {
      logView.input.show();
    }

    _prevNotebookReady = notebookReady;
    _prevNotebookImage = quiz.currentNotebook;
  }

  // If VN still active, we do NOT call quiz.update() at all,
  // which keeps the attic background hidden under the VN.
}

function mousePressed() {
  // Title → start INTRO VN
  if (appState === "TITLE") {
    appState = "VN";
    dialog.start();
    return;
  }

  // End screen → (no-op). If you want restart behavior, add it here.
  if (appState === "END") {
    return;
  }

  // If tutorial is active, it captures the click
  if (appState === "QUIZ" && tutorial && tutorial.active) {
    tutorial.mousePressed();
    return;
  }

  // While VN is running, clicks advance the dialog only
  if (dialog.isActive()) {
    dialog.mousePressed();
    return;
  }

  // VN is done → normal quiz inputs
  if (appState === "QUIZ") {
    quiz.mousePressed();
    logView.mousePressed();
  }
}

function keyPressed() {
  // While VN is running, keys advance the dialog only
  if (dialog.isActive()) {
    dialog.keyPressed(key);
    return;
  }

  // normal quiz hotkeys (optional)
  if (appState === "QUIZ") {
    quiz.keyPressed();
  }
}
