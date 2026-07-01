import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { deleteDirectory } from '../utils/fileSystem';

// Disable terminal prompting to fail fast on private repositories
process.env.GIT_TERMINAL_PROMPT = '0';

export class GitService {
  /**
   * Validates if a URL is a valid GitHub repository URL.
   */
  public static isValidGitHubUrl(url: string): boolean {
    const githubRegex = /^(https:\/\/|git@)github\.com[\/:]([a-zA-Z0-9-_\.]+)\/([a-zA-Z0-9-_\.]+)(\.git)?$/;
    return githubRegex.test(url.trim());
  }

  /**
   * Extracts the repository name from a GitHub URL.
   */
  public static getRepositoryName(url: string): string {
    const parts = url.replace(/\.git$/, '').split('/');
    return parts[parts.length - 1];
  }

  /**
   * Clones a public GitHub repository.
   * Cleans up the temp directory before cloning.
   * Returns the absolute path to the cloned repository.
   */
  public static async cloneRepository(githubUrl: string): Promise<{ localPath: string; repoName: string }> {
    if (!this.isValidGitHubUrl(githubUrl)) {
      const error: any = new Error('Invalid GitHub URL format');
      error.status = 400;
      throw error;
    }

    const repoName = this.getRepositoryName(githubUrl);
    const uniqueId = uuidv4();
    const localPath = path.join(config.TEMP_DIR, uniqueId);

    // Clean up old temporary repositories to save disk space
    try {
      if (fs.existsSync(config.TEMP_DIR)) {
        const folders = await fs.promises.readdir(config.TEMP_DIR);
        for (const folder of folders) {
          const folderPath = path.join(config.TEMP_DIR, folder);
          await deleteDirectory(folderPath);
        }
      } else {
        await fs.promises.mkdir(config.TEMP_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('[GitService] Pre-clone cleanup warning:', err);
    }

    const git = simpleGit();

    // Setup Git Clone with depth 1 for performance and timeout handler
    const clonePromise = git.clone(githubUrl, localPath, [
      '--depth=1'
    ]);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const error: any = new Error('Repository clone operation timed out');
        error.status = 408;
        reject(error);
      }, config.GIT_CLONE_TIMEOUT);
    });

    try {
      await Promise.race([clonePromise, timeoutPromise]);
      return { localPath, repoName };
    } catch (err: any) {
      // Clean up in case of failure
      await deleteDirectory(localPath);

      if (err.status === 408) {
        throw err;
      }

      const errorMsg = err.message || '';
      const error: any = new Error();

      if (
        errorMsg.includes('Authentication failed') || 
        errorMsg.includes('Could not read Username') || 
        errorMsg.includes('terminal prompts disabled')
      ) {
        error.message = 'Authentication failed. The repository may be private or requires credentials.';
        error.status = 401;
      } else if (
        errorMsg.includes('not found') || 
        (errorMsg.includes('repository') && errorMsg.includes('does not exist'))
      ) {
        error.message = 'Repository not found. Please verify the URL.';
        error.status = 404;
      } else {
        error.message = `Failed to clone repository: ${errorMsg}`;
        error.status = 500;
      }

      throw error;
    }
  }
}
