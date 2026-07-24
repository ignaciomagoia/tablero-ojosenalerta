function PersonalView({ data }) {
  const streetRows = getStreetRows(data);
  const totals = getStreetTotals(streetRows);

  if (streetRows.length === 0) {
    return (
      <section className="personal-view">
        <section className="card empty-state-card">
          <h2>Personal de calle disponible</h2>
          <p className="muted">
            No hay datos de personal de calle cargados para mostrar.
          </p>
        </section>
      </section>
    );
  }

  return (
    <section className="personal-view">
      <section className="card personal-header-card">
        <div>
          <h2>Personal de calle disponible</h2>
          <p className="muted">
            Dotacion presente por zona, tomada del bloque PERSONAL DE CALLE.
          </p>
        </div>
      </section>

      <section className="personal-summary-grid" aria-label="Totales presentes">
        <SummaryCard label="Jefes presentes" value={totals.jefesPresentes} />
        <SummaryCard
          label="Subalternos presentes"
          value={totals.subalternosPresentes}
        />
        <SummaryCard label="ETAC presentes" value={totals.etacPresentes} />
        <SummaryCard label="Civiles presentes" value={totals.civilPresentes} />
        <SummaryCard
          label="Total disponible"
          value={totals.totalDisponible}
        />
      </section>

      <section className="personal-street-grid" aria-label="Personal de calle por zona">
        {streetRows.map((row) => (
          <StreetZoneCard key={row.name} row={row} />
        ))}
      </section>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="recursos-summary-card">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </article>
  );
}

function StreetZoneCard({ row }) {
  const metrics = [
    ['Jefes', row.jefesPresentes],
    ['Subalternos', row.subalternosPresentes],
    ['ETAC', row.etacPresentes],
    ['Civil', row.civilPresentes],
  ];

  return (
    <article className="card personal-zone-card">
      <div className="personal-zone-heading">
        <h3>{row.name}</h3>
        <strong>{formatNumber(row.totalDisponible)}</strong>
      </div>
      <div className="personal-zone-metrics">
        {metrics.map(([label, value]) => (
          <div className="personal-zone-metric" key={label}>
            <span>{label}</span>
            <strong>{formatNumber(value)}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function getStreetRows(data) {
  return (data?.callePorZona ?? [])
    .filter((row) => !row.isTotal)
    .map((row) => {
      const jefesPresentes = Number(row.jefesPresentes) || 0;
      const subalternosPresentes = Number(row.subalternosPresentes) || 0;
      const etacPresentes = Number(row.etacPresentes) || 0;
      const civilPresentes = Number(row.civilPresentes) || 0;

      return {
        ...row,
        jefesPresentes,
        subalternosPresentes,
        etacPresentes,
        civilPresentes,
        totalDisponible:
          jefesPresentes +
          subalternosPresentes +
          etacPresentes +
          civilPresentes,
      };
    });
}

function getStreetTotals(rows) {
  return rows.reduce(
    (totals, row) => ({
      jefesPresentes: totals.jefesPresentes + row.jefesPresentes,
      subalternosPresentes:
        totals.subalternosPresentes + row.subalternosPresentes,
      etacPresentes: totals.etacPresentes + row.etacPresentes,
      civilPresentes: totals.civilPresentes + row.civilPresentes,
      totalDisponible: totals.totalDisponible + row.totalDisponible,
    }),
    {
      jefesPresentes: 0,
      subalternosPresentes: 0,
      etacPresentes: 0,
      civilPresentes: 0,
      totalDisponible: 0,
    },
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  });
}

export default PersonalView;
