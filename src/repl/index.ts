import repl from "repl";

for (const items of []) {
  Object.entries(items).map(([key, value]) => {
    // @ts-ignore
    globalThis[key] = value;
  });
}

const replServer = repl.start();
