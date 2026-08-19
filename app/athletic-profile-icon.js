"use client";

import { useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";

function subscribeToGender(callback) {
  window.addEventListener("luqmati:gender", callback);
  return () => window.removeEventListener("luqmati:gender", callback);
}

function getGenderSnapshot() {
  if (typeof window === "undefined") return "male";
  return localStorage.getItem("luqmati-user-gender") || "male";
}

export function useGender() {
  const { user } = useUser();
  const storedGender = useSyncExternalStore(subscribeToGender, getGenderSnapshot, () => "male");
  const clerkGender = user?.unsafeMetadata?.gender || user?.publicMetadata?.gender;
  const gender = clerkGender || storedGender || "male";

  const setGender = (nextGender) => {
    localStorage.setItem("luqmati-user-gender", nextGender);
    if (user?.update) {
      user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          gender: nextGender,
        },
      }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent("luqmati:gender", { detail: { gender: nextGender } }));
  };

  return { gender, setGender };
}

export default function AthleticProfileIcon({ width = 24, height = 24, className = "" }) {
  const { gender } = useGender();

  if (gender === "female") {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="currentColor"
        className={className}
        aria-label="Athletic Female Profile Icon"
      >
        {/* Ponytail & Head */}
        <path d="M 45.5 17 C 40 17 35 22 35 28 C 35 32 37.5 35 41 36.5 C 39.5 33 37 28 35.5 23 C 34.5 19.5 36.5 16 40 16.5 C 42.5 16.8 44 18 45.5 17 Z" />
        <path d="M 50 17 C 54.5 17 58 19.8 59 23.5 C 60 26.5 59.5 29 60.5 30.5 C 61 31.5 59.5 32.5 58.5 32 C 57.2 31 56.5 29 55 28.5 C 53.5 28 51.8 29 50.8 30.2 C 50 31.5 50.2 33.5 50 35 C 45.5 35.8 43 32 43 25.5 C 43 20.2 46.2 17 50 17 Z" />
        {/* Athletic female torso */}
        <path d="M 46 34.5 C 48 34.5 51 35 52.5 37 C 55 40 58.5 41.5 62 43 C 67.5 45.5 71.5 50 72.5 56.5 C 73 60 72 68 70.5 72 L 62.5 72 C 63 68 62 61 58 57.5 C 55 55 51 54.5 47 54.5 C 43 54.5 39 55 36 57.5 C 32 61 31 68 31.5 72 L 23.5 72 C 22 68 21 60 21.5 56.5 C 22.5 50 26.5 45.5 32 43 C 35.5 41.5 39 40 41.5 37 C 43 35 44.5 34.5 46 34.5 Z" />
        <path d="M 41 53 Q 50 59 55 52.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      aria-label="Athletic Male Profile Icon"
    >
      {/* Head */}
      <path d="M 50 14 C 54.5 14 58.2 16.8 59.5 21 C 60.5 24 59.8 27.5 60.5 29.5 C 61 31 59.5 32 58.5 31.5 C 57 30.5 56.5 28.5 55 28 C 53.5 27.5 51.5 28.5 50.5 30 C 49.5 31.5 50 34 50 35.5 C 45 36.5 42 32 42 25 C 42 18.9 45.6 14 50 14 Z" />
      {/* Muscular neck, shoulders and torso */}
      <path d="M 45 34 C 47.5 34 51 34.5 52.5 36.5 C 55 39.5 59.5 41 64 42.5 C 72 45 77 50 79 57 C 80 60.5 78.5 69.5 77 72 L 67 72 L 67 60 C 65 56 61 54 57.5 54 L 42.5 54 C 39 54 35 56 33 60 L 33 72 L 23 72 C 21.5 69.5 20 60.5 21 57 C 23 50 28 45 36 42.5 C 40.5 41 43.5 38 45 34 Z" />
      <path d="M 34 52 Q 42 57 48 53" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 66 52 Q 58 57 52 53" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
