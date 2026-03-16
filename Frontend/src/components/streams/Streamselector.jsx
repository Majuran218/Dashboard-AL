// frontend/src/components/streams/StreamSelector.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getStreams } from '../../services/streamService';
import { FaMath, FaFlask, FaPalette, FaChartLine, FaDna, FaCogs } from 'react-icons/fa';

const streamIcons = {
  'Mathematics': <FaMath className="w-8 h-8" />,
  'BIO': <FaFlask className="w-8 h-8" />,
  'Arts': <FaPalette className="w-8 h-8" />,
  'Commerce': <FaChartLine className="w-8 h-8" />,
  'BIO technology': <FaDna className="w-8 h-8" />,
  'Engineering Technology': <FaCogs className="w-8 h-8" />
};

const StreamSelector = () => {
  const navigate = useNavigate();
  const { data: streams, isLoading } = useQuery('streams', getStreams);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Choose Your Stream</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {streams?.map((stream) => (
          <div
            key={stream.id}
            onClick={() => navigate(`/streams/${stream.id}`)}
            className="bg-white rounded-lg shadow-lg p-6 cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-center justify-center mb-4 text-blue-600">
              {streamIcons[stream.stream_name]}
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">{stream.stream_name}</h2>
            <p className="text-gray-600 text-center text-sm">{stream.description}</p>
            <div className="mt-4 flex justify-center">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Explore Stream
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreamSelector;