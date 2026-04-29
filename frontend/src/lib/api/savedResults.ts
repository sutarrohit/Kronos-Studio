import {
  SavedResultMetaSchema,
  SavedResultDetailSchema,
  type SavedResultMeta,
  type SavedResultDetail,
  type SaveResultRequest
} from "@/schemas/resultsSchema";
import { handleResponse, endpoint } from "@/utils/handleAPI";
import { z } from "zod";

export async function listSavedResults(): Promise<SavedResultMeta[]> {
  const response = await fetch(endpoint("/saved-results"), {
    method: "GET",
    cache: "no-store"
  });
  return handleResponse(response, z.array(SavedResultMetaSchema));
}

export async function getSavedResult(id: string): Promise<SavedResultDetail> {
  const response = await fetch(endpoint(`/saved-results/${id}`), {
    method: "GET",
    cache: "no-store"
  });
  return handleResponse(response, SavedResultDetailSchema);
}

export async function saveResult(body: SaveResultRequest): Promise<SavedResultDetail> {
  const response = await fetch(endpoint("/saved-results"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  return handleResponse(response, SavedResultDetailSchema);
}

export async function deleteSavedResult(id: string): Promise<void> {
  const response = await fetch(endpoint(`/saved-results/${id}`), {
    method: "DELETE",
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to delete saved result: ${response.status}`);
  }
}
