import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Config {
    storage: {
        type: 'sqlite' | 'json';
        path: string;
    };
    cliPolicy: {
        mode: 'allow-all' | 'restricted';
        extraBlockedPatterns: string[];
        timeoutMs: number;
    };
    crud: {
        defaultLimit: number;
    };
}

const DEFAULT_CONFIG: Config = {
    storage: {
        type: 'sqlite',
        path: '~/.mcp/workspace.db',
    },
    cliPolicy: {
        mode: 'allow-all',
        extraBlockedPatterns: [],
        timeoutMs: 30000,
    },
    crud: {
        defaultLimit: 1000,
    },
};

export function loadConfig(): Config {
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.mcp', 'config.json');

    try {
        if (fs.existsSync(configPath)) {
            const fileContent = fs.readFileSync(configPath, 'utf-8');
            const userConfig = JSON.parse(fileContent);

            // Deep merge with defaults (simplified)
            return {
                storage: { ...DEFAULT_CONFIG.storage, ...userConfig.storage },
                cliPolicy: { ...DEFAULT_CONFIG.cliPolicy, ...userConfig.cliPolicy },
                crud: { ...DEFAULT_CONFIG.crud, ...userConfig.crud },
            };
        }
    } catch (error) {
        console.error('Failed to load config, using defaults:', error);
    }

    return DEFAULT_CONFIG;
}

export function expandHome(filePath: string): string {
    if (filePath.startsWith('~')) {
        return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
}
