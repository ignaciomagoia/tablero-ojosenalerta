function DataTable({ rows, columns, title = 'Datos' }) {
  if (!rows || rows.length === 0) {
    return (
      <section className="card">
        <h2>{title}</h2>
        <p className="muted">La hoja seleccionada no tiene filas para mostrar.</p>
      </section>
    );
  }

  // Preferimos las columnas normalizadas para respetar el orden detectado.
  const tableColumns = columns?.length > 0 ? columns : Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  );

  return (
    <section className="card data-card">
      <div className="table-heading">
        <h2>{title}</h2>
        <p>{rows.length} filas</p>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {tableColumns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {tableColumns.map((column) => (
                  <td key={column}>{formatCell(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

export default DataTable;
