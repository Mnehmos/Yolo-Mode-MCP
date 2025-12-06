import { z } from 'zod';

export interface ToolMetadata {
    name: string;
    category: string;
    description: string;
    keywords: string[];
    capabilities: string[];
    contextAware: boolean;
    estimatedTokenCost: 'low' | 'medium' | 'high' | 'variable';
}

// Tool metadata catalog
export const TOOL_CATALOG: ToolMetadata[] = [
    // Batch operations
    {
        name: 'batch_read_files',
        category: 'batch',
        description: 'Read multiple files in parallel with context-aware adaptive responses',
        keywords: ['read', 'files', 'parallel', 'batch', 'multiple', 'context'],
        capabilities: [
            'Parallel file reading',
            'Context-aware adaptive responses',
            'Automatic size estimation',
            'Smart suggestions for large files'
        ],
        contextAware: true,
        estimatedTokenCost: 'variable'
    },
    {
        name: 'batch_list_directories',
        category: 'batch',
        description: 'List multiple directories in parallel with context-aware adaptive responses',
        keywords: ['list', 'directories', 'parallel', 'batch', 'multiple', 'context', 'ls'],
        capabilities: [
            'Parallel directory listing',
            'Context-aware adaptive responses',
            'Automatic entry count estimation',
            'Smart suggestions for large directories'
        ],
        contextAware: true,
        estimatedTokenCost: 'variable'
    },
    {
        name: 'batch_execute_commands',
        category: 'batch',
        description: 'Execute multiple shell commands in parallel',
        keywords: ['execute', 'commands', 'parallel', 'batch', 'shell', 'cli'],
        capabilities: ['Parallel command execution', 'Aggregated results'],
        contextAware: false,
        estimatedTokenCost: 'variable'
    },

    // Filesystem operations
    {
        name: 'read_file',
        category: 'filesystem',
        description: 'Read entire contents of a file',
        keywords: ['read', 'file', 'cat', 'view', 'content'],
        capabilities: ['Read full file content'],
        contextAware: false,
        estimatedTokenCost: 'variable'
    },
    {
        name: 'read_file_lines',
        category: 'filesystem',
        description: 'Read specific line range from a file',
        keywords: ['read', 'file', 'lines', 'range', 'partial', 'head', 'tail'],
        capabilities: ['Targeted line reading', 'Efficient for large files'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
    {
        name: 'list_directory',
        category: 'filesystem',
        description: 'List contents of a single directory',
        keywords: ['list', 'directory', 'ls', 'dir', 'files'],
        capabilities: ['Directory listing', 'File type identification'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
    {
        name: 'search_files',
        category: 'filesystem',
        description: 'Search for files matching a pattern in a directory',
        keywords: ['search', 'find', 'pattern', 'glob', 'filter'],
        capabilities: ['Pattern matching', 'Recursive search', 'Glob support'],
        contextAware: false,
        estimatedTokenCost: 'medium'
    },
    {
        name: 'search_in_file',
        category: 'filesystem',
        description: 'Search for text pattern within a file',
        keywords: ['search', 'grep', 'pattern', 'regex', 'find', 'text'],
        capabilities: ['Regex search', 'Line number reporting', 'Context lines'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
    {
        name: 'write_file',
        category: 'filesystem',
        description: 'Write content to a file',
        keywords: ['write', 'file', 'create', 'save'],
        capabilities: ['File creation', 'Content writing'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
    {
        name: 'file_info',
        category: 'filesystem',
        description: 'Get metadata about a file or directory',
        keywords: ['info', 'metadata', 'stat', 'size', 'permissions'],
        capabilities: ['File metadata', 'Size', 'Permissions', 'Timestamps'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },

    // CLI operations
    {
        name: 'execute_command',
        category: 'cli',
        description: 'Execute a shell command',
        keywords: ['execute', 'command', 'shell', 'bash', 'run', 'cli'],
        capabilities: ['Shell execution', 'Command output'],
        contextAware: false,
        estimatedTokenCost: 'variable'
    },

    // Database operations
    {
        name: 'create_game',
        category: 'database',
        description: 'Create a new game entity in the database',
        keywords: ['create', 'game', 'database', 'insert', 'new'],
        capabilities: ['Database insertion', 'Game creation'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
    {
        name: 'get_game',
        category: 'database',
        description: 'Retrieve a game by ID from the database',
        keywords: ['get', 'game', 'database', 'read', 'retrieve', 'fetch'],
        capabilities: ['Database query', 'Game retrieval'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
    {
        name: 'list_games',
        category: 'database',
        description: 'List all games in the database',
        keywords: ['list', 'games', 'database', 'all', 'query'],
        capabilities: ['Database query', 'List all games'],
        contextAware: false,
        estimatedTokenCost: 'medium'
    },
    {
        name: 'update_game',
        category: 'database',
        description: 'Update a game entity in the database',
        keywords: ['update', 'game', 'database', 'modify', 'edit'],
        capabilities: ['Database update', 'Game modification'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
    {
        name: 'delete_game',
        category: 'database',
        description: 'Delete a game from the database',
        keywords: ['delete', 'game', 'database', 'remove'],
        capabilities: ['Database deletion', 'Game removal'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },

    // Screen capture
    {
        name: 'capture_screen',
        category: 'screen',
        description: 'Capture a screenshot of the entire screen or specific region',
        keywords: ['capture', 'screen', 'screenshot', 'image', 'display'],
        capabilities: ['Screen capture', 'Region capture', 'Image output'],
        contextAware: false,
        estimatedTokenCost: 'high'
    },

    // Input simulation
    {
        name: 'simulate_input',
        category: 'input',
        description: 'Simulate keyboard and mouse input',
        keywords: ['simulate', 'input', 'keyboard', 'mouse', 'click', 'type'],
        capabilities: ['Keyboard simulation', 'Mouse simulation', 'Automation'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },

    // Window management
    {
        name: 'manage_window',
        category: 'window',
        description: 'Manage application windows (focus, resize, move)',
        keywords: ['window', 'manage', 'focus', 'resize', 'move', 'application'],
        capabilities: ['Window focus', 'Window resize', 'Window positioning'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },

    // Clipboard operations
    {
        name: 'clipboard_read',
        category: 'clipboard',
        description: 'Read content from the system clipboard',
        keywords: ['clipboard', 'read', 'paste', 'get'],
        capabilities: ['Clipboard reading'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
    {
        name: 'clipboard_write',
        category: 'clipboard',
        description: 'Write content to the system clipboard',
        keywords: ['clipboard', 'write', 'copy', 'set'],
        capabilities: ['Clipboard writing'],
        contextAware: false,
        estimatedTokenCost: 'low'
    },
];

// Categories for filtering
export const CATEGORIES = [
    'batch',
    'filesystem',
    'cli',
    'database',
    'screen',
    'input',
    'window',
    'clipboard',
    'system',
    'meta'
] as const;

// Schema for search_tools
export const SearchToolsSchema = {
    query: z.string().describe('Natural language or keyword query to search for tools'),
    category: z.enum(CATEGORIES).optional().describe('Filter by category'),
    contextWindow: z.number().optional().describe('LLM total context window size'),
    contextUsed: z.number().optional().describe('Tokens already used in conversation'),
    maxResults: z.number().optional().describe('Maximum number of results to return (default: 10)'),
};

// Search result interface
interface SearchResult extends ToolMetadata {
    relevanceScore: number;
    usageExample?: string;
}

// Search algorithm
export function searchTools(args: {
    query: string;
    category?: typeof CATEGORIES[number];
    contextWindow?: number;
    contextUsed?: number;
    maxResults?: number;
}): {
    tools: SearchResult[];
    summary: {
        total_found: number;
        returned: number;
        categories: string[];
        context_aware_available: boolean;
    };
    suggestions: string[];
} {
    const { query, category, contextWindow, contextUsed, maxResults = 10 } = args;
    const queryLower = query.toLowerCase().trim();
    const queryTerms = queryLower.split(/\s+/);

    // Filter by category if provided
    let candidates = category
        ? TOOL_CATALOG.filter(t => t.category === category)
        : TOOL_CATALOG;

    // Score each tool
    const scored: SearchResult[] = candidates.map(tool => {
        let score = 0;

        // Exact name match (weight: 1.0)
        if (tool.name.toLowerCase() === queryLower) {
            score += 1.0;
        } else if (tool.name.toLowerCase().includes(queryLower)) {
            score += 0.8;
        }

        // Category match (weight: 0.9)
        if (tool.category === queryLower) {
            score += 0.9;
        }

        // Keyword matches (weight: 0.7 per match)
        const keywordMatches = queryTerms.filter(term =>
            tool.keywords.some(kw => kw.includes(term))
        ).length;
        score += (keywordMatches / queryTerms.length) * 0.7;

        // Description match (weight: 0.5)
        if (tool.description.toLowerCase().includes(queryLower)) {
            score += 0.5;
        }

        // Capability match (weight: 0.6)
        const capabilityMatches = queryTerms.filter(term =>
            tool.capabilities.some(cap => cap.toLowerCase().includes(term))
        ).length;
        score += (capabilityMatches / queryTerms.length) * 0.6;

        // Context-aware bonus if context params provided
        if (contextWindow && contextUsed && tool.contextAware) {
            score += 0.2;
        }

        return {
            ...tool,
            relevanceScore: score,
            usageExample: generateUsageExample(tool, contextWindow, contextUsed)
        };
    });

    // Sort by relevance and limit
    const results = scored
        .filter(r => r.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxResults);

    // Generate suggestions
    const suggestions: string[] = [];
    const hasContextAware = results.some(r => r.contextAware);

    if (contextWindow && contextUsed && hasContextAware) {
        suggestions.push(
            "Context-aware tools available! Use contextWindow and contextUsed parameters for adaptive responses."
        );
    }

    if (results.some(r => r.category === 'batch')) {
        suggestions.push(
            "For large operations, consider batch_* tools which support parallel execution."
        );
    }

    if (query.includes('read') || query.includes('file')) {
        suggestions.push(
            "For large files, use 'read_file_lines' to read specific ranges instead of entire file."
        );
    }

    // Summary
    const uniqueCategories = [...new Set(results.map(r => r.category))];
    const summary = {
        total_found: scored.filter(r => r.relevanceScore > 0).length,
        returned: results.length,
        categories: uniqueCategories,
        context_aware_available: hasContextAware
    };

    return { tools: results, summary, suggestions };
}

// Generate usage example
function generateUsageExample(tool: ToolMetadata, contextWindow?: number, contextUsed?: number): string {
    const baseExamples: Record<string, string> = {
        'batch_read_files': `batch_read_files({ paths: ['file1.txt', 'file2.txt']${contextWindow ? `, contextWindow: ${contextWindow}, contextUsed: ${contextUsed}` : ''} })`,
        'batch_list_directories': `batch_list_directories({ paths: ['src', 'tests']${contextWindow ? `, contextWindow: ${contextWindow}, contextUsed: ${contextUsed}` : ''} })`,
        'read_file': `read_file({ path: 'example.txt' })`,
        'read_file_lines': `read_file_lines({ path: 'large-file.txt', startLine: 1, endLine: 100 })`,
        'list_directory': `list_directory({ path: 'src' })`,
        'search_files': `search_files({ directory: 'src', pattern: '*.ts' })`,
        'search_in_file': `search_in_file({ path: 'file.txt', pattern: 'ERROR' })`,
    };

    return baseExamples[tool.name] || `${tool.name}({ ... })`;
}

// Handler for search_tools
export async function handleSearchTools(args: {
    query: string;
    category?: typeof CATEGORIES[number];
    contextWindow?: number;
    contextUsed?: number;
    maxResults?: number;
}) {
    const results = searchTools(args);

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2)
        }],
        isError: false,
    };
}
