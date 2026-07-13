import { parseExcelFile } from '../utils/excelParser';

function FileUploader({ onFilesLoad, onError, isLoading, setIsLoading }) {
  const handleFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !file.name.toLowerCase().endsWith('.xlsx'),
    );

    if (invalidFile) {
      onError('Uno de los archivos seleccionados no tiene extension .xlsx.');
      event.target.value = '';
      return;
    }

    setIsLoading(true);

    try {
      const parsedFiles = await Promise.all(
        selectedFiles.map(async (file) => ({
          fileName: file.name,
          sheets: await parseExcelFile(file),
        })),
      );

      onFilesLoad(parsedFiles);
    } catch (error) {
      onError('No se pudo leer algun Excel. Revisa que los archivos sean validos.');
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="uploader">
      <label htmlFor="excel-file">
        Seleccionar Excel
        <span>Selecciona juntos todos los .xlsx que quieras conservar.</span>
      </label>
      <input
        id="excel-file"
        type="file"
        accept=".xlsx"
        multiple
        onChange={handleFileChange}
        disabled={isLoading}
      />
      {isLoading && <p className="muted">Leyendo archivos...</p>}
    </div>
  );
}

export default FileUploader;
