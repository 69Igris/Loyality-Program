import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CITIES = ["Delhi", "Mumbai", "Bangalore", "Goa", "Hyderabad", "Chennai", "Kolkata", "Pune"];

function UploadCard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [trip, setTrip] = useState({ from: '', to: '' });
  const [userData, setUserData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const parseUserDataFile = (file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result || '{}');
        if (!Array.isArray(json.cards) || !Array.isArray(json.loyalty_programs)) {
          throw new Error('Invalid JSON shape');
        }

        setUserData(json);
        setFileName(file.name);
        setFileError('');
      } catch (_error) {
        setUserData(null);
        setFileName('');
        setFileError('Invalid JSON. Expected: { cards: [], loyalty_programs: [] }.');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!trip.from.trim() || !trip.to.trim()) {
      setFileError('Please select both From and To cities.');
      return;
    }

    if (trip.from === trip.to) {
      setFileError('Origin and destination cannot be the same.');
      return;
    }

    if (!userData) {
      setFileError('Upload a valid JSON file to continue.');
      return;
    }

    navigate('/results', {
      state: {
        trip: {
          from: trip.from.trim(),
          to: trip.to.trim(),
        },
        userData,
      },
    });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];
    parseUserDataFile(droppedFile);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.42, ease: 'easeOut' }}
      className="relative"
    >
      <div className="pointer-events-none absolute -inset-px rounded-[28px] bg-gradient-to-r from-cyan-400/35 via-indigo-400/30 to-fuchsia-400/35 blur-lg" />

      <form
        onSubmit={handleSubmit}
        className="glass-card relative rounded-[28px] p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">Trip Input</h2>
          <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            Secure JSON Upload
          </span>
        </div>

        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative mb-6 cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all duration-300 ${
            dragActive
              ? 'border-cyan-300/80 bg-cyan-400/10 shadow-glow'
              : 'border-white/20 bg-slate-900/45 hover:border-cyan-400/50 hover:bg-slate-900/65'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(event) => parseUserDataFile(event.target.files?.[0])}
          />

          <div className="space-y-2 text-center">
            <p className="text-base font-semibold text-slate-100">Drop your JSON file here</p>
            <p className="text-sm text-slate-400">or click to browse files</p>

            <AnimatePresence mode="wait">
              {userData ? (
                <motion.p
                  key="file-ready"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200"
                >
                  <motion.span
                    initial={{ scale: 0.7, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    ✓
                  </motion.span>
                  {fileName}
                </motion.p>
              ) : (
                <motion.p
                  key="file-empty"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-xs text-slate-400"
                >
                  Expected format: cards[] + loyalty_programs[]
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="from" className="text-sm font-medium text-slate-300">
              From
            </label>
            <select
              id="from"
              className="input-field"
              value={trip.from}
              onChange={(event) => setTrip((prev) => ({ ...prev, from: event.target.value }))}
            >
              <option value="" disabled>Select Origin</option>
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="to" className="text-sm font-medium text-slate-300">
              To
            </label>
            <select
              id="to"
              className="input-field"
              value={trip.to}
              onChange={(event) => setTrip((prev) => ({ ...prev, to: event.target.value }))}
            >
              <option value="" disabled>Select Destination</option>
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <AnimatePresence>
          {fileError && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            >
              {fileError}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          whileHover={{ y: -1, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="group relative mt-6 inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition"
        >
          <span className="relative z-10">Optimize Trip</span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/35 to-white/0 transition duration-700 group-hover:translate-x-full" />
        </motion.button>
      </form>
    </motion.section>
  );
}

export default UploadCard;
