import { pool } from "@/utils/db";
import { NextResponse } from "next/server";

export async function GET() {
    const [rows]: any = await pool.execute('SELECT * FROM users')
    return NextResponse.json(rows)  
}
