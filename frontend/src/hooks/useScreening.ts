import { useCallback, useEffect, useRef, useState } from "react";
import { preprocessDocument, screenDocument, resolveAssetUrl, ApiError } from "@/lib/api";
import type { AuditEntry, PreprocessResponse, ScreeningResponse } from "@/types/screening";

interface ScreeningState {
  idFile: File | null;
  originalPreviewUrl: string | null;
  processedPreviewUrl: string | null;
  preprocessResult: PreprocessResponse | null;
  isPreprocessing: boolean;
  screeningResult: ScreeningResponse | null;
  isScreening: boolean;
  errorMessage: string | null;
  auditEntries: AuditEntry[];
}

const initialState: ScreeningState = {
  idFile: null,
  originalPreviewUrl: null,
  processedPreviewUrl: null,
  preprocessResult: null,
  isPreprocessing: false,
  screeningResult: null,
  isScreening: false,
  errorMessage: null,
  auditEntries: [],
};

export function useScreening() {
  const [state, setState] = useState<ScreeningState>(initialState);
  const objectUrlsRef = useRef<string[]>([]);

  const trackObjectUrl = (url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  };

  const revokeTrackedUrls = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  };

  // Clean up object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const runScreeningPipeline = useCallback(async (idFile: File, selfieFile: File | null) => {
    setState((s) => ({
      ...s,
      idFile,
      originalPreviewUrl: trackObjectUrl(URL.createObjectURL(idFile)),
      processedPreviewUrl: null,
      preprocessResult: null,
      screeningResult: null,
      isPreprocessing: true,
      isScreening: true,
      errorMessage: null,
    }));

    const preprocessPromise = preprocessDocument(idFile)
      .then((result) => {
        setState((s) => ({
          ...s,
          preprocessResult: result,
          processedPreviewUrl: resolveAssetUrl(result.processed_image_path),
          isPreprocessing: false,
        }));
      })
      .catch((err) => {
        setState((s) => {
          const newErr = describeError(err, "Preprocessing");
          return {
            ...s,
            isPreprocessing: false,
            errorMessage: s.errorMessage ? `${s.errorMessage}; ${newErr}` : newErr,
          };
        });
      });

    const screenPromise = screenDocument(idFile, selfieFile)
      .then((result) => {
        setState((s) => {
          const entry: AuditEntry = {
            id: result.document_id,
            timestamp: new Date().toISOString(),
            fileName: idFile.name,
            trustScore: result.result.trust_score,
            verdict: result.result.verdict,
            documentId: result.document_id,
          };
          return {
            ...s,
            screeningResult: result,
            isScreening: false,
            auditEntries: [entry, ...s.auditEntries].slice(0, 50),
          };
        });
      })
      .catch((err) => {
        setState((s) => {
          const newErr = describeError(err, "Screening");
          return {
            ...s,
            isScreening: false,
            errorMessage: s.errorMessage ? `${s.errorMessage}; ${newErr}` : newErr,
          };
        });
      });

    await Promise.all([preprocessPromise, screenPromise]);
  }, []);

  const reset = useCallback(() => {
    revokeTrackedUrls();
    setState((s) => ({ ...initialState, auditEntries: s.auditEntries }));
  }, []);

  const clearAuditTrail = useCallback(() => {
    setState((s) => ({ ...s, auditEntries: [] }));
  }, []);

  return {
    ...state,
    runScreeningPipeline,
    reset,
    clearAuditTrail,
  };
}

function describeError(err: unknown, phase: string): string {
  if (err instanceof ApiError) {
    return `${phase} failed (${err.status}): ${err.message}`;
  }
  if (err instanceof Error) {
    return `${phase} failed: ${err.message}`;
  }
  return `${phase} failed: unknown error`;
}
