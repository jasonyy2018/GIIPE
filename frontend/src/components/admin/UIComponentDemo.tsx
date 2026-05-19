'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Textarea,
  Checkbox,
  Form,
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
  FormSubmit,
  LoadingSpinner,
  ProgressBar,
  CardSkeleton,
  TableSkeleton,
  InteractiveChart,
  ResponsiveGrid,
  ResponsiveStack,
  ValidationRule
} from './ui';

export default function UIComponentDemo() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(65);

  // Sample chart data
  const chartData = [
    { month: 'Jan', users: 400, events: 240, revenue: 2400 },
    { month: 'Feb', users: 300, events: 139, revenue: 2210 },
    { month: 'Mar', users: 200, events: 980, revenue: 2290 },
    { month: 'Apr', users: 278, events: 390, revenue: 2000 },
    { month: 'May', users: 189, events: 480, revenue: 2181 },
    { month: 'Jun', users: 239, events: 380, revenue: 2500 },
  ];

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const validationRules: Record<string, ValidationRule> = {
    email: {
      required: true,
      email: true,
    },
    password: {
      required: true,
      minLength: 8,
    },
    confirmPassword: {
      required: true,
      custom: (value) => {
        // This would need access to the form values in a real implementation
        return null;
      },
    },
    terms: {
      required: 'You must accept the terms and conditions',
    },
  };

  const handleFormSubmit = async (values: Record<string, any>) => {
    console.log('Form submitted:', values);
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">UI Component Library Demo</h1>

        {/* Buttons Section */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Buttons</h2>
          <ResponsiveStack direction={{ mobile: 'col', tablet: 'row' }} gap="gap-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="success" icon="fas fa-check">Success</Button>
            <Button variant="warning" loading>Loading...</Button>
            <Button variant="danger" size="sm">Small Danger</Button>
            <Button variant="ghost" size="lg">Large Ghost</Button>
          </ResponsiveStack>
        </section>

        {/* Form Components Section */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Form Components</h2>
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="gap-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              leftIcon="fas fa-envelope"
              helperText="We'll never share your email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              error="Password is too weak"
            />
            <Select
              label="Select Option"
              options={selectOptions}
              placeholder="Choose an option"
            />
            <Textarea
              label="Description"
              placeholder="Enter description"
              autoResize
              showCharCount
              maxLength={200}
            />
            <Checkbox
              label="Remember me"
              description="Keep me logged in for 30 days"
            />
            <Checkbox
              label="Enable notifications"
              variant="switch"
            />
          </ResponsiveGrid>
        </section>

        {/* Enhanced Form with Validation */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Enhanced Form with Validation</h2>
          <Form
            initialValues={{ email: '', password: '', confirmPassword: '', terms: false }}
            validationRules={validationRules}
            onSubmit={handleFormSubmit}
            className="space-y-6"
          >
            <ResponsiveGrid cols={{ mobile: 1, tablet: 2 }} gap="gap-6">
              <FormInput
                name="email"
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                leftIcon="fas fa-envelope"
                fullWidth
              />
              <FormSelect
                name="role"
                label="Role"
                options={[
                  { value: 'admin', label: 'Administrator' },
                  { value: 'user', label: 'User' },
                  { value: 'moderator', label: 'Moderator' },
                ]}
                placeholder="Select a role"
                fullWidth
              />
              <FormInput
                name="password"
                label="Password"
                type="password"
                placeholder="Enter password"
                helperText="Must be at least 8 characters"
                fullWidth
              />
              <FormInput
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Confirm password"
                fullWidth
              />
            </ResponsiveGrid>
            
            <FormTextarea
              name="bio"
              label="Bio"
              placeholder="Tell us about yourself"
              autoResize
              showCharCount
              maxLength={500}
              fullWidth
            />
            
            <FormCheckbox
              name="terms"
              label="I accept the terms and conditions"
              description="Please read our terms and conditions before proceeding"
            />
            
            <FormSubmit variant="primary" size="lg" fullWidth>
              Create Account
            </FormSubmit>
          </Form>
        </section>

        {/* Loading States Section */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Loading States</h2>
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 4 }} gap="gap-6">
            <div className="text-center">
              <LoadingSpinner size="sm" />
              <p className="mt-2 text-sm">Small</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm">Medium</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-2 text-sm">Large</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="xl" />
              <p className="mt-2 text-sm">Extra Large</p>
            </div>
          </ResponsiveGrid>
          
          <div className="mt-6 space-y-4">
            <ProgressBar
              value={progress}
              showLabel
              label="Upload Progress"
              color="primary"
            />
            <ProgressBar
              value={85}
              color="success"
              size="sm"
            />
            <ProgressBar
              value={45}
              color="warning"
              size="lg"
            />
          </div>
          
          <div className="mt-6 flex gap-4">
            <Button
              onClick={() => setProgress(Math.min(100, progress + 10))}
              size="sm"
            >
              Increase Progress
            </Button>
            <Button
              onClick={() => setProgress(Math.max(0, progress - 10))}
              variant="secondary"
              size="sm"
            >
              Decrease Progress
            </Button>
          </div>
        </section>

        {/* Skeleton Loading Section */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Skeleton Loading</h2>
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2 }} gap="gap-6">
            <CardSkeleton />
            <div>
              <h3 className="text-lg font-medium mb-4">Table Skeleton</h3>
              <TableSkeleton rows={3} columns={3} />
            </div>
          </ResponsiveGrid>
        </section>

        {/* Interactive Charts Section */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Interactive Charts</h2>
          <ResponsiveGrid cols={{ mobile: 1, desktop: 2 }} gap="gap-6">
            <InteractiveChart
              data={chartData}
              type="line"
              xKey="month"
              yKeys={['users', 'events']}
              title="Users and Events Over Time"
              height={300}
            />
            <InteractiveChart
              data={chartData}
              type="bar"
              xKey="month"
              yKeys={['revenue']}
              title="Revenue by Month"
              height={300}
              colors={['#10B981']}
            />
          </ResponsiveGrid>
        </section>

        {/* Responsive Layout Demo */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Responsive Layout Demo</h2>
          <p className="text-gray-600 mb-6">
            Resize your browser window to see how the layout adapts to different screen sizes.
          </p>
          
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3, largeDesktop: 4 }} gap="gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-primary to-primary-dark text-white p-6 rounded-lg">
                <h3 className="font-semibold">Card {i + 1}</h3>
                <p className="text-sm opacity-90 mt-2">
                  This card adapts to different screen sizes automatically.
                </p>
              </div>
            ))}
          </ResponsiveGrid>
        </section>
      </div>
    </div>
  );
}