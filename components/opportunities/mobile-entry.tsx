"use client";

import { useState } from "react";

import { MobileEntrySheet } from "@/components/opportunities/mobile-entry-sheet";

type MobileEntryProps = {
  opportunityId: string;
  opportunityVersion: number;
  currentStatus:
    | "DISCOVERED"
    | "SUBMITTED"
    | "IN_PROGRESS"
    | "OFFER"
    | "CLOSED"
    | "CANCELLED"
    | "REJECTED";
};

export function MobileEntry({
  opportunityId,
  opportunityVersion,
  currentStatus,
}: MobileEntryProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-button ui-button-primary"
      >
        Quick entry
      </button>

      <MobileEntrySheet
        opportunityId={opportunityId}
        opportunityVersion={opportunityVersion}
        currentStatus={currentStatus}
        open={open}
        onClose={() => setOpen(false)}
        onCompleted={() => window.location.reload()}
      />
    </>
  );
}
