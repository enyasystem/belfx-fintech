"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// TypeScript: Extend window to include SUMSUBKYC
declare global {
  interface Window {
    SUMSUBKYC?: any;
  }
}

// TODO: Connect to Supabase and new KYC Provider API
// TODO: Add stepper logic and form validation

const KycPage = () => {
  // Placeholder for stepper state
  const [step, setStep] = React.useState(1);
  const router = useRouter();

  // Placeholder for form data
  const [form, setForm] = React.useState({
    documentType: "bvn",
    documentValue: "",
    documentFile: null as File | null,
    selfieFile: null as File | null,
  });

  // Placeholder for status
  const [status, setStatus] = React.useState<"pending_submission" | "pending_review" | "approved" | "rejected">("pending_submission");

  // Placeholder for user ID
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (data?.user?.id) setUserId(data.user.id);
    });
  }, []);

  // Placeholder for submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.documentFile || !form.selfieFile) {
      alert("Please upload both ID document and selfie.");
      return;
    }
    if (!userId) {
      alert("User not authenticated.");
      return;
    }
    setStatus("pending_review");
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("documentType", form.documentType);
    formData.append("documentValue", form.documentValue);
    formData.append("documentFile", form.documentFile);
    formData.append("selfieFile", form.selfieFile);
    try {
      // Smile Identity KYC API call removed. Replace with your new API integration here.
      // Example:
      // const res = await fetch("/api/kyc/new-provider", {
      //   method: "POST",
      //   body: formData,
      // });
      const res = { ok: true }; // Placeholder response
      const data = await res.json();
      if (res.ok) {
        setStatus("pending_review");
      } else {
        setStatus("rejected");
        alert(data.error || "KYC submission failed");
      }
    } catch (err: any) {
      setStatus("rejected");
      alert(err.message || "KYC submission failed");
    }
  };

  // Dynamically load the Sumsub WebSDK script from CDN if not already loaded
  function loadSumsubSdk(callback: () => void) {
    if (window.SUMSUBKYC) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://static.sumsub.com/idensic/static/sumsub-kyc-sdk-1.0.0.js';
    script.async = true;
    script.onload = callback;
    document.body.appendChild(script);
  }

  // Example Sumsub KYC integration (client-side)
  async function startSumsubKyc(userId: string) {
    // Call your API route to get a Sumsub access token
    const res = await fetch('/api/kyc/sumsub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalUserId: userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get Sumsub token');
    const { token } = data;

    loadSumsubSdk(() => {
      if (window.SUMSUBKYC) {
        window.SUMSUBKYC.init(
          {
            lang: 'en',
            accessToken: token,
            onMessage: (type: string, payload: any) => {
              // handle events
            },
            onError: (error: any) => {
              // handle errors
            },
          }
        ).launch('#sumsub-kyc-container');
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>KYC Verification</CardTitle>
          <CardDescription>
            Complete your KYC to unlock all kwegofx features. We require your BVN/ID, a valid ID document, and a selfie for verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stepper UI Placeholder */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className={step >= 1 ? "font-bold" : "text-gray-400"}>1. Details</span>
              <span className={step >= 2 ? "font-bold" : "text-gray-400"}>2. ID Upload</span>
              <span className={step >= 3 ? "font-bold" : "text-gray-400"}>3. Selfie</span>
              <span className={step >= 4 ? "font-bold" : "text-gray-400"}>4. Review</span>
            </div>
          </div>
          {/* Step 1: Enter BVN/ID */}
          {step === 1 && (
            <form onSubmit={() => setStep(2)}>
              <label className="block mb-2 font-medium">Document Type</label>
              <select
                className="w-full mb-4 p-2 border rounded"
                value={form.documentType}
                onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))}
              >
                <option value="bvn">BVN</option>
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
              </select>
              <label className="block mb-2 font-medium">Document Number</label>
              <input
                className="w-full mb-4 p-2 border rounded"
                type="text"
                value={form.documentValue}
                onChange={e => setForm(f => ({ ...f, documentValue: e.target.value }))}
                required
              />
              <Button type="submit" className="w-full">Continue</Button>
            </form>
          )}
          {/* Step 2: Upload ID */}
          {step === 2 && (
            <form onSubmit={() => setStep(3)}>
              <label className="block mb-2 font-medium">Upload ID Document</label>
              <input
                className="w-full mb-4"
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setForm(f => ({ ...f, documentFile: e.target.files?.[0] || null }))}
                required
              />
              <Button type="button" variant="secondary" className="mr-2" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit">Continue</Button>
            </form>
          )}
          {/* Step 3: Upload Selfie */}
          {step === 3 && (
            <form onSubmit={() => setStep(4)}>
              <label className="block mb-2 font-medium">Upload Selfie</label>
              <input
                className="w-full mb-4"
                type="file"
                accept="image/*"
                onChange={e => setForm(f => ({ ...f, selfieFile: e.target.files?.[0] || null }))}
                required
              />
              <Button type="button" variant="secondary" className="mr-2" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit">Continue</Button>
            </form>
          )}
          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <div><b>Document Type:</b> {form.documentType}</div>
                <div><b>Document Number:</b> {form.documentValue}</div>
                <div><b>ID File:</b> {form.documentFile?.name}</div>
                <div><b>Selfie:</b> {form.selfieFile?.name}</div>
              </div>
              <Button type="button" variant="secondary" className="mr-2" onClick={() => setStep(3)}>Back</Button>
              <Button type="submit">Submit for Review</Button>
            </form>
          )}
          {/* Status Message */}
          {status === "pending_review" && (
            <div className="mt-6 text-yellow-600 font-medium">Your KYC is under review. We'll notify you once it's complete.</div>
          )}
          {/* Sumsub KYC Container */}
          <div id="sumsub-kyc-container"></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KycPage;
