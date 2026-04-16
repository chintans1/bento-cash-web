import Link from "next/link"

export function NoTokenPrompt() {
  return (
    <div className="flex flex-col items-center gap-5 p-6 pt-12">
      <p className="text-base text-muted-foreground">
        Connect your Lunch Money account in{" "}
        <Link
          href="/settings"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Settings
        </Link>{" "}
        to get started.
      </p>
    </div>
  )
}
