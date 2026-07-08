function DataSourceSelector({ files, selectedFileName, onSelectFile }) {
  const fileList = Object.values(files);

  if (fileList.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <h2>Archivos</h2>
      <ul className="selector-list">
        {fileList.map((file) => (
          <li key={file.fileName}>
            <button
              type="button"
              className={file.fileName === selectedFileName ? 'active' : ''}
              onClick={() => onSelectFile(file.fileName)}
            >
              <strong>{file.fileName}</strong>
              <span>{Object.keys(file.sheets).length} hojas</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default DataSourceSelector;
