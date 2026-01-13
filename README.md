# Secret Scan CLI

🔍 **AI-powered CLI tool to scan files and repositories for exposed secrets and credentials**

[![npm version](https://badge.fury.io/js/secret-scan-cli.svg)](https://www.npmjs.com/package/secret-scan-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Pattern-based Detection** - Detects AWS keys, GitHub tokens, API keys, database credentials, and more
- 🧠 **AI-Powered Analysis** - Context-aware threat assessment using Hugging Face AI
- 📊 **Entropy Analysis** - Smart randomness detection to identify real secrets
- 🎯 **Multi-Factor Risk Scoring** - Intelligent scoring based on pattern type, entropy, and location
- 🎨 **Beautiful CLI Output** - Colorful terminal output with emojis and progress indicators
- 💾 **Multiple Output Formats** - Pretty terminal, JSON, or save to file
- 📁 **Directory Scanning** - Recursive scanning of entire directories
- 🔄 **CI/CD Integration** - Exit codes for automated pipelines
- ⚡ **Fast & Efficient** - Scans thousands of files in seconds

## Installation

### Global Installation (Recommended)

```bash
npm install -g @ravichy9708/secret-scan-cli
```

### Local Installation

```bash
npm install @ravichy9708/secret-scan-cli
```

## Quick Start

```bash
# Scan a single file
secret-scan myfile.js

# Scan with AI analysis
secret-scan --ai config.json

# Scan entire directory
secret-scan --recursive src/

# Output as JSON
secret-scan --json myfile.js

# Save results to file
secret-scan --output results.txt myfile.js
```

## Usage

```
Usage: secret-scan [options] <files...>

Arguments:
  files                File(s) or directory to scan

Options:
  -V, --version        Output version number
  -a, --ai             Enable AI-powered analysis (requires HF_API_KEY)
  -j, --json           Output results as JSON
  -o, --output <file>  Save results to file
  -r, --recursive      Recursively scan directories
  --ci                 CI/CD mode: exit with code 1 if secrets found
  --fail-on <level>    Fail on specific risk level (high|critical)
  -h, --help           Display help
```

## Examples

### Basic Scanning

```bash
# Scan a JavaScript file
secret-scan app.js

# Scan multiple files
secret-scan config.js database.py secrets.env

# Scan with pattern
secret-scan src/**/*.js
```

### AI-Powered Analysis

Enable AI to distinguish between real secrets and test data:

```bash
# Requires HF_API_KEY environment variable
export HF_API_KEY=your_huggingface_token
secret-scan --ai myfile.js
```

The AI will:
- Detect if secrets are test/example data
- Provide confidence scores
- Explain its reasoning

### Directory Scanning

```bash
# Scan entire directory recursively
secret-scan --recursive ./src

# Scan and save results
secret-scan --recursive --output audit.txt ./
```

### CI/CD Integration

```bash
# Exit with code 1 if any secrets found
secret-scan --ci src/

# Fail only on high/critical secrets
secret-scan --ci --fail-on high src/

# Generate JSON report
secret-scan --ci --json src/ > security-report.json
```

### GitHub Actions Example

```yaml
name: Secret Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install -g secret-scan-cli
      - run: secret-scan --ci --fail-on high src/
```

## Detected Secret Types

- AWS Access Keys & Secret Keys
- GitHub Personal Access Tokens
- Google API Keys
- Slack Tokens
- Stripe API Keys (Live & Test)
- Database Connection Strings (MongoDB, PostgreSQL)
- Private Keys (RSA, EC, DSA)
- JWT Tokens
- Generic API Keys
- Passwords in URLs

## Output Example

```
🔍 Secret Scanner v1.0.0
Scanning 1 file(s)...

✔ Scanned config.js: 3 finding(s)

============================================================
  🔍 SCAN RESULTS: 3 Finding(s)
============================================================

[1] Stripe Live Key
    File: config.js
    Line: 15
    Risk: 🔴 CRITICAL (Score: 10)
    Entropy: 4.85
    Value: sk_live_51234567890abcdefghijklmnop
    AI Analysis: ⚠️  Real Threat (95% confidence)
    Reasoning: Variable name 'stripeKey' indicates production credential

Summary:
  🔴 Critical: 1
  🟠 High: 2
```

## Configuration

### AI Analysis (Optional)

To enable AI-powered analysis, set your Hugging Face API key:

```bash
export HF_API_KEY=your_token_here
```

Get a free API key at: https://huggingface.co/settings/tokens

## How It Works

1. **Pattern Matching** - Scans files using regex patterns for known secret formats
2. **Entropy Calculation** - Measures randomness using Shannon entropy
3. **Risk Scoring** - Combines pattern type, entropy, file location, and context
4. **AI Analysis** - (Optional) Uses AI to assess if secrets are real or test data
5. **Reporting** - Displays findings with risk levels and recommendations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © Your Name

## Support

- 📧 Email: your.email@example.com
- 🐛 Issues: https://github.com/yourusername/secretAnalyzer/issues
- 📖 Documentation: https://github.com/yourusername/secretAnalyzer#readme

## Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js/)
- Styled with [Chalk](https://github.com/chalk/chalk)
- AI powered by [Hugging Face](https://huggingface.co/)
