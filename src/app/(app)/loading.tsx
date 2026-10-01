// Se muestra al instante al navegar mientras el servidor arma la página con tus datos.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="skeleton mb-6 h-9 w-40" />
      <div className="skeleton mb-3 h-28" />
      <div className="skeleton mb-8 h-20" />
      <div className="skeleton mb-2 h-4 w-28" />
      <div className="skeleton h-48" />
    </div>
  );
}
