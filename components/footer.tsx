import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-center text-xs text-bento-subtle">
        <Link
          href="/privacy-policy"
          className="flex min-h-10 items-center rounded-lg transition-colors hover:text-bento-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Privacy policy
        </Link>
      </div>
    </footer>
  );
}
