import { z } from 'zod';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config';
import { logAudit } from '../audit';

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
