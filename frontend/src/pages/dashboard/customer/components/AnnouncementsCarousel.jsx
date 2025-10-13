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
      <section className="announcement-slider">
        <div className="announcement-slide announcement-slide--placeholder">
          <div className="announcement-skeleton" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="announcement-slider">
        <div className="announcement-slide announcement-slide--error">
          <p className="error-text">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={fetchAnnouncements}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="announcement-slider">
      <div
        className="announcement-track"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <article key={slide.id} className="announcement-slide">
            <header>
              <h3>{slide.title}</h3>
              <div className="announcement-meta">
                {slide.createdAt && <span>{slide.createdAt}</span>}
                {slide.author && <span>· {slide.author}</span>}
              </div>
            </header>
            <p>{slide.body}</p>
          </article>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="announcement-dots">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={index === activeIndex ? "dot is-active" : "dot"}
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to announcement ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default AnnouncementsCarousel;
