import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { shortenAddress } from "@/lib/utils";

interface IdentityRecord {
  address: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface IdentityInput {
  name: string;
  description?: string;
}

interface IdentityEditorOptions {
  initialName?: string;
  initialDescription?: string;
  focusField?: "name" | "description";
}

interface IdentityContextValue {
  identities: Record<string, IdentityRecord>;
  getIdentity: (address: string) => IdentityRecord | undefined;
  upsertIdentity: (address: string, input: IdentityInput) => void;
  removeIdentity: (address: string) => void;
  openEditor: (address: string, options?: IdentityEditorOptions) => void;
}

const IdentityContext = createContext<IdentityContextValue | undefined>(undefined);

const STORAGE_KEY = "hour-vault-identities";

interface EditorState {
  isOpen: boolean;
  address: string | null;
  initialName: string;
  initialDescription: string;
  focusField?: "name" | "description";
}

export const IdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [identities, setIdentities] = useState<Record<string, IdentityRecord>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({
    isOpen: false,
    address: null,
    initialName: "",
    initialDescription: "",
  });
  const [editorName, setEditorName] = useState("");
  const [editorDescription, setEditorDescription] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, IdentityRecord>;
        setIdentities(parsed);
      }
    } catch (error) {
      console.warn("Failed to load identity records from localStorage", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") {
      return;
    }

    try {
      const serialized = JSON.stringify(identities);
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn("Failed to persist identity records", error);
    }
  }, [identities, isInitialized]);

  useEffect(() => {
    if (!editorState.isOpen || !editorState.address) {
      return;
    }

    const existing = identities[editorState.address];
    setEditorName(editorState.initialName ?? existing?.name ?? "");
    setEditorDescription(editorState.initialDescription ?? existing?.description ?? "");
  }, [editorState, identities]);

  const getIdentity = useCallback(
    (address: string) => identities[address] ?? undefined,
    [identities]
  );

  const upsertIdentity = useCallback((address: string, input: IdentityInput) => {
    setIdentities((prev) => {
      const next = { ...prev };
      const now = new Date().toISOString();
      const sanitized: IdentityRecord = {
        address,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        createdAt: prev[address]?.createdAt ?? now,
        updatedAt: now,
      };
      next[address] = sanitized;
      return next;
    });
  }, []);

  const removeIdentity = useCallback((address: string) => {
    setIdentities((prev) => {
      if (!(address in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[address];
      return next;
    });
  }, []);

  const openEditor = useCallback((address: string, options?: IdentityEditorOptions) => {
    setEditorState({
      isOpen: true,
      address,
      initialName: options?.initialName ?? identities[address]?.name ?? "",
      initialDescription: options?.initialDescription ?? identities[address]?.description ?? "",
      focusField: options?.focusField,
    });
  }, [identities]);

  const closeEditor = useCallback(() => {
    setEditorState({
      isOpen: false,
      address: null,
      initialName: "",
      initialDescription: "",
      focusField: undefined,
    });
    setEditorName("");
    setEditorDescription("");
  }, []);

  const handleEditorSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!editorState.address) {
        return;
      }

      const trimmedName = editorName.trim();
      if (!trimmedName) {
        return;
      }

      upsertIdentity(editorState.address, {
        name: trimmedName,
        description: editorDescription.trim() ? editorDescription.trim() : undefined,
      });
      closeEditor();
    },
    [editorState.address, editorName, editorDescription, upsertIdentity, closeEditor]
  );

  const contextValue = useMemo<IdentityContextValue>(() => ({
    identities,
    getIdentity,
    upsertIdentity,
    removeIdentity,
    openEditor,
  }), [identities, getIdentity, upsertIdentity, removeIdentity, openEditor]);

  return (
    <IdentityContext.Provider value={contextValue}>
      {children}
      <Dialog open={editorState.isOpen} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent>
          <form onSubmit={handleEditorSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Set Display Name</DialogTitle>
              <DialogDescription>
                Associate a friendly name with {editorState.address ? shortenAddress(editorState.address) : "this address"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="identity-name">Name</Label>
              <Input
                id="identity-name"
                value={editorName}
                onChange={(event) => setEditorName(event.target.value)}
                autoFocus={editorState.focusField !== "description"}
                placeholder="e.g. Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identity-description">Description (optional)</Label>
              <Textarea
                id="identity-description"
                value={editorDescription}
                onChange={(event) => setEditorDescription(event.target.value)}
                placeholder="Add a note about this address"
                rows={3}
                autoFocus={editorState.focusField === "description"}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button type="submit" disabled={!editorName.trim()}>
                Save Name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </IdentityContext.Provider>
  );
};

export const useIdentityRegistry = (): IdentityContextValue => {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error("useIdentityRegistry must be used within an IdentityProvider");
  }
  return context;
};

export const useIdentity = (address?: string | null) => {
  const { getIdentity, upsertIdentity, removeIdentity, openEditor } = useIdentityRegistry();
  const normalized = address?.trim() ?? "";
  const identity = normalized ? getIdentity(normalized) : undefined;

  const setIdentity = useCallback((input: IdentityInput) => {
    if (!normalized) {
      return;
    }
    upsertIdentity(normalized, input);
  }, [normalized, upsertIdentity]);

  const clearIdentity = useCallback(() => {
    if (!normalized) {
      return;
    }
    removeIdentity(normalized);
  }, [normalized, removeIdentity]);

  const ensureIdentity = useCallback(() => {
    if (!normalized) {
      return;
    }
    openEditor(normalized, { focusField: identity?.name ? "description" : "name" });
  }, [normalized, openEditor, identity?.name]);

  return {
    address: normalized || undefined,
    identity,
    hasIdentity: !!identity,
    setIdentity,
    clearIdentity,
    openEditor: ensureIdentity,
    name: identity?.name ?? null,
    description: identity?.description ?? null,
  };
};
