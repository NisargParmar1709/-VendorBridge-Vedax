import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { ROUTES } from "../../constants/routes";
import { useRegister } from "../../hooks/useAuth";

const registerSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
      "Password must contain uppercase, number, and special char"
    ),
  role: z.enum(["admin", "procurement_officer", "manager", "vendor"]),
  phone: z.string().optional(),
});

const roles = [
  { value: "admin", label: "Admin" },
  { value: "procurement_officer", label: "Procurement Officer" },
  { value: "manager", label: "Manager" },
  { value: "vendor", label: "Vendor" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      role: "vendor",
      phone: "",
    },
  });

  const onSubmit = (values) => {
    registerMutation.mutate(values, {
      onSuccess: () => {
        navigate(ROUTES.LOGIN);
      },
    });
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Create account</h2>
        <p className="mt-2 text-sm text-gray-500">
          Register to access VendorBridge.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="first_name">
              First name
            </label>
            <input
              id="first_name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              {...register("first_name")}
            />
            {errors.first_name ? <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="last_name">
              Last name
            </label>
            <input
              id="last_name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              {...register("last_name")}
            />
            {errors.last_name ? <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p> : null}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="register_email">
            Email
          </label>
          <input
            id="register_email"
            type="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            {...register("email")}
          />
          {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="register_password">
            Password
          </label>
          <div className="relative">
            <input
              id="register_password"
              type={showPassword ? "text" : "password"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password.message}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="role">
            Role
          </label>
          <select
            id="role"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            {...register("role")}
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {errors.role ? <p className="mt-1 text-xs text-red-600">{errors.role.message}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            {...register("phone")}
          />
          {errors.phone ? <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p> : null}
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {registerMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {registerMutation.isPending ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link className="font-medium text-blue-600 hover:text-blue-700" to={ROUTES.LOGIN}>
          Sign in
        </Link>
      </p>
    </div>
  );
}