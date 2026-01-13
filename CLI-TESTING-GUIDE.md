# Secret Scanner CLI - Testing Guide

## Installation Complete ✅

The CLI tool has been successfully installed with all dependencies.

## Step-by-Step Testing Instructions

### Step 1: Verify Installation

Check that all dependencies are installed:
```bash
npm list commander chalk ora tsx
```

### Step 2: View CLI Help

See all available options:
```bash
npm run scan:help
```

Expected output:
```
Usage: secret-scan [options] <files...>

🔍 Scan files and repositories for exposed secrets and credentials

Arguments:
  files                File(s) or directory to scan

Options:
  -V, --version        output the version number
  -a, --ai             Enable AI-powered analysis (requires HF_API_KEY)
  -j, --json           Output results as JSON
  -o, --output <file>  Save results to file
  -r, --recursive      Recursively scan directories
  --ci                 CI/CD mode: exit with code 1 if secrets found
  --fail-on <level>    Fail on specific risk level (high|critical) (default: "critical")
  -h, --help           display help for command
```

### Step 3: Basic File Scan

Scan a single file:
```bash
npm run scan test-files/sample-secrets.js
```

**Expected Result:**
- Colorful output showing all detected secrets
- Risk levels with emojis (🔴 CRITICAL, 🟠 HIGH, etc.)
- Line numbers and entropy scores
- Summary at the bottom

### Step 4: Scan with AI Analysis

Enable AI-powered context analysis (requires HF_API_KEY in .env.local):
```bash
npm run scan -- --ai test-files/sample-secrets.js
```

**Expected Result:**
- Same as Step 3, plus:
- AI analysis for each finding
- "Real Threat" or "Likely Test/Example" classification
- Confidence percentage
- Reasoning explanation

### Step 5: JSON Output

Get results in JSON format:
```bash
npm run scan -- --json test-files/sample-secrets.js
```

**Expected Result:**
- Clean JSON array of findings
- Can be piped to other tools: `npm run scan -- --json file.js | jq`

### Step 6: Save Results to File

Save scan results:
```bash
npm run scan -- --output results.txt test-files/sample-secrets.js
```

**Expected Result:**
- Results displayed in terminal
- File `results.txt` created with findings
- Success message: "✓ Results saved to: results.txt"

### Step 7: Scan Multiple Files

Scan several files at once:
```bash
npm run scan test-files/sample-secrets.js test-files/sample.env
```

**Expected Result:**
- Both files scanned
- Results combined and displayed together
- Summary shows total findings from all files

### Step 8: Recursive Directory Scan

Scan entire directory:
```bash
npm run scan -- --recursive test-files
```

**Expected Result:**
- All text files in directory scanned
- Progress indicator for each file
- Combined results

### Step 9: CI/CD Mode

Test exit codes for automation:
```bash
npm run scan -- --ci test-files/sample-secrets.js
echo Exit Code: $?
```

**Expected Result:**
- Exit code 1 if CRITICAL secrets found
- Exit code 0 if no critical secrets

### Step 10: Fail on High Risk

Fail on HIGH or CRITICAL:
```bash
npm run scan -- --ci --fail-on high test-files/sample-secrets.js
```

**Expected Result:**
- Exit code 1 if HIGH or CRITICAL secrets found

## Advanced Usage Examples

### Scan and Save as JSON
```bash
npm run scan -- --json --output scan-results.json test-files/
```

### Full Analysis with AI
```bash
npm run scan -- --ai --recursive --output full-report.txt lib/
```

### Quick Check (No AI)
```bash
npm run scan app/api/
```

### CI Pipeline Integration
```bash
npm run scan -- --ci --fail-on high --json src/ > security-report.json
```

## Troubleshooting

### Error: "HF_API_KEY not configured"
- This is just a warning if you use `--ai` without the API key
- The scan will still work, just without AI analysis
- To fix: Add `HF_API_KEY=your_token` to `.env.local`

### Error: "File not found"
- Check the file path is correct
- Use relative or absolute paths
- Example: `npm run scan ./test-files/sample.js`

### Error: "is a directory. Use --recursive"
- Add `--recursive` flag to scan directories
- Example: `npm run scan -- --recursive test-files`

## What to Look For

When testing, verify:

1. **Color Coding Works**
   - 🔴 Red for CRITICAL
   - 🟠 Orange for HIGH
   - 🟡 Yellow for MEDIUM
   - 🔵 Blue for LOW

2. **Entropy Calculation**
   - Random strings should have high entropy (>4.5)
   - Common words should have low entropy (<3.0)

3. **Risk Scoring**
   - Stripe live keys should be CRITICAL
   - AWS keys should be HIGH
   - Generic API keys should be MEDIUM

4. **AI Analysis** (if enabled)
   - `test_key` should be marked as "Likely Test"
   - `prod_api_key` should be marked as "Real Threat"

5. **File Paths**
   - Should show relative paths from current directory
   - Should be displayed in findings

## Next Steps

After testing, you can:

1. **Scan Your Real Code**
   ```bash
   npm run scan -- --recursive src/
   ```

2. **Add to Git Hooks**
   - Use in pre-commit hooks
   - Prevent secrets from being committed

3. **Integrate into CI/CD**
   - Add to GitHub Actions, GitLab CI, etc.
   - Use `--ci` mode for automated checks

4. **Create Alias** (Optional)
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   alias secret-scan="npm run scan --"
   ```

## Success Criteria

Your CLI is working correctly if:
- ✅ All test files are scanned successfully
- ✅ Secrets are detected and categorized
- ✅ Colors and formatting display properly
- ✅ JSON output is valid
- ✅ Files can be saved
- ✅ Exit codes work in CI mode
- ✅ AI analysis works (if API key configured)

Happy scanning! 🔍
