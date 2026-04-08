import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, Edit2, Trash2, Eye, Link2, QrCode, Plus, X, CheckCircle, XCircle, Upload } from 'lucide-react';
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
  const [formLink, setFormLink] = useState('');
  const [qrCode, setQrCode] = useState('');
  
  // Pagination state for infinite scroll
  const [displayedCount, setDisplayedCount] = useState(15); // Initially show 15 users
  const ITEMS_PER_PAGE = 10; // Load 10 more on each "Load More" click
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<FormRecord | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    password: '',
    photo: null as string | null
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadFormData();
  }, [formId]);

  // Reset pagination when search term changes
  useEffect(() => {
    setDisplayedCount(15); // Reset to initial count
  }, [searchTerm]);

  const loadFormData = async () => {
    if (!formId) return;

    try {
      console.log('📊 Loading form data for formId:', formId);
      const response = await api.get(`/admin/forms-tables/${formId}/users`);
      
      console.log('📊 API Response:', response.data);
      
      if (response.status === 200) {
        const data = response.data.data;
        console.log('📊 Form data:', {
          formName: data.form_name,
          targetTable: data.target_table,
          recordCount: data.records?.length || 0,
          fieldCount: data.form_fields?.length || 0
        });
        
        setFormName(data.form_name);
        setRecords(data.records || []);
        
        // Store form link and QR code if available
        if (data.link) setFormLink(data.link);
        if (data.qrCode) setQrCode(data.qrCode);
        
        // Use form field definitions from API
        if (data.form_fields && data.form_fields.length > 0) {
          setFields(data.form_fields);
          console.log('📊 Fields set:', data.form_fields.map((f: any) => f.field_name));
        } else {
          console.warn('⚠️ No form fields returned from API');
        }
        
        if (data.error) {
          console.warn('⚠️ API returned error:', data.error);
          toast.error(data.error);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to load form data:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to load form records');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = (searchTerm.trim() === '' 
    ? records 
    : records.filter(record =>
        fields.some(field => {
          const value = record[field.field_name];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      )
  ).slice(0, displayedCount); // Apply pagination - show only first displayedCount items
  
  const hasMoreRecords = (searchTerm.trim() === '' 
    ? records 
    : records.filter(record =>
        fields.some(field => {
          const value = record[field.field_name];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      )
  ).length > displayedCount; // Check if there are more records to load

  // Selection handlers
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Load more handler for infinite scroll
  const handleLoadMore = () => {
    setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDelete = async (recordId: number) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      await api.delete(`/form/users/${recordId}`);
      setRecords(records.filter(r => r.id !== recordId));
      selectedIds.delete(recordId);
      setSelectedIds(new Set(selectedIds));
      toast.success('Record deleted');
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast.error('Failed to delete record');
    }
  };

  const handleEdit = (record: FormRecord) => {
    setCurrentRecord(record);
    setFormData({
      name: record.name || '',
      phone: record.phone || '',
      email: record.email || '',
      address: record.address || '',
      password: '',
      photo: null
    });
    // Set existing photo as preview
    setPhotoPreview(record.profileImageUrl || null);
    setShowEditModal(true);
  };

  const handleView = (record: FormRecord) => {
    setCurrentRecord(record);
    setShowViewModal(true);
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      password: '',
      photo: null
    });
    setPhotoPreview(null);
    setShowAddModal(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoPreview(base64String);
        setFormData({ ...formData, photo: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAdd = async () => {
    try {
      if (!formData.name || !formData.phone || !formData.email || !formData.address || !formData.password) {
        toast.error('All fields are required');
        return;
      }

      if (!formData.photo) {
        toast.error('Profile photo is required');
        return;
      }

      await api.post(`/form/register/${formId}`, formData);
      toast.success('User added successfully');
      setShowAddModal(false);
      setPhotoPreview(null);
      loadFormData();
    } catch (error: any) {
      console.error('Failed to add user:', error);
      toast.error(error.response?.data?.message || 'Failed to add user');
    }
  };

  const handleSaveEdit = async () => {
    if (!currentRecord) return;

    try {
      if (!formData.name || !formData.phone || !formData.email || !formData.address) {
        toast.error('All fields are required');
        return;
      }

      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address
      };

      // Include photo if a new one was uploaded
      if (formData.photo) {
        updateData.photo = formData.photo;
      }

      await api.put(`/form/users/${currentRecord.id}`, updateData);
      
      toast.success('User updated successfully');
      setShowEditModal(false);
      setPhotoPreview(null);
      loadFormData();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} record(s)?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.delete(`/form/users/${id}`))
      );
      
      setRecords(records.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} record(s) deleted`);
    } catch (error) {
      console.error('Failed to delete records:', error);
      toast.error('Failed to delete some records');
    }
  };

  const handleGenerateLink = async () => {
    try {
      const link = formLink || `${window.location.origin}/register/${formId}`;
      
      await navigator.clipboard.writeText(link);
      toast.success('Registration link copied to clipboard!');
      
      setTimeout(() => {
        alert(`Registration Link:\n\n${link}\n\nLink has been copied to clipboard.`);
      }, 100);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link to clipboard');
    }
  };

  const handleDownloadQR = () => {
    try {
      if (!qrCode) {
        toast.error('QR code not available for this form');
        return;
      }

      const link = document.createElement('a');
      link.href = qrCode;
      link.download = `${formName.replace(/\s+/g, '_')}_QR_Code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('QR code downloaded successfully!');
    } catch (error) {
      console.error('Failed to download QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  const exportToCSV = (selectedOnly = false) => {
    const recordsToExport = selectedOnly 
      ? filteredRecords.filter(r => selectedIds.has(r.id))
      : filteredRecords;

    if (recordsToExport.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = fields.map(f => f.field_label);
    const rows = recordsToExport.map(record =>
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
    const timestamp = new Date().toISOString().split('T')[0];
    const suffix = selectedOnly ? '_selected' : '_all';
    a.download = `${formName.replace(/\s+/g, '_')}${suffix}_${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success(`${recordsToExport.length} record(s) exported to CSV`);
  };

  if (loading) {
    return <div className="p-8 text-gray-600">Loading...</div>;
  }

  if (fields.length === 0) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <button
          onClick={() => navigate('/admin/tables')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium"
        >
          <ArrowLeft size={18} />
          Back to Tables
        </button>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">
            No form fields configured for this table
          </p>
          <p className="text-gray-400 text-sm">
            Please configure the form fields in the Forms section
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
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
        
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
        >
          <Plus size={18} />
          Add User
        </button>
        
        <button
          onClick={handleGenerateLink}
          className="flex items-center gap-2 px-4 py-2 bg-emerald hover:bg-emerald/90 text-white rounded-lg font-medium transition"
        >
          <Link2 size={18} />
          Generate Link
        </button>
        
        <button
          onClick={handleDownloadQR}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
          disabled={!qrCode}
        >
          <QrCode size={18} />
          Download QR
        </button>
        
        {records.length > 0 && (
          <button
            onClick={() => exportToCSV(false)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            <Download size={18} />
            Export All
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-blue-900 font-medium">
            {selectedIds.size} record(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => exportToCSV(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <Download size={16} />
              Export Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
            <button
              onClick={clearSelection}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
            >
              <X size={16} />
              Clear
            </button>
          </div>
        </div>
      )}

      {filteredRecords.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-center w-16">
                  <span className="text-sm font-semibold text-gray-700">Profile</span>
                </th>
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
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => toggleSelect(record.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {record.profileImageUrl ? (
                      <img
                        src={record.profileImageUrl}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 cursor-pointer hover:opacity-75 transition"
                        onClick={() => {
                          setViewingImageUrl(record.profileImageUrl);
                          setShowImageModal(true);
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                        No Photo
                      </div>
                    )}
                  </td>
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
                        onClick={() => {
                          setCurrentRecord(record);
                          setShowUserDetailsModal(true);
                        }}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="View User Details"
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

          {/* Load More Button */}
          {hasMoreRecords && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Load More ({displayedCount} of {searchTerm.trim() === '' 
                  ? records.length 
                  : records.filter(r => fields.some(f => {
                      const val = r[f.field_name];
                      return val && val.toString().toLowerCase().includes(searchTerm.toLowerCase());
                    })).length})
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">
            {records.length === 0 ? 'No records yet' : 'No records match your search'}
          </p>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New User</h2>
            
            {/* Photo Upload Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-col items-center gap-3">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400">
                    <Upload className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className={`px-4 py-2 rounded-lg cursor-pointer transition ${
                    photoPreview
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {photoPreview ? '✓ Photo Added - Click to Change' : 'Upload Photo'}
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Create a password"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setPhotoPreview(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdd}
                disabled={!formData.photo}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                title={!formData.photo ? 'Please upload a photo first' : ''}
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && currentRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit User</h2>
            
            {/* Photo Upload Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo
              </label>
              <div className="flex flex-col items-center gap-3">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400">
                    <Upload className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="edit-photo-upload"
                />
                <label
                  htmlFor="edit-photo-upload"
                  className={`px-4 py-2 rounded-lg cursor-pointer transition ${
                    formData.photo
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {formData.photo ? '✓ New Photo Selected' : photoPreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                {photoPreview && !formData.photo && (
                  <p className="text-xs text-gray-500">Current photo will be kept if not changed</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Enter address"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setPhotoPreview(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && currentRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">User Details</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900 font-medium">{currentRecord.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{currentRecord.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{currentRecord.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Address</label>
                <p className="text-gray-900">{currentRecord.address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Scan Status</label>
                <div className="flex items-center gap-2 mt-1">
                  {currentRecord.scanned ? (
                    <>
                      <CheckCircle className="text-green-600" size={20} />
                      <span className="text-green-600 font-medium">Scanned</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-gray-400" size={20} />
                      <span className="text-gray-600">Not Scanned</span>
                    </>
                  )}
                </div>
                {currentRecord.scannedAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Scanned at: {new Date(currentRecord.scannedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(currentRecord);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageModal && viewingImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-2xl w-full max-h-screen flex flex-col items-center">
            <button
              onClick={() => {
                setShowImageModal(false);
                setViewingImageUrl(null);
              }}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition z-10"
              title="Close"
            >
              <X size={24} className="text-gray-800" />
            </button>
            <img
              src={viewingImageUrl}
              alt="Full size photo"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-white mt-4 text-center text-sm">Click the image or X button to close</p>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && currentRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => {
                  setShowUserDetailsModal(false);
                  setCurrentRecord(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Profile Image */}
            <div className="mb-6 flex flex-col items-center">
              {currentRecord.profileImageUrl ? (
                <img
                  src={currentRecord.profileImageUrl}
                  alt={currentRecord.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 mb-3 cursor-pointer hover:opacity-75 transition"
                  onClick={() => {
                    setViewingImageUrl(currentRecord.profileImageUrl);
                    setShowImageModal(true);
                  }}
                  title="Click to view full size"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-3 border-4 border-gray-300">
                  <span className="text-gray-400 text-xs font-medium">No Photo</span>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">Click image to view full size</p>
            </div>

            {/* User Information */}
            <div className="space-y-4 bg-gray-50 rounded-lg p-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Name
                </label>
                <p className="text-gray-900 font-medium">{currentRecord.name || '-'}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Email
                </label>
                <a href={`mailto:${currentRecord.email}`} className="text-blue-600 hover:underline font-medium">
                  {currentRecord.email || '-'}
                </a>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Phone
                </label>
                <a href={`tel:${currentRecord.phone}`} className="text-blue-600 hover:underline font-medium">
                  {currentRecord.phone || '-'}
                </a>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Address
                </label>
                <p className="text-gray-900 font-medium">{currentRecord.address || '-'}</p>
              </div>

              {currentRecord.scanned !== undefined && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Attendance Status
                  </label>
                  <div className="flex items-center gap-2">
                    {currentRecord.scanned ? (
                      <>
                        <CheckCircle size={18} className="text-green-600" />
                        <span className="text-green-600 font-medium">Checked In</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={18} className="text-gray-400" />
                        <span className="text-gray-600 font-medium">Not Checked In</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleEdit(currentRecord)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setShowUserDetailsModal(false);
                  setCurrentRecord(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
