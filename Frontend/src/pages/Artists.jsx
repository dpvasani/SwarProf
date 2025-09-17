import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { artistAPI } from '../services/api';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Users,
  Calendar,
  FileText
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Artists = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArtists, setTotalArtists] = useState(0);

  useEffect(() => {
    fetchArtists();
  }, [currentPage, searchTerm]);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const response = await artistAPI.getArtists({
        page: currentPage,
        limit: 12,
        search: searchTerm,
      });
      
      // Handle the response structure from backend
      const artistsData = response.data.artists || [];
      
      // Transform the data to match frontend expectations
      const transformedArtists = artistsData.map(artist => ({
        id: artist._id,
        name: artist.artist_info?.artist_name || 'Unknown Artist',
        bio: artist.artist_info?.summary || artist.artist_info?.biography?.background || '',
        created_at: artist.created_at,
        updated_at: artist.updated_at,
        original_filename: artist.original_filename,
        artist_info: artist.artist_info
      }));
      
      setArtists(transformedArtists);
      setTotalPages(response.data.total_pages || 1);
      setTotalArtists(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch artists:', error);
      setArtists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && artists.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading artists..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Artists Database</h1>
              <p className="text-white text-opacity-60">
                Manage and explore your extracted artist information
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                to="/extract"
                className="glass-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Extract New Artists</span>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="glass-card">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{totalArtists}</p>
                  <p className="text-white text-opacity-60 text-sm">Total Artists</p>
                </div>
              </div>
            </div>
            <div className="glass-card">
              <div className="flex items-center space-x-3">
                <Calendar className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {artists.filter(a => {
                      const created = new Date(a.created_at);
                      const week = new Date();
                      week.setDate(week.getDate() - 7);
                      return created > week;
                    }).length}
                  </p>
                  <p className="text-white text-opacity-60 text-sm">This Week</p>
                </div>
              </div>
            </div>
            <div className="glass-card">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {artists.filter(a => a.bio && a.bio.length > 0).length}
                <span className="text-xl font-bold text-white">{artists.filter(a => a.bio && a.bio.length > 0).length}</span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white text-opacity-40" />
              <input
                type="text"
                placeholder="Search artists by name, bio, or other details..."
                value={searchTerm}
                onChange={handleSearch}
                className="glass-input w-full pl-10"
              />
            </div>
            <button className="glass-button flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </motion.div>

        {/* Artists Grid */}
        {artists.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
          >
            {artists.map((artist, index) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="glass-card group hover:shadow-glow transition-all duration-300"
              >
                {/* Artist Avatar */}
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">
                    {(artist.name || 'Unknown Artist').charAt(0)}
                  </span>
                </div>

                {/* Artist Info */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {artist.name}
                  </h3>
                  <p className="text-white text-opacity-60 text-sm mb-2">
                    Added {formatDate(artist.created_at)}
                  </p>
                  {artist.bio && (
                    <p className="text-white text-opacity-60 text-sm line-clamp-2">
                      {artist.bio.substring(0, 80)}
                      {artist.bio.length > 80 && '...'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Link
                    to={`/artists/${artist.id}`}
                    className="p-2 rounded-lg glass hover:bg-white/20 transition-colors duration-300"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4 text-white" />
                  </Link>
                  <button
                    className="p-2 rounded-lg glass hover:bg-white/20 transition-colors duration-300"
                    title="Edit Artist"
                  >
                    <Edit className="w-4 h-4 text-white" />
                  </button>
                  <button
                    className="p-2 rounded-lg glass hover:bg-red-500/20 transition-colors duration-300"
                    title="Delete Artist"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center py-16"
          >
            <Users className="w-24 h-24 text-white text-opacity-40 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-white mb-2">
              {searchTerm ? 'No artists found' : 'No artists yet'}
            </h3>
            <p className="text-white text-opacity-60 mb-6">
              {searchTerm 
                ? `No artists match "${searchTerm}". Try adjusting your search terms.`
                : 'Start by extracting artist information from your documents.'
              }
            </p>
            {!searchTerm && (
              <Link
                to="/extract"
                className="glass-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Extract Your First Artist
              </Link>
            )}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center items-center space-x-2"
          >
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="glass-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg transition-all duration-300 ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'glass text-white text-opacity-60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="glass-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Artists;