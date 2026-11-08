import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 text-xs text-bento-subtle">
        <Link
          href="/privacy-policy"
          className="flex min-h-10 items-center rounded-lg transition-colors hover:text-bento-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Privacy policy
        </Link>
        <a
          href="https://lunchmoney.app"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit Lunch Money"
          className="flex min-h-10 items-center rounded-lg transition-colors hover:text-bento-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Powered by Lunch Money
        </a>
      </div>
    </footer>
  );
}
