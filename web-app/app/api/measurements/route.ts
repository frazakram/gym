import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase, getBodyMeasurements, addBodyMeasurement, deleteBodyMeasurement } from "@/lib/db";
import { requireCsrf } from "@/lib/csrf";
import { z } from "zod";

const AddMeasurementSchema = z.object({
  measured_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().min(20).max(400).optional(),
  waist: z.number().min(30).max(200).optional(),
  chest: z.number().min(40).max(200).optional(),
  arms: z.number().min(15).max(80).optional(),
  hips: z.number().min(40).max(200).optional(),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await initializeDatabase();
    const measurements = await getBodyMeasurements(session.userId);
    return NextResponse.json({ measurements });
  } catch {
    return NextResponse.json({ error: "Failed to fetch measurements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const body = await request.json().catch(() => ({}));
    const parsed = AddMeasurementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    // Require at least one measurement value
    const { weight, waist, chest, arms, hips } = parsed.data;
    if (weight == null && waist == null && chest == null && arms == null && hips == null) {
      return NextResponse.json({ error: "At least one measurement is required" }, { status: 400 });
    }

    const measurement = await addBodyMeasurement(session.userId, parsed.data);
    if (!measurement) {
      return NextResponse.json({ error: "Failed to save measurement" }, { status: 500 });
    }

    return NextResponse.json({ measurement }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save measurement" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Invalid measurement ID" }, { status: 400 });
    }

    const deleted = await deleteBodyMeasurement(session.userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete measurement" }, { status: 500 });
  }
}
