import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { artistAPI } from '../services/api';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  FileText, 
  Copy,
  Download,
  Share,
  Sparkles
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const ArtistDetail = () => {
  const { id } = useParams();
  // navigate removed (unused)
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enhancing, setEnhancing] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState('');

  const fetchArtist = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchArtist();
    }
  }, [id, fetchArtist]);

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

  const handleComprehensiveEnhancement = async () => {
    try {
      setEnhancing(true);
      setEnhancementResult('');
      
      console.log('Starting comprehensive enhancement for artist:', id);
      const response = await artistAPI.enhanceArtistComprehensive(id);
      
      if (response.data.success) {
        setEnhancementResult('✅ Artist data comprehensively enhanced! Grammar, formatting, and presentation improved.');
        
        // Refresh the artist data to show the enhanced information
        setTimeout(async () => {
          try {
            await fetchArtist();
          } catch (error) {
            console.error('Failed to refresh artist data:', error);
          }
        }, 1500);
      } else {
        setEnhancementResult(`❌ Enhancement failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      setEnhancementResult('❌ Enhancement service temporarily unavailable. Please try again later.');
    } finally {
      setEnhancing(false);
    }
  };

  // Normalize and compute confidence display values
  const getConfidenceInfo = (raw) => {
    if (!raw && raw !== 0) return { level: null, percent: 0, label: 'Unknown' };
    const str = String(raw).toLowerCase();
    if (str === 'high' || str === 'h') return { level: 'high', percent: 90, label: 'High' };
    if (str === 'medium' || str === 'med' || str === 'm') return { level: 'medium', percent: 60, label: 'Medium' };
    if (str === 'low' || str === 'l') return { level: 'low', percent: 30, label: 'Low' };
    // If numeric (0-1 or 0-100)
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      let percent;
      if (n > 0 && n <= 1) percent = Math.round(n * 100);
      else percent = Math.min(100, Math.round(n));
      let level;
      if (percent >= 80) level = 'high';
      else if (percent >= 50) level = 'medium';
      else level = 'low';
      const label = level.charAt(0).toUpperCase() + level.slice(1);
      return { level, percent, label };
    }
    return { level: 'unknown', percent: 0, label: String(raw) };
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

  // Precompute confidence info to simplify JSX and avoid nested ternaries
  const confidenceRaw = artist.artist_info?.extraction_confidence;
  const confidenceInfo = getConfidenceInfo(confidenceRaw);
  let confidenceColorClass = 'from-red-400 to-red-600';
  if (confidenceInfo.level === 'high') confidenceColorClass = 'from-green-400 to-green-600';
  else if (confidenceInfo.level === 'medium') confidenceColorClass = 'from-yellow-400 to-yellow-600';

  // Precompute confidence label to avoid inline ternaries in JSX
  let confidenceLabel = confidenceInfo.label;
  if (confidenceInfo.percent) confidenceLabel = `${confidenceInfo.label} • ${confidenceInfo.percent}%`;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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
  </div>

        {/* Artist Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Biography */}
            {artist.bio && (
              <div className="glass-card">
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
              </div>
            )}

            {/* Additional Information */}
            <div className="glass-card">
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
                {artist.artist_info?.extraction_confidence !== undefined && (
                  <div className="p-4 rounded-lg glass flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white text-opacity-60 text-sm">Extraction Confidence</p>
                        <p className="text-white font-semibold text-lg">{confidenceLabel}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${confidenceColorClass} flex items-center justify-center shadow-md`}> 
                          <span className="text-white font-bold text-sm">{confidenceInfo.label.charAt(0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-white bg-opacity-10 rounded-full h-3 overflow-hidden">
                      <div className={`h-3 rounded-full bg-gradient-to-r ${confidenceColorClass}`} style={{ width: `${confidenceInfo.percent}%` }} />
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
            </div>

            {/* Achievements */}
            {artist.artist_info?.achievements && artist.artist_info.achievements.length > 0 && (
              <div
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
                    <div key={ach?.id || ach?._id || idx} className="p-4 rounded-lg glass">
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
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div
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
            </div>

            {/* Contact Details */}
            <div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Contact Details</h3>
              <div className="space-y-4 text-white text-opacity-80">
                {/* Phones */}
                {artist.artist_info?.contact_details?.contact_info?.phone_numbers && (
                  <div className="border-b border-white border-opacity-10 pb-3">
                    <p className="text-white text-opacity-60 text-sm mb-1">Phone</p>
                    <ul className="flex flex-col gap-2">
                      {artist.artist_info.contact_details.contact_info.phone_numbers.map((p, i) => (
                        <li key={p || i} className="flex items-center justify-between">
                          <a href={`tel:${p}`} className="text-white text-sm hover:underline">{p}</a>
                          <button onClick={() => copyToClipboard(p)} className="text-white text-opacity-60 text-xs hover:text-opacity-80">Copy</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Emails */}
                {artist.artist_info?.contact_details?.contact_info?.emails && (
                  <div className="border-b border-white border-opacity-10 pb-3">
                    <p className="text-white text-opacity-60 text-sm mb-1">Email</p>
                    <ul className="flex flex-col gap-2">
                      {artist.artist_info.contact_details.contact_info.emails.map((e, i) => (
                        <li key={e || i} className="flex items-center justify-between">
                          <a href={`mailto:${e}`} className="text-white text-sm hover:underline break-words">{e}</a>
                          <button onClick={() => copyToClipboard(e)} className="text-white text-opacity-60 text-xs hover:text-opacity-80">Copy</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Website */}
                {artist.artist_info?.contact_details?.contact_info?.website && (
                  <div className="border-b border-white border-opacity-10 pb-3">
                    <p className="text-white text-opacity-60 text-sm mb-1">Website</p>
                    <div className="flex items-center justify-between">
                      <a href={artist.artist_info.contact_details.contact_info.website} target="_blank" rel="noopener noreferrer" className="text-white text-sm hover:underline break-words">{artist.artist_info.contact_details.contact_info.website}</a>
                      <button onClick={() => copyToClipboard(artist.artist_info.contact_details.contact_info.website)} className="text-white text-opacity-60 text-xs hover:text-opacity-80">Copy</button>
                    </div>
                  </div>
                )}

                {/* Address */}
                {artist.artist_info?.contact_details?.address?.full_address && (
                  <div className="border-b border-white border-opacity-10 pb-3">
                    <p className="text-white text-opacity-60 text-sm mb-1">Address</p>
                    <p className="text-white text-sm break-words">{artist.artist_info.contact_details.address.full_address}</p>
                  </div>
                )}

                {/* Social Media */}
                {artist.artist_info?.contact_details?.social_media && (
                  <div>
                    <p className="text-white text-opacity-60 text-sm mb-2">Social Media</p>
                    <div className="flex flex-col gap-2">
                      {Object.entries(artist.artist_info.contact_details.social_media).map(([k, v]) => {
                        if (!v) return null;
                        const displayPlatform = k.charAt(0).toUpperCase() + k.slice(1);
                        let href = null;
                        if (v.startsWith('http')) href = v;
                        else if (!v.startsWith('@')) href = `https://${v}`;
                        return (
                          <div key={k} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-white text-sm font-medium">{displayPlatform}:</span>
                              <a href={href || '#'} onClick={e => { if(!href) e.preventDefault(); }} className="text-white text-sm hover:underline break-words">{v}</a>
                            </div>
                            <div className="flex items-center gap-2">
                              {href && (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-white text-opacity-60 text-xs hover:text-opacity-80">Open</a>
                              )}
                              <button onClick={() => copyToClipboard(v)} className="text-white text-opacity-60 text-xs hover:text-opacity-80">Copy</button>
                            </div>
                          </div>
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
            </div>

            {/* Metadata */}
            <div
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
            </div>

            {/* Extracted Text Preview */}
            {artist.extracted_text && (
              <div
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
              </div>
            )}

            {/* Enhancement Button */}
            <div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-card"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Comprehensive AI Enhancement</h3>
              <p className="text-white text-opacity-60 text-sm mb-4">
                Use AI to comprehensively refine, correct, and enhance ALL of this artist's information - not just missing fields, but improving existing data quality, fixing errors, and making everything more complete and accurate.
              </p>
              <button
                onClick={() => handleComprehensiveEnhancement()}
                disabled={enhancing}
                className="w-full glass-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {enhancing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Enhancing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Comprehensively Enhance with AI</span>
                  </>
                )}
              </button>
              {enhancementResult && (
                <div className={`mt-4 p-3 rounded-lg ${
                  enhancementResult.includes('✅') 
                    ? 'bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30'
                    : 'bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30'
                }`}>
                  <p className={`text-sm ${
                    enhancementResult.includes('✅') ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {enhancementResult}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistDetail;