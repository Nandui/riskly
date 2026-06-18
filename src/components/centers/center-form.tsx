"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Button, buttonClasses } from "@/components/ui/button";
import type { FormState } from "@/lib/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

interface CenterFormValues {
  name: string;
  siteCode: string | null;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
}

export function CenterForm({
  action,
  center,
  submitLabel,
}: {
  action: Action;
  center?: CenterFormValues | null;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    null,
  );
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg border border-critical-line bg-critical-bg px-4 py-3 text-sm font-medium text-critical">
          {state.error}
        </div>
      )}

      <Field label="Centre name" htmlFor="name" required error={fe.name}>
        <Input
          id="name"
          name="name"
          defaultValue={center?.name ?? ""}
          placeholder="e.g. Riverside Leisure Centre"
          autoFocus
        />
      </Field>

      <Field
        label="Site code"
        htmlFor="siteCode"
        required
        error={fe.siteCode}
        hint="2 letters, used in assessment references — e.g. BT → RA-BT-0001"
        className="sm:max-w-[14rem]"
      >
        <Input
          id="siteCode"
          name="siteCode"
          defaultValue={center?.siteCode ?? ""}
          placeholder="BT"
          maxLength={2}
          autoCapitalize="characters"
          className="uppercase"
        />
      </Field>

      <Field label="Address" htmlFor="address" error={fe.address}>
        <Textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={center?.address ?? ""}
          placeholder="Street, town, postcode"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact name" htmlFor="contactName" error={fe.contactName}>
          <Input
            id="contactName"
            name="contactName"
            defaultValue={center?.contactName ?? ""}
            placeholder="Duty manager"
          />
        </Field>
        <Field
          label="Contact email"
          htmlFor="contactEmail"
          error={fe.contactEmail}
        >
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={center?.contactEmail ?? ""}
            placeholder="name@centre.example"
          />
        </Field>
      </div>

      <Field label="Phone" htmlFor="phone" error={fe.phone} className="sm:max-w-xs">
        <Input
          id="phone"
          name="phone"
          defaultValue={center?.phone ?? ""}
          placeholder="01632 960000"
        />
      </Field>

      <Field label="Notes" htmlFor="notes" error={fe.notes}>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={center?.notes ?? ""}
          placeholder="Anything useful about this site"
        />
      </Field>

      {center && (
        <label className="flex items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={center.isActive}
            className="size-4 rounded border-line-strong accent-primary"
          />
          Active — appears in the centre switcher
        </label>
      )}

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Link href="/admin" className={buttonClasses({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
