import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { logAudit } from '../audit.js';

const execAsync = promisify(exec);
const platform = os.platform();

// Schema definitions
export const ListWindowsSchema = {};

export const GetActiveWindowSchema = {};

export const FocusWindowSchema = {
    title: z.string().optional().describe('Window title (partial match)'),
    pid: z.number().optional().describe('Process ID'),
    handle: z.string().optional().describe('Window handle (platform-specific)'),
};

export const MinimizeWindowSchema = {
    title: z.string().optional().describe('Window title (partial match). If not specified, minimizes active window.'),
    all: z.boolean().optional().describe('Minimize all windows'),
};

export const MaximizeWindowSchema = {
    title: z.string().optional().describe('Window title (partial match). If not specified, maximizes active window.'),
};

export const RestoreWindowSchema = {
    title: z.string().optional().describe('Window title (partial match). If not specified, restores active window.'),
};

export const CloseWindowSchema = {
    title: z.string().optional().describe('Window title (partial match). If not specified, closes active window.'),
    pid: z.number().optional().describe('Process ID'),
    force: z.boolean().optional().describe('Force close (kill process)'),
};

export const ResizeWindowSchema = {
    title: z.string().optional().describe('Window title (partial match)'),
    width: z.number().describe('New width'),
    height: z.number().describe('New height'),
};

export const MoveWindowSchema = {
    title: z.string().optional().describe('Window title (partial match)'),
    x: z.number().describe('New X position'),
    y: z.number().describe('New Y position'),
};

export const LaunchApplicationSchema = {
    path: z.string().describe('Application path or name'),
    args: z.array(z.string()).optional().describe('Command line arguments'),
    waitForWindow: z.boolean().optional().describe('Wait for a window to appear'),
    timeout: z.number().optional().describe('Timeout in ms when waiting for window'),
};

// Platform-specific implementations
interface WindowInfo {
    title: string;
    pid?: number;
    handle?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    isMinimized?: boolean;
    isMaximized?: boolean;
    isActive?: boolean;
}

async function listWindowsWin32(): Promise<WindowInfo[]> {
    const script = `
        Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        using System.Collections.Generic;
        public class WindowEnum {
            [DllImport("user32.dll")]
            public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
            [DllImport("user32.dll")]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
            [DllImport("user32.dll")]
            public static extern bool IsWindowVisible(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
            public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
            public static List<object[]> windows = new List<object[]>();
            public static bool EnumWindow(IntPtr hWnd, IntPtr lParam) {
                if (!IsWindowVisible(hWnd)) return true;
                StringBuilder sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (string.IsNullOrEmpty(title)) return true;
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                windows.Add(new object[] { title, (int)pid, hWnd.ToString() });
                return true;
            }
        }
"@
        [WindowEnum]::windows.Clear()
        [WindowEnum]::EnumWindows([WindowEnum+EnumWindowsProc]{ param($h,$l) [WindowEnum]::EnumWindow($h,$l) }, [IntPtr]::Zero)
        [WindowEnum]::windows | ForEach-Object { @{ title = $_[0]; pid = $_[1]; handle = $_[2] } } | ConvertTo-Json
    `;

    try {
        const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 10000 });
        const result = JSON.parse(stdout || '[]');
        return Array.isArray(result) ? result : [result];
    } catch {
        return [];
    }
}

async function listWindowsDarwin(): Promise<WindowInfo[]> {
    try {
        const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get {name, unix id} of every process whose visible is true'`, { timeout: 5000 });
        // Parse macOS output
        return [];
    } catch {
        return [];
    }
}

async function listWindowsLinux(): Promise<WindowInfo[]> {
    try {
        const { stdout } = await execAsync('wmctrl -l -p', { timeout: 5000 });
        const windows: WindowInfo[] = [];
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
            const parts = line.split(/\s+/);
            if (parts.length >= 5) {
                windows.push({
                    handle: parts[0],
                    pid: parseInt(parts[2]),
                    title: parts.slice(4).join(' '),
                });
            }
        }
        return windows;
    } catch {
        return [];
    }
}

async function getActiveWindowWin32(): Promise<WindowInfo | null> {
    const script = `
        Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        public class ActiveWindow {
            [DllImport("user32.dll")]
            public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll")]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        }
"@
        $hwnd = [ActiveWindow]::GetForegroundWindow()
        $sb = New-Object System.Text.StringBuilder 256
        [ActiveWindow]::GetWindowText($hwnd, $sb, 256) | Out-Null
        $pid = 0
        [ActiveWindow]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
        @{ title = $sb.ToString(); pid = $pid; handle = $hwnd.ToString() } | ConvertTo-Json
    `;

    try {
        const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        return JSON.parse(stdout);
    } catch {
        return null;
    }
}

async function focusWindowWin32(title?: string, pid?: number): Promise<boolean> {
    if (title) {
        const script = `
            Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class WindowFocus {
                [DllImport("user32.dll")]
                public static extern bool SetForegroundWindow(IntPtr hWnd);
                [DllImport("user32.dll")]
                public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            }
"@
            $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${title}*" } | Select-Object -First 1
            if ($proc) {
                [WindowFocus]::ShowWindow($proc.MainWindowHandle, 9)
                [WindowFocus]::SetForegroundWindow($proc.MainWindowHandle)
                Write-Output "true"
            } else {
                Write-Output "false"
            }
        `;
        const { stdout } = await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        return stdout.trim() === 'true';
    }
    return false;
}

// Tool handlers
export async function handleListWindows() {
    try {
        let windows: WindowInfo[];

        if (platform === 'win32') {
            windows = await listWindowsWin32();
        } else if (platform === 'darwin') {
            windows = await listWindowsDarwin();
        } else {
            windows = await listWindowsLinux();
        }

        await logAudit('list_windows', {}, { count: windows.length });

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    platform,
                    count: windows.length,
                    windows
                }, null, 2)
            }],
        };
    } catch (error: any) {
        await logAudit('list_windows', {}, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleGetActiveWindow() {
    try {
        let window: WindowInfo | null = null;

        if (platform === 'win32') {
            window = await getActiveWindowWin32();
        } else if (platform === 'darwin') {
            const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'`, { timeout: 5000 });
            window = { title: stdout.trim() };
        } else {
            const { stdout } = await execAsync('xdotool getactivewindow getwindowname', { timeout: 5000 });
            window = { title: stdout.trim() };
        }

        await logAudit('get_active_window', {}, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify(window, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('get_active_window', {}, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleFocusWindow(args: { title?: string; pid?: number; handle?: string }) {
    try {
        let success = false;

        if (platform === 'win32') {
            success = await focusWindowWin32(args.title, args.pid);
        } else if (platform === 'darwin') {
            if (args.title) {
                await execAsync(`osascript -e 'tell application "${args.title}" to activate'`, { timeout: 5000 });
                success = true;
            }
        } else {
            if (args.title) {
                await execAsync(`wmctrl -a "${args.title}"`, { timeout: 5000 });
                success = true;
            }
        }

        await logAudit('focus_window', args, success ? 'success' : 'not_found');

        return {
            content: [{ type: 'text', text: JSON.stringify({ focused: success }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('focus_window', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleMinimizeWindow(args: { title?: string; all?: boolean }) {
    try {
        if (platform === 'win32') {
            if (args.all) {
                await execAsync('powershell -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"', { timeout: 5000 });
            } else {
                const script = args.title
                    ? `$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${args.title}*" } | Select-Object -First 1; if ($proc) { $proc.MainWindowHandle }`
                    : `Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();'; [Native.Win]::ShowWindow([Native.Win]::GetForegroundWindow(), 6)`;
                await execAsync(`powershell -Command "${script}"`, { timeout: 5000 });
            }
        } else if (platform === 'darwin') {
            await execAsync(`osascript -e 'tell application "System Events" to set visible of first process whose frontmost is true to false'`, { timeout: 5000 });
        } else {
            await execAsync('xdotool getactivewindow windowminimize', { timeout: 5000 });
        }

        await logAudit('minimize_window', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ minimized: true }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('minimize_window', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleMaximizeWindow(args: { title?: string }) {
    try {
        if (platform === 'win32') {
            const script = `
                Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();'
                [Native.Win]::ShowWindow([Native.Win]::GetForegroundWindow(), 3)
            `;
            await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        } else if (platform === 'darwin') {
            await execAsync(`osascript -e 'tell application "System Events" to tell first process whose frontmost is true to set value of attribute "AXFullScreen" of window 1 to true'`, { timeout: 5000 });
        } else {
            await execAsync('wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz', { timeout: 5000 });
        }

        await logAudit('maximize_window', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ maximized: true }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('maximize_window', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleRestoreWindow(args: { title?: string }) {
    try {
        if (platform === 'win32') {
            const script = `
                Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();'
                [Native.Win]::ShowWindow([Native.Win]::GetForegroundWindow(), 9)
            `;
            await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        } else {
            await execAsync('wmctrl -r :ACTIVE: -b remove,maximized_vert,maximized_horz', { timeout: 5000 });
        }

        await logAudit('restore_window', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ restored: true }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('restore_window', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleCloseWindow(args: { title?: string; pid?: number; force?: boolean }) {
    try {
        if (args.force && args.pid) {
            if (platform === 'win32') {
                await execAsync(`taskkill /PID ${args.pid} /F`, { timeout: 5000 });
            } else {
                await execAsync(`kill -9 ${args.pid}`, { timeout: 5000 });
            }
        } else if (platform === 'win32') {
            const script = `
                Add-Type -Name Win -Namespace Native -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();'
                [Native.Win]::SendMessage([Native.Win]::GetForegroundWindow(), 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
            `;
            await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        } else {
            await execAsync('xdotool getactivewindow windowclose', { timeout: 5000 });
        }

        await logAudit('close_window', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ closed: true }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('close_window', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleResizeWindow(args: { title?: string; width: number; height: number }) {
    try {
        if (platform === 'win32') {
            const script = `
                Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class WinResize {
                    [DllImport("user32.dll")]
                    public static extern IntPtr GetForegroundWindow();
                    [DllImport("user32.dll")]
                    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
                    [DllImport("user32.dll")]
                    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
                    [StructLayout(LayoutKind.Sequential)]
                    public struct RECT { public int Left, Top, Right, Bottom; }
                }
"@
                $hwnd = [WinResize]::GetForegroundWindow()
                $rect = New-Object WinResize+RECT
                [WinResize]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
                [WinResize]::MoveWindow($hwnd, $rect.Left, $rect.Top, ${args.width}, ${args.height}, $true)
            `;
            await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        } else {
            await execAsync(`wmctrl -r :ACTIVE: -e 0,-1,-1,${args.width},${args.height}`, { timeout: 5000 });
        }

        await logAudit('resize_window', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ resized: true, width: args.width, height: args.height }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('resize_window', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleMoveWindow(args: { title?: string; x: number; y: number }) {
    try {
        if (platform === 'win32') {
            const script = `
                Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class WinMove {
                    [DllImport("user32.dll")]
                    public static extern IntPtr GetForegroundWindow();
                    [DllImport("user32.dll")]
                    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
                    [DllImport("user32.dll")]
                    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
                    [StructLayout(LayoutKind.Sequential)]
                    public struct RECT { public int Left, Top, Right, Bottom; }
                }
"@
                $hwnd = [WinMove]::GetForegroundWindow()
                $rect = New-Object WinMove+RECT
                [WinMove]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
                $w = $rect.Right - $rect.Left
                $h = $rect.Bottom - $rect.Top
                [WinMove]::MoveWindow($hwnd, ${args.x}, ${args.y}, $w, $h, $true)
            `;
            await execAsync(`powershell -Command "${script.replace(/\n/g, ' ')}"`, { timeout: 5000 });
        } else {
            await execAsync(`wmctrl -r :ACTIVE: -e 0,${args.x},${args.y},-1,-1`, { timeout: 5000 });
        }

        await logAudit('move_window', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ moved: true, x: args.x, y: args.y }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('move_window', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleLaunchApplication(args: { path: string; args?: string[]; waitForWindow?: boolean; timeout?: number }) {
    try {
        const appArgs = args.args?.join(' ') || '';

        if (platform === 'win32') {
            await execAsync(`start "" "${args.path}" ${appArgs}`, { timeout: 5000 });
        } else if (platform === 'darwin') {
            await execAsync(`open -a "${args.path}" ${appArgs}`, { timeout: 5000 });
        } else {
            await execAsync(`${args.path} ${appArgs} &`, { timeout: 5000 });
        }

        await logAudit('launch_application', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ launched: true, path: args.path }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('launch_application', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}
