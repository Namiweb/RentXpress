import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../../services/api.js";

const SLIDE_INTERVAL = 6000;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

function AnnouncementsCarousel() {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/announcements/published");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load announcements");
      }
      const normalized = Array.isArray(data) ? data : [data];
      setAnnouncements(normalized);
      setActiveIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return undefined;
    const handle = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % announcements.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(handle);
  }, [announcements.length]);

  const slides = useMemo(() => {
    return announcements.map((item, index) => ({
      id: item._id || index,
      title: item.title || item.heading || "Announcement",
      body: item.body || item.description || item.content || "",
      createdAt: formatDate(item.createdAt || item.date),
      author: item.author || item.createdBy || "",
    }));
  }, [announcements]);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-8">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-300">{error}</p>
          </div>
          <button 
            type="button" 
            className="bg-[#FF5A00] text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-200 inline-flex items-center space-x-2"
            onClick={fetchAnnouncements}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Retry</span>
          </button>
        </div>
      </section>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 relative">
      {/* Background Decoration */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#FF5A00] rounded-full blur-2xl opacity-10"></div>
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-[#FF5A00] rounded-full blur-2xl opacity-5"></div>
      
      <div className="relative overflow-hidden rounded-2xl bg-neutral-800 border border-neutral-800 shadow-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide) => (
            <article 
              key={slide.id} 
              className="flex-shrink-0 w-full p-8 min-h-[200px] flex flex-col justify-center"
            >
              <header className="mb-4">
                <h3 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {slide.title}
                </h3>
                <div className="flex items-center space-x-3 text-gray-400 text-sm">
                  {slide.createdAt && (
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{slide.createdAt}</span>
                    </span>
                  )}
                  {slide.author && (
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{slide.author}</span>
                    </span>
                  )}
                </div>
              </header>
              <p className="text-gray-300 text-lg leading-relaxed">
                {slide.body}
              </p>
            </article>
          ))}
        </div>

        {/* Navigation Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === activeIndex 
                    ? 'bg-[#FF5A00] scale-125' 
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to announcement ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm border border-gray-600 hover:border-gray-500"
              onClick={() => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)}
              aria-label="Previous announcement"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm border border-gray-600 hover:border-gray-500"
              onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
              aria-label="Next announcement"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Progress Bar */}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
          <div 
            className="h-full bg-[#FFFFFF] transition-all duration-1000 ease-linear"
            style={{ 
              width: `${(activeIndex + 1) / slides.length * 100}%` 
            }}
          />
        </div>
      )}
    </section>
  );
}

export default AnnouncementsCarousel;