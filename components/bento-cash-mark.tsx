import Image from "next/image";
import { cn } from "@/lib/utils";

export function BentoCashMark({ className }: { className?: string }) {
  return (
    <Image
      src="/bento-cash-mark.png"
      alt=""
      width={72}
      height={72}
      priority
      unoptimized
      className={cn("mx-auto size-16 object-contain sm:size-18", className)}
    />
  );
}
