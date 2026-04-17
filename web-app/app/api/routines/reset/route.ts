import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteAllUserRoutines, initializeDatabase } from '@/lib/db';

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await initializeDatabase();
        await deleteAllUserRoutines(session.userId);

        return withCors(NextResponse.json({
            success: true,
            message: 'All routine data has been reset successfully'
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error resetting routines:', message);
        
        return withCors(NextResponse.json(
            { error: 'Failed to reset routine data' },
            { status: 500 }
        );
    }
}