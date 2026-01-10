import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Direct pool access (following pattern from db.ts internal usage)
import { Pool } from 'pg';

function isPostgresUrl(value: string): boolean {
    const v = value.trim();
    return v.startsWith("postgres://") || v.startsWith("postgresql://");
}

function firstEnv(...keys: string[]): string {
    for (const k of keys) {
        const v = process.env[k];
        if (typeof v !== "string") continue;
        const trimmed = v.trim();
        if (!trimmed) continue;
        if (!isPostgresUrl(trimmed)) continue;
        return trimmed;
    }
    return "";
}

const connectionString = firstEnv(
    "POSTGRES_URL",
    "DATABASE_URL",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_PRISMA_URL"
);

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

function allowMockAuth(): boolean {
    return process.env.ALLOW_MOCK_AUTH === 'true';
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.userId;

        // Delete all routines and associated completions for this user
        await pool.query(
            `DELETE FROM exercise_completions 
       WHERE routine_id IN (
         SELECT id FROM routines WHERE user_id = $1
       )`,
            [userId]
        );

        await pool.query(
            'DELETE FROM routines WHERE user_id = $1',
            [userId]
        );

        return NextResponse.json({
            success: true,
            message: 'All routine data has been reset successfully'
        }, { status: 200 });

    } catch (error: unknown) {
        // If mock mode, just return success (there's nothing to clear in mock)
        if (allowMockAuth()) {
            console.warn('Reset in mock mode (no-op):', error);
            return NextResponse.json({
                success: true,
                message: 'All routine data has been reset successfully'
            }, { status: 200 });
        }

        const message = error instanceof Error ? error.message : String(error);
        console.error('Error resetting routines:', message);
        return NextResponse.json(
            { error: 'Failed to reset routine data' },
            { status: 500 }
        );
    }
}
