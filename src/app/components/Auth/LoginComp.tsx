"use client";
import { loginSchema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";


type loginDetails = {
  email: string;
  password: string;
};
export default function LoginComp() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<loginDetails>({
    resolver: zodResolver(loginSchema),
  });

  const userLogin = async (data: loginDetails) => {
    if (data) {
      const toastId = toast.loading("Logging in...");
      try {
        const response = await signIn("credentials", {
          redirect: false,
          email: data.email,
          password: data.password,
        });
        if (response?.ok) {
          // toast.success("Login successful!", { id: toastId });
          toast.success("Logged in successfully", { id: toastId });
        } else {
          toast.error(response?.error || "Login failed!", { id: toastId });
        }
      } catch (error: any) {
        toast.error(error.message, { id: toastId });
      }
    }
  };
  return (
    <>
      <form
        className="flex flex-col gap-y-1 w-full"
        onSubmit={handleSubmit(userLogin)}
      >
        <div className="flex flex-col">
          <div className="flex flex-col">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Email"
              {...register("email")}
              className="input input-bordered w-full outline-none border rounded p-2"
            />
          </div>
          <p
            className={`text-sm text-error ${
              errors.email ? "visible" : "invisible"
            }`}
          >
            {errors.email?.message || `Invalid`}
          </p>
        </div>
        <div className="flex flex-col">
          <div className="flex flex-col">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Password"
              {...register("password")}
              className="input input-bordered w-full outline-none border rounded p-2"
            />
          </div>
          <p
            className={`text-sm text-error ${
              errors.password ? "visible" : "invisible"
            }`}
          >
            {errors.password?.message || `Invalid`}
          </p>
        </div>
        <button
          className="bg-primary text-white rounded-lg p-2 cursor-pointer"
          type="submit"
        >
          Login
        </button>
      </form>

      <div className="flex flex-col items-center gap-y-2 w-full">
        <p className="text-sm text-base-content/50">or</p>
        <button
          className="bg-warning text-warning-content rounded-lg p-2 w-full flex items-center justify-center gap-2 cursor-pointer"
          onClick={() => signIn("google")}
        >
          <FaGoogle size={14} /> Google
        </button>
        <p className="text-sm text-base-content/50">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary capitalize">
            signup
          </Link>
        </p>
      </div>
    </>
  );
}
