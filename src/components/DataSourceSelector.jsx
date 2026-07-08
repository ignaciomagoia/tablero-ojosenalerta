function DataSourceSelector({ files, selectedFileName, onSelectFile }) {
  const fileList = Object.entries(files);

  if (fileList.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <h2>Archivos</h2>
      <ul className="selector-list">
        {fileList.map(([fileKey, file]) => {
          const displayName = file.fileName || fileKey;

          return (
            <li key={displayName}>
              <button
                type="button"
                className={displayName === selectedFileName ? 'active' : ''}
                onClick={() => onSelectFile(displayName)}
              >
                <strong>{displayName}</strong>
                <span>{Object.keys(file.sheets).length} hojas</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default DataSourceSelector;
