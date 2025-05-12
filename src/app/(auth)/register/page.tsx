import Link from "next/link";
import React from "react";
import RegisterComp from "@/app/components/Auth/RegisterComp";

export default function Register() {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="flex flex-col items-center justify-center rounded-lg shadow-md bg-base-100 w-1/3 p-5 gap-y-3">
        <h1 className="font-bold mb-4 flex flex-col items-center text-base-content/50 capitalize">
          get started with{" "}
          <span className="text-primary text-2xl ">Rival Radar</span>
        </h1>
        <RegisterComp />
        <div className="flex flex-col items-center gap-y-2 w-full">
          <p className="text-sm text-base-content/50">
            Already have an account?{" "}
            <Link href="/login" className="text-primary capitalize">
              login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
