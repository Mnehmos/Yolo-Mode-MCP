import { z } from 'zod';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';
import { logAudit } from '../audit.js';

const config = loadConfig();

// Token estimation helper
function estimateTokens(text: string | number): number {
    if (typeof text === 'number') return Math.ceil(text / 4);
    return Math.ceil(text.length / 4);
}

// Context budget calculator
interface ContextBudget {
    total: number;
    used: number;
    threshold: number;
    available: number;
}

function calculateContextBudget(
    contextWindow?: number,
    contextUsed?: number,
    contextThreshold?: number
): ContextBudget | null {
    if (!contextWindow || !contextUsed) return null;

    const threshold = contextThreshold ?? 0.7;
    const available = Math.floor((contextWindow - contextUsed) * threshold);

    return {
        total: contextWindow,
        used: contextUsed,
        threshold,
        available
    };
}

// Basic blocklist for safety even in YOLO mode
const BLOCKLIST = [
    'rm -rf /',
    'mkfs',
    ':(){:|:&};:', // fork bomb
    ...config.cliPolicy.extraBlockedPatterns
];

function isBlocked(command: string): boolean {
    return BLOCKLIST.some(pattern => command.includes(pattern));
}

export const ExecCliSchema = {
    command: z.string().describe('The command to execute'),
    cwd: z.string().optional().describe('Current working directory for the command'),
};

export async function handleExecCli(args: { command: string; cwd?: string }) {
    const { command, cwd } = args;

    if (isBlocked(command)) {
        const error = 'Command blocked by safety policy';
        await logAudit('exec_cli', args, null, error);
        throw new Error(error);
    }

    return new Promise((resolve, reject) => {
        exec(command, {
            cwd: cwd || process.cwd(),
            timeout: config.cliPolicy.timeoutMs
        }, async (error, stdout, stderr) => {
            const result = {
                stdout,
                stderr,
                exitCode: error ? error.code : 0
            };

            await logAudit('exec_cli', args, result, error ? error.message : null);

            if (error && !stdout && !stderr) {
                // If there was an error executing (e.g. command not found) and no output
                resolve({
                    content: [{ type: 'text', text: `Error: ${error.message}` }],
                    isError: true
                });
                return;
            }

            resolve({
                content: [
                    { type: 'text', text: stdout || '' },
                    { type: 'text', text: stderr ? `STDERR:\n${stderr}` : '' }
                ],
                isError: !!error
            });
        });
    });
}

// File system tools for convenience
export const ReadFileSchema = {
    path: z.string(),
};

export const WriteFileSchema = {
    path: z.string(),
    content: z.string(),
};

export const ListDirectorySchema = {
    path: z.string(),
};

// String replace schema - renamed parameters to avoid potential filtering
export const StrReplaceSchema = {
    path: z.string().describe('Path to the file to edit'),
    oldText: z.string().describe('Text to replace (must be unique in file)'),
    newText: z.string().optional().describe('Replacement text (empty to delete)'),
};

// Batch operation schemas for parallel execution
export const BatchExecCliSchema = {
    commands: z.array(z.object({
        command: z.string().describe('The command to execute'),
        cwd: z.string().optional().describe('Current working directory for the command'),
    })).describe('Array of commands to execute in parallel'),
};

export const BatchReadFilesSchema = {
    paths: z.array(z.string()).describe('Array of file paths to read in parallel'),
    contextWindow: z.number().optional().describe('LLM total context window size'),
    contextUsed: z.number().optional().describe('Tokens already used in conversation'),
    contextThreshold: z.number().optional().describe('Safety threshold (default: 0.7 for 70%)'),
};

export const BatchWriteFilesSchema = {
    files: z.array(z.object({
        path: z.string(),
        content: z.string(),
    })).describe('Array of files to write in parallel'),
};

export const BatchListDirectoriesSchema = {
    paths: z.array(z.string()).describe('Array of directory paths to list in parallel'),
    contextWindow: z.number().optional().describe('LLM total context window size'),
    contextUsed: z.number().optional().describe('Tokens already used in conversation'),
    contextThreshold: z.number().optional().describe('Safety threshold (default: 0.7 for 70%)'),
};

// Read specific lines from a file (token-efficient alternative to reading entire file)
export const ReadFileLinesSchema = {
    path: z.string().describe('Path to the file to read'),
    startLine: z.number().optional().describe('Starting line number (1-indexed, default: 1)'),
    endLine: z.number().optional().describe('Ending line number (inclusive, default: end of file)'),
    includeLineNumbers: z.boolean().optional().describe('Include line numbers in output (default: true)'),
};

// Search for patterns within a file and return matching lines
export const SearchInFileSchema = {
    path: z.string().describe('Path to the file to search'),
    pattern: z.string().describe('Text or regex pattern to search for'),
    isRegex: z.boolean().optional().describe('Treat pattern as regex (default: false)'),
    caseSensitive: z.boolean().optional().describe('Case sensitive search (default: true)'),
    contextLines: z.number().optional().describe('Number of lines of context before and after matches (default: 0)'),
    maxMatches: z.number().optional().describe('Maximum number of matches to return (default: 100)'),
};

export async function handleReadFile(args: { path: string }) {
    try {
        const content = fs.readFileSync(args.path, 'utf-8');
        await logAudit('read_file', args, 'success');
        return {
            content: [{ type: 'text', text: content }],
        };
    } catch (error: any) {
        await logAudit('read_file', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error reading file: ${error.message}` }],
            isError: true,
        };
    }
}

// Read specific lines from a file (token-efficient)
export async function handleReadFileLines(args: {
    path: string;
    startLine?: number;
    endLine?: number;
    includeLineNumbers?: boolean;
}) {
    try {
        const content = fs.readFileSync(args.path, 'utf-8');
        const allLines = content.split('\n');
        const totalLines = allLines.length;

        const startLine = Math.max(1, args.startLine ?? 1);
        const endLine = Math.min(totalLines, args.endLine ?? totalLines);
        const includeLineNumbers = args.includeLineNumbers !== false; // default true

        if (startLine > totalLines) {
            return {
                content: [{ type: 'text', text: `Error: startLine ${startLine} exceeds total lines ${totalLines}` }],
                isError: true,
            };
        }

        // Extract the requested lines (convert to 0-indexed)
        const selectedLines = allLines.slice(startLine - 1, endLine);

        let output: string;
        if (includeLineNumbers) {
            const lineNumWidth = String(endLine).length;
            output = selectedLines.map((line, idx) => {
                const lineNum = String(startLine + idx).padStart(lineNumWidth, ' ');
                return `${lineNum}: ${line}`;
            }).join('\n');
        } else {
            output = selectedLines.join('\n');
        }

        await logAudit('read_file_lines', { path: args.path, startLine, endLine }, `read ${selectedLines.length} lines`);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    path: args.path,
                    totalLines,
                    startLine,
                    endLine,
                    linesReturned: selectedLines.length,
                    content: output
                }, null, 2)
            }],
        };
    } catch (error: any) {
        await logAudit('read_file_lines', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error reading file: ${error.message}` }],
            isError: true,
        };
    }
}

// Search for patterns within a file
export async function handleSearchInFile(args: {
    path: string;
    pattern: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
    contextLines?: number;
    maxMatches?: number;
}) {
    try {
        const content = fs.readFileSync(args.path, 'utf-8');
        const lines = content.split('\n');
        const totalLines = lines.length;

        const isRegex = args.isRegex ?? false;
        const caseSensitive = args.caseSensitive !== false; // default true
        const contextLines = args.contextLines ?? 0;
        const maxMatches = args.maxMatches ?? 100;

        // Build the search pattern
        let regex: RegExp;
        try {
            if (isRegex) {
                regex = new RegExp(args.pattern, caseSensitive ? 'g' : 'gi');
            } else {
                // Escape special regex characters for literal search
                const escaped = args.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
            }
        } catch (regexError: any) {
            return {
                content: [{ type: 'text', text: `Error: Invalid regex pattern: ${regexError.message}` }],
                isError: true,
            };
        }

        interface Match {
            lineNumber: number;
            line: string;
            context?: {
                before: Array<{ lineNumber: number; line: string }>;
                after: Array<{ lineNumber: number; line: string }>;
            };
        }

        const matches: Match[] = [];
        const matchedLineNumbers = new Set<number>();

        // Find all matching lines
        for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
            if (regex.test(lines[i])) {
                matchedLineNumbers.add(i);
                const match: Match = {
                    lineNumber: i + 1,
                    line: lines[i],
                };

                if (contextLines > 0) {
                    const beforeLines: Array<{ lineNumber: number; line: string }> = [];
                    const afterLines: Array<{ lineNumber: number; line: string }> = [];

                    // Get context before
                    for (let b = Math.max(0, i - contextLines); b < i; b++) {
                        beforeLines.push({ lineNumber: b + 1, line: lines[b] });
                    }

                    // Get context after
                    for (let a = i + 1; a <= Math.min(lines.length - 1, i + contextLines); a++) {
                        afterLines.push({ lineNumber: a + 1, line: lines[a] });
                    }

                    match.context = { before: beforeLines, after: afterLines };
                }

                matches.push(match);
            }
            // Reset regex lastIndex for next test
            regex.lastIndex = 0;
        }

        await logAudit('search_in_file', { path: args.path, pattern: args.pattern }, `found ${matches.length} matches`);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    path: args.path,
                    pattern: args.pattern,
                    totalLines,
                    matchCount: matches.length,
                    truncated: matches.length >= maxMatches,
                    matches
                }, null, 2)
            }],
        };
    } catch (error: any) {
        await logAudit('search_in_file', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error searching file: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleWriteFile(args: { path: string; content: string }) {
    try {
        const dir = path.dirname(args.path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(args.path, args.content, 'utf-8');
        await logAudit('write_file', args, 'success');
        return {
            content: [{ type: 'text', text: `Successfully wrote to ${args.path}` }],
        };
    } catch (error: any) {
        await logAudit('write_file', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error writing file: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleListDirectory(args: { path: string }) {
    try {
        const entries = fs.readdirSync(args.path, { withFileTypes: true });
        const formatted = entries.map(entry => {
            return `${entry.isDirectory() ? '[DIR]' : '[FILE]'} ${entry.name}`;
        }).join('\n');

        await logAudit('list_directory', args, 'success');
        return {
            content: [{ type: 'text', text: formatted }],
        };
    } catch (error: any) {
        await logAudit('list_directory', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error listing directory: ${error.message}` }],
            isError: true,
        };
    }
}

// String replace handler - replaces a unique string in a file
// Accepts both old parameter names (old_str/new_str) and new ones (oldText/newText) for compatibility
export async function handleStrReplace(args: { path: string; oldText?: string; newText?: string; old_str?: string; new_str?: string }) {
    try {
        // Support both parameter naming conventions
        const oldStr = args.oldText ?? args.old_str;
        const newStr = args.newText ?? args.new_str ?? '';
        
        if (!oldStr) {
            return {
                content: [{ type: 'text', text: 'Error: oldText parameter is required' }],
                isError: true,
            };
        }

        // Read the file
        if (!fs.existsSync(args.path)) {
            const error = `File not found: ${args.path}`;
            await logAudit('str_replace', args, null, error);
            return {
                content: [{ type: 'text', text: `Error: ${error}` }],
                isError: true,
            };
        }

        const content = fs.readFileSync(args.path, 'utf-8');

        // Count occurrences
        const occurrences = content.split(oldStr).length - 1;

        if (occurrences === 0) {
            const error = `String not found in file: "${oldStr.substring(0, 50)}${oldStr.length > 50 ? '...' : ''}"`;
            await logAudit('str_replace', args, null, error);
            return {
                content: [{ type: 'text', text: `Error: ${error}` }],
                isError: true,
            };
        }

        if (occurrences > 1) {
            const error = `String appears ${occurrences} times in file. The string to replace must be unique. Add more context to make it unique.`;
            await logAudit('str_replace', args, null, error);
            return {
                content: [{ type: 'text', text: `Error: ${error}` }],
                isError: true,
            };
        }

        // Replace the string
        const newContent = content.replace(oldStr, newStr);
        fs.writeFileSync(args.path, newContent, 'utf-8');

        await logAudit('str_replace', { path: args.path, oldText_length: oldStr.length, newText_length: newStr.length }, 'success');

        return {
            content: [{ type: 'text', text: `Successfully replaced string in ${args.path}` }],
        };
    } catch (error: any) {
        await logAudit('str_replace', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

// Batch handlers for parallel execution
interface BatchResult {
    index: number;
    success: boolean;
    result?: any;
    error?: string;
}

export async function handleBatchExecCli(args: { commands: Array<{ command: string; cwd?: string }> }) {
    const startTime = Date.now();

    const results = await Promise.all(
        args.commands.map(async (cmd, index): Promise<BatchResult> => {
            if (isBlocked(cmd.command)) {
                await logAudit('batch_exec_cli_item', cmd, null, 'Command blocked by safety policy');
                return { index, success: false, error: 'Command blocked by safety policy' };
            }

            return new Promise((resolve) => {
                exec(cmd.command, {
                    cwd: cmd.cwd || process.cwd(),
                    timeout: config.cliPolicy.timeoutMs
                }, async (error, stdout, stderr) => {
                    if (error && !stdout && !stderr) {
                        resolve({ index, success: false, error: error.message });
                    } else {
                        resolve({
                            index,
                            success: !error,
                            result: { stdout: stdout || '', stderr: stderr || '', exitCode: error ? error.code : 0 }
                        });
                    }
                });
            });
        })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const elapsed = Date.now() - startTime;

    await logAudit('batch_exec_cli', { count: args.commands.length }, { successful, failed, elapsed });

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                summary: { total: args.commands.length, successful, failed, elapsed_ms: elapsed },
                results: results.sort((a, b) => a.index - b.index)
            }, null, 2)
        }],
        isError: failed > 0 && successful === 0,
    };
}

export async function handleBatchReadFiles(args: {
    paths: string[];
    contextWindow?: number;
    contextUsed?: number;
    contextThreshold?: number;
}) {
    const startTime = Date.now();
    const budget = calculateContextBudget(args.contextWindow, args.contextUsed, args.contextThreshold);

    let cumulativeTokens = 0;
    const results = await Promise.all(
        args.paths.map(async (filePath, index): Promise<BatchResult> => {
            try {
                const stats = fs.statSync(filePath);
                const sizeBytes = stats.size;
                const estimatedTokens = estimateTokens(sizeBytes);

                // Context-aware decision
                if (budget && (cumulativeTokens + estimatedTokens) > budget.available) {
                    // Too large - return info only with suggestions
                    let lines: number | null = null;
                    try {
                        if (sizeBytes < 10_000_000) { // Only count lines for files < 10MB
                            const content = fs.readFileSync(filePath, 'utf-8');
                            lines = content.split('\n').length;
                        }
                    } catch {
                        // Binary file or encoding issue
                    }

                    return {
                        index,
                        success: true,
                        result: {
                            path: filePath,
                            contentOmitted: true,
                            reason: 'File too large for available context',
                            sizeBytes,
                            lines,
                            estimatedTokens,
                            suggestions: lines ? [
                                `Use read_file_lines({ path: '${filePath}', startLine: 1, endLine: 100 }) for preview`,
                                `Use read_file_lines({ path: '${filePath}', startLine: ${Math.max(1, lines - 100)}, endLine: ${lines} }) for recent content`,
                                `Use search_in_file({ path: '${filePath}', pattern: 'YOUR_PATTERN' }) to find specific content`
                            ] : [
                                `File is too large (${Math.round(sizeBytes / 1024)}KB)`,
                                `Consider using specialized tools for this file type`
                            ]
                        }
                    };
                }

                // Fits in budget - return full content
                const content = fs.readFileSync(filePath, 'utf-8');
                cumulativeTokens += estimatedTokens;
                return {
                    index,
                    success: true,
                    result: { path: filePath, content, estimatedTokens }
                };
            } catch (error: any) {
                return { index, success: false, error: `${filePath}: ${error.message}` };
            }
        })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const elapsed = Date.now() - startTime;
    const hasOmitted = results.some(r => r.success && r.result?.contentOmitted);

    await logAudit('batch_read_files', { count: args.paths.length }, { successful, failed, elapsed });

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                summary: {
                    total: args.paths.length,
                    successful,
                    failed,
                    elapsed_ms: elapsed,
                    ...(budget ? {
                        contextBudget: budget.available,
                        estimatedResponseTokens: cumulativeTokens,
                        partial: hasOmitted
                    } : {})
                },
                results: results.sort((a, b) => a.index - b.index)
            }, null, 2)
        }],
        isError: failed > 0 && successful === 0,
    };
}

export async function handleBatchWriteFiles(args: { files: Array<{ path: string; content: string }> }) {
    const startTime = Date.now();

    const results = await Promise.all(
        args.files.map(async (file, index): Promise<BatchResult> => {
            try {
                const dir = path.dirname(file.path);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(file.path, file.content, 'utf-8');
                return { index, success: true, result: { path: file.path, written: true } };
            } catch (error: any) {
                return { index, success: false, error: `${file.path}: ${error.message}` };
            }
        })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const elapsed = Date.now() - startTime;

    await logAudit('batch_write_files', { count: args.files.length }, { successful, failed, elapsed });

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                summary: { total: args.files.length, successful, failed, elapsed_ms: elapsed },
                results: results.sort((a, b) => a.index - b.index)
            }, null, 2)
        }],
        isError: failed > 0,
    };
}

export async function handleBatchListDirectories(args: {
    paths: string[];
    contextWindow?: number;
    contextUsed?: number;
    contextThreshold?: number;
}) {
    const startTime = Date.now();
    const budget = calculateContextBudget(args.contextWindow, args.contextUsed, args.contextThreshold);

    let cumulativeTokens = 0;
    const results = await Promise.all(
        args.paths.map(async (dirPath, index): Promise<BatchResult> => {
            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                const formatted = entries.map(entry => ({
                    name: entry.name,
                    type: entry.isDirectory() ? 'directory' : 'file'
                }));

                const entryCount = entries.length;
                const estimatedTokens = estimateTokens(entryCount * 20); // ~20 chars per entry

                // Context-aware decision
                if (budget && (cumulativeTokens + estimatedTokens) > budget.available) {
                    // Too large - return info only with suggestions
                    return {
                        index,
                        success: true,
                        result: {
                            path: dirPath,
                            contentOmitted: true,
                            reason: 'Directory too large for available context',
                            entryCount,
                            estimatedTokens,
                            suggestions: [
                                `Use list_directory({ path: '${dirPath}' }) with grep to filter`,
                                `Use search_files({ directory: '${dirPath}', pattern: '*.{ext}' }) for specific file types`
                            ]
                        }
                    };
                }

                // Fits in budget - return full data
                cumulativeTokens += estimatedTokens;
                return {
                    index,
                    success: true,
                    result: { path: dirPath, entries: formatted, estimatedTokens }
                };
            } catch (error: any) {
                return { index, success: false, error: `${dirPath}: ${error.message}` };
            }
        })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const elapsed = Date.now() - startTime;
    const hasOmitted = results.some(r => r.success && r.result?.contentOmitted);

    await logAudit('batch_list_directories', { count: args.paths.length }, { successful, failed, elapsed });

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                summary: {
                    total: args.paths.length,
                    successful,
                    failed,
                    elapsed_ms: elapsed,
                    ...(budget ? {
                        contextBudget: budget.available,
                        estimatedResponseTokens: cumulativeTokens,
                        partial: hasOmitted
                    } : {})
                },
                results: results.sort((a, b) => a.index - b.index)
            }, null, 2)
        }],
        isError: failed > 0 && successful === 0,
    };
}
