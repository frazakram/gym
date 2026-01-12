import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteAllUserRoutines } from '@/lib/db';

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await deleteAllUserRoutines(session.userId);

        return NextResponse.json({
            success: true,
            message: 'All routine data has been reset successfully'
        }, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error resetting routines:', message);
        
        return NextResponse.json(
            { error: 'Failed to reset routine data' },
            { status: 500 }
        );
    }
}
