# MCP CRUD/CLI Server (YOLO Mode)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server for Claude Desktop that provides unrestricted CLI access and flexible CRUD operations backed by a global SQLite database. Perfect for power users who want Claude to have direct system access and persistent data storage.

## ⚠️ Security Warning

This server operates in "YOLO mode" - it provides **unrestricted command execution** capabilities to Claude. Only use this in trusted environments. Claude will have the ability to:
- Execute arbitrary shell commands
- Read and write files
- Modify system configurations

**Use at your own risk and only if you understand the implications.**

## Features

- **🖥️ CLI Tools**: Execute arbitrary shell commands with `exec_cli` and perform file operations (read, write, list directories)
- **📦 CRUD Tools**: Create, read, update, delete, and query records in a flexible key-value store
- **💾 Global Storage**: All data is stored in `~/.mcp/workspace.db`, accessible across different projects
- **📝 Audit Logging**: All operations are logged to the `audit_log` table in the database
- **⚙️ Configuration**: Customizable via `~/.mcp/config.json`

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/mcp-crud-cli.git
   cd mcp-crud-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the server:
   ```bash
   npm run build
   ```

### From npm (coming soon)

```bash
npm install -g mcp-crud-cli
```

## Configuration

### Server Configuration

Create a configuration file at `~/.mcp/config.json` (optional):

```json
{
  "storage": {
    "type": "sqlite",
    "path": "~/.mcp/workspace.db"
  },
  "cliPolicy": {
    "mode": "allow-all",
    "extraBlockedPatterns": [],
    "timeoutMs": 30000
  },
  "crud": {
    "defaultLimit": 1000
  }
}
```

### Claude Desktop Setup

Add the following to your Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "crud-cli": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-crud-cli/dist/index.js"
      ]
    }
  }
}
```

Replace `/absolute/path/to/mcp-crud-cli` with the actual path to your installation.

## Usage

### CLI Tools

The server provides several CLI-related tools:

#### Execute Commands
Ask Claude to run shell commands:
- "Run `dir` in the current directory" (Windows)
- "List files in /home/user" (Unix)
- "Check the current date and time"

#### File Operations
- **Read File**: "Read the contents of `package.json`"
- **Write File**: "Create a new file called `notes.txt` with the content 'Hello World'"
- **List Directory**: "Show me what's in the current directory"

### CRUD Tools

The server provides a flexible CRUD interface backed by SQLite:

#### Create Records
"Create a new task in the 'tasks' collection with title 'Buy milk' and status 'pending'"

#### Read Records
"Show me the task with ID 'abc123'"

#### Query Records
"List all items in the 'tasks' collection where status is 'pending'"

#### Update Records
"Update task 'abc123' to set status to 'completed'"

#### Delete Records
"Delete the task with ID 'abc123'"

## API Reference

### CLI Tools

- **`exec_cli(command, cwd?)`** - Execute a shell command
- **`read_file(path)`** - Read file contents
- **`write_file(path, content)`** - Write content to a file
- **`list_directory(path)`** - List directory contents

### CRUD Tools

- **`crud_create(collection, data)`** - Create a new record
- **`crud_read(collection, id)`** - Read a record by ID
- **`crud_update(collection, id, data)`** - Update an existing record
- **`crud_delete(collection, id)`** - Delete a record
- **`crud_query(collection, filter?, limit?)`** - Query records with optional filtering

## Data Storage

All data is stored in SQLite database at `~/.mcp/workspace.db` with the following structure:

- **`collections`** - Stores collection metadata
- **`records`** - Stores actual data records
- **`audit_log`** - Logs all operations for auditing

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/anthropics/anthropic-sdk-typescript) by Anthropic.

## Disclaimer

This software is provided "as is" without warranty of any kind. The unrestricted command execution feature is powerful but potentially dangerous. Always review what Claude is about to execute before allowing it to run.
