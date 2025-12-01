#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
    handleExecCli,
    ExecCliSchema,
    handleReadFile,
    ReadFileSchema,
    handleWriteFile,
    WriteFileSchema,
    handleListDirectory,
    ListDirectorySchema
} from './tools/cli.js';
import {
    handleCrudCreate,
    CrudCreateSchema,
    handleCrudRead,
    CrudReadSchema,
    handleCrudUpdate,
    CrudUpdateSchema,
    handleCrudDelete,
    CrudDeleteSchema,
    handleCrudQuery,
    CrudQuerySchema
} from './tools/crud.js';

const server = new Server(
    {
        name: 'mcp-crud-cli',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'exec_cli',
                description: 'Execute shell commands on the host system (YOLO mode)',
                inputSchema: {
                    type: 'object',
                    properties: ExecCliSchema,
                    required: ['command'],
                },
            },
            {
                name: 'read_file',
                description: 'Read file contents',
                inputSchema: {
                    type: 'object',
                    properties: ReadFileSchema,
                    required: ['path'],
                },
            },
            {
                name: 'write_file',
                description: 'Write content to a file',
                inputSchema: {
                    type: 'object',
                    properties: WriteFileSchema,
                    required: ['path', 'content'],
                },
            },
            {
                name: 'list_directory',
                description: 'List contents of a directory',
                inputSchema: {
                    type: 'object',
                    properties: ListDirectorySchema,
                    required: ['path'],
                },
            },
            {
                name: 'crud_create',
                description: 'Create a new record in a collection',
                inputSchema: {
                    type: 'object',
                    properties: CrudCreateSchema,
                    required: ['collection', 'data'],
                },
            },
            {
                name: 'crud_read',
                description: 'Read a record by ID',
                inputSchema: {
                    type: 'object',
                    properties: CrudReadSchema,
                    required: ['collection', 'id'],
                },
            },
            {
                name: 'crud_update',
                description: 'Update an existing record',
                inputSchema: {
                    type: 'object',
                    properties: CrudUpdateSchema,
                    required: ['collection', 'id', 'data'],
                },
            },
            {
                name: 'crud_delete',
                description: 'Delete a record',
                inputSchema: {
                    type: 'object',
                    properties: CrudDeleteSchema,
                    required: ['collection', 'id'],
                },
            },
            {
                name: 'crud_query',
                description: 'Query records in a collection',
                inputSchema: {
                    type: 'object',
                    properties: CrudQuerySchema,
                    required: ['collection'],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
        throw new Error('No arguments provided');
    }

    switch (name) {
        case 'exec_cli':
            return handleExecCli(args as any) as any;
        case 'read_file':
            return handleReadFile(args as any) as any;
        case 'write_file':
            return handleWriteFile(args as any) as any;
        case 'list_directory':
            return handleListDirectory(args as any) as any;
        case 'crud_create':
            return handleCrudCreate(args as any) as any;
        case 'crud_read':
            return handleCrudRead(args as any) as any;
        case 'crud_update':
            return handleCrudUpdate(args as any) as any;
        case 'crud_delete':
            return handleCrudDelete(args as any) as any;
        case 'crud_query':
            return handleCrudQuery(args as any) as any;
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

async function main() {
    try {
        // Initialize database
        const { getDb } = await import('./storage/db.js');
        await getDb();

        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('MCP CRUD/CLI Server running on stdio');
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
