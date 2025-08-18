let quiz;

function preload() {
  quiz = new Day0Quiz();
  quiz.preload();
}

function setup() {
  createCanvas(1024, 576);
  quiz.setup();
}

function draw() {
  quiz.update();
}

function keyPressed() {
  quiz.keyPressed();
}

function mousePressed() {
  quiz.mousePressed();
}
