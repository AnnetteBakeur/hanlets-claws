import { ArrowRight } from 'lucide-react';

function Placeholder({ label }) {
  return (
    <div className="ab2-placeholder">
      <span>{label}</span>
    </div>
  );
}

export default function HomePage({ hero, gallery = [], designs = [], goTo }) {
  const latestDesigns = [...designs].slice(-4).reverse();

  return (
    <main className="ab2-home">

      {/* =========================
          01 — COUVERTURE
      ========================== */}
 <div className="ab-home-art-zone">
      <section className="ab-home-hero">
  <div className="ab-home-hero-inner">
    <div className="ab-home-title-wrap">
      <p className="ab-home-kicker">Press-on nails artist</p>

      <h1 className="ab-home-title">
        ANNETTE
        <br />
        BAKEUR
      </h1>

      <p className="ab-home-welcome">
  Bienvenue dans la Bakeury
</p>
    </div>

    <img
      src="/hero-cutout.png"
      alt="Annette Bakeur"
      className="ab-home-cutout"
    />
    <img
  src="/images/dessin-bakeury.jpg"
  alt=""
  className="ab-home-drawing"
/>
  </div>

</section>

      {/* =========================
          02 — LES TROIS ENTRÉES
      ========================== */}
      <section className="ab2-menu" id="ab2-menu">

  <div className="ab2-section-meta">
    <span>CHAPITRE 01</span>
    <span>LA BAKEURY</span>
  </div>

  <div className="ab2-menu-grid">

    {/* 01 — DESIGNS ORIGINAUX */}
    <button
      className="ab2-card ab2-card-original"
      onClick={() => goTo('designs-original')}
    >
      <span className="ab2-card-number">01</span>

      <div className="ab2-card-content">
        <span className="ab2-card-small">ANNETTE BAKEUR</span>
        <h2>
          DESIGNS
          <br />
          ORIGINAUX
        </h2>
      </div>
    </button>

    {/* 02 — PRIX DOUX */}
    <button
      className="ab2-card ab2-card-soft"
      onClick={() => goTo('designs-soft')}
    >
      <span className="ab2-card-number">02</span>

      <div className="ab2-card-content">
        <span className="ab2-card-small">SÉLECTION</span>
        <h2>PRIX DOUX</h2>
      </div>
    </button>

    {/* 03 — COMMANDE PERSONNALISÉE */}
    <button
      className="ab2-card ab2-card-custom"
      onClick={() => goTo('custom')}
    >
      <span className="ab2-card-number">03</span>

      <div className="ab2-card-content">
        <span className="ab2-card-small">ANNETTE BAKEUR</span>
        <h2>
          COMMANDE
          <br />
          PERSONNALISÉE
        </h2>
      </div>
    </button>

  </div>
</section>

</div>

      {/* =========================
          03 — NOUVEAUTÉS
      ========================== */}
      <section className="ab2-new">

        <div className="ab2-new-head">
          <div>
            <span className="ab2-section-label">CHAPITRE 02</span>
            <h2>NOUVEAUTÉS</h2>
          </div>

          <button onClick={() => goTo('designs')}>
            VOIR LES DESIGNS
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="ab2-new-layout">

          {latestDesigns.length > 0 ? (
            latestDesigns.map((design, index) => (
              <button
                key={design.id}
                className={`ab2-design ab2-design-${index + 1}`}
                onClick={() => goTo('order', design)}
              >
                <span className="ab2-design-fig">
                  FIG. {String(index + 2).padStart(2, '0')}
                </span>

                <div className="ab2-design-image">
                  {design.image ? (
                    <img src={design.image} alt={design.name} />
                  ) : (
                    <Placeholder label={design.name || 'DESIGN'} />
                  )}
                </div>

                <div className="ab2-design-info">
                  <span>{design.name}</span>
                  <span>{design.price} €</span>
                </div>
              </button>
            ))
          ) : (
            [0, 1, 2].map((index) => (
              <div
                key={index}
                className={`ab2-design ab2-design-${index + 1}`}
              >
                <span className="ab2-design-fig">
                  FIG. {String(index + 2).padStart(2, '0')}
                </span>

                <div className="ab2-design-image">
                  <Placeholder label="DESIGN" />
                </div>
              </div>
            ))
          )}

        </div>
      </section>

      {/* =========================
          04 — ARCHIVES
      ========================== */}
      <section className="ab2-archives">

        <div className="ab2-archives-head">
          <span className="ab2-section-label">CHAPITRE 03</span>

          <h2>
            LES
            <br />
            ARCHIVES
          </h2>

          <div className="ab2-archive-note">
  <span>ANNETTE BAKEUR</span>
</div>
        </div>

        {gallery.length > 0 ? (
          <div className="ab2-archive-grid">
            {gallery.map((image, index) => (
              <figure
                key={`${image}-${index}`}
                className={`ab2-archive-item ab2-archive-${
                  (index % 7) + 1
                }`}
              >
                <img
                  src={image}
                  alt={`Création Annette Bakeur ${index + 1}`}
                />

                <figcaption>
                  FIG. {String(index + 1).padStart(2, '0')}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="ab2-empty">
            <Placeholder label="LES ARCHIVES" />
          </div>
        )}

        <footer className="ab2-archive-footer">
          <span>ANNETTE BAKEUR</span>
          <span>LA BAKEURY</span>
          <span>03</span>
        </footer>

      </section>

    </main>
  );
}