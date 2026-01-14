import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import simpleGit from 'simple-git';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rm = promisify(fs.rm);

// Patterns to ignore during scanning
const IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'vendor',
    'target',
    'bin',
    'obj',
    '.vscode',
    '.idea',
    '__pycache__',
    'venv',
    '.env',
    'coverage',
    '.cache'
];

// Supported text file extensions
const TEXT_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx',
    '.py', '.java', '.go', '.rb', '.php',
    '.json', '.yml', '.yaml', '.xml',
    '.txt', '.md', '.env', '.config',
    '.c', '.cpp', '.h', '.cs',
    '.sh', '.bash', '.ps1',
    '.sql', '.html', '.css', '.scss'
];

/**
 * Check if a file is binary
 */
function isBinaryFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();

    // Known binary extensions
    const binaryExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
        '.pdf', '.zip', '.tar', '.gz', '.rar',
        '.exe', '.dll', '.so', '.dylib',
        '.woff', '.woff2', '.ttf', '.eot',
        '.mp4', '.mp3', '.avi', '.mov',
        '.bin', '.dat', '.db', '.sqlite'
    ];

    return binaryExtensions.includes(ext);
}

/**
 * Check if a path should be ignored
 */
function shouldIgnore(filePath: string): boolean {
    const parts = filePath.split(path.sep);
    return IGNORE_PATTERNS.some(pattern => parts.includes(pattern));
}

/**
 * Check if a file is a text file we should scan
 */
function isTextFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return TEXT_EXTENSIONS.includes(ext) || ext === '';
}

/**
 * Recursively get all text files in a directory
 */
export async function getAllTextFiles(dirPath: string, baseDir: string = dirPath): Promise<string[]> {
    const files: string[] = [];

    try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            // Skip ignored patterns
            if (shouldIgnore(relativePath)) {
                continue;
            }

            if (entry.isDirectory()) {
                // Recursively scan subdirectories
                const subFiles = await getAllTextFiles(fullPath, baseDir);
                files.push(...subFiles);
            } else if (entry.isFile()) {
                // Check if it's a text file and not binary
                if (isTextFile(fullPath) && !isBinaryFile(fullPath)) {
                    files.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
    }

    return files;
}

/**
 * Clone a Git repository to a temporary directory
 */
export async function cloneRepository(
    repoUrl: string,
    branch: string = 'main',
    tempDir: string
): Promise<void> {
    const git = simpleGit();
    git.env({ ...process.env, GIT_TERMINAL_PROMPT: '0' });

    // Ensure tempDir exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
        console.log(`Executing git clone ${repoUrl} ${tempDir} --depth 1 --branch ${branch}`);
        await git.clone(repoUrl, tempDir, ['--depth', '1', '--branch', branch]);
    } catch (error: any) {
        // If branch doesn't exist, try master
        if (branch === 'main' && error.message.includes('Remote branch main not found')) {
            console.log(`Branch 'main' not found, trying 'master'...`);
            await git.clone(repoUrl, tempDir, ['--depth', '1', '--branch', 'master']);
        } else {
            console.error(`Git Error: ${error.message}`);
            throw error;
        }
    }
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
    try {
        if (fs.existsSync(tempDir)) {
            await rm(tempDir, { recursive: true, force: true });
        }
    } catch (error) {
        console.error(`Error cleaning up temp directory ${tempDir}:`, error);
    }
}

/**
 * Validate GitHub repository URL
 */
export function validateRepoUrl(url: string): boolean {
    // Basic check for github.com
    if (!url.includes('github.com/')) return false;

    // Remove trailing slash if present for validation
    const normalizedUrl = url.replace(/\/$/, '');
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+(\.git)?$/;
    return githubPattern.test(normalizedUrl);
}

/**
 * Get repository name from URL
 */
export function getRepoName(url: string): string {
    // Remove trailing slash if present
    const normalizedUrl = url.replace(/\/$/, '');
    const match = normalizedUrl.match(/github\.com\/([\w-]+)\/([\w.-]+?)(\.git)?$/);
    if (match) {
        return `${match[1]}/${match[2]}`;
    }
    return 'unknown';
}
