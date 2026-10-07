import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const pairs = [
  ['frontend/.env.example', 'frontend/.env.local'],
  ['backend/.env.example', 'backend/.env'],
];

for (const [source, target] of pairs) {
  const targetPath = resolve(target);
  try {
    await access(targetPath, constants.F_OK);
    console.log(`Skipped ${target}: file already exists.`);
  } catch {
    await copyFile(resolve(source), targetPath);
    console.log(`Created ${target}.`);
  }
}
