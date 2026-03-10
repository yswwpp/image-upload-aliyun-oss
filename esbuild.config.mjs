import { build } from "esbuild";

const isDev = process.argv.includes("--dev");

async function main() {
  const config = {
    entryPoints: ["src/main.ts"],
    bundle: true,
    format: "cjs",
    target: "node16",
    platform: "node",
    sourcemap: isDev ? "inline" : false,
    outfile: "main.js",
    external: [
      "obsidian",
      "electron"
    ],
    plugins: [],
    define: {
      "process.env.NODE_ENV": '"production"'
    }
  };

  if (process.argv.includes("--production")) {
    config.minify = true;
  }

  if (isDev) {
    config.watch = {
      onRebuild(error) {
        if (error) {
          console.error("Watch build failed:", error);
        } else {
          console.log("Watch build succeeded");
        }
      }
    };
  }

  await build(config);
  
  if (!isDev) {
    console.log("Build succeeded");
  }
}

main();
