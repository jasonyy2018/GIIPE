'use client'

import { useState } from 'react';
import PublicLayout from '@/components/public/PublicLayout';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create mailto link with pre-filled content
    const subject = encodeURIComponent(formData.subject || 'Contact Form Submission');
    const body = encodeURIComponent(
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Subject: ${formData.subject}\n\n` +
      `Message:\n${formData.message}`
    );
    
    const mailtoLink = `mailto:minyuan@wustl.edu?subject=${subject}&body=${body}`;
    
    // Open email client
    window.location.href = mailtoLink;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-5 max-w-[1200px] py-16">
        <div className="text-center mb-12">
          <h1 className="text-[1.4rem] md:text-[2rem] font-bold text-primary-dark mb-4">
            Contact Us
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto mb-8"></div>
          <p className="text-[0.9rem] md:text-xl text-text max-w-3xl mx-auto leading-relaxed">
            Get in touch with our team. We'd love to hear from you and answer any questions you may have.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-semibold text-primary-dark mb-6">
              Send us a Message
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-primary-dark mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-primary-dark mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-primary-dark mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="conference">Conference Information</option>
                  <option value="partnership">Partnership Opportunities</option>
                  <option value="research">Research Collaboration</option>
                  <option value="media">Media Inquiry</option>
                  <option value="technical">Technical Support</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-primary-dark mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition-colors resize-vertical"
                  placeholder="Please describe your inquiry in detail..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 bg-accent text-white font-semibold rounded-md hover:bg-accent/90 transition-all duration-300 hover:-translate-y-0.5"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}