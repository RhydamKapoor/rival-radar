import { pool } from "@/utils/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    try {
        const { firstName, lastName, email, password } = await req.json();
        
        const [existingRows]: any = await pool.execute(
          "SELECT id FROM users WHERE email = ?",
          [email]
        );
        
        if (existingRows.length > 0) {
          return NextResponse.json({ message: "User already exists" }, { status: 400 });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const id = uuidv4();
        await pool.execute(
          "INSERT INTO users (id, firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?, ?)",
          [id, firstName, lastName, email, hashedPassword, "User"]
        );
      
        return NextResponse.json({message: "User created successfully"}, {status: 200});
    } catch (error: any) {
        return NextResponse.json({message: error.message}, {status: 500});
    }
 
};