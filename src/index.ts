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
function toJsonSchema(schemaObj: Record<string, z.ZodTypeAny>, required: string[] = []) {
    const zodSchema = z.object(schemaObj);
    const jsonSchema = zodToJsonSchema(zodSchema, { target: 'openApi3' });
    // Remove the $schema property if present as MCP doesn't need it
    if (typeof jsonSchema === 'object' && jsonSchema !== null) {
        const { $schema, ...rest } = jsonSchema as any;
        return rest;
    }
    return jsonSchema;
}

// CLI Tools
import {
    handleExecCli, ExecCliSchema,
    handleReadFile, ReadFileSchema,
    handleWriteFile, WriteFileSchema,
    handleListDirectory, ListDirectorySchema,
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
            // === CLI & File Operations ===
            // ==========================================
            {
                name: 'exec_cli',
                description: 'Execute a shell command. For multiple commands, use batch_exec_cli for parallel execution.',
                inputSchema: { type: 'object', properties: ExecCliSchema, required: ['command'] },
            },
            {
                name: 'read_file',
                description: 'Read file contents. For multiple files, use batch_read_files.',
                inputSchema: { type: 'object', properties: ReadFileSchema, required: ['path'] },
            },
            {
                name: 'write_file',
                description: 'Write content to file. For multiple files, use batch_write_files.',
                inputSchema: { type: 'object', properties: WriteFileSchema, required: ['path', 'content'] },
            },
            {
                name: 'list_directory',
                description: 'List directory contents. For multiple directories, use batch_list_directories.',
                inputSchema: { type: 'object', properties: ListDirectorySchema, required: ['path'] },
            },
            {
                name: 'copy_file',
                description: 'Copy a file or directory. For multiple operations, use batch_copy_files.',
                inputSchema: { type: 'object', properties: CopyFileSchema, required: ['source', 'destination'] },
            },
            {
                name: 'move_file',
                description: 'Move/rename a file or directory. For multiple operations, use batch_move_files.',
                inputSchema: { type: 'object', properties: MoveFileSchema, required: ['source', 'destination'] },
            },
            {
                name: 'delete_file',
                description: 'Delete a file or directory. For multiple deletions, use batch_delete_files.',
                inputSchema: { type: 'object', properties: DeleteFileSchema, required: ['path'] },
            },
            {
                name: 'file_info',
                description: 'Get file/directory metadata (size, dates, type). For multiple paths, use batch_file_info.',
                inputSchema: { type: 'object', properties: FileInfoSchema, required: ['path'] },
            },
            {
                name: 'search_files',
                description: 'Search for files by pattern in a directory tree.',
                inputSchema: { type: 'object', properties: SearchFilesSchema, required: ['directory', 'pattern'] },
            },

            // Batch file operations
            {
                name: 'batch_exec_cli',
                description: 'Execute multiple shell commands in parallel.',
                inputSchema: toJsonSchema(BatchExecCliSchema),
            },
            {
                name: 'batch_read_files',
                description: 'Read multiple files in parallel.',
                inputSchema: toJsonSchema(BatchReadFilesSchema),
            },
            {
                name: 'batch_write_files',
                description: 'Write multiple files in parallel.',
                inputSchema: toJsonSchema(BatchWriteFilesSchema),
            },
            {
                name: 'batch_list_directories',
                description: 'List multiple directories in parallel.',
                inputSchema: toJsonSchema(BatchListDirectoriesSchema),
            },
            {
                name: 'batch_copy_files',
                description: 'Copy multiple files in parallel.',
                inputSchema: toJsonSchema(BatchCopyFilesSchema),
            },
            {
                name: 'batch_move_files',
                description: 'Move multiple files in parallel.',
                inputSchema: toJsonSchema(BatchMoveFilesSchema),
            },
            {
                name: 'batch_delete_files',
                description: 'Delete multiple files in parallel.',
                inputSchema: toJsonSchema(BatchDeleteFilesSchema),
            },
            {
                name: 'batch_file_info',
                description: 'Get info for multiple files in parallel.',
                inputSchema: toJsonSchema(BatchFileInfoSchema),
            },

            // ==========================================
            // === CRUD Database Operations ===
            // ==========================================
            {
                name: 'crud_create',
                description: 'Create a record. For multiple records, use crud_batch_create.',
                inputSchema: { type: 'object', properties: CrudCreateSchema, required: ['collection', 'data'] },
            },
            {
                name: 'crud_read',
                description: 'Read a record by ID. For multiple records, use crud_batch_read.',
                inputSchema: { type: 'object', properties: CrudReadSchema, required: ['collection', 'id'] },
            },
            {
                name: 'crud_update',
                description: 'Update a record. For multiple records, use crud_batch_update.',
                inputSchema: { type: 'object', properties: CrudUpdateSchema, required: ['collection', 'id', 'data'] },
            },
            {
                name: 'crud_delete',
                description: 'Delete a record. For multiple records, use crud_batch_delete.',
                inputSchema: { type: 'object', properties: CrudDeleteSchema, required: ['collection', 'id'] },
            },
            {
                name: 'crud_query',
                description: 'Query records with optional filtering.',
                inputSchema: { type: 'object', properties: CrudQuerySchema, required: ['collection'] },
            },
            {
                name: 'crud_batch_create',
                description: 'Create multiple records in parallel.',
                inputSchema: toJsonSchema(CrudBatchCreateSchema),
            },
            {
                name: 'crud_batch_read',
                description: 'Read multiple records in parallel.',
                inputSchema: toJsonSchema(CrudBatchReadSchema),
            },
            {
                name: 'crud_batch_update',
                description: 'Update multiple records in parallel.',
                inputSchema: toJsonSchema(CrudBatchUpdateSchema),
            },
            {
                name: 'crud_batch_delete',
                description: 'Delete multiple records in parallel.',
                inputSchema: toJsonSchema(CrudBatchDeleteSchema),
            },

            // ==========================================
            // === Screen Perception (OBSERVE) ===
            // ==========================================
            {
                name: 'screenshot',
                description: 'Capture screenshot of screen or region. Returns base64 image or saves to file.',
                inputSchema: { type: 'object', properties: ScreenshotSchema },
            },
            {
                name: 'get_screen_info',
                description: 'Get display/monitor information (resolution, count, positions).',
                inputSchema: { type: 'object', properties: GetScreenInfoSchema },
            },
            {
                name: 'wait_for_screen_change',
                description: 'Wait until screen content changes in a region. Useful for detecting UI updates.',
                inputSchema: { type: 'object', properties: WaitForScreenChangeSchema },
            },
            {
                name: 'find_on_screen',
                description: 'Find text or image on screen (requires OCR/template matching dependencies).',
                inputSchema: { type: 'object', properties: FindOnScreenSchema },
            },

            // ==========================================
            // === Input Simulation (ACT) ===
            // ==========================================
            {
                name: 'keyboard_type',
                description: 'Type text as keyboard input.',
                inputSchema: { type: 'object', properties: KeyboardTypeSchema, required: ['text'] },
            },
            {
                name: 'keyboard_press',
                description: 'Press a key with optional modifiers (ctrl, alt, shift).',
                inputSchema: { type: 'object', properties: KeyboardPressSchema, required: ['key'] },
            },
            {
                name: 'keyboard_shortcut',
                description: 'Execute keyboard shortcut (e.g., "ctrl+c", "alt+tab").',
                inputSchema: { type: 'object', properties: KeyboardShortcutSchema, required: ['shortcut'] },
            },
            {
                name: 'mouse_move',
                description: 'Move mouse cursor to coordinates.',
                inputSchema: { type: 'object', properties: MouseMoveSchema, required: ['x', 'y'] },
            },
            {
                name: 'mouse_click',
                description: 'Click mouse button at position. Supports double-click.',
                inputSchema: { type: 'object', properties: MouseClickSchema },
            },
            {
                name: 'mouse_drag',
                description: 'Drag from one position to another.',
                inputSchema: { type: 'object', properties: MouseDragSchema, required: ['startX', 'startY', 'endX', 'endY'] },
            },
            {
                name: 'mouse_scroll',
                description: 'Scroll mouse wheel.',
                inputSchema: { type: 'object', properties: MouseScrollSchema, required: ['deltaY'] },
            },
            {
                name: 'get_mouse_position',
                description: 'Get current mouse cursor position.',
                inputSchema: { type: 'object', properties: GetMousePositionSchema },
            },
            {
                name: 'batch_keyboard_actions',
                description: 'Execute sequence of keyboard actions (type, press, shortcut, wait).',
                inputSchema: toJsonSchema(BatchKeyboardActionsSchema),
            },
            {
                name: 'batch_mouse_actions',
                description: 'Execute sequence of mouse actions (move, click, drag, scroll, wait).',
                inputSchema: toJsonSchema(BatchMouseActionsSchema),
            },

            // ==========================================
            // === Window Management ===
            // ==========================================
            {
                name: 'list_windows',
                description: 'List all open windows with titles and process info.',
                inputSchema: { type: 'object', properties: ListWindowsSchema },
            },
            {
                name: 'get_active_window',
                description: 'Get information about the currently focused window.',
                inputSchema: { type: 'object', properties: GetActiveWindowSchema },
            },
            {
                name: 'focus_window',
                description: 'Bring a window to the foreground by title or PID.',
                inputSchema: { type: 'object', properties: FocusWindowSchema },
            },
            {
                name: 'minimize_window',
                description: 'Minimize a window or all windows.',
                inputSchema: { type: 'object', properties: MinimizeWindowSchema },
            },
            {
                name: 'maximize_window',
                description: 'Maximize the active or specified window.',
                inputSchema: { type: 'object', properties: MaximizeWindowSchema },
            },
            {
                name: 'restore_window',
                description: 'Restore a minimized/maximized window.',
                inputSchema: { type: 'object', properties: RestoreWindowSchema },
            },
            {
                name: 'close_window',
                description: 'Close a window. Use force to kill the process.',
                inputSchema: { type: 'object', properties: CloseWindowSchema },
            },
            {
                name: 'resize_window',
                description: 'Resize the active or specified window.',
                inputSchema: { type: 'object', properties: ResizeWindowSchema, required: ['width', 'height'] },
            },
            {
                name: 'move_window',
                description: 'Move the active or specified window.',
                inputSchema: { type: 'object', properties: MoveWindowSchema, required: ['x', 'y'] },
            },
            {
                name: 'launch_application',
                description: 'Launch an application by path or name.',
                inputSchema: { type: 'object', properties: LaunchApplicationSchema, required: ['path'] },
            },

            // ==========================================
            // === Clipboard ===
            // ==========================================
            {
                name: 'clipboard_read',
                description: 'Read clipboard contents (text, HTML, or image as base64).',
                inputSchema: { type: 'object', properties: ClipboardReadSchema },
            },
            {
                name: 'clipboard_write',
                description: 'Write text or HTML to clipboard.',
                inputSchema: { type: 'object', properties: ClipboardWriteSchema, required: ['content'] },
            },
            {
                name: 'clipboard_clear',
                description: 'Clear the clipboard.',
                inputSchema: { type: 'object', properties: ClipboardClearSchema },
            },
            {
                name: 'clipboard_has_format',
                description: 'Check if clipboard contains a specific format.',
                inputSchema: { type: 'object', properties: ClipboardHasFormatSchema, required: ['format'] },
            },

            // ==========================================
            // === System Operations ===
            // ==========================================
            {
                name: 'get_system_info',
                description: 'Get system information (OS, CPU, memory, uptime).',
                inputSchema: { type: 'object', properties: GetSystemInfoSchema },
            },
            {
                name: 'list_processes',
                description: 'List running processes with CPU/memory usage.',
                inputSchema: { type: 'object', properties: ListProcessesSchema },
            },
            {
                name: 'kill_process',
                description: 'Kill a process by PID or name.',
                inputSchema: { type: 'object', properties: KillProcessSchema },
            },
            {
                name: 'get_environment',
                description: 'Get environment variable(s).',
                inputSchema: { type: 'object', properties: GetEnvironmentSchema },
            },
            {
                name: 'set_environment',
                description: 'Set an environment variable.',
                inputSchema: { type: 'object', properties: SetEnvironmentSchema, required: ['variable', 'value'] },
            },
            {
                name: 'get_network_info',
                description: 'Get network interface information.',
                inputSchema: { type: 'object', properties: GetNetworkInfoSchema },
            },
            {
                name: 'wait',
                description: 'Wait/sleep for specified milliseconds. Use in action sequences.',
                inputSchema: { type: 'object', properties: WaitSchema, required: ['ms'] },
            },
            {
                name: 'notify',
                description: 'Show a system notification.',
                inputSchema: { type: 'object', properties: NotifySchema, required: ['title', 'message'] },
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
        // CLI & File operations
        case 'exec_cli': return handleExecCli(args as any) as any;
        case 'read_file': return handleReadFile(args as any) as any;
        case 'write_file': return handleWriteFile(args as any) as any;
        case 'list_directory': return handleListDirectory(args as any) as any;
        case 'copy_file': return handleCopyFile(args as any) as any;
        case 'move_file': return handleMoveFile(args as any) as any;
        case 'delete_file': return handleDeleteFile(args as any) as any;
        case 'file_info': return handleFileInfo(args as any) as any;
        case 'search_files': return handleSearchFiles(args as any) as any;
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
