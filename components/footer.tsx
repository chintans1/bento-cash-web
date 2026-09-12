import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-bento-hairline bg-bento-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-end px-4 py-3 sm:px-6">
        <a
          href="https://lunchmoney.app"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit Lunch Money"
          className="rounded-lg dark:bg-[#44958C]"
        >
          <Image
            src="/powered-by-lunch-money.png"
            alt="Powered by Lunch Money"
            width={735}
            height={196}
            className="h-auto w-48"
          />
        </a>
      </div>
    </footer>
  );
}
