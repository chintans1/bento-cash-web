import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Bento Cash handles your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-5 py-12 text-sm leading-7 sm:py-16">
      <header className="space-y-2">
        <h1 className="font-heading text-4xl font-bold">Privacy policy</h1>
        <p className="text-bento-subtle">Last updated November 6, 2026</p>
      </header>

      <p>
        Bento Cash is an independent app that connects to Lunch Money. You sign
        in to create a Bento Cash account and connect a budget to use the app.
      </p>

      <section className="space-y-2">
        <h2 className="font-heading text-2xl font-semibold">Data we use</h2>
        <p>
          We receive your sign-in name and email, and the Lunch Money budget
          data needed to show your finances and perform actions you request.
          Bento Cash stores your account and session, connected budget details,
          app preferences, and encrypted Lunch Money credentials. An essential
          session cookie keeps you signed in. We do not keep a separate copy of
          your transaction history.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-2xl font-semibold">How we use it</h2>
        <p>
          We use this data to run Bento Cash. Some features update or delete
          Lunch Money data when you use them. Cloudflare hosts the app and
          processes requests, including IP addresses and request metadata, to
          serve it. We do not sell your data or use it for advertising.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-heading text-2xl font-semibold">Your choices</h2>
        <p>
          You can remove a budget in Settings to delete its saved credential and
          preferences. Signing out ends your session but keeps your connected
          budgets. You can also revoke Bento Cash access in Lunch Money. To
          request deletion of your Bento Cash account or ask a privacy question,
          email{" "}
          <a
            href="mailto:chintans98@gmail.com"
            className="text-bento-brand underline underline-offset-4"
          >
            chintans98@gmail.com
          </a>
          .
        </p>
      </section>
    </article>
  );
}
