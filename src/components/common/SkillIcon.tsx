import "./SkillIcon.css";

export function SkillIcon({
  src,
  alt,
  size = 28,
  className = "",
}: {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        className={`skill-icon skill-icon--missing ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${alt} (icon unavailable)`}
      >
        ?
      </span>
    );
  }
  return (
    <img
      className={`skill-icon ${className}`}
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      loading="lazy"
      draggable={false}
    />
  );
}
