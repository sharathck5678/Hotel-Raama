import React, { useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { fetchAttractions } from '../services/api';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../components/ScrollReveal';

export const AttractionsPage: React.FC = () => {
  const [attractions, setAttractions] = useState<any[]>([]);

  useEffect(() => {
    fetchAttractions().then((res) => {
      if (res.success) setAttractions(res.data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-16 max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
      <ScrollReveal direction="up" duration={0.8}>
        <div className="text-center max-w-3xl mx-auto border-b border-[#cbc0ad] pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-2">
            Hassan Sightseeing & Heritage
          </span>
          <h1 className="editorial-section-title text-[#333333]">Nearby Heritage Attractions</h1>
          <p className="font-sans text-xs sm:text-sm text-[#666666] mt-3 max-w-xl mx-auto leading-relaxed">
            Hotel Raama is located on B.M. Road, offering seamless highway connectivity to Belur, Halebidu, Shravanabelagola, and Sakleshpur.
          </p>
        </div>
      </ScrollReveal>

      <ScrollRevealGroup staggerDelay={0.12} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {attractions.map((spot) => (
          <ScrollRevealItem key={spot._id}>
            <div
              className="bg-[#f7f7f2] rounded-sm overflow-hidden border border-[#cbc0ad] hover:border-[#cbc0ad] transition-all duration-300 flex flex-col justify-between shadow-sm h-full"
            >
              <div>
                <div className="relative h-60 overflow-hidden">
                  <img src={spot.image} alt={spot.name} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-[#47614d] px-3 py-1 text-[10px] font-sans font-bold text-[#d9b57d] flex items-center gap-1 uppercase tracking-wider">
                    <MapPin size={11} /> {spot.distance}
                  </div>
                </div>
                <div className="p-7 space-y-3">
                  <span className="text-[9px] font-sans text-[#666666] font-bold uppercase tracking-widest">{spot.category}</span>
                  <h3 className="text-2xl font-serif text-[#333333]">{spot.name}</h3>
                  <p className="text-xs font-sans text-[#666666] leading-relaxed">{spot.description}</p>
                </div>
              </div>

              <div className="p-7 pt-0 border-t border-[#cbc0ad] mt-4">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.name + ' Hassan')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#47614d] text-[#f7f7f2] hover:bg-[#374c3c] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Navigation size={13} className="text-[#d9b57d]" /> Open in Google Maps
                </a>
              </div>
            </div>
          </ScrollRevealItem>
        ))}
      </ScrollRevealGroup>
    </div>
  );
};
