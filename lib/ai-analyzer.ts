import { HfInference } from '@huggingface/inference';

// AI Analysis Interfaces
export interface AIAnalysis {
    isRealThreat: boolean;
    confidence: number; // 0-100
    reasoning: string;
}

export interface SecretClassification {
    type: string;
    probability: number; // 0-100
}

export interface RemediationStep {
    step: number;
    title: string;
    description: string;
    command?: string;
    url?: string;
}

export interface RemediationSteps {
    immediate: RemediationStep[];
    followUp: RemediationStep[];
    prevention: RemediationStep[];
}

export interface SecuritySummary {
    overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    summary: string;
    businessImpact: string;
    actionItems: string[];
    timeline: string;
}

// Initialize Hugging Face Inference
function getHfClient() {
    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) {
        throw new Error('HF_API_KEY is not configured');
    }
    return new HfInference(apiKey);
}

// Helper function to call Hugging Face with structured output
async function callHfModel(prompt: string): Promise<string> {
    const hf = getHfClient();

    try {
        const response = await hf.chatCompletion({
            model: 'meta-llama/Llama-3.3-70B-Instruct',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.3,
        });

        return response.choices[0].message.content || '';
    } catch (error) {
        console.error('Hugging Face API error:', error);
        throw error;
    }
}

/**
 * Context-Aware Analysis - Determines if a finding is a real threat
 */
export async function analyzeContext(
    secretType: string,
    value: string,
    context: string,
    filename?: string
): Promise<AIAnalysis> {
    try {
        const prompt = `You are a security expert analyzing potential secret leaks. Analyze this finding and determine if it's a real threat.

Secret Type: ${secretType}
Value: ${value}
File: ${filename || 'unknown'}
Code Context: ${context}

Consider these factors:
1. Is this likely test/example code? (look for "test", "example", "sample", "dummy", "mock" in variable names or comments)
2. Does the variable name suggest test data? (e.g., "test_key", "example_token")
3. Are there comments indicating this is for testing or documentation?
4. Does the value contain test indicators like "EXAMPLE", "TEST", "SAMPLE", "FAKE"?
5. Is the file path suggesting a test environment? (e.g., .test.js, .spec.ts, test/, examples/)

Be STRICT: Only mark as non-threat if there are clear, multiple indicators this is test/example code.
Real production secrets are often near test code, so be cautious.

Respond with ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "isRealThreat": boolean,
  "confidence": number (0-100),
  "reasoning": "brief explanation of your decision"
}`;

        const response = await callHfModel(prompt);

        // Clean response - remove markdown code blocks if present
        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const analysis = JSON.parse(cleanedResponse);

        return {
            isRealThreat: analysis.isRealThreat,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning
        };
    } catch (error) {
        console.error('AI Analysis error:', error);
        // Fallback: assume it's a real threat if AI fails
        return {
            isRealThreat: true,
            confidence: 50,
            reasoning: 'AI analysis unavailable - manual review recommended'
        };
    }
}

/**
 * Smart Secret Classification - Identifies secret type with probabilities
 */
export async function classifySecret(
    value: string,
    context: string
): Promise<SecretClassification[]> {
    try {
        const prompt = `You are a security expert. Identify the type of this secret or credential with probability scores.

Value: ${value}
Context: ${context}

Analyze the pattern, prefix, length, and context to determine what type of secret this is.
Consider known patterns like:
- AWS keys (AKIA*, ASIA*)
- GitHub tokens (ghp_*, gho_*, ghs_*)
- Stripe keys (sk_live_*, pk_live_*)
- Google API keys (AIzaSy*)
- Hugging Face tokens (hf_*)
- Anthropic keys (sk-ant-*)
- OpenAI keys (sk-*)
- JWT tokens (eyJ*)
- Generic API keys
- Database credentials
- Private keys

Respond with ONLY valid JSON (no markdown, no code blocks, no extra text) with up to 3 most likely types:
{
  "classifications": [
    {"type": "Secret Type Name", "probability": 85},
    {"type": "Alternative Type", "probability": 12},
    {"type": "Another Possibility", "probability": 3}
  ]
}`;

        const response = await callHfModel(prompt);

        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const data = JSON.parse(cleanedResponse);
        return data.classifications;
    } catch (error) {
        console.error('Classification error:', error);
        return [{
            type: 'Unknown Secret',
            probability: 50
        }];
    }
}

/**
 * Generate Custom Remediation Steps
 */
export async function generateRemediation(
    secretType: string,
    riskLevel: string,
    value: string
): Promise<RemediationSteps> {
    try {
        // Mask the secret value for safety
        const maskedValue = value.substring(0, 8) + '***' + value.substring(value.length - 4);

        const prompt = `You are a security expert. Generate specific, actionable remediation steps for this exposed secret.

Secret Type: ${secretType}
Risk Level: ${riskLevel}
Value (masked): ${maskedValue}

Provide detailed, step-by-step remediation organized into three categories:

1. IMMEDIATE actions (to revoke/disable the exposed secret)
   - Include exact URLs to relevant consoles/dashboards
   - Provide specific commands where applicable
   - Be platform-specific (e.g., AWS IAM, GitHub Settings)

2. FOLLOW-UP actions (to secure the system)
   - Security audit steps
   - Log review recommendations
   - New credential generation with best practices

3. PREVENTION measures (to avoid future exposure)
   - Environment variable setup
   - Git hooks and pre-commit checks
   - Secret management tools
   - CI/CD integration

Be specific with URLs, commands, and exact steps. Include actual console URLs.

Respond with ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "immediate": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed description",
      "command": "optional command to run",
      "url": "optional URL to visit"
    }
  ],
  "followUp": [...],
  "prevention": [...]
}`;

        const response = await callHfModel(prompt);

        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const steps = JSON.parse(cleanedResponse);
        return steps;
    } catch (error) {
        console.error('Remediation generation error:', error);
        return {
            immediate: [{
                step: 1,
                title: 'Revoke the exposed credential',
                description: 'Immediately disable or revoke this credential in the relevant service console.',
                url: 'https://console.aws.amazon.com/iam/'
            }],
            followUp: [{
                step: 1,
                title: 'Review access logs',
                description: 'Check for any unauthorized usage of this credential.'
            }],
            prevention: [{
                step: 1,
                title: 'Use environment variables',
                description: 'Store secrets in .env files and add them to .gitignore.'
            }]
        };
    }
}

/**
 * Generate Executive Security Summary
 */
export async function generateSecuritySummary(
    findings: any[]
): Promise<SecuritySummary> {
    try {
        // Count findings by risk level
        const criticalCount = findings.filter(f => f.riskLevel === 'CRITICAL').length;
        const highCount = findings.filter(f => f.riskLevel === 'HIGH').length;
        const mediumCount = findings.filter(f => f.riskLevel === 'MEDIUM').length;
        const lowCount = findings.filter(f => f.riskLevel === 'LOW').length;

        // Determine overall risk
        let overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (criticalCount > 0) overallRisk = 'CRITICAL';
        else if (highCount > 2) overallRisk = 'CRITICAL';
        else if (highCount > 0) overallRisk = 'HIGH';
        else if (mediumCount > 3) overallRisk = 'HIGH';
        else if (mediumCount > 0) overallRisk = 'MEDIUM';

        const findingsSummary = findings.map(f => ({
            type: f.type,
            riskLevel: f.riskLevel,
            line: f.line
        }));

        const prompt = `You are a security expert. Generate a professional executive security summary for these findings.

Total Findings: ${findings.length}
Critical: ${criticalCount}
High: ${highCount}
Medium: ${mediumCount}
Low: ${lowCount}

Findings Details: ${JSON.stringify(findingsSummary)}

Generate a comprehensive security report with:

1. SUMMARY: A professional 2-3 sentence overview of the security situation
   - Be direct and executive-friendly
   - Highlight the most critical issues
   - Mention specific secret types if critical (AWS, Stripe, etc.)

2. BUSINESS IMPACT: Estimate the potential business impact
   - Consider data breach costs
   - Unauthorized service usage costs (especially cloud services)
   - Compliance violations
   - Reputation damage
   - Be specific with dollar estimates where applicable

3. ACTION ITEMS: Prioritized list of 4-6 action items
   - Order by urgency and impact
   - Be specific and actionable
   - Include timeframes

4. TIMELINE: Recommended timeline for remediation
   - Immediate (within 1 hour)
   - Short-term (within 24 hours)
   - Medium-term (within 1 week)

Be professional, direct, and actionable. This is for security leadership.

Respond with ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "summary": "Executive summary text",
  "businessImpact": "Business impact assessment",
  "actionItems": ["action 1", "action 2", ...],
  "timeline": "Timeline recommendations"
}`;

        const response = await callHfModel(prompt);

        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const summaryData = JSON.parse(cleanedResponse);

        return {
            overallRisk,
            totalFindings: findings.length,
            criticalCount,
            highCount,
            mediumCount,
            lowCount,
            summary: summaryData.summary,
            businessImpact: summaryData.businessImpact,
            actionItems: summaryData.actionItems,
            timeline: summaryData.timeline
        };
    } catch (error) {
        console.error('Summary generation error:', error);
        return {
            overallRisk: findings.some(f => f.riskLevel === 'CRITICAL') ? 'CRITICAL' : 'HIGH',
            totalFindings: findings.length,
            criticalCount: findings.filter(f => f.riskLevel === 'CRITICAL').length,
            highCount: findings.filter(f => f.riskLevel === 'HIGH').length,
            mediumCount: findings.filter(f => f.riskLevel === 'MEDIUM').length,
            lowCount: findings.filter(f => f.riskLevel === 'LOW').length,
            summary: `Found ${findings.length} potential security issues requiring immediate attention.`,
            businessImpact: 'Manual assessment required.',
            actionItems: ['Review all findings', 'Revoke exposed credentials', 'Implement secret management'],
            timeline: 'Address critical issues within 1 hour, all others within 24 hours.'
        };
    }
}

/**
 * Check if AI is available
 */
export function isAIAvailable(): boolean {
    return !!process.env.HF_API_KEY;
}
