import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, Edit2, Trash2, Eye } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface FormRecord {
  id: number;
  [key: string]: any;
}

interface FormField {
  field_name: string;
  field_label: string;
  field_type: string;
}

export function FormTableDetailPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();

  const [formName, setFormName] = useState('');
  const [records, setRecords] = useState<FormRecord[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFormData();
  }, [formId]);

  const loadFormData = async () => {
    if (!formId) return;

    try {
      const response = await api.get(`/admin/forms-tables/${formId}/users`);
      
      if (response.status === 200) {
        const data = response.data.data;
        setFormName(data.form_name);
        setRecords(data.records || []);
        
        // Use form field definitions from API
        if (data.form_fields && data.form_fields.length > 0) {
          setFields(data.form_fields);
        }
      }
    } catch (error) {
      console.error('Failed to load form data:', error);
      toast.error('Failed to load form records');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record =>
    fields.some(field => {
      const value = record[field.field_name];
      return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  const handleDelete = async (recordId: number) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      await api.delete(`/admin/forms-tables/${formId}/users/${recordId}`);
      setRecords(records.filter(r => r.id !== recordId));
      toast.success('Record deleted');
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast.error('Failed to delete record');
    }
  };

  const handleEdit = (record: FormRecord) => {
    toast.success('Edit feature coming soon!');
    // TODO: Implement edit modal
  };

  const handleView = (record: FormRecord) => {
    toast.success('View feature coming soon!');
    // TODO: Implement view modal
  };

  const exportToCSV = () => {
    const headers = fields.map(f => f.field_label);
    const rows = filteredRecords.map(record =>
      fields.map(f => record[f.field_name] || '')
    );

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Records exported to CSV');
  };

  if (loading) {
    return <div className="p-8 text-gray-600">Loading...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/tables')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium"
        >
          <ArrowLeft size={18} />
          Back to Tables
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{formName}</h1>
          <p className="text-gray-500 mt-1">
            {records.length} {records.length === 1 ? 'record' : 'records'}
          </p>
        </div>
      </div>

      {/* Search and Export */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {records.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            <Download size={18} />
            Export CSV
          </button>
        )}
      </div>

      {/* Table */}
      {filteredRecords.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {fields.map(field => (
                  <th key={field.field_name} className="px-6 py-3 text-left">
                    <span className="text-sm font-semibold text-gray-700">
                      {field.field_label}
                    </span>
                  </th>
                ))}
                <th className="px-6 py-3 text-left">
                  <span className="text-sm font-semibold text-gray-700">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  {fields.map(field => (
                    <td key={`${record.id}-${field.field_name}`} className="px-6 py-4 text-sm text-gray-700">
                      {field.field_type === 'email' ? (
                        <a href={`mailto:${record[field.field_name]}`} className="text-blue-600 hover:underline">
                          {record[field.field_name]}
                        </a>
                      ) : field.field_type === 'password' ? (
                        <span className="text-gray-400">••••••••</span>
                      ) : (
                        record[field.field_name] || '-'
                      )}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(record)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">
            {records.length === 0 ? 'No records yet' : 'No records match your search'}
          </p>
        </div>
      )}
    </div>
  );
}
