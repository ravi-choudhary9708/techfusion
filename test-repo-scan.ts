import { cloneRepository, getAllTextFiles, cleanupTempDir } from './lib/git-scanner';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

async function test() {
    const logFile = 'test-results.log';
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    // Clear log file
    fs.writeFileSync(logFile, '');

    const repoUrl = 'https://github.com/ravi-choudhary9708/secretAnalyzer';
    const tempDir = path.join(os.tmpdir(), `test-scan-${Date.now()}`);

    log(`Testing repo scan for: ${repoUrl}`);
    log(`Temp dir: ${tempDir}`);

    try {
        log('Step 1: Cloning...');
        await cloneRepository(repoUrl, 'main', tempDir);
        log('Clone successful!');

        log('Step 2: Finding files...');
        const files = await getAllTextFiles(tempDir);
        log(`Found ${files.length} text files.`);

        if (files.length > 0) {
            log('Sample files:');
            files.slice(0, 5).forEach(f => log(` - ${path.relative(tempDir, f)}`));
        }

    } catch (error: any) {
        log(`Test failed: ${error.message}`);
    } finally {
        log('Step 3: Cleanup...');
        await cleanupTempDir(tempDir);
        log('Cleanup complete.');
    }
}

test();
