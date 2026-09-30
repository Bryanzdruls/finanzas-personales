import { BottomNav } from "./bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-[max(env(safe-area-inset-top),1.5rem)] pb-28">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
