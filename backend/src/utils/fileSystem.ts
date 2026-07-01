import fs from 'fs';
import path from 'path';

export async function cleanDirectory(dirPath: string): Promise<void> {
  if (fs.existsSync(dirPath)) {
    const files = await fs.promises.readdir(dirPath);
    for (const file of files) {
      const curPath = path.join(dirPath, file);
      if ((await fs.promises.lstat(curPath)).isDirectory()) {
        await cleanDirectory(curPath);
        await fs.promises.rmdir(curPath);
      } else {
        await fs.promises.unlink(curPath);
      }
    }
  }
}

export async function deleteDirectory(dirPath: string, retries = 5, delayMs = 300): Promise<void> {
  if (!fs.existsSync(dirPath)) return;
  for (let i = 0; i < retries; i++) {
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
      return;
    } catch (err: any) {
      if (i === retries - 1) {
        console.error(`[FileSystem] Failed to delete directory ${dirPath} after ${retries} attempts:`, err);
        throw err;
      }
      console.warn(`[FileSystem] Directory busy or locked, retrying deletion of ${dirPath} in ${delayMs}ms (Attempt ${i + 1}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function measureFolderSize(dirPath: string): Promise<number> {
  let size = 0;
  if (fs.existsSync(dirPath)) {
    try {
      const files = await fs.promises.readdir(dirPath);
      for (const file of files) {
        const curPath = path.join(dirPath, file);
        const stat = await fs.promises.lstat(curPath);
        if (stat.isDirectory()) {
          // Skip dependency/vcs folders to reflect code files only
          if (file === '.git' || file === 'node_modules' || file === 'venv' || file === '.venv') continue;
          size += await measureFolderSize(curPath);
        } else {
          size += stat.size;
        }
      }
    } catch {
      // Gracefully handle files that can't be read
    }
  }
  return size;
}

export async function getDirectoryDepth(dirPath: string, currentDepth: number = 0): Promise<number> {
  if (!fs.existsSync(dirPath)) return currentDepth;
  try {
    const files = await fs.promises.readdir(dirPath);
    let maxDepth = currentDepth;
    for (const file of files) {
      const curPath = path.join(dirPath, file);
      const stat = await fs.promises.lstat(curPath);
      if (stat.isDirectory() && file !== '.git' && file !== 'node_modules' && file !== 'venv' && file !== '.venv') {
        const depth = await getDirectoryDepth(curPath, currentDepth + 1);
        if (depth > maxDepth) {
          maxDepth = depth;
        }
      }
    }
    return maxDepth;
  } catch {
    return currentDepth;
  }
}
