export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-negative/10 px-4 py-3 text-sm text-negative">
      {message}
    </p>
  );
}
