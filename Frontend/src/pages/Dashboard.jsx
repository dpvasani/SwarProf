import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { artistAPI } from '../services/api';
import { 
  Upload, 
  Users, 
  FileText, 
  Activity, 
  TrendingUp,
  Calendar,
  Eye,
  Download,
  Plus
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalArtists: 0,
    totalExtractions: 0,
    recentExtractions: [],
    weeklyGrowth: 0,
  });
  const [recentArtists, setRecentArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch recent artists
        const artistsResponse = await artistAPI.getArtists({ limit: 5, sort: 'created_at' });
        
        // Transform the data to match frontend expectations
        const artistsData = artistsResponse.data.artists || [];
        const transformedArtists = artistsData.map(artist => ({
          id: artist._id,
          name: artist.artist_info?.artist_name || 'Unknown Artist',
          bio: artist.artist_info?.summary || artist.artist_info?.biography?.background || '',
          created_at: artist.created_at,
          artist_info: artist.artist_info
        }));
        
        setRecentArtists(transformedArtists);
        
        // Mock stats for now (replace with actual API calls)
        setStats({
          totalArtists: artistsResponse.data.total || 0,
          totalExtractions: 42, // Mock data
          recentExtractions: [
            { id: 1, filename: 'artist_portfolio.pdf', date: '2023-12-15', count: 5 },
            { id: 2, filename: 'gallery_catalog.docx', date: '2023-12-14', count: 8 },
            { id: 3, filename: 'exhibition_list.pdf', date: '2023-12-13', count: 3 },
          ],
          weeklyGrowth: 23.5,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'Extract Artists',
      description: 'Upload documents to extract artist information',
      icon: Upload,
      color: 'from-blue-500 to-cyan-500',
      link: '/extract',
    },
    {
      title: 'View Artists',
      description: 'Browse and manage your artist database',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      link: '/artists',
    },
    {
      title: 'Profile Settings',
      description: 'Update your account settings',
      icon: Activity,
      color: 'from-indigo-500 to-purple-500',
      link: '/profile',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
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
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.full_name || user?.email}!
          </h1>
          <p className="text-white text-opacity-60 text-lg">
            Here's what's happening with your artist extractions
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-opacity-60 text-sm">Total Artists</p>
                <p className="text-3xl font-bold text-white">{stats.totalArtists}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-opacity-60 text-sm">Total Extractions</p>
                <p className="text-3xl font-bold text-white">{stats.totalExtractions}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-opacity-60 text-sm">This Week</p>
                <p className="text-3xl font-bold text-white">12</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-opacity-60 text-sm">Growth</p>
                <p className="text-3xl font-bold text-white">+{stats.weeklyGrowth}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  to={action.link}
                  className="glass-card group hover:shadow-glow transition-all duration-300 transform hover:scale-105"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-1">{action.title}</h3>
                      <p className="text-white text-opacity-60 text-sm">{action.description}</p>
                    </div>
                    <Plus className="w-5 h-5 text-white text-opacity-40 group-hover:text-opacity-80 transition-colors duration-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Extractions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Recent Extractions</h3>
              <Link 
                to="/extract" 
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-300"
              >
                View all
              </Link>
            </div>
            
            <div className="space-y-4">
              {stats.recentExtractions.map((extraction) => (
                <div key={extraction.id} className="flex items-center justify-between p-4 rounded-lg glass">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{extraction.filename}</p>
                      <p className="text-white text-opacity-60 text-sm">{extraction.count} artists found</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-opacity-60 text-sm">{extraction.date}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <button className="p-1 hover:bg-white/10 rounded transition-colors duration-300">
                        <Eye className="w-4 h-4 text-white text-opacity-60" />
                      </button>
                      <button className="p-1 hover:bg-white/10 rounded transition-colors duration-300">
                        <Download className="w-4 h-4 text-white text-opacity-60" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Artists */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Recent Artists</h3>
              <Link 
                to="/artists" 
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-300"
              >
                View all
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentArtists.length > 0 ? (
                recentArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    to={`/artists/${artist.id}`}
                    className="flex items-center space-x-3 p-4 rounded-lg glass hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {(artist.name || 'Unknown Artist').charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{artist.name}</p>
                      <p className="text-white text-opacity-60 text-sm">
                        {artist.bio ? artist.bio.substring(0, 50) + '...' : 'No bio available'}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-white text-opacity-40 mx-auto mb-4" />
                  <p className="text-white text-opacity-60">No artists found yet</p>
                  <Link 
                    to="/extract" 
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-300"
                  >
                    Extract your first artist
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;