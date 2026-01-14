"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Shield, AlertTriangle, CheckCircle, Loader2, Activity, Target, Brain, Sparkles, ChevronDown, ChevronUp, Copy, ExternalLink, Zap, GitBranch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Types from our API
interface AIAnalysis {
    isRealThreat: boolean;
    confidence: number;
    reasoning: string;
}

interface SecretClassification {
    type: string;
    probability: number;
}

interface RemediationStep {
    step: number;
    title: string;
    description: string;
    command?: string;
    url?: string;
}

interface RemediationSteps {
    immediate: RemediationStep[];
    followUp: RemediationStep[];
    prevention: RemediationStep[];
}

interface SecuritySummary {
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

interface Finding {
    type: string;
    value: string;
    line: number;
    entropy: number;
    riskScore: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    context: string;
    file?: string; // For repository scans
    aiAnalysis?: AIAnalysis;
    classification?: SecretClassification[];
    remediation?: RemediationSteps;
}

interface RepoMetadata {
    repository: string;
    branch: string;
    filesScanned: number;
    totalFiles?: number;
    totalSize?: string;
    limitReached?: boolean;
}

export function Scanner() {
    const [activeTab, setActiveTab] = useState<"file" | "text" | "repo">("text");
    const [textInput, setTextInput] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [repoUrl, setRepoUrl] = useState("");
    const [branch, setBranch] = useState("main");
    const [isScanning, setIsScanning] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [findings, setFindings] = useState<Finding[] | null>(null);
    const [repoMetadata, setRepoMetadata] = useState<RepoMetadata | null>(null);
    const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedRemediation, setExpandedRemediation] = useState<number | null>(null);
    const [useAI, setUseAI] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleScan = async () => {
        setIsScanning(true);
        setFindings(null);
        setRepoMetadata(null);
        setSecuritySummary(null);
        setError(null);

        try {
            let currentFindings: Finding[] = [];
            let metadata: RepoMetadata | null = null;

            // Handle Repository Scan
            if (activeTab === "repo") {
                if (!repoUrl) {
                    setError("Please provide a repository URL.");
                    setIsScanning(false);
                    return;
                }

                const repoResponse = await fetch("/api/scan-repo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ repoUrl, branch })
                });

                if (!repoResponse.ok) {
                    const errorData = await repoResponse.json();
                    throw new Error(errorData.error || "Repository scan failed");
                }

                const repoData = await repoResponse.json();
                currentFindings = repoData.findings;
                metadata = repoData.metadata;
                setRepoMetadata(metadata);
                setFindings(currentFindings);
            } else {
                // Handle File/Text Scan
                const formData = new FormData();
                if (activeTab === "file" && file) {
                    formData.append("file", file);
                } else if (activeTab === "text" && textInput) {
                    formData.append("text", textInput);
                } else {
                    setError("Please provide content to scan.");
                    setIsScanning(false);
                    return;
                }

                // 1. Initial Standard Scan
                const scanResponse = await fetch("/api/scan", {
                    method: "POST",
                    body: formData,
                });

                if (!scanResponse.ok) throw new Error("Scan failed");

                const scanData = await scanResponse.json();
                let currentFindings = scanData.findings;
                setFindings(currentFindings);

                // 2. AI Analysis (if enabled and findings exist)
                if (useAI && currentFindings.length > 0) {
                    setIsAnalyzing(true);
                    try {
                        const analyzeResponse = await fetch("/api/analyze", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ findings: currentFindings })
                        });

                        if (analyzeResponse.ok) {
                            const analyzeData = await analyzeResponse.json();
                            setFindings(analyzeData.findings);
                            setSecuritySummary(analyzeData.summary);
                        } else {
                            console.warn("AI analysis failed, showing standard results");
                        }
                    } catch (aiError) {
                        console.error("AI Analysis error:", aiError);
                    } finally {
                        setIsAnalyzing(false);
                    }
                }
            }

        } catch (err) {
            console.error(err);
            setError("An error occurred during scanning. Please try again.");
        } finally {
            setIsScanning(false);
            setIsAnalyzing(false);
        }
    };

    const clearResults = () => {
        setFindings(null);
        setRepoMetadata(null);
        setSecuritySummary(null);
        setError(null);
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'text-red-500 bg-red-500/20 border-red-500/30';
            case 'HIGH': return 'text-orange-500 bg-orange-500/20 border-orange-500/30';
            case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
            case 'LOW': return 'text-blue-500 bg-blue-500/20 border-blue-500/30';
            default: return 'text-zinc-500 bg-zinc-500/20 border-zinc-500/30';
        }
    };

    const getRiskEmoji = (level: string) => {
        switch (level) {
            case 'CRITICAL': return '🔴';
            case 'HIGH': return '🟠';
            case 'MEDIUM': return '🟡';
            case 'LOW': return '🔵';
            default: return '⚪';
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            {/* Input Section */}
            <div className="bg-card border border-white/5 rounded-2xl p-1 overflow-hidden shadow-2xl">
                <div className="flex bg-secondary/30 rounded-t-xl">
                    <button
                        onClick={() => setActiveTab("text")}
                        className={cn(
                            "flex-1 py-4 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                            activeTab === "text"
                                ? "bg-card text-primary shadow-sm rounded-t-xl border-t border-x border-white/5"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                        )}
                    >
                        <FileText className="w-4 h-4" /> Paste Text
                    </button>
                    <button
                        onClick={() => setActiveTab("file")}
                        className={cn(
                            "flex-1 py-4 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                            activeTab === "file"
                                ? "bg-card text-primary shadow-md rounded-t-xl border-t border-x border-white/5"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                        )}
                    >
                        <Upload className="w-4 h-4" /> Upload File
                    </button>
                    <button
                        onClick={() => setActiveTab("repo")}
                        className={cn(
                            "flex-1 py-4 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                            activeTab === "repo"
                                ? "bg-card text-primary shadow-md rounded-t-xl border-t border-x border-white/5"
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                        )}
                    >
                        <GitBranch className="w-4 h-4" /> Git Repository
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    <AnimatePresence mode="wait">
                        {activeTab === "text" ? (
                            <motion.div
                                key="text"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <textarea
                                    className="w-full h-64 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-all placeholder:text-zinc-600"
                                    placeholder="Paste your code or text here..."
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    spellCheck={false}
                                />
                            </motion.div>
                        ) : activeTab === "file" ? (
                            <motion.div
                                key="file"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div
                                    className="w-full h-64 border-2 border-dashed border-zinc-700 hover:border-primary rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer bg-zinc-950/30 hover:bg-zinc-900/50 group"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const droppedFile = e.dataTransfer.files[0];
                                        if (droppedFile) setFile(droppedFile);
                                    }}
                                >
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) setFile(e.target.files[0]);
                                        }}
                                    />
                                    <div className="p-4 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors mb-4">
                                        <Upload className="w-8 h-8 text-zinc-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <p className="text-zinc-300 font-medium">{file ? file.name : "Click to upload or drag and drop"}</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="repo"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Repository URL</label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-zinc-600"
                                        placeholder="https://github.com/username/repository.git"
                                        value={repoUrl}
                                        onChange={(e) => setRepoUrl(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Branch</label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-zinc-600"
                                        placeholder="main"
                                        value={branch}
                                        onChange={(e) => setBranch(e.target.value)}
                                    />
                                </div>
                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                                    <p className="text-xs text-blue-400 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>Only public GitHub repositories are supported. The repository will be cloned temporarily and deleted after scanning.</span>
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-between items-center pt-4 border-t border-zinc-800/50">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${useAI ? 'bg-primary' : 'bg-zinc-700'}`}
                                onClick={() => setUseAI(!useAI)}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${useAI ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-1.5">
                                <Brain className="w-4 h-4" /> AI-Powered Analysis
                            </span>
                        </label>

                        <div className="flex gap-3">
                            {(textInput || file || repoUrl) && <button
                                onClick={() => { setTextInput(""); setFile(null); setRepoUrl(""); clearResults() }}
                                disabled={isScanning}
                                className="px-6 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Clear
                            </button>}

                            <button
                                onClick={handleScan}
                                disabled={
                                    isScanning ||
                                    isAnalyzing ||
                                    (activeTab === 'text' && !textInput) ||
                                    (activeTab === 'file' && !file) ||
                                    (activeTab === 'repo' && !repoUrl)
                                }
                                className="px-8 py-2.5 rounded-lg bg-primary hover:bg-violet-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Brain className="w-4 h-4 animate-pulse" /> Analyzing with AI...
                                    </>
                                ) : isScanning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-4 h-4" /> Scan for Secrets
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Repository Metadata */}
            <AnimatePresence>
                {repoMetadata && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-white/5 rounded-2xl p-6 shadow-2xl"
                    >
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <GitBranch className="w-5 h-5 text-primary" />
                            Repository Scan Results
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                                <div className="text-xs text-zinc-500 mb-1">Repository</div>
                                <div className="text-sm font-semibold text-zinc-200">{repoMetadata.repository}</div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                                <div className="text-xs text-zinc-500 mb-1">Branch</div>
                                <div className="text-sm font-semibold text-zinc-200">{repoMetadata.branch}</div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                                <div className="text-xs text-zinc-500 mb-1">Files Scanned</div>
                                <div className="text-sm font-semibold text-zinc-200">{repoMetadata.filesScanned}{repoMetadata.totalFiles ? ` / ${repoMetadata.totalFiles}` : ''}</div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                                <div className="text-xs text-zinc-500 mb-1">Total Size</div>
                                <div className="text-sm font-semibold text-zinc-200">{repoMetadata.totalSize || 'N/A'}</div>
                            </div>
                        </div>
                        {repoMetadata.limitReached && (
                            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                <p className="text-xs text-yellow-400">⚠️ Repository scan limited to 500 files for performance</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Security Summary */}
            <AnimatePresence>
                {securitySummary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-2xl"
                    >
                        <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/50 p-6 border-b border-white/5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Executive Security Summary
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-white/5">
                                        <div className="text-sm text-zinc-400 mb-1">Overall Risk Level</div>
                                        <div className={cn("text-2xl font-bold flex items-center gap-2",
                                            securitySummary.overallRisk === 'CRITICAL' ? 'text-red-500' :
                                                securitySummary.overallRisk === 'HIGH' ? 'text-orange-500' :
                                                    securitySummary.overallRisk === 'MEDIUM' ? 'text-yellow-500' : 'text-blue-500'
                                        )}>
                                            {getRiskEmoji(securitySummary.overallRisk)} {securitySummary.overallRisk}
                                        </div>
                                    </div>
                                    <div className="bg-zinc-950/50 rounded-xl p-4 border border-white/5">
                                        <div className="text-sm text-zinc-400 mb-2">Findings Breakdown</div>
                                        <div className="flex gap-2">
                                            {securitySummary.criticalCount > 0 && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/20">{securitySummary.criticalCount} Critical</span>}
                                            {securitySummary.highCount > 0 && <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded border border-orange-500/20">{securitySummary.highCount} High</span>}
                                            {securitySummary.mediumCount > 0 && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/20">{securitySummary.mediumCount} Medium</span>}
                                            {securitySummary.lowCount > 0 && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/20">{securitySummary.lowCount} Low</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-zinc-300 text-sm leading-relaxed">{securitySummary.summary}</p>
                                    <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
                                        <div className="text-xs font-semibold text-red-400 mb-1 uppercase tracking-wider">Potential Business Impact</div>
                                        <p className="text-zinc-400 text-sm">{securitySummary.businessImpact}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/5 grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-primary" /> Prioritized Action Items
                                    </h4>
                                    <ul className="space-y-2">
                                        {securitySummary.actionItems.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" /> Recommended Timeline
                                    </h4>
                                    <p className="text-sm text-zinc-400 bg-zinc-950/30 p-3 rounded-lg border border-white/5">
                                        {securitySummary.timeline}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detailed Findings */}
            <AnimatePresence>
                {findings && findings.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    Detailed Technical Findings
                                </h3>
                                <span className="text-sm text-zinc-500">{findings.length} findings</span>
                            </div>

                            <div className="divide-y divide-zinc-800/50">
                                {findings.map((f, i) => (
                                    <div key={i} className="p-6 hover:bg-white/[0.02] transition-colors">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Left: Finding Details */}
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-zinc-500 font-mono text-xs">Line #{f.line}</span>
                                                    <h4 className="text-zinc-200 font-semibold text-base">{f.type}</h4>
                                                    <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5", getRiskColor(f.riskLevel))}>
                                                        {getRiskEmoji(f.riskLevel)} {f.riskLevel}
                                                    </div>
                                                </div>

                                                {/* Secret Value & Context */}
                                                <div className="space-y-2">
                                                    <div className="bg-zinc-950/50 rounded-lg border border-zinc-800 p-3 font-mono text-sm break-all text-red-300 selection:bg-red-900/30">
                                                        {f.value}
                                                    </div>
                                                    <div className="relative group">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-800 rounded-l" />
                                                        <pre className="pl-4 py-2 text-xs text-zinc-500 overflow-x-auto whitespace-pre-wrap font-mono">
                                                            {f.context}
                                                        </pre>
                                                    </div>
                                                </div>

                                                {/* AI Analysis Block */}
                                                {f.aiAnalysis && (
                                                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Brain className="w-4 h-4 text-primary" />
                                                            <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Context Analysis</span>
                                                        </div>
                                                        <div className="flex items-center gap-4 mb-2">
                                                            <div className={cn("text-sm font-semibold", f.aiAnalysis.isRealThreat ? "text-red-400" : "text-green-400")}>
                                                                {f.aiAnalysis.isRealThreat ? "⚠️ Real Threat Detected" : "✅ Likely Test/Example"}
                                                            </div>
                                                            <div className="text-xs text-zinc-500">
                                                                Confidence: {f.aiAnalysis.confidence}%
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-zinc-400 leading-relaxed">
                                                            {f.aiAnalysis.reasoning}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Remediation & Stats */}
                                            <div className="w-full md:w-80 space-y-4 flex-shrink-0">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                                        <div className="text-xs text-zinc-500 mb-1">Risk Score</div>
                                                        <div className="text-lg font-mono font-bold text-zinc-300">{f.riskScore}</div>
                                                    </div>
                                                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                                        <div className="text-xs text-zinc-500 mb-1">Entropy</div>
                                                        <div className="text-lg font-mono font-bold text-zinc-300">{f.entropy.toFixed(2)}</div>
                                                    </div>
                                                </div>

                                                {f.classification && f.classification.length > 0 && (
                                                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5">
                                                        <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Classification</div>
                                                        {f.classification.map((c, idx) => (
                                                            <div key={idx} className="flex justify-between text-sm mb-1 last:mb-0">
                                                                <span className="text-zinc-300">{c.type}</span>
                                                                <span className="text-zinc-500">{c.probability}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => setExpandedRemediation(expandedRemediation === i ? null : i)}
                                                    className="w-full py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors flex items-center justify-between"
                                                >
                                                    {expandedRemediation === i ? 'Hide Remediation' : 'View Remediation Steps'}
                                                    {expandedRemediation === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Remediation Steps */}
                                        <AnimatePresence>
                                            {expandedRemediation === i && f.remediation && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-6 pt-6 border-t border-white/5 grid md:grid-cols-3 gap-6">
                                                        <div className="space-y-3">
                                                            <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                                                                <Zap className="w-3 h-3" /> Immediate Action
                                                            </h5>
                                                            {f.remediation.immediate.map((step, idx) => (
                                                                <div key={idx} className="text-sm bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                                                                    <div className="font-medium text-red-200 mb-1">{step.title}</div>
                                                                    <p className="text-zinc-400 text-xs mb-2">{step.description}</p>
                                                                    {step.url && (
                                                                        <a href={step.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                                                                            Open Console <ExternalLink className="w-3 h-3" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="space-y-3">
                                                            <h5 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                                                                <Shield className="w-3 h-3" /> Follow-Up
                                                            </h5>
                                                            {f.remediation.followUp.map((step, idx) => (
                                                                <div key={idx} className="text-sm bg-orange-500/5 p-3 rounded-lg border border-orange-500/10">
                                                                    <div className="font-medium text-orange-200 mb-1">{step.title}</div>
                                                                    <p className="text-zinc-400 text-xs">{step.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="space-y-3">
                                                            <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                                                <Target className="w-3 h-3" /> Prevention
                                                            </h5>
                                                            {f.remediation.prevention.map((step, idx) => (
                                                                <div key={idx} className="text-sm bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                                                                    <div className="font-medium text-blue-200 mb-1">{step.title}</div>
                                                                    <p className="text-zinc-400 text-xs">{step.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {findings && findings.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center"
                    >
                        <div className="inline-flex justify-center items-center p-3 rounded-full bg-green-500/20 mb-4">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-green-500 mb-2">No Secrets Found</h3>
                        <p className="text-zinc-400">Your code appears safely clean of common secrets.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center flex items-center justify-center gap-2"
                >
                    <AlertTriangle className="w-4 h-4" /> {error}
                </motion.div>
            )}
        </div>
    );
}
