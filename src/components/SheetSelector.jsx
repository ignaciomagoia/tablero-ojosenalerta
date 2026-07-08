function SheetSelector({ sheets, selectedSheetName, onSelectSheet }) {
  if (sheets.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <h2>Hojas</h2>
      <ul className="selector-list">
        {sheets.map((sheetName) => (
          <li key={sheetName}>
            <button
              type="button"
              className={sheetName === selectedSheetName ? 'active' : ''}
              onClick={() => onSelectSheet(sheetName)}
            >
              {sheetName}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SheetSelector;
