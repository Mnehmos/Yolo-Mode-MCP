import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../storage/db';
import { logAudit } from '../audit';
import { loadConfig } from '../config';

const config = loadConfig();

export const CrudCreateSchema = {
    collection: z.string(),
    data: z.any(),
};

export const CrudReadSchema = {
    collection: z.string(),
    id: z.string(),
};

export const CrudUpdateSchema = {
    collection: z.string(),
    id: z.string(),
    data: z.any(),
};

export const CrudDeleteSchema = {
    collection: z.string(),
    id: z.string(),
};

export const CrudQuerySchema = {
    collection: z.string(),
    filter: z.any().optional(),
    limit: z.number().optional(),
};

export async function handleCrudCreate(args: { collection: string; data: any }) {
    try {
        const id = uuidv4();
        const db = await getDb();

        // Parse data if it's a string
        const parsedData = typeof args.data === 'string' ? JSON.parse(args.data) : args.data;

        await db.run(
            `INSERT INTO kv_store (collection, id, data) VALUES (?, ?, ?)`,
            args.collection, id, JSON.stringify(parsedData)
        );

        await logAudit('crud_create', args, { id });

        return {
            content: [{ type: 'text', text: JSON.stringify({ id, ...parsedData }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('crud_create', args, null, error.message);
        throw error;
    }
}

export async function handleCrudRead(args: { collection: string; id: string }) {
    try {
        const db = await getDb();
        const row = await db.get(
            `SELECT data FROM kv_store WHERE collection = ? AND id = ?`,
            args.collection, args.id
        );

        if (!row) {
            throw new Error(`Record not found in collection ${args.collection} with id ${args.id}`);
        }

        const data = JSON.parse(row.data);
        await logAudit('crud_read', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ id: args.id, ...data }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('crud_read', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleCrudUpdate(args: { collection: string; id: string; data: any }) {
    try {
        const db = await getDb();

        // Parse data if it's a string
        const parsedData = typeof args.data === 'string' ? JSON.parse(args.data) : args.data;

        // First get existing data to merge
        const row = await db.get(
            `SELECT data FROM kv_store WHERE collection = ? AND id = ?`,
            args.collection, args.id
        );

        if (!row) {
            throw new Error(`Record not found`);
        }

        const existingData = JSON.parse(row.data);
        const newData = { ...existingData, ...parsedData };

        await db.run(
            `UPDATE kv_store SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE collection = ? AND id = ?`,
            JSON.stringify(newData), args.collection, args.id
        );

        await logAudit('crud_update', args, 'success');

        return {
            content: [{ type: 'text', text: JSON.stringify({ id: args.id, ...newData }, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('crud_update', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleCrudDelete(args: { collection: string; id: string }) {
    try {
        const db = await getDb();
        const result = await db.run(
            `DELETE FROM kv_store WHERE collection = ? AND id = ?`,
            args.collection, args.id
        );

        await logAudit('crud_delete', args, result.changes && result.changes > 0 ? 'success' : 'not_found');

        if (!result.changes || result.changes === 0) {
            return {
                content: [{ type: 'text', text: `Record not found` }],
                isError: true,
            };
        }

        return {
            content: [{ type: 'text', text: `Successfully deleted record ${args.id}` }],
        };
    } catch (error: any) {
        await logAudit('crud_delete', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}

export async function handleCrudQuery(args: { collection: string; filter?: any; limit?: number }) {
    try {
        const limit = args.limit || config.crud.defaultLimit;
        const db = await getDb();

        // For now, we'll do simple filtering in memory since data is JSON
        const rows = await db.all(
            `SELECT id, data FROM kv_store WHERE collection = ? ORDER BY created_at DESC LIMIT ?`,
            args.collection, limit * 5
        );

        let results = rows.map(row => ({
            id: row.id,
            ...JSON.parse(row.data)
        }));

        if (args.filter) {
            // Parse filter if it's a string
            const parsedFilter = typeof args.filter === 'string' ? JSON.parse(args.filter) : args.filter;

            results = results.filter(item => {
                return Object.entries(parsedFilter as Record<string, any>).every(([key, value]) => {
                    return item[key] === value;
                });
            });
        }

        // Apply limit after filtering
        results = results.slice(0, limit);

        await logAudit('crud_query', args, `found ${results.length} records`);

        return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        };
    } catch (error: any) {
        await logAudit('crud_query', args, null, error.message);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
}
