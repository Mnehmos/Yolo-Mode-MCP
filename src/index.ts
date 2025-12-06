#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Helper to convert Zod schema objects to JSON Schema
function toJsonSchema(schemaObj: Record<string, z.ZodTypeAny>, required?: string[]): Record<string, unknown> {
    const zodSchema = z.object(schemaObj);
    const jsonSchema = zodToJsonSchema(zodSchema, { target: 'openApi3' }) as Record<string, unknown>;
    // Remove the $schema property if present as MCP doesn't need it
    if (jsonSchema && typeof jsonSchema === 'object') {
        delete jsonSchema['$schema'];
        // Override required if specified
        if (required) {
            jsonSchema['required'] = required;
        }
    }
    return jsonSchema;
}

// Search Tools
import {
    handleSearchTools, SearchToolsSchema
} from './tools/search.js';

// CLI Tools
import {
    handleExecCli, ExecCliSchema,
    handleReadFile, ReadFileSchema,
    handleWriteFile, WriteFileSchema,
    handleListDirectory, ListDirectorySchema,
    handleStrReplace, StrReplaceSchema,
    handleReadFileLines, ReadFileLinesSchema,
    handleSearchInFile, SearchInFileSchema,
    handleBatchExecCli, BatchExecCliSchema,
    handleBatchReadFiles, BatchReadFilesSchema,
    handleBatchWriteFiles, BatchWriteFilesSchema,
    handleBatchListDirectories, BatchListDirectoriesSchema
} from './tools/cli.js';

// CRUD Tools
import {
    handleCrudCreate, CrudCreateSchema,
    handleCrudRead, CrudReadSchema,
    handleCrudUpdate, CrudUpdateSchema,
    handleCrudDelete, CrudDeleteSchema,
    handleCrudQuery, CrudQuerySchema,
    handleCrudBatchCreate, CrudBatchCreateSchema,
    handleCrudBatchRead, CrudBatchReadSchema,
    handleCrudBatchUpdate, CrudBatchUpdateSchema,
    handleCrudBatchDelete, CrudBatchDeleteSchema
} from './tools/crud.js';

// Filesystem Tools
import {
    handleCopyFile, CopyFileSchema,
    handleMoveFile, MoveFileSchema,
    handleDeleteFile, DeleteFileSchema,
    handleFileInfo, FileInfoSchema,
    handleSearchFiles, SearchFilesSchema,
    handleBatchCopyFiles, BatchCopyFilesSchema,
    handleBatchMoveFiles, BatchMoveFilesSchema,
    handleBatchDeleteFiles, BatchDeleteFilesSchema,
    handleBatchFileInfo, BatchFileInfoSchema
} from './tools/filesystem.js';

// Screen Tools
import {
    handleScreenshot, ScreenshotSchema,
    handleGetScreenInfo, GetScreenInfoSchema,
    handleWaitForScreenChange, WaitForScreenChangeSchema,
    handleFindOnScreen, FindOnScreenSchema
} from './tools/screen.js';

// Input Tools
import {
    handleKeyboardType, KeyboardTypeSchema,
    handleKeyboardPress, KeyboardPressSchema,
    handleKeyboardShortcut, KeyboardShortcutSchema,
    handleMouseMove, MouseMoveSchema,
    handleMouseClick, MouseClickSchema,
    handleMouseDrag, MouseDragSchema,
    handleMouseScroll, MouseScrollSchema,
    handleGetMousePosition, GetMousePositionSchema,
    handleBatchKeyboardActions, BatchKeyboardActionsSchema,
    handleBatchMouseActions, BatchMouseActionsSchema
} from './tools/input.js';

// Window Tools
import {
    handleListWindows, ListWindowsSchema,
    handleGetActiveWindow, GetActiveWindowSchema,
    handleFocusWindow, FocusWindowSchema,
    handleMinimizeWindow, MinimizeWindowSchema,
    handleMaximizeWindow, MaximizeWindowSchema,
    handleRestoreWindow, RestoreWindowSchema,
    handleCloseWindow, CloseWindowSchema,
    handleResizeWindow, ResizeWindowSchema,
    handleMoveWindow, MoveWindowSchema,
    handleLaunchApplication, LaunchApplicationSchema
} from './tools/window.js';

// Clipboard Tools
import {
    handleClipboardRead, ClipboardReadSchema,
    handleClipboardWrite, ClipboardWriteSchema,
    handleClipboardClear, ClipboardClearSchema,
    handleClipboardHasFormat, ClipboardHasFormatSchema
} from './tools/clipboard.js';

// System Tools
import {
    handleGetSystemInfo, GetSystemInfoSchema,
    handleListProcesses, ListProcessesSchema,
    handleKillProcess, KillProcessSchema,
    handleGetEnvironment, GetEnvironmentSchema,
    handleSetEnvironment, SetEnvironmentSchema,
    handleGetNetworkInfo, GetNetworkInfoSchema,
    handleWait, WaitSchema,
    handleNotify, NotifySchema
} from './tools/system.js';

const server = new Server(
    {
        name: 'mcp-ooda-computer',
        version: '2.0.0',
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
            // ==========================================
            // === Tool Discovery ===
            // ==========================================
            {
                name: 'search_tools',
                description: 'Search for available tools by category, capability, or keyword. Use this to discover specialized tools for your task. Returns tool information including usage examples and context-awareness capabilities. Most tools are discoverable via search and not shown by default to reduce token usage.',
                inputSchema: toJsonSchema(SearchToolsSchema),
            },

            // ==========================================
            // === Core CLI & File Operations ===
            // ==========================================
            {
                name: 'exec_cli',
                description: 'Execute shell commands on the host system (YOLO mode)',
                inputSchema: toJsonSchema(ExecCliSchema, ['command']),
            },
            {
                name: 'read_file',
                description: 'Read file contents',
                inputSchema: toJsonSchema(ReadFileSchema, ['path']),
            },
            {
                name: 'write_file',
                description: 'Write content to a file',
                inputSchema: toJsonSchema(WriteFileSchema, ['path', 'content']),
            },
            {
                name: 'list_directory',
                description: 'List contents of a directory',
                inputSchema: toJsonSchema(ListDirectorySchema, ['path']),
            },
            {
                name: 'str_replace',
                description: 'Replace a unique string in a file with another string. The string to replace must appear exactly once in the file.',
                inputSchema: toJsonSchema(StrReplaceSchema, ['path', 'oldText']),
            },

            // ==========================================
            // === Core CRUD Database Operations ===
            // ==========================================
            {
                name: 'crud_create',
                description: 'Create a new record in a collection',
                inputSchema: toJsonSchema(CrudCreateSchema, ['collection', 'data']),
            },
            {
                name: 'crud_read',
                description: 'Read a record by ID',
                inputSchema: toJsonSchema(CrudReadSchema, ['collection', 'id']),
            },
            {
                name: 'crud_update',
                description: 'Update an existing record',
                inputSchema: toJsonSchema(CrudUpdateSchema, ['collection', 'id', 'data']),
            },
            {
                name: 'crud_delete',
                description: 'Delete a record',
                inputSchema: toJsonSchema(CrudDeleteSchema, ['collection', 'id']),
            },
            {
                name: 'crud_query',
                description: 'Query records in a collection',
                inputSchema: toJsonSchema(CrudQuerySchema, ['collection']),
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
        // Tool Discovery
        case 'search_tools': return handleSearchTools(args as any) as any;

        // CLI & File operations
        case 'exec_cli': return handleExecCli(args as any) as any;
        case 'read_file': return handleReadFile(args as any) as any;
        case 'write_file': return handleWriteFile(args as any) as any;
        case 'list_directory': return handleListDirectory(args as any) as any;
        case 'str_replace': return handleStrReplace(args as any) as any;
        case 'copy_file': return handleCopyFile(args as any) as any;
        case 'move_file': return handleMoveFile(args as any) as any;
        case 'delete_file': return handleDeleteFile(args as any) as any;
        case 'file_info': return handleFileInfo(args as any) as any;
        case 'search_files': return handleSearchFiles(args as any) as any;
        case 'read_file_lines': return handleReadFileLines(args as any) as any;
        case 'search_in_file': return handleSearchInFile(args as any) as any;
        case 'batch_exec_cli': return handleBatchExecCli(args as any) as any;
        case 'batch_read_files': return handleBatchReadFiles(args as any) as any;
        case 'batch_write_files': return handleBatchWriteFiles(args as any) as any;
        case 'batch_list_directories': return handleBatchListDirectories(args as any) as any;
        case 'batch_copy_files': return handleBatchCopyFiles(args as any) as any;
        case 'batch_move_files': return handleBatchMoveFiles(args as any) as any;
        case 'batch_delete_files': return handleBatchDeleteFiles(args as any) as any;
        case 'batch_file_info': return handleBatchFileInfo(args as any) as any;

        // CRUD operations
        case 'crud_create': return handleCrudCreate(args as any) as any;
        case 'crud_read': return handleCrudRead(args as any) as any;
        case 'crud_update': return handleCrudUpdate(args as any) as any;
        case 'crud_delete': return handleCrudDelete(args as any) as any;
        case 'crud_query': return handleCrudQuery(args as any) as any;
        case 'crud_batch_create': return handleCrudBatchCreate(args as any) as any;
        case 'crud_batch_read': return handleCrudBatchRead(args as any) as any;
        case 'crud_batch_update': return handleCrudBatchUpdate(args as any) as any;
        case 'crud_batch_delete': return handleCrudBatchDelete(args as any) as any;

        // Screen perception
        case 'screenshot': return handleScreenshot(args as any) as any;
        case 'get_screen_info': return handleGetScreenInfo() as any;
        case 'wait_for_screen_change': return handleWaitForScreenChange(args as any) as any;
        case 'find_on_screen': return handleFindOnScreen(args as any) as any;

        // Input simulation
        case 'keyboard_type': return handleKeyboardType(args as any) as any;
        case 'keyboard_press': return handleKeyboardPress(args as any) as any;
        case 'keyboard_shortcut': return handleKeyboardShortcut(args as any) as any;
        case 'mouse_move': return handleMouseMove(args as any) as any;
        case 'mouse_click': return handleMouseClick(args as any) as any;
        case 'mouse_drag': return handleMouseDrag(args as any) as any;
        case 'mouse_scroll': return handleMouseScroll(args as any) as any;
        case 'get_mouse_position': return handleGetMousePosition() as any;
        case 'batch_keyboard_actions': return handleBatchKeyboardActions(args as any) as any;
        case 'batch_mouse_actions': return handleBatchMouseActions(args as any) as any;

        // Window management
        case 'list_windows': return handleListWindows() as any;
        case 'get_active_window': return handleGetActiveWindow() as any;
        case 'focus_window': return handleFocusWindow(args as any) as any;
        case 'minimize_window': return handleMinimizeWindow(args as any) as any;
        case 'maximize_window': return handleMaximizeWindow(args as any) as any;
        case 'restore_window': return handleRestoreWindow(args as any) as any;
        case 'close_window': return handleCloseWindow(args as any) as any;
        case 'resize_window': return handleResizeWindow(args as any) as any;
        case 'move_window': return handleMoveWindow(args as any) as any;
        case 'launch_application': return handleLaunchApplication(args as any) as any;

        // Clipboard
        case 'clipboard_read': return handleClipboardRead(args as any) as any;
        case 'clipboard_write': return handleClipboardWrite(args as any) as any;
        case 'clipboard_clear': return handleClipboardClear() as any;
        case 'clipboard_has_format': return handleClipboardHasFormat(args as any) as any;

        // System
        case 'get_system_info': return handleGetSystemInfo() as any;
        case 'list_processes': return handleListProcesses(args as any) as any;
        case 'kill_process': return handleKillProcess(args as any) as any;
        case 'get_environment': return handleGetEnvironment(args as any) as any;
        case 'set_environment': return handleSetEnvironment(args as any) as any;
        case 'get_network_info': return handleGetNetworkInfo() as any;
        case 'wait': return handleWait(args as any) as any;
        case 'notify': return handleNotify(args as any) as any;

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
        console.error('MCP OODA Computer Server v2.0.0 running on stdio');
        console.error('Tools: CLI, CRUD, Filesystem, Screen, Input, Window, Clipboard, System');
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
