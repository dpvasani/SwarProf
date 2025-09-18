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
        
        // Transform the backend data to match frontend expectations
        const artistData = response.data.artist;
        if (artistData) {
          const transformedArtist = {
            id: artistData._id,
            name: artistData.artist_info?.artist_name || 'Unknown Artist',
            bio: artistData.artist_info?.summary || artistData.artist_info?.biography?.background || '',
            birth_date: artistData.artist_info?.biography?.early_life,
            nationality: artistData.artist_info?.contact_details?.address?.country,
            style: artistData.artist_info?.gharana_details?.style,
            achievements: artistData.artist_info?.achievements || [],
            created_at: artistData.created_at,
            updated_at: artistData.updated_at,
            original_filename: artistData.original_filename,
            saved_filename: artistData.saved_filename,
            extracted_text: artistData.extracted_text,
            artist_info: artistData.artist_info
          };
          setArtist(transformedArtist);
        } else {
          setError('Artist data not found');
        }
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
                  {(artist.name || 'Unknown Artist').charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  {artist.name}
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
                {/* Guru Name */}
                {artist.artist_info?.guru_name && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Guru/Teacher</p>
                    <p className="text-white font-medium">{artist.artist_info.guru_name}</p>
                  </div>
                )}

                {/* Gharana Name */}
                {artist.artist_info?.gharana_details?.gharana_name && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Gharana</p>
                    <p className="text-white font-medium">{artist.artist_info.gharana_details.gharana_name}</p>
                  </div>
                )}

                {/* Style */}
                {artist.artist_info?.gharana_details?.style && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Style</p>
                    <p className="text-white font-medium">{artist.artist_info.gharana_details.style}</p>
                  </div>
                )}

                {/* Tradition */}
                {artist.artist_info?.gharana_details?.tradition && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Tradition</p>
                    <p className="text-white font-medium">{artist.artist_info.gharana_details.tradition}</p>
                  </div>
                )}

                {/* Early Life */}
                {artist.artist_info?.biography?.early_life && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Early Life</p>
                    <p className="text-white font-medium">{artist.artist_info.biography.early_life}</p>
                  </div>
                )}

                {/* Education */}
                {artist.artist_info?.biography?.education && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Education</p>
                    <p className="text-white font-medium">{artist.artist_info.biography.education}</p>
                  </div>
                )}

                {/* Career Highlights */}
                {artist.artist_info?.biography?.career_highlights && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Career Highlights</p>
                    <p className="text-white font-medium">{artist.artist_info.biography.career_highlights}</p>
                  </div>
                )}

                {/* Extraction Confidence */}
                {artist.artist_info?.extraction_confidence && (
                  <div className="p-4 rounded-lg glass">
                    <p className="text-white text-opacity-60 text-sm">Extraction Confidence</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        artist.artist_info.extraction_confidence === 'high' 
                          ? 'bg-green-500 bg-opacity-20 text-green-400'
                          : artist.artist_info.extraction_confidence === 'medium'
                          ? 'bg-yellow-500 bg-opacity-20 text-yellow-400'
                          : 'bg-red-500 bg-opacity-20 text-red-400'
                      }`}>
                        {artist.artist_info.extraction_confidence.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {artist.artist_info?.additional_notes && (
                  <div className="p-4 rounded-lg glass md:col-span-2">
                    <p className="text-white text-opacity-60 text-sm">Additional Notes</p>
                    <p className="text-white font-medium">{artist.artist_info.additional_notes}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Achievements */}
            {artist.artist_info?.achievements && artist.artist_info.achievements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="glass-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Achievements</h2>
                </div>
                <div className="space-y-3">
                  {artist.artist_info.achievements.map((ach, idx) => (
                    <div key={idx} className="p-4 rounded-lg glass">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium">
                            {ach.title || ach.type || 'Achievement'}
                          </h4>
                          {ach.year && (
                            <p className="text-white text-opacity-60 text-sm">{ach.year}</p>
                          )}
                          {ach.details && (
                            <p className="text-white text-opacity-80 text-sm mt-2">{ach.details}</p>
                          )}
                        </div>
                        {ach.type && (
                          <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 bg-opacity-20 text-white text-xs rounded-full">
                            {ach.type}
                          </span>
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

            {/* Contact Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Contact Details</h3>
              <div className="space-y-4 text-white text-opacity-80">
                {/* Phones */}
                {artist.artist_info?.contact_details?.contact_info?.phone_numbers && (
                  <div>
                    <p className="text-white text-opacity-60 text-sm">Phone</p>
                    <div className="flex flex-col mt-1">
                      {artist.artist_info.contact_details.contact_info.phone_numbers.map((p, i) => (
                        <a key={i} href={`tel:${p}`} className="text-white text-sm hover:underline">{p}</a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emails */}
                {artist.artist_info?.contact_details?.contact_info?.emails && (
                  <div>
                    <p className="text-white text-opacity-60 text-sm">Email</p>
                    <div className="flex flex-col mt-1">
                      {artist.artist_info.contact_details.contact_info.emails.map((e, i) => (
                        <a key={i} href={`mailto:${e}`} className="text-white text-sm hover:underline">{e}</a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Website */}
                {artist.artist_info?.contact_details?.contact_info?.website && (
                  <div>
                    <p className="text-white text-opacity-60 text-sm">Website</p>
                    <a href={artist.artist_info.contact_details.contact_info.website} target="_blank" rel="noopener noreferrer" className="text-white text-sm hover:underline">{artist.artist_info.contact_details.contact_info.website}</a>
                  </div>
                )}

                {/* Address */}
                {artist.artist_info?.contact_details?.address?.full_address && (
                  <div>
                    <p className="text-white text-opacity-60 text-sm">Address</p>
                    <p className="text-white text-sm">{artist.artist_info.contact_details.address.full_address}</p>
                  </div>
                )}

                {/* Social Media */}
                {artist.artist_info?.contact_details?.social_media && (
                  <div>
                    <p className="text-white text-opacity-60 text-sm mb-2">Social Media</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {Object.entries(artist.artist_info.contact_details.social_media).map(([k, v]) => {
                        if (!v) return null;
                        // If v looks like a handle (starts with @), show as text; otherwise link
                        const href = v.startsWith('http') ? v : (v.startsWith('@') ? null : `https://${v}`);
                        return (
                          <a key={k} href={href || '#'} onClick={e => { if(!href) e.preventDefault(); }} className="px-2 py-1 bg-white bg-opacity-10 rounded-full text-white text-sm hover:underline">
                            {k.charAt(0).toUpperCase() + k.slice(1)}: {v}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show message if no contact details */}
                {!artist.artist_info?.contact_details?.contact_info?.phone_numbers &&
                 !artist.artist_info?.contact_details?.contact_info?.emails &&
                 !artist.artist_info?.contact_details?.contact_info?.website &&
                 !artist.artist_info?.contact_details?.address?.full_address &&
                 !artist.artist_info?.contact_details?.social_media && (
                  <div className="text-center py-4">
                    <p className="text-white text-opacity-60 text-sm">
                      No contact details found in the extracted data
                    </p>
                  </div>
                )}
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
              <div className="space-y-4">
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
                    <p className="text-white text-sm">{artist.original_filename || artist.saved_filename || 'Unknown'}</p>
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

            {/* Extracted Text Preview */}
            {artist.extracted_text && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="glass-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Extracted Text</h3>
                  <button
                    onClick={() => copyToClipboard(artist.extracted_text)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-300"
                    title="Copy extracted text"
                  >
                    <Copy className="w-4 h-4 text-white text-opacity-60" />
                  </button>
                </div>
                <div className="p-4 rounded-lg glass max-h-60 overflow-y-auto">
                  <p className="text-white text-opacity-60 text-sm whitespace-pre-wrap">
                    {artist.extracted_text}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Enhancement Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">AI Enhancement</h3>
              <p className="text-white text-opacity-60 text-sm mb-4">
                Use AI to find missing contact details and enhance this artist's information.
              </p>
              <button
                disabled
                className="w-full glass-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>Enhance with AI</span>
              </button>
            </motion.div>

            {/* Related Artists */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
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