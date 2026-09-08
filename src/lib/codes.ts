import { customAlphabet } from "nanoid";

// Unambiguous uppercase alphabet (no 0/O, 1/I) for customer-facing codes.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const nano = customAlphabet(alphabet, 8);

export function newOrderCode(): string {
  return `GCN-${nano().slice(0, 6)}`;
}

export function newTicketCode(): string {
  return `TKT-${nano().slice(0, 6)}`;
}
