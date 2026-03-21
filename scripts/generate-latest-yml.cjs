#!/usr/bin/env node
// Generates the latest.yml / latest-mac.yml / latest-linux.yml files that
// electron-updater fetches from GitHub Releases to detect new versions.
// Usage: node scripts/generate-latest-yml.cjs <win|mac|linux>

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const [, , platform] = process.argv;
if (!["win", "mac", "linux"].includes(platform)) {
  console.error("Usage: generate-latest-yml.cjs <win|mac|linux>");
  process.exit(1);
}

const version = require("../package.json").version;
const distDir = path.join(__dirname, "..", "dist");
const releaseDate = new Date().toISOString();

function sha512b64(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha512").update(data).digest("base64");
}

function entry(filename) {
  const filePath = path.join(distDir, filename);
  return {
    url: filename,
    sha512: sha512b64(filePath),
    size: fs.statSync(filePath).size,
  };
}

function fmt(e) {
  return `  - url: ${e.url}\n    sha512: ${e.sha512}\n    size: ${e.size}`;
}

function write(name, yml) {
  const out = path.join(distDir, name);
  fs.writeFileSync(out, yml);
  console.log("Generated", out);
}

if (platform === "win") {
  const e = entry(`PDFDecomposer-Setup-${version}.exe`);
  write(
    "latest.yml",
    `version: ${version}\nfiles:\n${fmt(e)}\npath: ${e.url}\nsha512: ${e.sha512}\nreleaseDate: '${releaseDate}'\n`,
  );
} else if (platform === "mac") {
  const archs = ["x64", "arm64"].map((arch) =>
    entry(`PDFDecomposer-${version}-${arch}.dmg`),
  );
  const primary = archs.find((e) => e.url.includes("arm64"));
  write(
    "latest-mac.yml",
    `version: ${version}\nfiles:\n${archs.map(fmt).join("\n")}\npath: ${primary.url}\nsha512: ${primary.sha512}\nreleaseDate: '${releaseDate}'\n`,
  );
} else if (platform === "linux") {
  const e = entry(`PDFDecomposer-${version}.AppImage`);
  write(
    "latest-linux.yml",
    `version: ${version}\nfiles:\n${fmt(e)}\npath: ${e.url}\nsha512: ${e.sha512}\nreleaseDate: '${releaseDate}'\n`,
  );
}
