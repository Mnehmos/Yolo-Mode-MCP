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

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
    return path.join(os.homedir(), '.mcp', 'config.json');
}

/**
 * Save the entire config to disk
 */
export function saveConfig(config: Config): void {
    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Update a specific config value using dot notation path
 * @param keyPath - Dot-notation path like "cliPolicy.timeoutMs"
 * @param value - New value to set
 * @returns Updated config
 */
export function updateConfigValue(keyPath: string, value: any): Config {
    const config = loadConfig();
    const keys = keyPath.split('.');
    
    // Navigate to the nested property and set it
    let current: any = config;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) {
            throw new Error(`Invalid config path: ${keyPath}`);
        }
        current = current[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    if (current[lastKey] === undefined) {
        throw new Error(`Invalid config path: ${keyPath}`);
    }
    
    current[lastKey] = value;
    saveConfig(config);
    
    return config;
}

/**
 * Get the default config for reference
 */
export function getDefaultConfig(): Config {
    return { ...DEFAULT_CONFIG };
}
