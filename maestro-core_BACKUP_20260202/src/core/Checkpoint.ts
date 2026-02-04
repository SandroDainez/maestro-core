import readline from "readline";

export class Checkpoint {
  static async confirm(message: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer: string = await new Promise((resolve) => {
      rl.question(`${message} (s/n): `, resolve);
    });

    rl.close();

    const a = answer.trim().toLowerCase();
    return a === "s" || a === "sim" || a === "y" || a === "yes";
  }
}

