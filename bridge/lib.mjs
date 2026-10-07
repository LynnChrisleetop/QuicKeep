import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_DATA_PATTERN = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+\/=\r\n]+)$/s;

function requireAbsolutePath(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(name + " 不能为空。");
  }

  if (value.includes("\0") || !path.isAbsolute(value)) {
    throw new Error(name + " 必须是绝对路径。");
  }

  return path.normalize(value);
}

function parseImageData(imageData) {
  if (typeof imageData !== "string") {
    throw new Error("imageData 必须是图片 Data URL。");
  }

  const match = imageData.match(IMAGE_DATA_PATTERN);
  if (!match) {
    throw new Error("只支持 PNG 或 JPEG 图片 Data URL。");
  }

  return {
    extension: match[1].toLowerCase() === "jpg" ? "jpg" : match[1].toLowerCase(),
    buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64")
  };
}

function safeFilePart(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "page";
}

function escapeAlt(value) {
  return String(value || "QuicKeep capture")
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function formatTimestamp(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("") + "-" + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function formatMarkdownPath(relativePath) {
  const slashPath = relativePath.split(path.sep).join("/");
  return /[\s()]/.test(slashPath) ? "<" + slashPath + ">" : slashPath;
}

export async function saveCapture({
  imageData,
  url,
  title,
  mdPath,
  imageDir,
  now = new Date()
}) {
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("当前网址不能为空。");
  }

  const markdownPath = requireAbsolutePath(mdPath, "Markdown 文件路径");
  const defaultImageDirectory = path.join(path.dirname(markdownPath), "assets");
  const requestedImageDirectory = typeof imageDir === "string" && imageDir.trim()
    ? imageDir
    : defaultImageDirectory;
  const imageDirectory = requireAbsolutePath(requestedImageDirectory, "图片保存目录");
  const parsed = parseImageData(imageData);

  if (parsed.buffer.length === 0) {
    throw new Error("图片内容为空。");
  }

  await fs.mkdir(imageDirectory, { recursive: true });
  await fs.mkdir(path.dirname(markdownPath), { recursive: true });

  const baseName = formatTimestamp(now) + "-" + safeFilePart(title);
  let imagePath = path.join(imageDirectory, baseName + "." + parsed.extension);
  let suffix = 2;

  while (true) {
    try {
      await fs.access(imagePath);
      imagePath = path.join(
        imageDirectory,
        baseName + "-" + suffix + "." + parsed.extension
      );
      suffix += 1;
    } catch {
      break;
    }
  }

  await fs.writeFile(imagePath, parsed.buffer);

  const relativeImagePath = path.relative(
    path.dirname(markdownPath),
    imagePath
  );
  const block = [
    "![" + escapeAlt(title) + "](" + formatMarkdownPath(relativeImagePath) + ")",
    url.trim(),
    ""
  ].join("\n");

  try {
    await fs.appendFile(
      markdownPath,
      block + "\n",
      { encoding: "utf8" }
    );
  } catch (error) {
    await fs.rm(imagePath, { force: true });
    throw error;
  }

  return {
    imagePath: imagePath,
    mdPath: markdownPath,
    relativeImagePath: relativeImagePath.split(path.sep).join("/"),
    bytes: parsed.buffer.length
  };
}