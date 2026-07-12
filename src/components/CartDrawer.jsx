import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { WHATSAPP_NUMBER, STORE_NAME } from '../lib/config';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

export default function CartDrawer() {
  const { items, updateQty, removeItem, total, isOpen, setIsOpen, clearCart } = useCart();
  
  const [step, setStep] = useState('CART'); // 'CART' | 'CHECKOUT'
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    crossStreets: '',
    comments: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Reset to CART step when drawer closes or cart empties
  useEffect(() => {
    if (!isOpen || items.length === 0) {
      setStep('CART');
      setFormErrors({});
    }
  }, [isOpen, items.length]);

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
      lines.push(`• ${i.qty}${i.isWeighable ? ' kg' : ''} x ${i.name}${i.code ? ` (#${i.code})` : ''} — ${currency.format(i.price * i.qty)}`);
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
      {/* Backdrop - Oculto en pantallas grandes para permitir seguir comprando */}
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
                        onClick={() => updateQty(item.id, item.qty - (item.isWeighable ? 0.5 : 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-full border border-ink/20 text-ink hover:border-moss-600"
                      >
                        −
                      </button>
                      {item.isWeighable ? (
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
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
                        onClick={() => updateQty(item.id, item.qty + (item.isWeighable ? 0.5 : 1))}
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
              
              <div>
                <label className="block text-sm font-medium mb-1">Nombre*:</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => { setFormData({...formData, name: e.target.value}); setFormErrors({...formErrors, name: false}); }}
                  className={`w-full rounded border px-3 py-2 bg-white focus:outline-none ${formErrors.name ? 'border-red-500' : 'border-ink/20 focus:border-moss-500'}`}
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">El nombre es requerido</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Domicilio*:</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => { setFormData({...formData, address: e.target.value}); setFormErrors({...formErrors, address: false}); }}
                  className={`w-full rounded border px-3 py-2 bg-white focus:outline-none ${formErrors.address ? 'border-red-500' : 'border-ink/20 focus:border-moss-500'}`}
                />
                {formErrors.address && <p className="text-red-500 text-xs mt-1">El domicilio es requerido</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Entre calles:</label>
                <input 
                  type="text" 
                  value={formData.crossStreets}
                  onChange={e => setFormData({...formData, crossStreets: e.target.value})}
                  className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:outline-none focus:border-moss-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Comentario:</label>
                <textarea 
                  value={formData.comments}
                  onChange={e => setFormData({...formData, comments: e.target.value})}
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
                  Enviar ya por WhatsApp!
                </button>
                <button 
                  onClick={() => setStep('CART')} 
                  className="w-full rounded bg-turmeric-400 text-moss-900 font-bold py-3 hover:bg-turmeric-500 transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
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
