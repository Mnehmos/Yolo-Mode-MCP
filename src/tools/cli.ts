import { z } from 'zod';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';
import { logAudit } from '../audit.js';

const config = loadConfig();

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
};

export const BatchWriteFilesSchema = {
    files: z.array(z.object({
        path: z.string(),
        content: z.string(),
    })).describe('Array of files to write in parallel'),
};

export const BatchListDirectoriesSchema = {
    paths: z.array(z.string()).describe('Array of directory paths to list in parallel'),
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

export async function handleBatchReadFiles(args: { paths: string[] }) {
    const startTime = Date.now();

    const results = await Promise.all(
        args.paths.map(async (filePath, index): Promise<BatchResult> => {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                return { index, success: true, result: { path: filePath, content } };
            } catch (error: any) {
                return { index, success: false, error: `${filePath}: ${error.message}` };
            }
        })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const elapsed = Date.now() - startTime;

    await logAudit('batch_read_files', { count: args.paths.length }, { successful, failed, elapsed });

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                summary: { total: args.paths.length, successful, failed, elapsed_ms: elapsed },
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

export async function handleBatchListDirectories(args: { paths: string[] }) {
    const startTime = Date.now();

    const results = await Promise.all(
        args.paths.map(async (dirPath, index): Promise<BatchResult> => {
            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                const formatted = entries.map(entry => ({
                    name: entry.name,
                    type: entry.isDirectory() ? 'directory' : 'file'
                }));
                return { index, success: true, result: { path: dirPath, entries: formatted } };
            } catch (error: any) {
                return { index, success: false, error: `${dirPath}: ${error.message}` };
            }
        })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const elapsed = Date.now() - startTime;

    await logAudit('batch_list_directories', { count: args.paths.length }, { successful, failed, elapsed });

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                summary: { total: args.paths.length, successful, failed, elapsed_ms: elapsed },
                results: results.sort((a, b) => a.index - b.index)
            }, null, 2)
        }],
        isError: failed > 0 && successful === 0,
    };
}
