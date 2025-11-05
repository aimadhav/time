import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, leading = 4, trailing = 4) {
  if (!address || address.length <= leading + trailing + 3) {
    return address;
  }
  return `${address.slice(0, leading)}...${address.slice(-trailing)}`;
}
