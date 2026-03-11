import { Blob } from "buffer";
import { FormData } from "undici";
import type { BodyEncoding, MultipartPart } from "@hookdump/shared";

export const MULTIPART_PREVIEW_LIMIT_BYTES = 2 * 1024 * 1024;

interface BuildBodyInput {
  bodyEncoding: BodyEncoding | null;
  bodyText: string | null;
  bodyBase64: string | null;
  multipartParts: MultipartPart[] | null;
}

interface BuildBodyResult {
  body: string | Buffer | FormData | undefined;
  error: string | null;
  isMultipart: boolean;
}

export function parseMultipartParts(
  raw: string | null
): MultipartPart[] | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as MultipartPart[];
  } catch {
    return null;
  }
}

export function buildForwardBody(input: BuildBodyInput): BuildBodyResult {
  if (!input.bodyEncoding) {
    return { body: undefined, error: null, isMultipart: false };
  }

  if (input.bodyEncoding === "utf8") {
    return {
      body: input.bodyText ?? undefined,
      error: null,
      isMultipart: false,
    };
  }

  if (input.bodyEncoding === "base64") {
    if (!input.bodyBase64) {
      return { body: undefined, error: null, isMultipart: false };
    }

    return {
      body: Buffer.from(input.bodyBase64, "base64"),
      error: null,
      isMultipart: false,
    };
  }

  const parts = input.multipartParts;
  if (!parts || parts.length === 0) {
    return {
      body: undefined,
      error: "Multipart payload has no parts available for forward/replay.",
      isMultipart: true,
    };
  }

  const form = new FormData();

  for (const part of parts) {
    if (part.kind === "field") {
      form.append(part.name, part.value ?? "");
      continue;
    }

    if (part.truncated || !part.dataBase64) {
      return {
        body: undefined,
        error:
          "Multipart file content is truncated and cannot be forwarded/replayed exactly.",
        isMultipart: true,
      };
    }

    const fileBytes = Buffer.from(part.dataBase64, "base64");
    const blob = new Blob([fileBytes], {
      type: part.contentType || "application/octet-stream",
    });

    form.append(part.name, blob, part.filename || "file");
  }

  return {
    body: form,
    error: null,
    isMultipart: true,
  };
}

export function removeHeaderCaseInsensitive(
  headers: Record<string, string>,
  headerName: string
): void {
  const lookup = headerName.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lookup) {
      delete headers[key];
    }
  }
}
