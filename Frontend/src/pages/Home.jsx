import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowRight, 
  Sparkles, 
  Upload, 
  Database, 
  Zap, 
  CheckCircle,
  Users,
  FileText,
  Brain
} from 'lucide-react';

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Upload,
      title: 'Smart Upload',
      description: 'Upload documents, PDFs, or images and let our AI extract artist information automatically.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Brain,
      title: 'AI-Powered Extraction',
      description: 'Advanced machine learning algorithms analyze your documents to identify artist details.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Database,
      title: 'Organized Storage',
      description: 'All extracted artist information is stored securely and organized for easy access.',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Get results in seconds with our optimized processing pipeline.',
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  const benefits = [
    'Save hours of manual data entry',
    'Improve accuracy with AI validation',
    'Access your data from anywhere',
    'Export in multiple formats',
    'Real-time collaboration',
    'Secure cloud storage',
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Extract Artist Information
              <span className="block gradient-text">with AI Power</span>
            </h1>
            <p className="text-xl md:text-2xl text-white text-opacity-80 mb-8 max-w-3xl mx-auto">
              Transform your documents into structured artist data using advanced AI technology. 
              Upload, extract, and organize artist information in seconds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="glass-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 flex items-center space-x-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="glass-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 flex items-center space-x-2"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="glass-button text-lg px-8 py-4"
                >
                  Sign In
                </Link>
              </>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto"
          >
            <div className="glass-card text-center">
              <div className="text-3xl font-bold gradient-text mb-2">99.9%</div>
              <div className="text-white text-opacity-60">Accuracy Rate</div>
            </div>
            <div className="glass-card text-center">
              <div className="text-3xl font-bold gradient-text mb-2">10K+</div>
              <div className="text-white text-opacity-60">Documents Processed</div>
            </div>
            <div className="glass-card text-center">
              <div className="text-3xl font-bold gradient-text mb-2">2.5s</div>
              <div className="text-white text-opacity-60">Average Processing Time</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Powerful Features for
              <span className="gradient-text"> Modern Workflows</span>
            </h2>
            <p className="text-xl text-white text-opacity-60 max-w-2xl mx-auto">
              Everything you need to extract, organize, and manage artist information efficiently.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="glass-card text-center group hover:shadow-glow transition-all duration-300"
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white text-opacity-60">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-white mb-6">
                Why Choose
                <span className="gradient-text"> ArtistAI?</span>
              </h2>
              <p className="text-xl text-white text-opacity-60 mb-8">
                Streamline your workflow with intelligent automation and never lose track of artist information again.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center space-x-3"
                  >
                    <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    <span className="text-white text-opacity-80">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="glass-card p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Document Upload</h3>
                    <p className="text-white text-opacity-60">artist_portfolio.pdf</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-opacity-60">Processing</span>
                    <div className="w-32 h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        initial={{ width: 0 }}
                        whileInView={{ width: '100%' }}
                        transition={{ duration: 2, delay: 0.5 }}
                        viewport={{ once: true }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-4 rounded-lg">
                      <Users className="w-6 h-6 text-blue-400 mb-2" />
                      <p className="text-sm text-white text-opacity-60">Artists Found</p>
                      <p className="text-xl font-bold text-white">15</p>
                    </div>
                    <div className="glass p-4 rounded-lg">
                      <Sparkles className="w-6 h-6 text-purple-400 mb-2" />
                      <p className="text-sm text-white text-opacity-60">Confidence</p>
                      <p className="text-xl font-bold text-white">98.5%</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="glass-card p-12"
            >
              <h2 className="text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-white text-opacity-60 mb-8">
                Join thousands of users who are already saving time with AI-powered artist extraction.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="glass-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 flex items-center justify-center space-x-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="glass-button text-lg px-8 py-4"
                >
                  Sign In
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;