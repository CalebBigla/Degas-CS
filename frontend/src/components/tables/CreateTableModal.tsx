import { useState } from 'react';
import { X, Plus, Trash2, Table as TableIcon } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { v4 as uuidv4 } from 'uuid';

interface Column {
  id: string;
  name: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
}

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tableData: { name: string; description: string; schema: Column[] }) => Promise<void>;
}

export function CreateTableModal({ isOpen, onClose, onSave }: CreateTableModalProps) {
  const [tableName, setTableName] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState<Column[]>([
    { id: uuidv4(), name: '', type: 'text', required: false }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ tableName?: string; columns?: string }>({});

  const handleAddColumn = () => {
    setColumns([...columns, { id: uuidv4(), name: '', type: 'text', required: false }]);
  };

  const handleRemoveColumn = (id: string) => {
    if (columns.length > 1) {
      setColumns(columns.filter(col => col.id !== id));
    }
  };

  const handleColumnChange = (id: string, field: keyof Column, value: any) => {
    setColumns(columns.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ));
  };

  const validateForm = () => {
    const newErrors: { tableName?: string; columns?: string } = {};

    if (!tableName.trim()) {
      newErrors.tableName = 'Table name is required';
    }

    const validColumns = columns.filter(col => col.name.trim() !== '');
    if (validColumns.length === 0) {
      newErrors.columns = 'At least one column with a name is required';
    }

    // Check for duplicate column names
    const columnNames = validColumns.map(col => col.name.trim().toLowerCase());
    const duplicates = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      newErrors.columns = `Duplicate column names found: ${duplicates.join(', ')}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Filter out empty columns
      const validColumns = columns.filter(col => col.name.trim() !== '');
      
      await onSave({
        name: tableName.trim(),
        description: description.trim(),
        schema: validColumns
      });
      
      // Reset form
      setTableName('');
      setDescription('');
      setColumns([{ id: uuidv4(), name: '', type: 'text', required: false }]);
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to create table:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTableName('');
    setDescription('');
    setColumns([{ id: uuidv4(), name: '', type: 'text', required: false }]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-deep-blue/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-deep-blue/10 rounded-lg">
              <TableIcon className="h-6 w-6 text-deep-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-charcoal">Create New Table</h2>
              <p className="text-sm text-gray-600">Define your table structure manually</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Table Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Table Name <span className="text-crimson">*</span>
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => {
                setTableName(e.target.value);
                if (errors.tableName) setErrors({ ...errors, tableName: undefined });
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-deep-blue focus:border-transparent ${
                errors.tableName ? 'border-crimson' : 'border-gray-300'
              }`}
              placeholder="e.g., Staff, Visitors, Contractors"
            />
            {errors.tableName && (
              <p className="text-crimson text-xs mt-1">{errors.tableName}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-deep-blue focus:border-transparent"
              placeholder="Brief description of this table's purpose"
              rows={2}
            />
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Columns <span className="text-crimson">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddColumn}
                className="flex items-center space-x-1 text-sm text-deep-blue hover:text-navy-blue"
              >
                <Plus className="h-4 w-4" />
                <span>Add Column</span>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {columns.map((column) => (
                <div key={column.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Column Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Column Name
                      </label>
                      <input
                        type="text"
                        value={column.name}
                        onChange={(e) => handleColumnChange(column.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-deep-blue text-sm"
                        placeholder="e.g., Name, Email, ID"
                      />
                    </div>

                    {/* Column Type */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Type
                      </label>
                      <select
                        value={column.type}
                        onChange={(e) => handleColumnChange(column.id, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-deep-blue text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="boolean">Yes/No</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </div>

                    {/* Required Checkbox */}
                    <div className="flex items-end">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={column.required}
                          onChange={(e) => handleColumnChange(column.id, 'required', e.target.checked)}
                          className="w-4 h-4 text-deep-blue border-gray-300 rounded focus:ring-deep-blue"
                        />
                        <span className="text-sm text-gray-700">Required</span>
                      </label>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(column.id)}
                    disabled={columns.length === 1}
                    className="p-2 text-crimson hover:bg-crimson/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-6"
                    title="Remove column"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {errors.columns && (
              <p className="text-crimson text-xs mt-2">{errors.columns}</p>
            )}

            <p className="text-xs text-gray-500 mt-2">
              {columns.filter(c => c.name.trim()).length} column(s) defined
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-deep-blue text-white rounded-lg hover:bg-navy-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <TableIcon className="h-4 w-4 mr-2" />
                  Create Table
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
