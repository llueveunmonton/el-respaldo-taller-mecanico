export const siteData = {
  name: "El Respaldo",
  descriptor: "Mecánica automotriz",
  eyebrow: "Taller de confianza en tu barrio",
  headline: "Mecánica que responde.",
  subheadline: "Diagnóstico preciso. Reparación confiable.",
  contact: {
    // Completar con el número real cuando el negocio lo confirme.
    whatsappNumber: "",
    whatsappUrl: "https://wa.me/?text=Hola%20El%20Respaldo%2C%20quiero%20pedir%20un%20diagn%C3%B3stico.",
    instagramUrl: "",
    instagramLabel: "Instagram",
    location: "Ubicación a confirmar",
    hours: "Horarios a confirmar",
  },
  services: [
    {
      index: "01",
      name: "Tren delantero",
      detail: "Dirección, suspensión y frenos.",
      icon: "axle",
      tone: "violet",
    },
    {
      index: "02",
      name: "Alineación",
      detail: "Geometría exacta para manejar mejor.",
      icon: "crosshair",
      tone: "dark",
    },
    {
      index: "03",
      name: "Balanceo",
      detail: "Rodar parejo también es seguridad.",
      icon: "wheel",
      tone: "violet",
    },
    {
      index: "04",
      name: "Mecánica general",
      detail: "El problema, de raíz y sin vueltas.",
      icon: "wrench",
      tone: "yellow",
    },
  ],
  method: [
    { number: "01", title: "Revisamos", text: "Escuchamos el auto y miramos cada señal." },
    { number: "02", title: "Diagnosticamos", text: "Te explicamos qué pasa antes de cambiar nada." },
    { number: "03", title: "Reparamos", text: "Hacemos el trabajo justo para que vuelvas a salir." },
  ],
  gallery: [
    {
      label: "Manos a la obra",
      caption: "Cada detalle cuenta",
      image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=82",
    },
    {
      label: "Precisión",
      caption: "Medimos antes de ajustar",
      image: "https://images.unsplash.com/photo-1504222490345-c075b6008014?auto=format&fit=crop&w=1200&q=82",
    },
    {
      label: "El taller",
      caption: "Trabajo de barrio, criterio técnico",
      image: "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=1200&q=82",
    },
  ],
} as const;

export type ServiceIcon = (typeof siteData.services)[number]["icon"];
