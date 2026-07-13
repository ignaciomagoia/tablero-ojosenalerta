import { getFriendlyFileName } from '../utils/displayNames';

function DataSourceSelector({ files, selectedFileName, onSelectFile }) {
  const fileList = Object.entries(files);

  if (fileList.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <h2>Módulos</h2>
      <ul className="selector-list">
        {fileList.map(([fileKey, file], index) => {
          const displayName = getFriendlyFileName(file.fileName || fileKey, index);

          return (
            <li key={fileKey}>
              <button
                type="button"
                className={fileKey === selectedFileName ? 'active' : ''}
                onClick={() => onSelectFile(fileKey)}
              >
                <strong>{displayName}</strong>
                <span>{Object.keys(file.sheets).length} secciones</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default DataSourceSelector;
