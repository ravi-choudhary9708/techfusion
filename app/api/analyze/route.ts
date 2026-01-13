import { NextRequest, NextResponse } from 'next/server';
import {
    analyzeContext,
    classifySecret,
    generateRemediation,
    generateSecuritySummary,
    isAIAvailable
} from '@/lib/ai-analyzer';

export async function POST(req: NextRequest) {
    try {
        // Check if AI is available
        if (!isAIAvailable()) {
            return NextResponse.json({
                error: 'AI analysis is not configured. Please set GEMINI_API_KEY in .env.local'
            }, { status: 503 });
        }

        const body = await req.json();
        const { findings, generateSummary = true } = body;

        if (!findings || !Array.isArray(findings)) {
            return NextResponse.json({
                error: 'Invalid request: findings array required'
            }, { status: 400 });
        }

        // Process each finding with AI analysis in parallel
        const enhancedFindings = await Promise.all(
            findings.map(async (finding) => {
                try {
                    // Perform context-aware analysis
                    const aiAnalysis = await analyzeContext(
                        finding.type,
                        finding.value,
                        finding.context,
                        finding.filename
                    );

                    // Smart classification
                    const classification = await classifySecret(
                        finding.value,
                        finding.context
                    );

                    // Generate remediation steps
                    const remediation = await generateRemediation(
                        finding.type,
                        finding.riskLevel,
                        finding.value
                    );

                    return {
                        ...finding,
                        aiAnalysis,
                        classification,
                        remediation
                    };
                } catch (error) {
                    console.error(`Error analyzing finding:`, error);
                    // Return finding without AI enhancements if analysis fails
                    return finding;
                }
            })
        );

        // Generate executive summary if requested
        let summary = null;
        if (generateSummary && enhancedFindings.length > 0) {
            try {
                summary = await generateSecuritySummary(enhancedFindings);
            } catch (error) {
                console.error('Error generating summary:', error);
            }
        }

        return NextResponse.json({
            findings: enhancedFindings,
            summary
        });

    } catch (error) {
        console.error('AI Analysis error:', error);
        return NextResponse.json({
            error: 'Failed to process AI analysis'
        }, { status: 500 });
    }
}
