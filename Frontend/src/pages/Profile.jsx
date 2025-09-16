import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  Edit, 
  Save, 
  X, 
  Camera,
  Shield,
  Bell,
  Download,
  Trash2
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name.trim()) {
      setErrors({ full_name: 'Full name is required' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await updateProfile(formData);
      if (result.success) {
        setEditing(false);
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      email: user?.email || '',
    });
    setErrors({});
    setEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const profileSections = [
    {
      title: 'Account Security',
      icon: Shield,
      items: [
        { label: 'Change Password', action: () => {}, disabled: true },
        { label: 'Two-Factor Authentication', action: () => {}, disabled: true },
        { label: 'Login Sessions', action: () => {}, disabled: true },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { label: 'Email Notifications', action: () => {}, disabled: true },
        { label: 'Push Notifications', action: () => {}, disabled: true },
        { label: 'Weekly Reports', action: () => {}, disabled: true },
      ],
    },
    {
      title: 'Data & Privacy',
      icon: Download,
      items: [
        { label: 'Export Data', action: () => {}, disabled: true },
        { label: 'Privacy Settings', action: () => {}, disabled: true },
        { label: 'Data Usage', action: () => {}, disabled: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-white text-opacity-60">
            Manage your account settings and preferences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-card"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Basic Information</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="glass-button flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCancel}
                      className="glass-button flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="glass-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {loading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-white text-opacity-80 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className={`glass-input w-full ${errors.full_name ? 'border-red-500 border-opacity-50' : ''}`}
                      placeholder="Enter your full name"
                      disabled={loading}
                    />
                    {errors.full_name && (
                      <p className="mt-1 text-sm text-red-400">{errors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white text-opacity-80 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      className="glass-input w-full opacity-50 cursor-not-allowed"
                      disabled
                    />
                    <p className="mt-1 text-sm text-white text-opacity-60">
                      Email address cannot be changed
                    </p>
                  </div>

                  {errors.submit && (
                    <div className="p-4 rounded-lg bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30">
                      <p className="text-red-400 text-sm">{errors.submit}</p>
                    </div>
                  )}
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-white text-opacity-60" />
                    <div>
                      <p className="text-white text-opacity-60 text-sm">Full Name</p>
                      <p className="text-white font-medium">{user?.full_name || 'Not set'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-white text-opacity-60" />
                    <div>
                      <p className="text-white text-opacity-60 text-sm">Email Address</p>
                      <p className="text-white font-medium">{user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-white text-opacity-60" />
                    <div>
                      <p className="text-white text-opacity-60 text-sm">Member Since</p>
                      <p className="text-white font-medium">{formatDate(user?.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Settings Sections */}
            {profileSections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                  className="glass-card"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <Icon className="w-6 h-6 text-white text-opacity-60" />
                    <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                  </div>
                  
                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <button
                        key={itemIndex}
                        onClick={item.action}
                        disabled={item.disabled}
                        className="w-full flex items-center justify-between p-3 rounded-lg glass hover:bg-white/10 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="text-white">{item.label}</span>
                        {item.disabled && (
                          <span className="text-white text-opacity-40 text-xs">Coming Soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="glass-card border-red-500 border-opacity-30"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
                <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
              </div>
              
              <p className="text-white text-opacity-60 text-sm mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              
              <button
                disabled
                className="glass-button bg-red-500 bg-opacity-20 hover:bg-opacity-30 border-red-500 border-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </motion.div>
          </div>

          {/* Profile Sidebar */}
          <div className="space-y-6">
            {/* Profile Avatar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-card text-center"
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center relative group">
                <span className="text-white text-3xl font-semibold">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-1">
                {user?.full_name || 'User'}
              </h3>
              <p className="text-white text-opacity-60 text-sm mb-4">{user?.email}</p>
              
              <button
                disabled
                className="glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change Avatar
              </button>
            </motion.div>

            {/* Account Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Account Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white text-opacity-60">Artists Extracted</span>
                  <span className="text-white font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white text-opacity-60">Documents Processed</span>
                  <span className="text-white font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white text-opacity-60">Account Type</span>
                  <span className="text-white font-medium">Free</span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download My Data
                </button>
                <button
                  disabled
                  className="w-full glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export Artists
                </button>
                <button
                  disabled
                  className="w-full glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Account Backup
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;