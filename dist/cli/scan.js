#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk = require("chalk");
const ora = require("ora");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const scanner_1 = require("../lib/scanner");
const ai_analyzer_1 = require("../lib/ai-analyzer");
// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
dotenv.config(); // Load from .env if .env.local missing
const program = new commander_1.Command();
// Helper function to read file
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    }
    catch (error) {
        throw new Error(`Failed to read file: ${error.message}`);
    }
}
// Helper function to get all files in directory
function getAllFiles(dirPath, fileList = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            // Skip common directories
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
                getAllFiles(filePath, fileList);
            }
        }
        else {
            // Only include text files
            const ext = path.extname(file);
            const textExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rb', '.php', '.json', '.yml', '.yaml', '.env', '.txt', '.md'];
            if (textExtensions.includes(ext) || ext === '') {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}
// Display results in pretty format
function displayResults(findings, options) {
    if (findings.length === 0) {
        console.log(chalk.green('\n✓ No secrets found! Your code is clean.\n'));
        return;
    }
    console.log(chalk.bold('\n' + '='.repeat(60)));
    console.log(chalk.bold.red(`  🔍 SCAN RESULTS: ${findings.length} Finding(s)`));
    console.log(chalk.bold('='.repeat(60) + '\n'));
    findings.forEach((finding, i) => {
        const riskColors = {
            CRITICAL: chalk.red.bold,
            HIGH: chalk.hex('#FFA500').bold,
            MEDIUM: chalk.yellow.bold,
            LOW: chalk.blue.bold
        };
        const riskColor = riskColors[finding.riskLevel] || chalk.white;
        const riskEmoji = {
            CRITICAL: '🔴',
            HIGH: '🟠',
            MEDIUM: '🟡',
            LOW: '🔵'
        }[finding.riskLevel] || '⚪';
        console.log(chalk.bold(`[${i + 1}] ${finding.type}`));
        console.log(`    ${chalk.gray('File:')} ${finding.file || 'N/A'}`);
        console.log(`    ${chalk.gray('Line:')} ${finding.line}`);
        console.log(`    ${chalk.gray('Risk:')} ${riskEmoji} ${riskColor(finding.riskLevel)} ${chalk.gray(`(Score: ${finding.riskScore})`)}`);
        console.log(`    ${chalk.gray('Entropy:')} ${finding.entropy.toFixed(2)}`);
        console.log(`    ${chalk.gray('Value:')} ${chalk.red(finding.value)}`);
        if (finding.aiAnalysis) {
            const threatStatus = finding.aiAnalysis.isRealThreat
                ? chalk.red('⚠️  Real Threat')
                : chalk.green('✅ Likely Test/Example');
            console.log(`    ${chalk.gray('AI Analysis:')} ${threatStatus} ${chalk.gray(`(${finding.aiAnalysis.confidence}% confidence)`)}`);
            console.log(`    ${chalk.gray('Reasoning:')} ${chalk.italic(finding.aiAnalysis.reasoning)}`);
        }
        console.log('');
    });
    // Summary
    const criticalCount = findings.filter(f => f.riskLevel === 'CRITICAL').length;
    const highCount = findings.filter(f => f.riskLevel === 'HIGH').length;
    const mediumCount = findings.filter(f => f.riskLevel === 'MEDIUM').length;
    const lowCount = findings.filter(f => f.riskLevel === 'LOW').length;
    console.log(chalk.bold('Summary:'));
    if (criticalCount > 0)
        console.log(`  ${chalk.red('🔴 Critical:')} ${criticalCount}`);
    if (highCount > 0)
        console.log(`  ${chalk.hex('#FFA500')('🟠 High:')} ${highCount}`);
    if (mediumCount > 0)
        console.log(`  ${chalk.yellow('🟡 Medium:')} ${mediumCount}`);
    if (lowCount > 0)
        console.log(`  ${chalk.blue('🔵 Low:')} ${lowCount}`);
    console.log('');
}
// Display results as JSON
function displayJSON(findings) {
    console.log(JSON.stringify(findings, null, 2));
}
// Save results to file
function saveToFile(findings, outputPath, format) {
    try {
        if (format === 'json') {
            fs.writeFileSync(outputPath, JSON.stringify(findings, null, 2));
        }
        else {
            let output = `Secret Scan Results\n${'='.repeat(60)}\n\n`;
            output += `Total Findings: ${findings.length}\n\n`;
            findings.forEach((finding, i) => {
                output += `[${i + 1}] ${finding.type}\n`;
                output += `    File: ${finding.file || 'N/A'}\n`;
                output += `    Line: ${finding.line}\n`;
                output += `    Risk: ${finding.riskLevel} (Score: ${finding.riskScore})\n`;
                output += `    Entropy: ${finding.entropy.toFixed(2)}\n`;
                output += `    Value: ${finding.value}\n\n`;
            });
            fs.writeFileSync(outputPath, output);
        }
        console.log(chalk.green(`✓ Results saved to: ${outputPath}`));
    }
    catch (error) {
        console.error(chalk.red(`Failed to save results: ${error.message}`));
    }
}
// Main scan function
async function scanFiles(filePaths, options) {
    const allFindings = [];
    const spinner = ora();
    for (const filePath of filePaths) {
        spinner.start(`Scanning ${chalk.cyan(path.basename(filePath))}...`);
        try {
            const content = readFile(filePath);
            const filename = path.relative(process.cwd(), filePath);
            const findings = (0, scanner_1.scanText)(content, filename);
            // Add file path to findings
            findings.forEach(f => f.file = filename);
            allFindings.push(...findings);
            spinner.succeed(`Scanned ${chalk.cyan(path.basename(filePath))}: ${findings.length} finding(s)`);
        }
        catch (error) {
            spinner.fail(`Failed to scan ${filePath}: ${error.message}`);
        }
    }
    // AI Analysis
    if (options.ai && allFindings.length > 0) {
        if (!(0, ai_analyzer_1.isAIAvailable)()) {
            console.log(chalk.yellow('\n⚠️  AI analysis disabled: HF_API_KEY not configured in .env.local'));
        }
        else {
            spinner.start('Running AI analysis...');
            try {
                for (const finding of allFindings) {
                    const aiAnalysis = await (0, ai_analyzer_1.analyzeContext)(finding.type, finding.value, finding.context, finding.file);
                    finding.aiAnalysis = aiAnalysis;
                }
                spinner.succeed('AI analysis complete');
            }
            catch (error) {
                spinner.fail(`AI analysis failed: ${error.message}`);
            }
        }
    }
    // Display results
    if (options.json) {
        displayJSON(allFindings);
    }
    else {
        displayResults(allFindings, options);
    }
    // Save to file
    if (options.output) {
        const format = options.json ? 'json' : 'text';
        saveToFile(allFindings, options.output, format);
    }
    // Exit code for CI/CD
    if (options.ci) {
        const hasCritical = allFindings.some(f => f.riskLevel === 'CRITICAL');
        const hasHigh = allFindings.some(f => f.riskLevel === 'HIGH');
        if (hasCritical || (options.failOn === 'high' && hasHigh)) {
            process.exit(1);
        }
    }
}
// CLI Program
program
    .name('secret-scan')
    .description('🔍 Scan files and repositories for exposed secrets and credentials')
    .version('1.0.0')
    .argument('<files...>', 'File(s) or directory to scan')
    .option('-a, --ai', 'Enable AI-powered analysis (requires HF_API_KEY)')
    .option('-j, --json', 'Output results as JSON')
    .option('-o, --output <file>', 'Save results to file')
    .option('-r, --recursive', 'Recursively scan directories')
    .option('--ci', 'CI/CD mode: exit with code 1 if secrets found')
    .option('--fail-on <level>', 'Fail on specific risk level (high|critical)', 'critical')
    .action(async (files, options) => {
    try {
        let filesToScan = [];
        // Process each input
        for (const file of files) {
            const fullPath = path.resolve(file);
            if (!fs.existsSync(fullPath)) {
                console.error(chalk.red(`Error: File or directory not found: ${file}`));
                process.exit(1);
            }
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (options.recursive) {
                    filesToScan.push(...getAllFiles(fullPath));
                }
                else {
                    console.error(chalk.red(`Error: ${file} is a directory. Use --recursive to scan directories.`));
                    process.exit(1);
                }
            }
            else {
                filesToScan.push(fullPath);
            }
        }
        if (filesToScan.length === 0) {
            console.error(chalk.red('Error: No files to scan'));
            process.exit(1);
        }
        console.log(chalk.bold(`\n🔍 Secret Scanner v1.0.0`));
        console.log(chalk.gray(`Scanning ${filesToScan.length} file(s)...\n`));
        await scanFiles(filesToScan, options);
    }
    catch (error) {
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
    }
});
program.parse();
