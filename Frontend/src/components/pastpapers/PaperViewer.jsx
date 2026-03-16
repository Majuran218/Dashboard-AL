// frontend/src/components/pastpapers/PastPapers.jsx
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { getPastPapers, downloadPaper } from '../../services/paperService';
import { FaDownload, FaFilePdf } from 'react-icons/fa';
import { format } from 'date-fns';

const PastPapers = () => {
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const { data: papers, isLoading } = useQuery(
    ['pastpapers', selectedYear, selectedSubject],
    () => getPastPapers({ year: selectedYear, subject: selectedSubject })
  );

  const years = ['2023', '2022', '2021', '2020', '2019', '2018', '2017'];

  const handleDownload = async (paperId, fileName) => {
    try {
      await downloadPaper(paperId);
      // Trigger file download
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Past Papers Library</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              <option value="maths">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
            </select>
          </div>
        </div>
      </div>

      {/* Papers Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {papers?.map((paper) => (
            <div key={paper.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-600 p-4">
                <FaFilePdf className="text-white text-4xl mx-auto" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{paper.subject_name}</h3>
                <p className="text-gray-600 text-sm mb-1">Year: {paper.year}</p>
                <p className="text-gray-600 text-sm mb-1">Type: {paper.paper_type}</p>
                <p className="text-gray-600 text-sm mb-4">Downloads: {paper.downloads_count}</p>
                <button
                  onClick={() => handleDownload(paper.id, paper.file_name)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center space-x-2"
                >
                  <FaDownload />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PastPapers;