import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import fs from "fs";

const prod = (process.argv[2] === "production");

const context = await esbuild.context({
  banner: {
    js: '/* eslint-disable */',
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (prod) {
  await context.rebuild();
  
  // Patch main.js to remove script tags created by JSZip setImmediate polyfill
  let mainJs = fs.readFileSync("main.js", "utf8");
  mainJs = mainJs.replace(/createElement\(['"]script['"]\)/gi, 'createElement("div")');
  fs.writeFileSync("main.js", mainJs);

  process.exit(0);
} else {
  await context.watch();
}
