import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webDirectory = resolve(scriptDirectory, "..");
const source = resolve(webDirectory, "..", "app.py");
const destinationDirectory = resolve(webDirectory, "public", "core");
const destination = resolve(destinationDirectory, "app.py");

await mkdir(destinationDirectory, { recursive: true });
await copyFile(source, destination);
console.log(`Copied browser analysis core to ${destination}`);
