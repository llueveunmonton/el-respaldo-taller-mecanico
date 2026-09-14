"use client";

import { useState } from "react";
import EngineExplorer from "../components/EngineExplorer";
import { siteData, type ServiceIcon } from "../lib/site-data";

function Logo({ compact = false }: { compact?: boolean }) {
  return <a href="#inicio" className={`brand ${compact ? "brand-compact" : ""}`} aria-label="El Respaldo, volver al inicio"><span className="brand-mark"><span>ER</span></span><span className="brand-copy"><strong>EL RESPALDO</strong><small>{siteData.descriptor}</small></span></a>;
}

function Arrow() { return <span className="arrow" aria-hidden="true">↗</span>; }

function ServiceIcon({ icon }: { icon: ServiceIcon }) {
  if (icon === "axle") return <svg viewBox="0 0 52 32" aria-hidden="true"><path d="M5 16h42M9 12v8M43 12v8M14 9v14M38 9v14" /><circle cx="10" cy="16" r="5" /><circle cx="42" cy="16" r="5" /></svg>;
  if (icon === "crosshair") return <svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="11" /><path d="M21 2v10M21 30v10M2 21h10M30 21h10" /></svg>;
  if (icon === "wheel") return <svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="16" /><circle cx="21" cy="21" r="5" /><path d="m21 5 0 11m11-3-9 6m4 12-6-10m-15-2 11-3M10 10l7 9" /></svg>;
  return <svg viewBox="0 0 42 42" aria-hidden="true"><path d="m25 6 5 5-7 7 6 6-5 5-6-6-7 7-5-5 7-7-6-6 5-5 6 6z" /></svg>;
}

export default function Home() {
  const whatsapp = siteData.contact.whatsappUrl;
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return <main>
    <header className={`site-header ${menuOpen ? "menu-open" : ""}`} id="inicio">
      <Logo />
      <nav aria-label="Navegación principal"><a href="#servicios" onClick={closeMenu}>Servicios</a><a href="#metodo" onClick={closeMenu}>El método</a><a href="#taller" onClick={closeMenu}>El taller</a></nav>
      <a href={whatsapp} className="header-cta" target="_blank" rel="noreferrer">Pedí tu diagnóstico <Arrow /></a>
      <button className="menu-button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span /><span /><span /></button>
      {menuOpen && <div className="mobile-menu"><a href="#servicios" onClick={closeMenu}>Servicios</a><a href="#metodo" onClick={closeMenu}>El método</a><a href="#taller" onClick={closeMenu}>El taller</a><a href={whatsapp} target="_blank" rel="noreferrer" onClick={closeMenu}>Pedí tu diagnóstico <Arrow /></a></div>}
    </header>

    <section className="hero" aria-label="La historia de un auto que vuelve a responder">
      <div className="hero-noise" aria-hidden="true" />
      <div className="hero-interaction"><EngineExplorer whatsappUrl={whatsapp} /></div>
      <div className="scroll-cue"><span className="mouse"><i /></span><span>Deslizá<br />para explorar</span></div>
    </section>

    <section className="service-strip" id="servicios" aria-labelledby="services-title">
      <div className="section-intro"><span className="section-number">01 / 04</span><h2 id="services-title">Lo que hacemos,<br /><em>bien hecho.</em></h2><p>Soluciones concretas para que tu auto vuelva a responder como tiene que responder.</p></div>
      <div className="services-grid">{siteData.services.map((service) => <article className={`service-card service-${service.tone}`} key={service.name}><div className="service-top"><span>{service.index}</span><ServiceIcon icon={service.icon} /></div><div><h3>{service.name}</h3><p>{service.detail}</p></div><Arrow /></article>)}</div>
    </section>

    <section className="method-section" id="metodo" aria-labelledby="method-title">
      <div className="method-heading"><span className="section-number">02 / 04</span><h2 id="method-title">Primero<br /><em>entendemos.</em></h2><p>Antes de sacar una pieza, te contamos qué está pasando. Porque reparar bien también es explicar bien.</p></div>
      <div className="method-list">{siteData.method.map((step, index) => <article className="method-step" key={step.number}><span className="step-number">{step.number}</span><div className="step-line"><span style={{ width: `${(index + 1) * 33}%` }} /></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      <div className="method-stamp">SIN<br /><strong>VERSO</strong></div>
    </section>

    <section className="difference-section" aria-labelledby="difference-title">
      <div className="difference-mark" aria-hidden="true">{"//"}</div><div className="difference-copy"><span className="section-number">03 / 04</span><h2 id="difference-title">No cambiamos<br />piezas <em>porque sí.</em></h2><p>Diagnosticamos el origen. Te mostramos lo que vemos. Recién después, reparamos. Así cuidamos tu auto y también tu bolsillo.</p><a href={whatsapp} className="text-link" target="_blank" rel="noreferrer">Hablemos de tu auto <Arrow /></a></div><div className="difference-aside"><span>La confianza</span><strong>se construye<br />con claridad.</strong></div>
    </section>

    <section className="workshop-section" id="taller" aria-labelledby="workshop-title">
      <div className="workshop-heading"><span className="section-number">04 / 04</span><h2 id="workshop-title">Así se ve<br /><em>el respaldo.</em></h2><p>Un taller de barrio con mirada técnica, herramientas reales y lugar para hacer las cosas con calma.</p></div>
      <div className="gallery">{siteData.gallery.map((photo, index) => <figure className={`gallery-item gallery-${index + 1}`} key={photo.label} style={{ backgroundImage: `url(${photo.image})` }}><div className="photo-shade" /><figcaption><span>{photo.label}</span><strong>{photo.caption}</strong></figcaption></figure>)}</div>
    </section>

    <section className="final-cta" id="contacto"><div className="final-grid" aria-hidden="true" /><p className="eyebrow"><span />El próximo paso es simple</p><h2>Que tu auto<br /><em>responda.</em></h2><p className="final-copy">Contanos qué sentís al manejarlo.<br />Arrancamos por ahí.</p><a href={whatsapp} className="primary-cta" target="_blank" rel="noreferrer"><span className="cta-tool">✣</span>Pedí tu diagnóstico <Arrow /></a></section>

    <footer className="site-footer"><Logo compact /><div className="footer-detail"><span>Encontranos</span><strong>{siteData.contact.location}</strong></div><div className="footer-detail"><span>Estamos</span><strong>{siteData.contact.hours}</strong></div><a className="footer-social" href={siteData.contact.instagramUrl || "#contacto"} target={siteData.contact.instagramUrl ? "_blank" : undefined} rel={siteData.contact.instagramUrl ? "noreferrer" : undefined}>{siteData.contact.instagramLabel} <Arrow /></a><p className="copyright">© {new Date().getFullYear()} El Respaldo</p></footer>
  </main>;
}
