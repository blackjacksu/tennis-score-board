"use client";

// A per-browser id and remembered display name for the Find a Game board.
//
// This is not authentication. It exists so the person who posted a request can
// close it again from the same device, and so they don't retype their name
// every time. Anyone who clears their storage simply loses those two things.

const ID_KEY = "taa-client-id";
const NAME_KEY = "taa-display-name";

export function getClientId(): string {
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export function setDisplayName(name: string): void {
  window.localStorage.setItem(NAME_KEY, name.trim());
}
