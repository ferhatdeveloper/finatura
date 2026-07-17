type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "" }: BrandLogoProps) {
  const classes = ["brand-logo", className].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-label="Finatura">
      <span>Finatur</span>
      <span className="brand-logo__accent">a</span>
    </span>
  );
}
