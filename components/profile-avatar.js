export function ProfileAvatarIcon({ gender = "male", className = "" }) {
  const isFemale = gender === "female";

  if (isFemale) {
    return (
      <svg
        viewBox="0 0 88 88"
        aria-hidden="true"
        className={className}
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <g fill="currentColor">
          <path d="M63 17c-7.2 0-13 5.8-13 13 0 6.4 4.7 11.8 10.8 12.8l-1.6 6.9H49.6L42 67.2h7.8L52 78h7l2.2-10.8H70L64.7 50h-8.7l-1.6-6.9c6.1-1 10.8-6.4 10.8-12.8 0-7.2-5.8-13-13-13Zm0 7.5c3.1 0 5.5 2.5 5.5 5.5s-2.4 5.5-5.5 5.5-5.5-2.5-5.5-5.5 2.4-5.5 5.5-5.5Z" />
          <path d="M36 66.5c.8-6.1 4.7-11.4 10.4-14.6-5.1-1.4-9-7-9-13.4v-1.8c0-7.1 5.2-12.9 12-13.7v4.1c-4.4.8-7.7 4.6-7.7 9.1v1.8c0 5.4 4.3 9.7 9.7 9.7 5.3 0 9.7-4.3 9.7-9.7v-1.8c0-4.4-3.3-8.2-7.7-9.1v-4.1c6.8.8 12 6.6 12 13.7v1.8c0 6.4-3.9 12-9 13.4 5.7 3.2 9.6 8.5 10.4 14.6H36Z" />
          <path d="M22 17c4.8 4.7 7.2 11.1 7.2 18.1 0 8.6-3.8 16.1-9.8 21.1-.7-3.8-2.1-7.5-4.2-10.7l-1.1-1.8C11.7 34.2 12.7 22 22 17Z" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 88 88"
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <g fill="currentColor">
        <circle cx="44" cy="20" r="12" />
        <path d="M28 47c0-8.8 7.2-16 16-16s16 7.2 16 16v8H28v-8Zm-3 20c2.8-8.2 10.1-13 19-13s16.2 4.8 19 13v8H25v-8Z" />
      </g>
    </svg>
  );
}

export function ProfileAvatarBadge({ gender = "male", size = 42, className = "", src = null }) {
  // If a src is provided (from Clerk user), render the image. Fall back to
  // the SVG avatar icons preserving original styling.
  if (src) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "9999px",
          background: "var(--surface)",
          color: "var(--foreground)",
          display: "grid",
          placeItems: "center",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 8px 18px rgba(0, 0, 0, 0.12)",
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt="Profile"
          width={size}
          height={size}
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background: "var(--surface)",
        color: "var(--foreground)",
        display: "grid",
        placeItems: "center",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 8px 18px rgba(0, 0, 0, 0.12)",
        overflow: "hidden",
      }}
    >
      <ProfileAvatarIcon gender={gender} className="profile-avatar-icon" />
    </div>
  );
}
