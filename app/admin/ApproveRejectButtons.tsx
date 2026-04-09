"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApproveRejectButtons({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateListing(status: "approved" | "rejected") {
    setLoading(true);

    const response = await fetch("/api/admin/listings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, status }),
    });

    setLoading(false);

    if (response.ok) {
      router.refresh();
    } else {
      alert("Failed to update listing.");
    }
  }

  return (
    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
      <button onClick={() => updateListing("approved")} disabled={loading}>
        {loading ? "Working..." : "Approve"}
      </button>
      <button onClick={() => updateListing("rejected")} disabled={loading}>
        {loading ? "Working..." : "Reject"}
      </button>
    </div>
  );
}