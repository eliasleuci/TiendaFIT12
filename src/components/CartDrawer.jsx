import { useEffect, useRef, useState, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { WHATSAPP_NUMBER, STORE_NAME } from '../lib/config';
import {
  GoogleMap,
  useJsApiLoader,
  Autocomplete,
  Marker,
} from '@react-google-maps/api';

const LIBRARIES = ['places'];
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Default center: Córdoba, Argentina
const DEFAULT_CENTER = { lat: -31.4135, lng: -64.1811 };

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const mapContainerStyle = {
  width: '100%',
  height: '200px',
  borderRadius: '8px',
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#f5f0e8' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#4a4a3a' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7a7a6a' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b8d4e8' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8dfc0' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

export default function CartDrawer() {
  const { items, updateQty, removeItem, total, isOpen, setIsOpen, clearCart } = useCart();

  const [step, setStep] = useState('CART'); // 'CART' | 'CHECKOUT'
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    crossStreets: '',
    comments: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [markerPos, setMarkerPos] = useState(null);
  const [mapZoom, setMapZoom] = useState(12);

  const autocompleteRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // Reset to CART step when drawer closes or cart empties
  useEffect(() => {
    if (!isOpen || items.length === 0) {
      setStep('CART');
      setFormErrors({});
    }
  }, [isOpen, items.length]);

  const onAutocompleteLoad = useCallback((autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMapCenter({ lat, lng });
        setMarkerPos({ lat, lng });
        setMapZoom(17);
        setFormData((prev) => ({
          ...prev,
          address: place.formatted_address || place.name || '',
        }));
        setFormErrors((prev) => ({ ...prev, address: false }));
      }
    }
  }, []);

  function buildMessage() {
    const lines = [];
    lines.push(`Hola ${STORE_NAME}! Quiero hacer este pedido:`);
    lines.push('');
    lines.push(`👤 Cliente: ${formData.name.trim()}`);
    lines.push(`📍 Domicilio: ${formData.address.trim()}`);
    if (formData.crossStreets.trim()) lines.push(`🗺️ Entre calles: ${formData.crossStreets.trim()}`);
    if (formData.comments.trim()) lines.push(`💬 Comentario: ${formData.comments.trim()}`);
    lines.push('');
    lines.push(`🛒 Mi pedido:`);
    items.forEach((i) => {
      lines.push(
        `• ${i.qty}${i.isWeighable ? ' kg' : ''} x ${i.name}${i.code ? ` (#${i.code})` : ''} — ${currency.format(i.price * i.qty)}`
      );
    });
    lines.push('');
    lines.push(`Total: ${currency.format(total)}`);
    return lines.join('\n');
  }

  function handleCheckout() {
    const errors = {};
    if (!formData.name.trim()) errors.name = true;
    if (!formData.address.trim()) errors.address = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const text = encodeURIComponent(buildMessage());
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-ink/50 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 w-full max-w-md h-full bg-paper flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/10 bg-moss-700 text-paper">
          <h2 className="font-display text-xl font-semibold">Tu pedido</h2>
          <button onClick={() => setIsOpen(false)} className="text-paper/80 hover:text-paper text-sm">
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 && (
            <p className="text-ink/50 text-sm mt-8 text-center">Todavía no agregaste productos.</p>
          )}

          {items.length > 0 && step === 'CART' && (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 border-b border-ink/10 pb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{item.name}</p>
                    <p className="font-mono text-xs text-ink/50 mt-0.5">{currency.format(item.price)} c/u</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-ink/20 text-ink hover:border-moss-600"
                      >
                        −
                      </button>
                      {item.isWeighable ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) updateQty(item.id, val);
                            }}
                            className="font-mono text-sm w-12 text-center bg-transparent border-b border-ink/20 focus:outline-none focus:border-moss-600 appearance-none"
                          />
                          <span className="text-[10px] text-ink/50 ml-1">kg</span>
                        </div>
                      ) : (
                        <span className="font-mono text-sm w-6 text-center">{item.qty}</span>
                      )}
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-ink/20 text-ink hover:border-moss-600"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-2 text-xs text-paprika-500 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-ink shrink-0">
                    {currency.format(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && step === 'CHECKOUT' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <span className="text-xl">👤</span>
                <h3 className="font-semibold text-lg mt-1">Completá tus datos</h3>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium mb-1">Nombre*:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormErrors({ ...formErrors, name: false });
                  }}
                  className={`w-full rounded border px-3 py-2 bg-white focus:outline-none ${
                    formErrors.name ? 'border-red-500' : 'border-ink/20 focus:border-moss-500'
                  }`}
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">El nombre es requerido</p>}
              </div>

              {/* Domicilio con Autocomplete */}
              <div>
                <label className="block text-sm font-medium mb-1">Domicilio*:</label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{ componentRestrictions: { country: 'ar' } }}
                  >
                    <input
                      type="text"
                      placeholder="Ej: Av. Colón 1234, Córdoba"
                      defaultValue={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value });
                        setFormErrors({ ...formErrors, address: false });
                        if (!e.target.value) {
                          setMarkerPos(null);
                          setMapZoom(12);
                          setMapCenter(DEFAULT_CENTER);
                        }
                      }}
                      className={`w-full rounded border px-3 py-2 bg-white focus:outline-none ${
                        formErrors.address ? 'border-red-500' : 'border-ink/20 focus:border-moss-500'
                      }`}
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      setFormErrors({ ...formErrors, address: false });
                    }}
                    className={`w-full rounded border px-3 py-2 bg-white focus:outline-none ${
                      formErrors.address ? 'border-red-500' : 'border-ink/20 focus:border-moss-500'
                    }`}
                  />
                )}
                {formErrors.address && <p className="text-red-500 text-xs mt-1">El domicilio es requerido</p>}

                {/* Google Map */}
                <div className="mt-3 overflow-hidden rounded-lg border border-ink/15 shadow-sm">
                  {loadError ? (
                    <div className="h-[200px] flex items-center justify-center bg-ink/5 text-ink/40 text-sm">
                      No se pudo cargar el mapa
                    </div>
                  ) : !isLoaded ? (
                    <div className="h-[200px] flex items-center justify-center bg-ink/5">
                      <div className="flex flex-col items-center gap-2 text-ink/40">
                        <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        <span className="text-xs">Cargando mapa...</span>
                      </div>
                    </div>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={mapZoom}
                      options={mapOptions}
                    >
                      {markerPos && (
                        <Marker
                          position={markerPos}
                          animation={window.google?.maps?.Animation?.DROP}
                        />
                      )}
                    </GoogleMap>
                  )}
                  {!markerPos && isLoaded && !loadError && (
                    <p className="text-center text-[11px] text-ink/40 py-1.5 bg-ink/[0.02] border-t border-ink/10">
                      📍 Escribí tu dirección para ver tu ubicación en el mapa
                    </p>
                  )}
                  {markerPos && isLoaded && (
                    <p className="text-center text-[11px] text-moss-700 py-1.5 bg-moss-700/5 border-t border-moss-700/20 font-medium">
                      ✅ Ubicación confirmada
                    </p>
                  )}
                </div>
              </div>

              {/* Entre calles */}
              <div>
                <label className="block text-sm font-medium mb-1">Entre calles:</label>
                <input
                  type="text"
                  value={formData.crossStreets}
                  onChange={(e) => setFormData({ ...formData, crossStreets: e.target.value })}
                  className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:outline-none focus:border-moss-500"
                />
              </div>

              {/* Comentario */}
              <div>
                <label className="block text-sm font-medium mb-1">Comentario:</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Ingresá si deseas un comentario"
                  rows="3"
                  className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:outline-none focus:border-moss-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-ink/10 px-5 py-4 bg-white/40 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
            {step === 'CART' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between font-display text-lg font-semibold">
                  <span>Total</span>
                  <span className="font-mono text-paprika-500">{currency.format(total)}</span>
                </div>
                <button
                  onClick={() => setStep('CHECKOUT')}
                  className="w-full rounded bg-turmeric-400 text-moss-900 font-semibold py-3 hover:bg-turmeric-500 transition-colors"
                >
                  Continuar compra
                </button>
                <button onClick={clearCart} className="w-full text-xs text-ink/50 hover:text-paprika-500">
                  Vaciar carrito
                </button>
              </div>
            )}

            {step === 'CHECKOUT' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between font-display font-semibold bg-white p-3 rounded border border-ink/10 shadow-sm">
                  <span className="flex items-center gap-2 text-ink">🛒 Total pedido</span>
                  <span className="font-mono text-paprika-500 text-lg">{currency.format(total)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full rounded font-bold py-3 text-ink transition-colors"
                  style={{ backgroundColor: '#77e8d2' }}
                >
                  Enviar ya por WhatsApp! 🚀
                </button>
                <button
                  onClick={() => setStep('CART')}
                  className="w-full rounded bg-turmeric-400 text-moss-900 font-bold py-3 hover:bg-turmeric-500 transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Volver al pedido
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
