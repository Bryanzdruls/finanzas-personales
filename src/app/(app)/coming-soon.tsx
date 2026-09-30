export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-6 rounded-2xl bg-surface p-6 text-center text-muted">
        Disponible en la fase {phase}.
      </p>
    </>
  );
}
