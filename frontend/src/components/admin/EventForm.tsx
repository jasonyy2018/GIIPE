'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload';
import PDFUpload from './PDFUpload';
import HonorableGuestsUpload, { HonorableGuest } from './HonorableGuestsUpload';
import { MarkdownEditor } from './MarkdownEditor';

interface EventFormData {
  title: string;
  description: string;
  content: string;
  featuredImage?: string;
  pdfAttachment?: string;
  pdfAttachmentName?: string;
  showPdfAttachment?: boolean;
  submitUrl?: string;
  honorableGuests?: HonorableGuest[];
  startDate: string;
  endDate: string;
  location: string;
  maxAttendees: number | null;
  registrationDeadline: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  tags: string[];
  price: number;
  isPaymentEnabled: boolean;
}

interface EventFormProps {
  event?: any;
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit' | 'duplicate';
}

export default function EventForm({ event, onSubmit, onCancel, isLoading = false, mode }: EventFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    content: '',
    featuredImage: '',
    pdfAttachment: '',
    pdfAttachmentName: '',
    showPdfAttachment: true,
    submitUrl: '',
    honorableGuests: [],
    startDate: '',
    endDate: '',
    location: '',
    maxAttendees: null,
    registrationDeadline: '',
    status: 'DRAFT',
    tags: [],
    price: 0,
    isPaymentEnabled: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Helper function to convert UTC date to local date format (YYYY-MM-DD)
  const utcToLocalDate = (utcDate: string | Date): string => {
    if (!utcDate) return '';
    const date = new Date(utcDate);
    // Get local date components (ignore time)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to convert local date format to UTC ISO string (at midnight UTC)
  // Simply append T00:00:00.000Z to treat as UTC midnight, avoiding timezone conversion
  const localDateToUtcISO = (localDate: string): string => {
    if (!localDate) return '';
    // date format: YYYY-MM-DD
    // Append T00:00:00.000Z to treat as UTC midnight (no timezone conversion)
    return `${localDate}T00:00:00.000Z`;
  };

  const generateQrCheckoutUrl = (): string | null => {
    if (!event?.id) return null;
    const slug = event.id.slice(0, 8);
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/p/${slug}`;
    }
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giip.info';
    return `${base}/p/${slug}`;
  };

  const handleGenerateQr = async () => {
    const url = generateQrCheckoutUrl();
    if (!url) return;
    try {
      setQrGenerating(true);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#16a34a', // primary green
          light: '#ffffff',
        },
      });
      setQrPreview(dataUrl);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      alert('生成二维码失败，请稍后重试。');
    } finally {
      setQrGenerating(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrPreview) return;
    const link = document.createElement('a');
    link.href = qrPreview;
    link.download = `event-${event?.id || 'qr-checkout'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (event && mode !== 'create') {
      setFormData({
        title: mode === 'duplicate' ? `Copy of ${event.title}` : event.title,
        description: event.description || '',
        // Backend returns contentMarkdown, not content
        content: event.contentMarkdown || event.content || '',
        featuredImage: event.featuredImage || '',
        pdfAttachment: event.pdfAttachment || '',
        pdfAttachmentName: event.pdfAttachmentName || '',
        showPdfAttachment: event.showPdfAttachment ?? true,
        submitUrl: event.submitUrl || '',
        // Convert old format (string[]) to new format (HonorableGuest[]) if needed
        honorableGuests: event.honorableGuests ? event.honorableGuests.map((guest: any) => {
          if (typeof guest === 'string') {
            return { photoUrl: guest, name: '', title: '' };
          }
          return guest;
        }) : [],
        startDate: event.startDate ? utcToLocalDate(event.startDate) : '',
        endDate: event.endDate ? utcToLocalDate(event.endDate) : '',
        location: event.location || '',
        maxAttendees: event.maxAttendees || null,
        registrationDeadline: event.registrationDeadline ? utcToLocalDate(event.registrationDeadline) : '',
        status: mode === 'duplicate' ? 'DRAFT' : event.status,
        tags: event.tags || [],
        price: event.price || 0,
        isPaymentEnabled: event.isPaymentEnabled || false,
      });
    }
  }, [event, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate >= endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (formData.registrationDeadline && formData.startDate) {
      const regDeadline = new Date(formData.registrationDeadline);
      const startDate = new Date(formData.startDate);
      if (regDeadline >= startDate) {
        newErrors.registrationDeadline = 'Registration deadline must be before event start date';
      }
    }

    if (formData.maxAttendees !== null && formData.maxAttendees < 1) {
      newErrors.maxAttendees = 'Max attendees must be at least 1';
    }



    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Prepare data with proper ISO 8601 date formatting and Markdown content
      const submitDataRaw: any = {
        ...formData,
        contentMarkdown: formData.content || '', // Send as contentMarkdown for backend processing - ensure it's never undefined
        startDate: localDateToUtcISO(formData.startDate),
        endDate: localDateToUtcISO(formData.endDate),
        registrationDeadline: formData.registrationDeadline ? localDateToUtcISO(formData.registrationDeadline) : undefined,
      };

      // Debug: Log the content being submitted
      console.log('Submitting event with contentMarkdown:', {
        length: submitDataRaw.contentMarkdown?.length || 0,
        preview: submitDataRaw.contentMarkdown?.substring(0, 200),
        hasImages: submitDataRaw.contentMarkdown?.includes('![') || false
      });

      // Create properly typed submitData with content field (required by EventFormData interface)
      // Use type assertion to allow contentMarkdown property which is needed for backend
      const submitData = {
        title: submitDataRaw.title,
        description: submitDataRaw.description,
        content: submitDataRaw.contentMarkdown || '', // Ensure content is always a string for type compatibility
        featuredImage: submitDataRaw.featuredImage,
        pdfAttachment: submitDataRaw.pdfAttachment,
        pdfAttachmentName: submitDataRaw.pdfAttachmentName,
        showPdfAttachment: submitDataRaw.showPdfAttachment ?? true,
        submitUrl: submitDataRaw.submitUrl,
        honorableGuests: submitDataRaw.honorableGuests || [],
        startDate: submitDataRaw.startDate,
        endDate: submitDataRaw.endDate,
        location: submitDataRaw.location,
        maxAttendees: submitDataRaw.maxAttendees,
        registrationDeadline: submitDataRaw.registrationDeadline || undefined, // Use undefined instead of empty string for optional date
        status: submitDataRaw.status,
        tags: submitDataRaw.tags,
        price: submitDataRaw.price || 0,
        isPaymentEnabled: submitDataRaw.isPaymentEnabled || false,
        // Add contentMarkdown as additional property (not in interface but needed for backend)
        contentMarkdown: submitDataRaw.contentMarkdown || '',
      } as EventFormData & { contentMarkdown?: string };
      
      // Remove undefined fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key as keyof typeof submitData] === undefined) {
          delete submitData[key as keyof typeof submitData];
        }
      });

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'create' && 'Create New Event'}
          {mode === 'edit' && 'Edit Event'}
          {mode === 'duplicate' && 'Duplicate Event'}
        </h2>
        <p className="text-gray-600 mt-1">
          {mode === 'create' && 'Create a new event with image and content'}
          {mode === 'edit' && 'Update event details and content'}
          {mode === 'duplicate' && 'Create a copy of this event with new details'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter event title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter event location"
            />
          </div>
        </div>

        {/* Featured Image */}
        <div>
          <ImageUpload
            value={formData.featuredImage}
            onChange={(imageUrl) => handleInputChange('featuredImage', imageUrl)}
            label="Featured Image"
            placeholder="Upload event featured image"
          />
        </div>

        {/* PDF Attachment */}
        <div>
          <PDFUpload
            value={formData.pdfAttachment}
            fileName={formData.pdfAttachmentName}
            onChange={(filePath, fileName) => {
              handleInputChange('pdfAttachment', filePath);
              handleInputChange('pdfAttachmentName', fileName);
            }}
            onRemove={() => {
              handleInputChange('pdfAttachment', '');
              handleInputChange('pdfAttachmentName', '');
            }}
            label="PDF Attachment"
            placeholder="Upload PDF document (optional)"
            maxSize={10}
          />
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!formData.showPdfAttachment}
              onChange={(e) => handleInputChange('showPdfAttachment', e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            在前台显示 PDF 附件模块 (Show PDF attachment on public page)
          </label>
        </div>

        {/* Honorable Guests Photos */}
        <div>
          <HonorableGuestsUpload
            value={formData.honorableGuests || []}
            onChange={(guests) => handleInputChange('honorableGuests', guests)}
            label="Honorable Guests Photos"
            placeholder="Upload honorable guest photos"
            maxSize={5}
            maxGuests={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            Photos will be displayed in a gallery on the event details page (between content and PDF section).
            Name and title will be automatically extracted from filename (e.g., "John Doe - Professor.jpg").
            You can edit them after uploading if needed.
          </p>
        </div>

        {/* Submit URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Submit URL (Optional)
          </label>
          <input
            type="url"
            value={formData.submitUrl}
            onChange={(e) => handleInputChange('submitUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="https://example.com/submit-form"
          />
          <p className="text-xs text-gray-500 mt-1">
            If provided, a Submit button will appear on the event details page that links to this URL
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Enter event description"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="text"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="YYYY-MM-DD"
            />
            {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="text"
              value={formData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="YYYY-MM-DD"
            />
            {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Deadline
            </label>
            <input
              type="date"
              value={formData.registrationDeadline}
              onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.registrationDeadline ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.registrationDeadline && <p className="text-red-500 text-sm mt-1">{errors.registrationDeadline}</p>}
          </div>
        </div>

        {/* Capacity and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Attendees
            </label>
            <input
              type="number"
              min="1"
              value={formData.maxAttendees || ''}
              onChange={(e) => handleInputChange('maxAttendees', e.target.value ? parseInt(e.target.value) : null)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.maxAttendees ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Unlimited"
            />
            {errors.maxAttendees && <p className="text-red-500 text-sm mt-1">{errors.maxAttendees}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            <i className="fas fa-credit-card mr-2 text-primary"></i>
            支付设置
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                会议费用 (元)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price ? (formData.price / 100).toFixed(2) : ''}
                onChange={(e) => {
                  const yuan = parseFloat(e.target.value);
                  handleInputChange('price', isNaN(yuan) ? 0 : Math.round(yuan * 100));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0.00 (免费则留空)"
              />
              <p className="text-xs text-gray-500 mt-1">
                输入人民币金额，系统将自动转为分存储。留空或0表示免费。
              </p>
            </div>
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPaymentEnabled}
                  onChange={(e) => handleInputChange('isPaymentEnabled', e.target.checked)}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">
                  启用在线支付
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-2">
                开启后，用户需在线支付后方可报名
              </p>
            </div>
          </div>

          {/* 收银台支付二维码 + 支付短链接（仅编辑/复制已有活动时显示） */}
          {mode !== 'create' && event?.id && formData.isPaymentEnabled && formData.price > 0 && (
            <div className="mt-2 border-t border-dashed border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">
                  QR
                </span>
                收银台支付二维码
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                自动生成指向本活动收银台的支付二维码，功能与 &quot;Pay to Register&quot; 按钮一致，可用于海报、PPT 等线下扫码支付。
              </p>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateQr}
                    disabled={qrGenerating}
                    className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {qrGenerating ? '生成中…' : (qrPreview ? '重新生成二维码' : '生成二维码')}
                  </button>
                  {qrPreview && (
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="inline-flex items-center px-3 py-2 rounded-md border border-primary text-primary text-sm font-medium hover:bg-primary/5"
                    >
                      下载二维码
                    </button>
                  )}
                </div>
                {qrPreview && (
                  <div className="inline-flex items-center gap-3 bg-white rounded-lg border border-primary/20 px-3 py-2 shadow-sm">
                    <div className="w-20 h-20 rounded-md overflow-hidden border border-primary/30 bg-white flex items-center justify-center">
                      <img
                        src={qrPreview}
                        alt="收银台支付二维码预览"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-xs text-gray-600 max-w-[220px]">
                      <div className="font-semibold text-gray-800 mb-1">
                        {event.title || 'Event'}
                      </div>
                      <div className="text-primary font-bold">
                        ￥{(formData.price / 100).toFixed(2)}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400">
                        扫码后将跳转至本网站收银台页面完成支付。
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 支付短链接显示与复制 */}
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">
                    支付短链接
                  </span>
                  <span className="text-[11px] text-gray-400">
                    功能与 &quot;Pay to Register&quot; 按钮一致，可用于网页、邮件等直接点击支付。
                  </span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      readOnly
                      value={generateQrCheckoutUrl() || ''}
                      className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = generateQrCheckoutUrl();
                      if (!url) return;
                      navigator.clipboard
                        .writeText(url)
                        .then(() => {
                          alert('支付短链接已复制，可直接粘贴使用。');
                        })
                        .catch(() => {
                          alert('复制失败，请手动选中链接复制。');
                        });
                    }}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                  >
                    复制短链接
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-primary hover:text-primary-dark"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Add a tag"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Content (Markdown)
          </label>
          <MarkdownEditor
            value={formData.content}
            onChange={(value) => handleInputChange('content', value)}
            placeholder="Write detailed event content in Markdown format. You can include images, formatting, lists, etc."
            height="500px"
            onFirstImageChange={(imageUrl) => {
              // Auto-set featured image if not already set
              if (!formData.featuredImage && imageUrl) {
                handleInputChange('featuredImage', imageUrl);
              }
            }}
          />
          <p className="text-gray-500 text-sm mt-2">
            Use Markdown format to add rich content including images, formatting, lists, links, etc.
          </p>
        </div>



        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {mode === 'create' ? 'Creating...' : mode === 'edit' ? 'Updating...' : 'Duplicating...'}
              </div>
            ) : (
              <>
                {mode === 'create' && 'Create Event'}
                {mode === 'edit' && 'Update Event'}
                {mode === 'duplicate' && 'Duplicate Event'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}