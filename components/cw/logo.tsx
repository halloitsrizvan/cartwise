import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Cart mark (public/logo-mark.png) + live wordmark so it stays crisp and themeable. */
export function Logo({ light, className }: { light?: boolean; className?: string }) {
  const cart = APP_NAME.slice(0, 4);
  const wise = APP_NAME.slice(4);
  return (
    <Link href="/" aria-label={APP_NAME} className={cn("inline-flex items-center gap-2 font-heading text-xl font-extrabold leading-none sm:text-2xl", className)}>
      <Image src="/logo-mark.png" alt="" width={44} height={44} priority className="size-9 rounded-xl sm:size-11" />
      <span className={light ? "text-on-deep" : "text-deep dark:text-ink"}>
        {cart}
        <span className="text-primary">{wise}</span>
      </span>
    </Link>
  );
}
