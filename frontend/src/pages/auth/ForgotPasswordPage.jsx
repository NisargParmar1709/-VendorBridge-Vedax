import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { ROUTES } from "../../constants/routes";
import { useForgotPassword } from "../../hooks/useAuth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const forgotPasswordMutation = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (values) => {
    forgotPasswordMutation.mutate(values.email, {
      onSuccess: () => {
        setSubmitted(true);
      },
    });
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Forgot password</h2>
        <p className="mt-2 text-sm text-gray-500">
          Enter your email and we&apos;ll send reset instructions if an account exists.
        </p>
      </div>

      {submitted ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          If an account exists for that email, reset instructions have been sent.
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="forgot_email">
            Email
          </label>
          <input
            id="forgot_email"
            type="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            {...register("email")}
          />
          {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
        </div>

        <button
          type="submit"
          disabled={forgotPasswordMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {forgotPasswordMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {forgotPasswordMutation.isPending ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Back to{" "}
        <Link className="font-medium text-blue-600 hover:text-blue-700" to={ROUTES.LOGIN}>
          Sign in
        </Link>
      </p>
    </div>
  );
}