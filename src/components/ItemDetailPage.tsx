import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Calendar, Clock, Heart, Share2, Check } from 'lucide-react';
import RentalCheckout from './RentalCheckout';
import { supabase } from '../supabaseClient';
import type { Equipment } from '../types';
import LoadingSpinner from './LoadingSpinner';
import Auth from './Auth';

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [rentalDates, setRentalDates] = useState({
    start: '',
    end: ''
  });
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setEquipment(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load equipment');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [id]);

  const handleRentNow = async () => {
    if (!rentalDates.start || !rentalDates.end) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setShowCheckout(true);
  };

  const calculateTotalPrice = () => {
    if (!rentalDates.start || !rentalDates.end || !equipment) return 0;
    const startDate = new Date(rentalDates.start);
    const endDate = new Date(rentalDates.end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return days * equipment.price_day;
  };

  const toggleFavorite = async () => {
    if (!equipment) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('equipment_id', equipment.id);
      } else {
        await supabase
          .from('favorites')
          .insert([{ user_id: user.id, equipment_id: equipment.id }]);
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!equipment) return <div className="p-4">Equipment not found</div>;

  if (showCheckout) {
    return (
      <RentalCheckout
        startDate={new Date(rentalDates.start)}
        endDate={new Date(rentalDates.end)}
        totalPrice={calculateTotalPrice()}
        equipment={{
          id: equipment.id,
          name: equipment.name,
          images: equipment.images,
          price_day: equipment.price_day
        }}
        onBack={() => setShowCheckout(false)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <Auth
              onSuccess={() => {
                setShowAuthModal(false);
                setShowCheckout(true);
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
            <img
              src={equipment.images[currentImageIndex] || '/placeholder-equipment.jpg'}
              alt={equipment.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={toggleFavorite}
                className={`p-2 rounded-full ${isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/80 text-gray-700'}`}
              >
                <Heart className={isFavorite ? 'fill-current' : ''} size={20} />
              </button>
              <button className="p-2 rounded-full bg-white/80 text-gray-700">
                <Share2 size={20} />
              </button>
            </div>
          </div>
          {equipment.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {equipment.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`aspect-square rounded-md overflow-hidden ${currentImageIndex === index ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <img
                    src={img}
                    alt={`${equipment.name} thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Equipment Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{equipment.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center text-yellow-500">
              <Star className="fill-current" size={18} />
              <span className="ml-1 font-medium">4.8</span>
              <span className="text-gray-500 ml-1">(24 reviews)</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin size={14} className="mr-1" />
              <span>{equipment.location}</span>
            </div>
          </div>

          <div className="prose max-w-none text-gray-700 mb-6">
            <p>{equipment.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Features</h3>
            <ul className="grid grid-cols-2 gap-2">
              {equipment.features?.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="text-green-500 mr-2" size={16} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Rental Section */}
          <div className="mt-8 bg-gray-50 p-6 rounded-xl">
            <h2 className="text-lg font-medium text-gray-900">Rent this equipment</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={rentalDates.start}
                  onChange={(e) => setRentalDates({ ...rentalDates, start: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={rentalDates.end}
                  onChange={(e) => setRentalDates({ ...rentalDates, end: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min={rentalDates.start || new Date().toISOString().split('T')[0]}
                  disabled={!rentalDates.start}
                />
              </div>
            </div>

            {rentalDates.start && rentalDates.end && (
              <div className="mt-4">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Daily rate</span>
                  <span className="font-medium">${equipment.price_day.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">
                    {Math.ceil((new Date(rentalDates.end).getTime() - new Date(rentalDates.start).getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Total</span>
                  <span className="text-lg font-bold text-blue-600">
                    ${calculateTotalPrice().toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleRentNow}
              disabled={!rentalDates.start || !rentalDates.end}
              className="mt-6 w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rent Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
