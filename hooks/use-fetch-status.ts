"use client";

import { useState } from "react";

type FetchStatus = { loading: boolean; error: string | null };

export function useFetchStatus(): [
  FetchStatus,
  React.Dispatch<React.SetStateAction<FetchStatus>>,
] {
  return useState<FetchStatus>({ loading: false, error: null });
}
