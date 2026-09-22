"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const profileFormSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});
type ProfileFormInput = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    if (session?.user) {
      form.reset({ name: session.user.name ?? "", email: session.user.email ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  async function onSubmit(values: ProfileFormInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update profile");
        return;
      }
      toast.success("Profile updated");
      await update({ name: data.user.name, email: data.user.email });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return <div className="container-page py-16 text-center text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Profile</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="card max-w-md space-y-4 p-5">
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input id="name" className="input" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div>
          <span className="label">Phone number</span>
          <p className="input bg-gray-50 text-gray-500">{session?.user?.phone}</p>
          <p className="mt-1 text-xs text-gray-400">Phone number cannot be changed here.</p>
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
