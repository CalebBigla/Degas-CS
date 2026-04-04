import { useState } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTableCreated?: (tableId: string) => void;
}

interface CSVPreview {
  fileName: string;
  suggestedTableName: string;
  headers: string[];
  schema: Array<{
    id: string;
    name: string;
    type: 'text' | 'email' | 'number' | 'date' | 'boolean';
    required: boolean;
  }>;
  totalRows: number;
  previewData: Record<string, any>[];
  validation: {
    headers: { valid: boolean; errors: string[] };
    data: { valid: boolean; errors: string[] };
  };
}

interface UploadResult {
  success: boolean;
  message: string;
  processed: number;
  errors: Array<{ row: number; error: string }>;
  tableId?: string;
  tableName?: string;
}

export function BulkUploadModal({ isOpen, onClose, onTableCreated }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [tableName, setTableName] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setFile(files[0]);
      setCsvPreview(null);
      setUploadResult(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setIsPreviewing(true);
    setCsvPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/tables/preview-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const preview = response.data.data;
        setCsvPreview(preview);
        setTableName(preview.suggestedTableName);
      } else {
        setUploadResult({
          success: false,
          message: response.data.error || 'Preview failed',
          processed: 0,
          errors: response.data.details || []
        });
      }
    } catch (error: any) {
      console.error('CSV preview error:', error);
      setUploadResult({
        success: false,
        message: error.response?.data?.error || 'Preview failed',
        processed: 0,
        errors: error.response?.data?.details || []
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/users/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'user_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleUpload = async () => {
    if (!file || !tableName.trim()) {
      setUploadResult({
        success: false,
        message: 'Please provide a table name',
        processed: 0,
        errors: []
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tableName', tableName.trim());

      // Use the correct CSV import endpoint
      const response = await api.post('/tables/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const result = response.data.data;
        setUploadResult({
          success: true,
          message: result.message || `Successfully imported ${result.imported} users`,
          processed: result.imported || result.created || 0,
          errors: [],
          tableId: result.table?.id,
          tableName: result.tableName || result.table?.name
        });

        // Notify parent component if table was created
        if (onTableCreated && result.table?.id) {
          onTableCreated(result.table.id);
        }
      } else {
        setUploadResult({
          success: false,
          message: response.data.error || 'Import failed',
          processed: 0,
          errors: []
        });
      }
    } catch (error: any) {
      console.error('CSV import error:', error);
      setUploadResult({
        success: false,
        message: error.response?.data?.error || 'Upload failed',
        processed: 0,
        errors: error.response?.data?.details || []
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setCsvPreview(null);
    setUploadResult(null);
    setTableName('');
    setDragActive(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-charcoal">Bulk Upload Users</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!uploadResult ? (
            <>
              {!csvPreview ? (
                <>
                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Upload a CSV file to preview its structure</li>
                      <li>• Review the detected columns and data types</li>
                      <li>• Confirm to create a new table with your data</li>
                      <li>• Maximum 10,000 rows per upload</li>
                    </ul>
                  </div>

                  {/* Template Download */}
                  <div className="flex justify-center">
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download CSV Template</span>
                    </button>
                  </div>

                  {/* File Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-emerald bg-emerald/5'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <Upload className="h-12 w-12 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-700">
                          Drop your CSV file here, or{' '}
                          <label className="text-emerald cursor-pointer hover:text-emerald/80">
                            browse
                            <input
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Supports CSV, Excel files up to 10MB
                        </p>
                      </div>
                      {file && (
                        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span>{file.name}</span>
                          <button
                            onClick={() => setFile(null)}
                            className="text-crimson hover:text-crimson/80"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview Button */}
                  {file && (
                    <div className="flex justify-center">
                      <button
                        onClick={handlePreview}
                        disabled={isPreviewing}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {isPreviewing ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Analyzing CSV...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Preview CSV
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* CSV Preview */
                <div className="space-y-6">
                  <div className="bg-emerald/10 border border-emerald/20 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-emerald" />
                      <div>
                        <h3 className="font-medium text-emerald-900">CSV Analysis Complete</h3>
                        <p className="text-sm text-emerald-800">
                          Found {csvPreview.headers.length} columns and {csvPreview.totalRows} rows
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Table Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Table Name
                    </label>
                    <input
                      type="text"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent"
                      placeholder="Enter table name"
                    />
                  </div>

                  {/* Column Schema */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Detected Columns</h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        {csvPreview.schema.map((column, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">{column.name}</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {column.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Data Preview */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Data Preview (First 5 rows)</h4>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {csvPreview.headers.map((header, index) => (
                                <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvPreview.previewData.slice(0, 5).map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {csvPreview.headers.map((header, colIndex) => (
                                  <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 max-w-32 truncate">
                                    {row[header] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setCsvPreview(null)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back to Upload
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={isUploading || !tableName.trim()}
                      className="px-6 py-2 bg-emerald text-white rounded-lg hover:bg-emerald/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isUploading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Creating Table...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Create Table & Import Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Upload Results */
            <div className="space-y-4">
              <div className={`flex items-center space-x-3 p-4 rounded-lg ${
                uploadResult.success ? 'bg-emerald/10 text-emerald' : 'bg-crimson/10 text-crimson'
              }`}>
                {uploadResult.success ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
                <div>
                  <p className="font-medium">{uploadResult.message}</p>
                  <div className="text-sm opacity-80 space-y-1">
                    <p>{uploadResult.processed} users processed</p>
                    {uploadResult.tableName && (
                      <p>Table created: <span className="font-medium">{uploadResult.tableName}</span></p>
                    )}
                  </div>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Errors Found:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-crimson">
                        Row {error.row}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Upload Another
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-emerald text-white rounded-lg hover:bg-emerald/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}