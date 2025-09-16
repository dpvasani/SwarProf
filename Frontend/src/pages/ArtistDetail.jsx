import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { artistAPI } from '../services/api';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  FileText, 
  ExternalLink,
  Copy,
  Download,
  Share
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const ArtistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        setLoading(true);
        const response = await artistAPI.getArtist(id);
        setArtist(response.data);
      } catch (error) {
        console.error('Failed to fetch artist:', error);
        setError('Failed to load artist details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArtist();
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading artist details..." />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Artist Not Found</h1>
          <p className="text-white text-opacity-60 mb-6">{error || 'The requested artist could not be found.'}</p>
          <Link to="/artists" className="glass-button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Artists
          </Link>
        </div>
      </div>
    );
  }

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
          <Link 
            to="/artists" 
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors duration-300 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Artists
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-white text-3xl font-semibold">
                  {artist.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  {artist.name || 'Unknown Artist'}
                </h1>
                <p className="text-white text-opacity-60">
                  Added on {formatDate(artist.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="glass-button flex items-center space-x-2">
                <Share className="w-4 h-4" />
                <span>Share</span>
              </button>
              <button className="glass-button flex items-center space-x-2">
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button className="glass-button bg-red-500 bg-opacity-20 hover:bg-opacity-30 border-red-500 border-opacity-30 flex items-center space-x-2">
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Artist Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Biography */}
            {artist.bio && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="glass-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Biography</h2>
                  <button
                    onClick={() => copyToClipboard(artist.bio)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-300"
                    title="Copy biography"
                  >
                    <Copy className="w-4 h-4 text-white text-opacity-60" />
                  </button>
                </div>
                <p className="text-white text-opacity-80 leading-relaxed whitespace-pre-wrap">
                  {artist.bio}
                </p>
              </motion.div>
            )}

            {/* Additional Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card"
            >
              <h2 className="text-xl font-semibold text-white mb-4">Additional Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Birth Date */}
                {artist.birth_date && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Birth Date</p>
                    <p className="text-white font-medium">{formatDate(artist.birth_date)}</p>
                  </div>
                )}

                {/* Death Date */}
                {artist.death_date && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Death Date</p>
                    <p className="text-white font-medium">{formatDate(artist.death_date)}</p>
                  </div>
                )}

                {/* Nationality */}
                {artist.nationality && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Nationality</p>
                    <p className="text-white font-medium">{artist.nationality}</p>
                  </div>
                )}

                {/* Style */}
                {artist.style && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Style</p>
                    <p className="text-white font-medium">{artist.style}</p>
                  </div>
                )}

                {/* Medium */}
                {artist.medium && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Medium</p>
                    <p className="text-white font-medium">{artist.medium}</p>
                  </div>
                )}

                {/* Movements */}
                {artist.movements && artist.movements.length > 0 && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Movements</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {artist.movements.map((movement, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 bg-opacity-20 text-white text-xs rounded-full"
                        >
                          {movement}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Notable Works */}
            {artist.notable_works && artist.notable_works.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="glass-card"
              >
                <h2 className="text-xl font-semibold text-white mb-4">Notable Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {artist.notable_works.map((work, index) => (
                    <div key={index} className="p-4 rounded-lg glass">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{work.title || `Work ${index + 1}`}</p>
                          {work.year && (
                            <p className="text-white text-opacity-60 text-sm">{work.year}</p>
                          )}
                          {work.description && (
                            <p className="text-white text-opacity-80 text-sm mt-1">
                              {work.description}
                            </p>
                          )}
                        </div>
                        {work.url && (
                          <a
                            href={work.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-300"
                          >
                            <ExternalLink className="w-4 h-4 text-white text-opacity-60" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full glass-button flex items-center justify-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </button>
                <button className="w-full glass-button flex items-center justify-center space-x-2">
                  <Copy className="w-4 h-4" />
                  <span>Copy Info</span>
                </button>
                <button className="w-full glass-button flex items-center justify-center space-x-2">
                  <Share className="w-4 h-4" />
                  <span>Share Artist</span>
                </button>
              </div>
            </motion.div>

            {/* Metadata */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Metadata</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-white text-opacity-60" />
                  <div>
                    <p className="text-white text-opacity-60 text-sm">Added</p>
                    <p className="text-white text-sm">{formatDate(artist.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-white text-opacity-60" />
                  <div>
                    <p className="text-white text-opacity-60 text-sm">Source</p>
                    <p className="text-white text-sm">{artist.source_document || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Edit className="w-4 h-4 text-white text-opacity-60" />
                  <div>
                    <p className="text-white text-opacity-60 text-sm">Last Updated</p>
                    <p className="text-white text-sm">{formatDate(artist.updated_at || artist.created_at)}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Related Artists */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Similar Artists</h3>
              <p className="text-white text-opacity-60 text-sm">
                Feature coming soon - AI-powered artist recommendations based on style and movement.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistDetail;