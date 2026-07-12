// Configuración general de la tienda.
// El número de WhatsApp se toma de una variable de entorno para que sea
// fácil de cambiar sin tocar código. Formato: código de país + número, sin
// espacios ni el signo "+". Ejemplo Argentina Córdoba: 5493511234567
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '5493516696017';

export const STORE_NAME = 'Fit 12';
export const STORE_TAGLINE = 'Distribuidor de productos saludables';
export const STORE_LOCATION = 'Córdoba';
