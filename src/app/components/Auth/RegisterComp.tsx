"use client";
import { signupSchema } from "@/utils/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";


type signupDetails = {
    firstName: string,
    lastName: string,
    email: string,
    password: string
}
export default function RegisterComp() {
  const { register, handleSubmit, formState: {errors} } = useForm<signupDetails>({
    resolver: zodResolver(signupSchema)
  });

    const userSubmit = async (data: signupDetails) => {
      console.log(data)
    if (data) {
        const toastId = toast.loading('Creating account...')
      try {
        const response = await axios.post(
          "http://localhost:3000/api/auth/register",
          data
        );
        console.log(response);
        if(response.status === 200){
            toast.success('Account created successfully', {id: toastId})
        }
      } catch (error: any) {
        console.log(error);
        toast.error(error.response.data.message, {id: toastId})
      }
    }
  };
  return (
    <form
      className="flex flex-col gap-y-1 w-full"
      onSubmit={handleSubmit(userSubmit)}
    >
      <div className="flex flex-col">
        <div className="flex w-full *:w-1/2 gap-x-3">
          <div className="flex flex-col">
            <div className="flex flex-col">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </label>
              <input
                type="firstName"
                id="firstName"
                placeholder="First Name"
                {...register("firstName")}
                className="input input-bordered w-full outline-none border rounded p-2"
              />
            </div>
            <p className={`text-sm text-error ${errors.firstName ? 'visible' : 'invisible'}`}>{errors.firstName?.message || `First name is required`}</p>
          </div>
          <div className="flex flex-col">
            <div className="flex flex-col">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <input
                type="lastName"
                id="lastName"
                placeholder="Last Name"
                {...register("lastName")}
                className="input input-bordered w-full outline-none border rounded p-2"
              />
            </div>
            <p className={`text-sm text-error ${errors.lastName ? 'visible' : 'invisible'}`}>{errors.lastName?.message || `Last name is required`}</p>
          </div>
        </div>
      </div>
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
        <p className={`text-sm text-error ${errors.email ? 'visible' : 'invisible'}`}>{errors.email?.message || `Invalid email`}</p>
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
        <p className={`text-sm text-error ${errors.password ? 'visible' : 'invisible'}`}>{errors.password?.message || `Invalid password`}</p>
      </div>
      <button className="bg-primary text-white rounded-lg p-2 cursor-pointer" type="submit">
        Register
      </button>
    </form>
  );
}
