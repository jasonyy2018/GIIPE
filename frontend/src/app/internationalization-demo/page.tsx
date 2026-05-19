/**
 * Internationalization Demo Page
 * Demonstrates multi-language support and localization features
 */

'use client';

import React, { useState } from 'react';
import InternationalizationProvider, { 
  LocaleSelector, 
  TranslatedText, 
  FormattedDate, 
  FormattedNumber 
} from '@/components/InternationalizationProvider';
import { useInternationalization, useTranslation, useDateTimeFormatting, useNumberFormatting, useRTLSupport } from '@/hooks/useInternationalization';

function InternationalizationDemoContent() {
  const { currentLocale, isRTL, supportedLocales } = useInternationalization();
  const { t } = useTranslation('dashboard');
  const { formatDateShort, formatDateMedium, formatDateLong, formatRelativeTimeAuto } = useDateTimeFormatting();
  const { formatInteger, formatDecimal, formatCompactNumber, formatPercentage } = useNumberFormatting();
  const { getTextAlign, getFlexDirection, getMarginStart, getMarginEnd } = useRTLSupport();

  const [sampleDate] = useState(new Date());
  const [sampleNumbers] = useState({
    integer: 1234567,
    decimal: 1234.56,
    large: 1234567890,
    percentage: 0.75
  });

  const demoData = {
    events: [
      { id: 1, name: 'Tech Conference 2024', date: new Date('2024-12-15'), attendees: 1250 },
      { id: 2, name: 'Design Workshop', date: new Date('2024-11-20'), attendees: 85 },
      { id: 3, name: 'Networking Event', date: new Date('2024-11-30'), attendees: 320 }
    ],
    statistics: {
      totalUsers: 45678,
      activeUsers: 12345,
      revenue: 987654.32,
      growthRate: 0.156
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              <TranslatedText 
                i18nKey="title" 
                namespace="dashboard"
                defaultValue="Internationalization Demo"
              />
            </h1>
            <LocaleSelector showFlags={true} className="ml-4" />
          </div>
          <p className="text-lg text-gray-600">
            <TranslatedText 
              i18nKey="subtitle" 
              namespace="common"
              defaultValue="Comprehensive testing interface for multi-language support and localization features"
            />
          </p>
        </header>

        {/* Current Locale Info */}
        <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            <TranslatedText 
              i18nKey="current_locale_info" 
              namespace="common"
              defaultValue="Current Locale Information"
            />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">
                <TranslatedText i18nKey="locale" namespace="common" defaultValue="Locale" />
              </div>
              <div className="text-lg font-semibold text-primary-dark">{currentLocale}</div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-900 mb-1">
                <TranslatedText i18nKey="direction" namespace="common" defaultValue="Direction" />
              </div>
              <div className="text-lg font-semibold text-green-800">
                {isRTL ? 'RTL (Right-to-Left)' : 'LTR (Left-to-Right)'}
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm font-medium text-purple-900 mb-1">
                <TranslatedText i18nKey="supported_locales" namespace="common" defaultValue="Supported Locales" />
              </div>
              <div className="text-lg font-semibold text-purple-800">{supportedLocales.length}</div>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm font-medium text-orange-900 mb-1">
                <TranslatedText i18nKey="text_alignment" namespace="common" defaultValue="Text Alignment" />
              </div>
              <div className="text-lg font-semibold text-orange-800" style={{ textAlign: getTextAlign() }}>
                {getTextAlign()}
              </div>
            </div>
          </div>
        </section>

        {/* Translation Examples */}
        <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            <TranslatedText 
              i18nKey="translation_examples" 
              namespace="common"
              defaultValue="Translation Examples"
            />
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  <TranslatedText i18nKey="common_phrases" namespace="common" defaultValue="Common Phrases" />
                </h3>
                <ul className="space-y-2 text-sm">
                  <li><strong><TranslatedText i18nKey="welcome" namespace="common" defaultValue="Welcome" />:</strong> <TranslatedText i18nKey="welcome" namespace="common" defaultValue="Welcome" /></li>
                  <li><strong><TranslatedText i18nKey="loading" namespace="common" defaultValue="Loading" />:</strong> <TranslatedText i18nKey="loading" namespace="common" defaultValue="Loading..." /></li>
                  <li><strong><TranslatedText i18nKey="success" namespace="common" defaultValue="Success" />:</strong> <TranslatedText i18nKey="success" namespace="common" defaultValue="Success" /></li>
                  <li><strong><TranslatedText i18nKey="error" namespace="common" defaultValue="Error" />:</strong> <TranslatedText i18nKey="error" namespace="common" defaultValue="Error" /></li>
                </ul>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  <TranslatedText i18nKey="dashboard_terms" namespace="common" defaultValue="Dashboard Terms" />
                </h3>
                <ul className="space-y-2 text-sm">
                  <li><strong><TranslatedText i18nKey="overview" namespace="dashboard" defaultValue="Overview" />:</strong> <TranslatedText i18nKey="overview" namespace="dashboard" defaultValue="Overview" /></li>
                  <li><strong><TranslatedText i18nKey="statistics" namespace="dashboard" defaultValue="Statistics" />:</strong> <TranslatedText i18nKey="statistics" namespace="dashboard" defaultValue="Statistics" /></li>
                  <li><strong><TranslatedText i18nKey="recent_activity" namespace="dashboard" defaultValue="Recent Activity" />:</strong> <TranslatedText i18nKey="recent_activity" namespace="dashboard" defaultValue="Recent Activity" /></li>
                  <li><strong><TranslatedText i18nKey="settings" namespace="dashboard" defaultValue="Settings" />:</strong> <TranslatedText i18nKey="settings" namespace="dashboard" defaultValue="Settings" /></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Date and Time Formatting */}
        <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            <TranslatedText 
              i18nKey="date_time_formatting" 
              namespace="common"
              defaultValue="Date and Time Formatting"
            />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="date_formats" namespace="common" defaultValue="Date Formats" />
              </h3>
              <ul className="space-y-2 text-sm">
                <li><strong>Short:</strong> <FormattedDate date={sampleDate} format="short" /></li>
                <li><strong>Medium:</strong> <FormattedDate date={sampleDate} format="medium" /></li>
                <li><strong>Long:</strong> <FormattedDate date={sampleDate} format="long" /></li>
                <li><strong>Full:</strong> <FormattedDate date={sampleDate} format="full" /></li>
              </ul>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="time_formats" namespace="common" defaultValue="Time Formats" />
              </h3>
              <ul className="space-y-2 text-sm">
                <li><strong>Short:</strong> <FormattedDate date={sampleDate} showTime={true} timeFormat="short" /></li>
                <li><strong>Medium:</strong> <FormattedDate date={sampleDate} showTime={true} timeFormat="medium" /></li>
                <li><strong>Long:</strong> <FormattedDate date={sampleDate} showTime={true} timeFormat="long" /></li>
                <li><strong>Full:</strong> <FormattedDate date={sampleDate} showTime={true} timeFormat="full" /></li>
              </ul>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="relative_time" namespace="common" defaultValue="Relative Time" />
              </h3>
              <ul className="space-y-2 text-sm">
                <li><strong>Now:</strong> <FormattedDate date={new Date()} relative={true} /></li>
                <li><strong>1 hour ago:</strong> <FormattedDate date={new Date(Date.now() - 3600000)} relative={true} /></li>
                <li><strong>Yesterday:</strong> <FormattedDate date={new Date(Date.now() - 86400000)} relative={true} /></li>
                <li><strong>Last week:</strong> <FormattedDate date={new Date(Date.now() - 604800000)} relative={true} /></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Number Formatting */}
        <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            <TranslatedText 
              i18nKey="number_formatting" 
              namespace="common"
              defaultValue="Number Formatting"
            />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="integers" namespace="common" defaultValue="Integers" />
              </h3>
              <ul className="space-y-2 text-sm">
                <li><FormattedNumber value={sampleNumbers.integer} /></li>
                <li><FormattedNumber value={sampleNumbers.large} /></li>
              </ul>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="decimals" namespace="common" defaultValue="Decimals" />
              </h3>
              <ul className="space-y-2 text-sm">
                <li><FormattedNumber value={sampleNumbers.decimal} minimumFractionDigits={2} /></li>
                <li><FormattedNumber value={Math.PI} maximumFractionDigits={4} /></li>
              </ul>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="currency" namespace="common" defaultValue="Currency" />
              </h3>
              <ul className="space-y-2 text-sm">
                <li><FormattedNumber value={demoData.statistics.revenue} type="currency" /></li>
                <li><FormattedNumber value={1234.56} type="currency" currency="EUR" /></li>
              </ul>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="percentages" namespace="common" defaultValue="Percentages" />
              </h3>
              <ul className="space-y-2 text-sm">
                <li><FormattedNumber value={demoData.statistics.growthRate} type="percent" /></li>
                <li><FormattedNumber value={0.25} type="percent" /></li>
              </ul>
            </div>
          </div>
        </section>

        {/* RTL Layout Demo */}
        <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            <TranslatedText 
              i18nKey="rtl_layout_demo" 
              namespace="common"
              defaultValue="RTL Layout Demo"
            />
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="text_alignment" namespace="common" defaultValue="Text Alignment" />
              </h3>
              <p style={{ textAlign: getTextAlign() }}>
                <TranslatedText 
                  i18nKey="sample_text" 
                  namespace="common"
                  defaultValue="This text automatically aligns based on the current locale's text direction. In RTL languages, it will be right-aligned, and in LTR languages, it will be left-aligned."
                />
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="flex_direction" namespace="common" defaultValue="Flex Direction" />
              </h3>
              <div 
                className="flex space-x-4"
                style={{ flexDirection: getFlexDirection() }}
              >
                <div className="px-4 py-2 bg-light rounded">Item 1</div>
                <div className="px-4 py-2 bg-green-100 rounded">Item 2</div>
                <div className="px-4 py-2 bg-yellow-100 rounded">Item 3</div>
              </div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                <TranslatedText i18nKey="directional_spacing" namespace="common" defaultValue="Directional Spacing" />
              </h3>
              <div className="space-y-2">
                <div 
                  className="p-2 bg-gray-100 rounded"
                  style={getMarginStart('2rem')}
                >
                  <TranslatedText i18nKey="margin_start" namespace="common" defaultValue="Margin Start" />
                </div>
                <div 
                  className="p-2 bg-gray-100 rounded"
                  style={getMarginEnd('2rem')}
                >
                  <TranslatedText i18nKey="margin_end" namespace="common" defaultValue="Margin End" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Dashboard Data */}
        <section className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            <TranslatedText 
              i18nKey="sample_dashboard_data" 
              namespace="common"
              defaultValue="Sample Dashboard Data"
            />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                <TranslatedText i18nKey="upcoming_events" namespace="dashboard" defaultValue="Upcoming Events" />
              </h3>
              <div className="space-y-3">
                {demoData.events.map((event) => (
                  <div key={event.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="font-medium text-gray-900">{event.name}</div>
                    <div className="text-sm text-gray-600">
                      <FormattedDate date={event.date} format="medium" />
                    </div>
                    <div className="text-sm text-gray-600">
                      <FormattedNumber value={event.attendees} /> <TranslatedText i18nKey="attendees" namespace="common" defaultValue="attendees" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                <TranslatedText i18nKey="statistics" namespace="dashboard" defaultValue="Statistics" />
              </h3>
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <TranslatedText i18nKey="total_users" namespace="common" defaultValue="Total Users" />
                  </div>
                  <div className="text-lg font-semibold">
                    <FormattedNumber value={demoData.statistics.totalUsers} />
                  </div>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <TranslatedText i18nKey="active_users" namespace="common" defaultValue="Active Users" />
                  </div>
                  <div className="text-lg font-semibold">
                    <FormattedNumber value={demoData.statistics.activeUsers} />
                  </div>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <TranslatedText i18nKey="revenue" namespace="common" defaultValue="Revenue" />
                  </div>
                  <div className="text-lg font-semibold">
                    <FormattedNumber value={demoData.statistics.revenue} type="currency" />
                  </div>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <TranslatedText i18nKey="growth_rate" namespace="common" defaultValue="Growth Rate" />
                  </div>
                  <div className="text-lg font-semibold">
                    <FormattedNumber value={demoData.statistics.growthRate} type="percent" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function InternationalizationDemoPage() {
  return (
    <InternationalizationProvider>
      <InternationalizationDemoContent />
    </InternationalizationProvider>
  );
}