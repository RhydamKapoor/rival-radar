import Link from 'next/link'
import React from 'react'
import { FaGoogle } from "react-icons/fa";
import LoginComp from "@/app/components/Auth/LoginComp";
export default function Login() {
  return (
    <div className='flex justify-center items-center h-full'>
        <div className='flex flex-col items-center justify-center rounded-lg shadow-md bg-base-100 w-1/3 p-5 gap-y-3'>
            <h1 className='font-bold mb-4 flex flex-col items-center text-base-content/50'>Welcome to <span className='text-primary text-2xl '>Rival Radar</span></h1>
            <LoginComp />
        </div>
    </div>
  )
}
