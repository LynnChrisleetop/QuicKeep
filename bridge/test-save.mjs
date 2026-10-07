import path from "node:path";
import { fileURLToPath } from "node:url";
import { saveCapture } from "./lib.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const testDirectory = process.env.QUICKEEP_TEST_DIR
  ? path.resolve(process.env.QUICKEEP_TEST_DIR)
  : path.join(projectRoot, "tests");

const result = await saveCapture({
  imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  url: "https://example.com/quickeep-test",
  title: "QuicKeep bridge fixture",
  mdPath: path.join(testDirectory, "quicKeep-test.md"),
  imageDir: path.join(testDirectory, "quicKeep-images"),
  now: new Date()
});

console.log(JSON.stringify(result, null, 2));