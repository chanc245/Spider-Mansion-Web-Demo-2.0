// public/classes/Day0Eva.js
class Day0Eva {
  constructor(setup, solution, opts = {}) {
    this.setup = setup;
    this.solution = solution;
    this.history = [];
    this.prefix = opts.prefix ?? "Eva";
    this.icon = opts.icon ?? "🕷️"; // e.g., "🕷️ "
    this.tone = opts.tone ?? "calm, thoughtful yet mysterious";
  }

  setPuzzle(setup, solution) {
    this.setup = setup;
    this.solution = solution;
    this.history = [];
  }

  _prompt(userInput) {
    const h = this.history.length ? this.history.join(", ") : "(none yet)";
    return `
You are an AI called ${this.prefix} assisting in a puzzle game.
You speak in a ${this.tone} manner.

The current puzzle for the player to guess is: ${this.setup}
The answer is: ${this.solution}

The player's previous guesses so far are:
${h}

You should respond to the player’s guesses with only "yes", "no", or "doesn't relate".
If the player asks something unrelated to the puzzle say "doesn't relate".
If the player answers correctly say: That's Correct!

After responding with "yes," "no," or "doesn't relate," add a very short, gentle nudge that guides them closer to the answer without revealing it.

Allow misspellings.
Be an easy judge on the player's answer.

The player's current guess is: ${userInput}
`.trim();
  }

  async ask(userInput) {
    this.history.push(userInput);
    const res = await fetch("/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: this._prompt(userInput) }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Submit failed: ${res.status} ${txt}`);
    }
    const json = await res.json();
    return (json.ai ?? "(no ai field)").toString();
  }
}
window.Day0Eva = Day0Eva;
