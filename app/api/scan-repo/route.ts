import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import {
    cloneRepository,
    getAllTextFiles,
    cleanupTempDir,
    validateRepoUrl,
    getRepoName
} from '@/lib/git-scanner';
import { scanText } from '@/lib/scanner';

const readFile = promisify(fs.readFile);

export async function POST(req: NextRequest) {
    let tempDir: string | null = null;

    try {
        const body = await req.json();
        const { repoUrl, branch = 'main' } = body;

        // Validate repository URL
        if (!repoUrl || typeof repoUrl !== 'string') {
            return NextResponse.json({
                error: 'Repository URL is required'
            }, { status: 400 });
        }

        if (!validateRepoUrl(repoUrl)) {
            return NextResponse.json({
                error: 'Invalid GitHub repository URL. Please provide a valid GitHub URL.'
            }, { status: 400 });
        }

        // Create temporary directory
        const timestamp = Date.now();
        const repoNameString = getRepoName(repoUrl).replace('/', '-');
        const rootDir = process.cwd();
        tempDir = path.join(rootDir, '.temp', `scan-${repoNameString}-${timestamp}`);

        // Ensure .temp exists
        const dotTemp = path.join(rootDir, '.temp');
        if (!fs.existsSync(dotTemp)) {
            fs.mkdirSync(dotTemp, { recursive: true });
        }

        console.log(`Repository scan starting for ${repoUrl} in ${tempDir}`);

        // Clone repository
        try {
            console.log(`Cloning repository ${repoUrl} branch ${branch}...`);
            await cloneRepository(repoUrl, branch, tempDir);
            console.log(`Clone complete.`);
        } catch (cloneError: any) {
            console.error(`Clone failed: ${cloneError.message}`);
            return NextResponse.json({
                error: `Failed to clone repository: ${cloneError.message}. Make sure the repository is public and the branch exists.`
            }, { status: 400 });
        }

        // Get all text files
        console.log(`Discovering text files in ${tempDir}...`);
        const textFiles = await getAllTextFiles(tempDir);
        console.log(`Found ${textFiles.length} candidate text files.`);

        if (textFiles.length === 0) {
            await cleanupTempDir(tempDir);
            return NextResponse.json({
                findings: [],
                metadata: {
                    repository: getRepoName(repoUrl),
                    branch,
                    filesScanned: 0,
                    message: 'No text files found to scan'
                }
            });
        }

        // Limit number of files to prevent abuse
        const MAX_FILES = 500;
        const filesToScan = textFiles.slice(0, MAX_FILES);

        if (textFiles.length > MAX_FILES) {
            console.warn(`Repository has ${textFiles.length} files, limiting to ${MAX_FILES}`);
        }

        // Scan all files and aggregate findings
        const allFindings: any[] = [];
        let filesScanned = 0;
        let totalSize = 0;

        for (const filePath of filesToScan) {
            try {
                const content = await readFile(filePath, 'utf-8');
                const fileSize = content.length;

                // Skip very large files (> 1MB)
                if (fileSize > 1024 * 1024) {
                    continue;
                }

                totalSize += fileSize;

                // Get relative path from repo root
                const relativePath = path.relative(tempDir, filePath);

                // Scan the file
                const findings = scanText(content, relativePath);

                // Add file path to each finding
                findings.forEach(finding => {
                    allFindings.push({
                        ...finding,
                        file: relativePath
                    });
                });

                filesScanned++;
            } catch (error) {
                console.error(`Error scanning file ${filePath}:`, error);
                // Continue with other files
            }
        }

        // Cleanup temporary directory
        await cleanupTempDir(tempDir);

        return NextResponse.json({
            findings: allFindings,
            metadata: {
                repository: getRepoName(repoUrl),
                branch,
                filesScanned,
                totalFiles: textFiles.length,
                totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
                limitReached: textFiles.length > MAX_FILES
            }
        });

    } catch (error: any) {
        console.error('Repository scan error:', error);

        // Cleanup on error
        if (tempDir) {
            await cleanupTempDir(tempDir);
        }

        return NextResponse.json({
            error: `Failed to scan repository: ${error.message}`
        }, { status: 500 });
    }
}
