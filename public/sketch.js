let logView;

function preload() {
  logView = new Day0QuizLog();
  logView.preload();
}

function setup() {
  createCanvas(1024, 576);
  logView.setup();
}

function draw() {
  logView.update();
}

function mousePressed() {
  if (logView && logView.mousePressed) logView.mousePressed();
}
