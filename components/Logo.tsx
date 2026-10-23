export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Festro logo">
      <rect width="64" height="64" rx="14" fill="#3E4763" />
      <circle cx="31" cy="29" r="22" fill="#fff" />
      <polygon points="15.1,40 11.5,57.1 27.3,49.1" fill="#fff" />
      <path
        d="M31 16.2 C31.6 23.5 36.5 28.4 43.8 29 C36.5 29.6 31.6 34.5 31 41.8 C30.4 34.5 25.5 29.6 18.2 29 C25.5 28.4 30.4 23.5 31 16.2 Z"
        fill="#3E4763"
      />
    </svg>
  );
}
