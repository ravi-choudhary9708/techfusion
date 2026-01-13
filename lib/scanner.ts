import type { AIAnalysis, SecretClassification, RemediationSteps } from './ai-analyzer';

export interface Finding {
    type: string;
    value: string;
    line: number;
    entropy: number;
    riskScore: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    context: string;
    // AI-powered fields
    aiAnalysis?: AIAnalysis;
    classification?: SecretClassification[];
    remediation?: RemediationSteps;
}


interface Pattern {
    name: string;
    regex: RegExp;
    baseScore: number;
}

const PATTERNS: Pattern[] = [
    // CRITICAL patterns (base score 10)
    { name: 'Stripe Live Key', regex: /sk_live_[0-9a-zA-Z]{24,}/g, baseScore: 10 },

    // HIGH patterns (base score 7)
    { name: 'AWS Access Key', regex: /(AKIA|ASIA)[A-Z0-9]{16}/g, baseScore: 7 },
    { name: 'AWS Secret Key', regex: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g, baseScore: 7 },
    { name: 'GitHub Personal Token', regex: /ghp_[0-9a-zA-Z]{36}/g, baseScore: 7 },
    { name: 'GitHub OAuth Token', regex: /gho_[0-9a-zA-Z]{36}/g, baseScore: 7 },
    { name: 'Google API Key', regex: /AIzaSy[0-9A-Za-z_-]{33}/g, baseScore: 7 },
    { name: 'Slack Token', regex: /xox[baprs]-([0-9a-zA-Z]{10,48})/g, baseScore: 7 },
    { name: 'Password in URL', regex: /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^:\/\s]+:([^@\/\s]{3,})@/g, baseScore: 7 },
    { name: 'Private Key (PEM)', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) PRIVATE KEY-----/g, baseScore: 7 },
    { name: 'MongoDB URI', regex: /mongodb(\+srv)?:\/\/[^:]+:([^@\s]{3,})@/g, baseScore: 7 },
    { name: 'PostgreSQL URI', regex: /postgres(ql)?:\/\/[^:]+:([^@\s]{3,})@/g, baseScore: 7 },

    // MEDIUM patterns (base score 5)
    { name: 'Generic API Key', regex: /['"]?api[_-]?key['"]?\s*[:=]\s*['"]([a-zA-Z0-9_\-]{16,64})['"]/gi, baseScore: 5 },
    { name: 'JWT Token', regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, baseScore: 5 },
];

/**
 * Calculate Shannon entropy of a string
 * Measures randomness: higher = more random
 * Range: 0-8 (for typical strings)
 */
function calculateEntropy(str: string): number {
    if (!str || str.length === 0) return 0;

    // Count character frequencies
    const frequencies = new Map<string, number>();
    for (const char of str) {
        frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    // Calculate Shannon entropy: H(X) = -Σ(p(x) * log2(p(x)))
    let entropy = 0;
    const len = str.length;

    for (const count of frequencies.values()) {
        const probability = count / len;
        entropy -= probability * Math.log2(probability);
    }

    return Math.round(entropy * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if the line or context indicates this is a test/example
 */
function isTestOrExample(lineText: string, context: string, filename?: string): boolean {
    const lowerLine = lineText.toLowerCase();
    const lowerContext = context.toLowerCase();

    // Check filename for test indicators
    if (filename) {
        const lowerFilename = filename.toLowerCase();
        if (
            lowerFilename.includes('.test.') ||
            lowerFilename.includes('.spec.') ||
            lowerFilename.includes('test_') ||
            lowerFilename.includes('_test') ||
            lowerFilename.includes('example') ||
            lowerFilename.includes('sample') ||
            lowerFilename.includes('readme')
        ) {
            return true;
        }
    }

    // Check for example/test indicators in the code
    const testIndicators = [
        'example', 'sample', 'dummy', 'test', 'fake',
        'placeholder', 'demo', 'mock', 'stub'
    ];

    for (const indicator of testIndicators) {
        if (lowerLine.includes(indicator) || lowerContext.includes(indicator)) {
            return true;
        }
    }

    return false;
}

/**
 * Check if the line is commented out
 */
function isCommented(lineText: string): boolean {
    const trimmed = lineText.trim();
    return (
        trimmed.startsWith('//') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('<!--')
    );
}

/**
 * Get file extension penalty/bonus
 */
function getLocationScore(filename?: string): number {
    if (!filename) return 0;

    const lower = filename.toLowerCase();

    // .env files are better (but still risky)
    if (lower.includes('.env')) return -2;

    // Source code files get penalty
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rb', '.php', '.cs'];
    if (sourceExtensions.some(ext => lower.endsWith(ext))) return 2;

    // Config files get moderate penalty
    const configExtensions = ['.json', '.xml', '.yaml', '.yml', '.toml', '.ini'];
    if (configExtensions.some(ext => lower.endsWith(ext))) return 1;

    return 0;
}

/**
 * Calculate risk score based on multiple factors
 */
function calculateRiskScore(
    baseScore: number,
    entropy: number,
    lineText: string,
    context: string,
    filename?: string
): number {
    let score = baseScore;

    // Entropy bonus
    if (entropy > 5.0) {
        score += 3;
    } else if (entropy > 4.5) {
        score += 2;
    }

    // Location penalty/bonus
    score += getLocationScore(filename);

    // Test/example penalty
    if (isTestOrExample(lineText, context, filename)) {
        score -= 5;
    }

    // Ensure score doesn't go negative
    return Math.max(0, score);
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score >= 10) return 'CRITICAL';
    if (score >= 7) return 'HIGH';
    if (score >= 4) return 'MEDIUM';
    return 'LOW';
}

/**
 * Extract context around a match (up to 50 chars on each side)
 */
function extractContext(lineText: string, matchStart: number, matchEnd: number): string {
    const contextRadius = 50;
    const start = Math.max(0, matchStart - contextRadius);
    const end = Math.min(lineText.length, matchEnd + contextRadius);

    let context = lineText.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < lineText.length) context = context + '...';

    return context;
}

export function scanText(text: string, filename?: string): Finding[] {
    const findings: Finding[] = [];
    const lines = text.split('\n');

    lines.forEach((lineText, index) => {
        const lineNum = index + 1;

        // Skip empty lines
        if (!lineText.trim()) return;

        // Skip commented lines
        if (isCommented(lineText)) return;

        for (const pattern of PATTERNS) {
            // Reset lastIndex for global regex
            pattern.regex.lastIndex = 0;

            let match;
            while ((match = pattern.regex.exec(lineText)) !== null) {
                const value = match[0];
                const entropy = calculateEntropy(value);
                const context = extractContext(lineText, match.index, match.index + value.length);

                const riskScore = calculateRiskScore(
                    pattern.baseScore,
                    entropy,
                    lineText,
                    context,
                    filename
                );

                const riskLevel = getRiskLevel(riskScore);

                findings.push({
                    type: pattern.name,
                    value,
                    line: lineNum,
                    entropy,
                    riskScore,
                    riskLevel,
                    context
                });
            }
        }
    });

    return findings;
}
