"use client";

import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Section } from "./section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LeadFormState {
  name: string;
  phone: string;
  message: string;
}

const INITIAL_STATE: LeadFormState = { name: "", phone: "", message: "" };

function validate(state: LeadFormState): string | null {
  if (!state.name) return "Please enter your name.";
  if (!/^[\d+\-() ]{7,}$/.test(state.phone)) {
    return "Please enter a valid phone number.";
  }
  return null;
}

export function LeadFooter() {
  const [form, setForm] = useState<LeadFormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleChange<K extends keyof LeadFormState>(field: K) {
    return (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    // Placeholder submission: no Lead model/Firestore write exists yet.
    // A future Leads feature wires this into a real Lead record.
    setError(null);
    setSubmitted(true);
  }

  return (
    <Section tone="light">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-heading mb-2 text-2xl uppercase tracking-tight">
          Need a Car?
        </h2>
        {submitted ? (
          <p className="text-[#0d0d0d]/70">
            Thanks — we&apos;ve got your message and will reach out shortly.
          </p>
        ) : (
          <>
            <p className="mb-6 text-[#0d0d0d]/70">
              Tell us what you&apos;re looking for and a member of our team
              will follow up.
            </p>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 text-left"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="lf-name">Name</Label>
                <Input
                  id="lf-name"
                  value={form.name}
                  onChange={handleChange("name")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lf-phone">Phone</Label>
                <Input
                  id="lf-phone"
                  value={form.phone}
                  onChange={handleChange("phone")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lf-message">What are you looking for?</Label>
                <Textarea
                  id="lf-message"
                  value={form.message}
                  onChange={handleChange("message")}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="bg-[#0d0d0d] text-white hover:bg-[#0d0d0d]/80"
              >
                Send Message
              </Button>
            </form>
          </>
        )}
      </div>
    </Section>
  );
}
