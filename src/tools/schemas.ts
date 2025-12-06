import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
    ExecCliSchema, ReadFileSchema, WriteFileSchema, ListDirectorySchema, StrReplaceSchema,
    ReadFileLinesSchema, SearchInFileSchema,
    BatchExecCliSchema, BatchReadFilesSchema, BatchWriteFilesSchema, BatchListDirectoriesSchema
} from './cli.js';
import {
    CrudCreateSchema, CrudReadSchema, CrudUpdateSchema, CrudDeleteSchema, CrudQuerySchema,
    CrudBatchCreateSchema, CrudBatchReadSchema, CrudBatchUpdateSchema, CrudBatchDeleteSchema
} from './crud.js';
import {
    CopyFileSchema, MoveFileSchema, DeleteFileSchema, FileInfoSchema, SearchFilesSchema,
    BatchCopyFilesSchema, BatchMoveFilesSchema, BatchDeleteFilesSchema, BatchFileInfoSchema
} from './filesystem.js';
import {
    ScreenshotSchema, GetScreenInfoSchema, WaitForScreenChangeSchema, FindOnScreenSchema
} from './screen.js';
import {
    KeyboardTypeSchema, KeyboardPressSchema, KeyboardShortcutSchema,
    MouseMoveSchema, MouseClickSchema, MouseDragSchema, MouseScrollSchema,
    GetMousePositionSchema, BatchKeyboardActionsSchema, BatchMouseActionsSchema
} from './input.js';
import {
    ListWindowsSchema, GetActiveWindowSchema, FocusWindowSchema,
    MinimizeWindowSchema, MaximizeWindowSchema, RestoreWindowSchema,
    CloseWindowSchema, ResizeWindowSchema, MoveWindowSchema, LaunchApplicationSchema
} from './window.js';
import {
    ClipboardReadSchema, ClipboardWriteSchema, ClipboardClearSchema, ClipboardHasFormatSchema
} from './clipboard.js';
import {
    GetSystemInfoSchema, ListProcessesSchema, KillProcessSchema,
    GetEnvironmentSchema, SetEnvironmentSchema, GetNetworkInfoSchema,
    WaitSchema, NotifySchema
} from './system.js';
import { SearchToolsSchema } from './search.js';

// Full schema registry
export const TOOL_SCHEMAS: Record<string, Record<string, z.ZodTypeAny>> = {
    // Meta tools
    'search_tools': SearchToolsSchema,
    'load_tool_schema': {
        toolName: z.string().describe('Name of the tool to load the full schema for'),
    },

    // CLI & File operations
    'exec_cli': ExecCliSchema,
    'read_file': ReadFileSchema,
    'write_file': WriteFileSchema,
    'list_directory': ListDirectorySchema,
    'str_replace': StrReplaceSchema,
    'read_file_lines': ReadFileLinesSchema,
    'search_in_file': SearchInFileSchema,
    'batch_exec_cli': BatchExecCliSchema,
    'batch_read_files': BatchReadFilesSchema,
    'batch_write_files': BatchWriteFilesSchema,
    'batch_list_directories': BatchListDirectoriesSchema,

    // CRUD operations
    'crud_create': CrudCreateSchema,
    'crud_read': CrudReadSchema,
    'crud_update': CrudUpdateSchema,
    'crud_delete': CrudDeleteSchema,
    'crud_query': CrudQuerySchema,
    'crud_batch_create': CrudBatchCreateSchema,
    'crud_batch_read': CrudBatchReadSchema,
    'crud_batch_update': CrudBatchUpdateSchema,
    'crud_batch_delete': CrudBatchDeleteSchema,

    // Filesystem operations
    'copy_file': CopyFileSchema,
    'move_file': MoveFileSchema,
    'delete_file': DeleteFileSchema,
    'file_info': FileInfoSchema,
    'search_files': SearchFilesSchema,
    'batch_copy_files': BatchCopyFilesSchema,
    'batch_move_files': BatchMoveFilesSchema,
    'batch_delete_files': BatchDeleteFilesSchema,
    'batch_file_info': BatchFileInfoSchema,

    // Screen perception
    'screenshot': ScreenshotSchema,
    'get_screen_info': GetScreenInfoSchema,
    'wait_for_screen_change': WaitForScreenChangeSchema,
    'find_on_screen': FindOnScreenSchema,

    // Input simulation
    'keyboard_type': KeyboardTypeSchema,
    'keyboard_press': KeyboardPressSchema,
    'keyboard_shortcut': KeyboardShortcutSchema,
    'mouse_move': MouseMoveSchema,
    'mouse_click': MouseClickSchema,
    'mouse_drag': MouseDragSchema,
    'mouse_scroll': MouseScrollSchema,
    'get_mouse_position': GetMousePositionSchema,
    'batch_keyboard_actions': BatchKeyboardActionsSchema,
    'batch_mouse_actions': BatchMouseActionsSchema,

    // Window management
    'list_windows': ListWindowsSchema,
    'get_active_window': GetActiveWindowSchema,
    'focus_window': FocusWindowSchema,
    'minimize_window': MinimizeWindowSchema,
    'maximize_window': MaximizeWindowSchema,
    'restore_window': RestoreWindowSchema,
    'close_window': CloseWindowSchema,
    'resize_window': ResizeWindowSchema,
    'move_window': MoveWindowSchema,
    'launch_application': LaunchApplicationSchema,

    // Clipboard
    'clipboard_read': ClipboardReadSchema,
    'clipboard_write': ClipboardWriteSchema,
    'clipboard_clear': ClipboardClearSchema,
    'clipboard_has_format': ClipboardHasFormatSchema,

    // System
    'get_system_info': GetSystemInfoSchema,
    'list_processes': ListProcessesSchema,
    'kill_process': KillProcessSchema,
    'get_environment': GetEnvironmentSchema,
    'set_environment': SetEnvironmentSchema,
    'get_network_info': GetNetworkInfoSchema,
    'wait': WaitSchema,
    'notify': NotifySchema,
};

// Tool descriptions (one-liner for minimal registration)
export const TOOL_DESCRIPTIONS: Record<string, string> = {
    'search_tools': 'Search for available tools by category, capability, or keyword',
    'load_tool_schema': 'Load full input schema for a specific tool (required before first use)',

    'exec_cli': 'Execute shell commands on the host system',
    'read_file': 'Read file contents',
    'write_file': 'Write content to a file',
    'list_directory': 'List contents of a directory',
    'str_replace': 'Replace a unique string in a file',
    'read_file_lines': 'Read specific line range from a file (token-efficient)',
    'search_in_file': 'Search for text pattern within a file',
    'batch_exec_cli': 'Execute multiple shell commands in parallel',
    'batch_read_files': 'Read multiple files in parallel with context-aware responses',
    'batch_write_files': 'Write multiple files in parallel',
    'batch_list_directories': 'List multiple directories in parallel with context-aware responses',

    'crud_create': 'Create a new record in a collection',
    'crud_read': 'Read a record by ID',
    'crud_update': 'Update an existing record',
    'crud_delete': 'Delete a record',
    'crud_query': 'Query records in a collection',
    'crud_batch_create': 'Create multiple records in parallel',
    'crud_batch_read': 'Read multiple records in parallel',
    'crud_batch_update': 'Update multiple records in parallel',
    'crud_batch_delete': 'Delete multiple records in parallel',

    'copy_file': 'Copy a file to a new location',
    'move_file': 'Move/rename a file',
    'delete_file': 'Delete a file',
    'file_info': 'Get metadata about a file or directory',
    'search_files': 'Search for files matching a pattern',
    'batch_copy_files': 'Copy multiple files in parallel',
    'batch_move_files': 'Move multiple files in parallel',
    'batch_delete_files': 'Delete multiple files in parallel',
    'batch_file_info': 'Get info for multiple files in parallel',

    'screenshot': 'Capture a screenshot',
    'get_screen_info': 'Get screen resolution and information',
    'wait_for_screen_change': 'Wait for screen content to change',
    'find_on_screen': 'Find text or image on screen',

    'keyboard_type': 'Type text via keyboard simulation',
    'keyboard_press': 'Press a specific key',
    'keyboard_shortcut': 'Execute a keyboard shortcut',
    'mouse_move': 'Move mouse to coordinates',
    'mouse_click': 'Click mouse button',
    'mouse_drag': 'Drag mouse from one position to another',
    'mouse_scroll': 'Scroll mouse wheel',
    'get_mouse_position': 'Get current mouse position',
    'batch_keyboard_actions': 'Execute multiple keyboard actions in sequence',
    'batch_mouse_actions': 'Execute multiple mouse actions in sequence',

    'list_windows': 'List all open windows',
    'get_active_window': 'Get currently active window',
    'focus_window': 'Focus a specific window',
    'minimize_window': 'Minimize a window',
    'maximize_window': 'Maximize a window',
    'restore_window': 'Restore a minimized window',
    'close_window': 'Close a window',
    'resize_window': 'Resize a window',
    'move_window': 'Move a window to new position',
    'launch_application': 'Launch an application',

    'clipboard_read': 'Read content from clipboard',
    'clipboard_write': 'Write content to clipboard',
    'clipboard_clear': 'Clear clipboard contents',
    'clipboard_has_format': 'Check if clipboard has specific format',

    'get_system_info': 'Get system information',
    'list_processes': 'List running processes',
    'kill_process': 'Kill a process by ID',
    'get_environment': 'Get environment variable',
    'set_environment': 'Set environment variable',
    'get_network_info': 'Get network information',
    'wait': 'Wait for specified duration',
    'notify': 'Show system notification',
};

// Handler for load_tool_schema
export async function handleLoadToolSchema(args: { toolName: string }) {
    const { toolName } = args;

    if (!TOOL_SCHEMAS[toolName]) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: `Unknown tool: ${toolName}`,
                    availableTools: Object.keys(TOOL_SCHEMAS)
                }, null, 2)
            }],
            isError: true,
        };
    }

    const schema = TOOL_SCHEMAS[toolName];
    const zodSchema = z.object(schema);
    const jsonSchema = zodToJsonSchema(zodSchema, { target: 'openApi3' }) as Record<string, unknown>;

    // Remove $schema property
    if (jsonSchema && typeof jsonSchema === 'object') {
        delete jsonSchema['$schema'];
    }

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                toolName,
                description: TOOL_DESCRIPTIONS[toolName],
                inputSchema: jsonSchema,
                note: `Schema loaded successfully. You can now call ${toolName} with these parameters.`
            }, null, 2)
        }],
        isError: false,
    };
}
