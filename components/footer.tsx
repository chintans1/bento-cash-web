import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-bento-hairline bg-bento-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/privacy-policy"
          className="text-sm text-bento-subtle hover:text-bento-default"
        >
          Privacy policy
        </Link>
        <a
          href="https://lunchmoney.app"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit Lunch Money"
          className="rounded-lg dark:bg-footer-brand"
        >
          <Image
            src="/powered-by-lunch-money.png"
            alt="Powered by Lunch Money"
            width={735}
            height={196}
            className="h-auto w-48 rounded-lg outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          />
        </a>
      </div>
    </footer>
  );
}
