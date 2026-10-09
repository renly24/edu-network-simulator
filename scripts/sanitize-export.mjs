// 静的エクスポート（out/）のうち、名前に ".." を含むファイルを改名し、参照も書き換える。
// Next.js のハッシュ付きファイル名は "xxxx..woff" のようにドットが連続することがあり、
// FTP サーバーがそうした名前のアップロードを拒否する（550 Not owner）ため。
import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const root = process.argv[2] ?? "out";
const TEXT_EXT = /\.(html|js|css|txt|json|map|xml|webmanifest)$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(root);
const renames = new Map();
for (const path of files) {
  const name = basename(path);
  if (!name.includes("..")) continue;
  const fixed = name.replace(/\.{2,}/g, ".");
  if (files.includes(join(dirname(path), fixed))) {
    throw new Error(`Cannot rename ${path}: ${fixed} already exists`);
  }
  renameSync(path, join(dirname(path), fixed));
  renames.set(name, fixed);
  console.log(`renamed ${path} -> ${fixed}`);
}

if (renames.size > 0) {
  for (const path of walk(root)) {
    if (!TEXT_EXT.test(path)) continue;
    const original = readFileSync(path, "utf8");
    let text = original;
    for (const [from, to] of renames) text = text.split(from).join(to);
    if (text !== original) {
      writeFileSync(path, text);
      console.log(`updated references in ${path}`);
    }
  }
}
console.log(`${renames.size} file(s) renamed`);
