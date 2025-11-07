"use client";

type Props = {
  symbol: string;
  name: string;
  size?: "sm" | "md" | "lg";
};

export default function Logo({ symbol, name, size = "md" }: Props) {
  const sizeClasses = {
    sm: "w-10 h-10 text-lg",
    md: "w-16 h-16 text-2xl",
    lg: "w-20 h-20 text-3xl",
  };

  // Extract base symbol (remove .NS, .BO, etc.)
  const baseSymbol = symbol.split('.')[0].toLowerCase();
  
  // Try multiple logo sources for Indian stocks
  const logoUrl = `https://logo.clearbit.com/${baseSymbol}.com`;

  return (
    <div className={`flex-shrink-0 ${sizeClasses[size]} rounded-xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden`}>
      <img
        src={logoUrl}
        alt={name}
        className="w-full h-full object-contain"
        onError={(e) => {
          // Fallback to first letter if logo fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.textContent) {
            parent.textContent = name.charAt(0).toUpperCase();
            parent.className = parent.className + ' text-white/80 font-semibold';
          }
        }}
      />
    </div>
  );
}

