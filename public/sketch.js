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
  background(220);
  logView.update();
}

function mousePressed() {
  logView.mousePressed();
}
