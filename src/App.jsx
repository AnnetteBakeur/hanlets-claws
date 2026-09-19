import { useEffect, useRef, useState } from 'react';
import { Sparkles, Upload, X, Plus, Lock, Camera, Trash2, ArrowLeft, Check, ImagePlus, Send, Package, LogOut, Edit3, Menu, ChevronRight, Search, Download, Home, Settings, Eye, EyeOff } from 'lucide-react';
import * as db from './db';
import HomePage from './pages/HomePage';
import './App.css';
// ===== CONFIG (à personnaliser) =====
const BRAND = "Annettebakeur";
const INSTAGRAM = '@Annettebakeur';
// ===== PASSWORD RESET STATE (à rajouter dans le composant App) =====
// (tu verras c'est utilisé dans le return)

const SHAPES = [
  { id: 1, label: 'Modèle 1', image: '/shapes/shape 1.jpeg' },
  { id: 2, label: 'Modèle 2', image: '/shapes/shape 2.jpeg' },
  { id: 3, label: 'Modèle 3', image: '/shapes/shape 3.jpeg' },
  { id: 4, label: 'Modèle 4', image: '/shapes/shape 4.jpeg' },
  { id: 5, label: 'Modèle 5', image: '/shapes/shape 5.jpeg' },
  { id: 6, label: 'Modèle 6', image: '/shapes/shape 6.jpeg' },
  { id: 7, label: 'Modèle 7', image: '/shapes/shape 7.jpeg' },
  { id: 8, label: 'Modèle 8', image: '/shapes/shape 8.jpeg' },
  { id: 9, label: 'Modèle 9', image: '/shapes/shape 9.jpeg' },
  { id: 10, label: 'Modèle 10', image: '/shapes/shape 10.jpeg' },
  {id: 11,label: 'Ongle court, forme naturelle', image: null },
];

const MEASUREMENT_PHOTOS = [
  { id: 'leftThumb', name: 'Pouce main gauche' },
  { id: 'leftHand', name: 'Main gauche entière' },
  { id: 'rightThumb', name: 'Pouce main droite' },
  { id: 'rightHand', name: 'Main droite entière' }
];

const DEFAULT_DESIGNS = [
  { id: 'd1', name: 'Black Widow', price: 55, image: null, desc: 'Noir intense, finition mate' },
  { id: 'd2', name: 'Bloodmoon', price: 60, image: null, desc: 'Bordeaux profond, chrome doré' },
  { id: 'd3', name: 'Obsidian', price: 65, image: null, desc: 'Noir glossy & strass argentés' },
  { id: 'd4', name: 'Ghost Lace', price: 50, image: null, desc: 'Dentelle gothique sur base nude' }
];


// ===== HELPERS =====
async function compressImage(file, maxSize = 900, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function exportOrdersCSV(orders) {
  const headers = ['ID', 'Date', 'Type', 'Design', 'Prix', 'Contact', 'Forme', 'Statut'];
  const rows = orders.map(o => [
    o.id,
    new Date(o.createdAt).toLocaleString('fr-FR'),
    o.type === 'design' ? 'Design existant' : 'Sur mesure',
    o.type === 'design' ? o.designName : 'Personnalisé',
    o.type === 'design' ? `${o.designPrice}€` : '-',
    o.contact,
    o.shape ? SHAPES.find(s => s.id === o.shape)?.label : '-',
    o.status === 'done' ? 'Traitée' : o.status === 'processing' ? 'En cours' : 'Nouvelle'
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commandes_hanletsclaws_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== ICONS =====

function Placeholder({ label, className = '' }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black ${className}`}>
      <div className="text-center px-4">
        <Sparkles className="w-7 h-7 mx-auto text-neutral-600 mb-2" />
        <p className="text-neutral-500 text-[10px] tracking-[0.25em] uppercase">{label}</p>
      </div>
    </div>
  );
}

// ===== APP =====
export default function App() {
  const [page, setPage] = useState('home');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [designs, setDesigns] = useState(DEFAULT_DESIGNS);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const recoveryCode = urlParams.get('code');
  const hasRecoveryUrl =
    window.location.hash.includes('type=recovery') ||
    Boolean(recoveryCode);
  const isPasswordReset = passwordRecovery || hasRecoveryUrl;

  async function loadAll() {
  const [g, d] = await Promise.all([
    db.getSetting('gallery'),
    db.getSetting('designs')
  ]);

  return { g, d };
}

  useEffect(() => {
  loadAll()
    .then(({ g, d }) => {
      if (g) setGallery(g);
      if (d && d.length > 0) setDesigns(d);
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      setLoading(false);
    });

  db.getCurrentUser().then(setUser);

    const unsub = db.onAuthChange((event, currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
  setOrders([]);
}

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setPasswordResetMessage('Lien validé. Choisissez maintenant votre nouveau mot de passe.');
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    async function handleRecoveryCode() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) return;

      setPasswordResetLoading(true);
      setPasswordResetMessage('Préparation de la session de réinitialisation...');

      const error = await db.exchangeCodeForSession(code);

      setPasswordResetLoading(false);

      if (error) {
        setPasswordResetMessage('Erreur : impossible de valider le lien de réinitialisation. Demandez un nouveau lien.');
        return;
      }

      setPasswordResetMessage('Lien validé. Vous pouvez choisir un nouveau mot de passe.');
    }

    handleRecoveryCode();
  }, []);

  useEffect(() => {
  if (!user) return;

  db.listOrders().then(setOrders);
}, [user]);

useEffect(() => {
  // On enregistre l'écran initial dans l'historique
  window.history.replaceState(
    { page: 'home', design: null },
    '',
    window.location.href
  );

  const handlePopState = (event) => {
    const state = event.state;

    setPage(state?.page || 'home');
    setSelectedDesign(state?.design || null);
    setMenuOpen(false);
    setConfirmation(null);

    window.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, []);

  async function handlePasswordUpdate() {
    setPasswordResetMessage('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordResetMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordResetMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setPasswordResetLoading(true);
    const error = await db.updatePassword(newPassword);
    setPasswordResetLoading(false);

    if (error) {
      setPasswordResetMessage('Erreur : ' + error.message);
      return;
    }

    setPasswordResetMessage('✅ Mot de passe mis à jour. Vous allez devoir vous reconnecter avec ce nouveau mot de passe.');

    setTimeout(async () => {
      await db.signOut();
      setUser(null);
      setPasswordRecovery(false);
      setNewPassword('');
      setConfirmNewPassword('');
      window.history.replaceState({}, document.title, window.location.origin);
      setPage('admin');
    }, 1800);
  }

  if (isPasswordReset) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-5">
        <div className="w-full max-w-md bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <Lock className="w-8 h-8 text-neutral-300 mb-4" />
          <h1 className="font-serif text-2xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>
            Nouveau mot de passe
          </h1>
          <p className="text-neutral-500 text-sm mb-6">
            Choisissez un nouveau mot de passe pour votre espace admin.
          </p>

          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100"
          />

          <input
            type="password"
            value={confirmNewPassword}
            onChange={e => setConfirmNewPassword(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100"
          />

          {passwordResetMessage && (
            <p className="text-sm text-neutral-300 mb-3">{passwordResetMessage}</p>
          )}

          <button
            onClick={handlePasswordUpdate}
            disabled={passwordResetLoading}
            className="w-full px-6 py-3 bg-neutral-50 text-neutral-950 rounded-full hover:bg-white text-sm font-medium disabled:opacity-50"
          >
            {passwordResetLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </button>
        </div>
      </div>
    );
  }


  async function saveOrder(order) {
    const o = { ...order, id: uid(), createdAt: Date.now(), status: 'new' };

    const result = await db.createOrder(o);

    if (!result?.ok) {
      console.error('Order creation failed:', result?.error);
      alert("Erreur d'envoi. Veuillez réessayer.");
      return false;
    }

    try {
      const response = await fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: o.id })
      });

      if (!response.ok) {
        console.warn('Order email notification failed:', await response.text());
      }
    } catch (emailError) {
      console.warn('Order email notification failed:', emailError);
    }

    setConfirmation(o);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }


  function goTo(p, d = null) {
  setSelectedDesign(d);
  setPage(p);
  setMenuOpen(false);
  setConfirmation(null);

  window.history.pushState(
    { page: p, design: d },
    '',
    window.location.href
  );

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

  return (
    <div
  className={`site-shell min-h-screen text-neutral-100 ${
  page !== 'admin' ? 'site-shell-public' : ''
} ${page === 'order' ? 'site-shell-order' : ''}`}
  style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
>
      <Header page={page} goTo={goTo} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {confirmation ? (
        <ConfirmationScreen order={confirmation} goTo={goTo} />
      ) : loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-neutral-800 border-t-neutral-100 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {page === 'home' && <HomePage
  gallery={gallery}
  designs={designs}
  goTo={goTo}
/>}
          {(page === 'designs' || page === 'designs-original' || page === 'designs-soft') && (
  <DesignsPage
    designs={designs}
    goTo={goTo}
    category={
      page === 'designs-original'
        ? 'original'
        : page === 'designs-soft'
        ? 'soft'
        : 'all'
    }
  />
)}
          {page === 'order' && <OrderForm design={selectedDesign} saveOrder={saveOrder} goTo={goTo} />}
          {page === 'custom' && <CustomOrderForm saveOrder={saveOrder} goTo={goTo} />}
          {page === 'admin' && <AdminPage user={user} setUser={setUser} orders={orders} setOrders={setOrders} gallery={gallery} setGallery={setGallery} designs={designs} setDesigns={setDesigns} goTo={goTo} />}
        </>
      )}
      <Footer goTo={goTo} />
    </div>
  );
}

function Header({ page, goTo, menuOpen, setMenuOpen }) {
  const links = [
    { id: 'home', label: 'LA BAKEURY' },
    { id: 'designs', label: 'DESIGNS' },
    { id: 'custom', label: 'PERSONNALISÉS' }
  ];

  const navigate = (id) => {
    goTo(id);
    setMenuOpen(false);
  };

  return (
    <header className="ab-header">
      <div className="ab-header-inner">

        <button
          onClick={() => navigate('home')}
          className="ab-header-brand"
        >
          <span>ANNETTE</span>
          <span>BAKEUR</span>
        </button>

        <nav className="ab-header-nav">
          {links.map((link, index) => (
            <button
              key={link.id}
              onClick={() => navigate(link.id)}
              className={`ab-header-link ${
                page === link.id ? 'is-active' : ''
              }`}
            >
              <span className="ab-header-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="ab-header-actions">
          <button
            onClick={() => goTo('admin')}
            className="ab-header-admin"
            title="Espace admin"
            aria-label="Espace admin"
          >
            <Lock />
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ab-header-menu-button"
            aria-label="Menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

      </div>

      {menuOpen && (
        <div className="ab-mobile-menu">
          {links.map((link, index) => (
            <button
              key={link.id}
              onClick={() => navigate(link.id)}
              className={page === link.id ? 'is-active' : ''}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{link.label}</strong>
            </button>
          ))}

          <button
            onClick={() => navigate('admin')}
            className="ab-mobile-admin"
          >
            <Lock />
            <strong>ADMIN</strong>
          </button>
        </div>
      )}
    </header>
  );
}

function BackButton({ onClick, label = "Retour à l'accueil", icon = 'home' }) {
  return (
    <button onClick={onClick} className="text-neutral-400 hover:text-neutral-100 text-sm flex items-center gap-1.5 mb-6 transition-colors group">
      {icon === 'home' ? <Home className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> : <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />}
      {label}
    </button>
  );
}

function DesignsPage({ designs, goTo, category = 'all' }) {
  const [sort, setSort] = useState('recent');

  const filteredDesigns =
    category === 'all'
      ? designs
      : designs.filter(
          d => (d.category || 'original') === category
        );
  const pageTitle = 'Designs disponibles';
  const sorted = [...filteredDesigns].sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : 0);
  return (
    <div className="ab-designs-page max-w-7xl mx-auto px-5 lg:px-10 py-10 lg:py-16">
      <BackButton onClick={() => goTo('home')} />
      <div className="ab-designs-head flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10 lg:mb-14">
        <div className="ab-designs-intro">
          <p className="ab-designs-kicker text-xs tracking-[0.3em] uppercase text-neutral-500 mb-3">Boutique</p>
          <h1
  className="ab-designs-title font-serif text-4xl lg:text-5xl text-neutral-50 mb-3"
  style={{ fontFamily: 'ui-serif, Georgia, serif' }}
>
  {pageTitle}
</h1>
        </div>
        <div className="ab-designs-sort flex items-center gap-2">
          <span className="text-xs text-neutral-500 uppercase tracking-widest">Trier</span>
          <select value={sort} onChange={e => setSort(e.target.value)} className="ab-designs-select bg-neutral-900 border border-neutral-800 text-neutral-100 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-neutral-600">
            <option value="recent">Plus récents</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </div>
      </div>
      <div className="ab-designs-category-filter">

  <button
    type="button"
    onClick={() => goTo('designs')}
    className={`ab-designs-filter-button ab-filter-all ${category === 'all' ? 'is-active' : ''}`}
  >
    <span>00</span>
    TOUS
  </button>

  <button
    type="button"
    onClick={() => goTo('designs-original')}
    className={`ab-designs-filter-button ab-filter-original ${category === 'original' ? 'is-active' : ''}`}
  >
    <span>01</span>
    DESIGNS ORIGINAUX
  </button>

  <button
    type="button"
    onClick={() => goTo('designs-soft')}
    className={`ab-designs-filter-button ab-filter-soft ${category === 'soft' ? 'is-active' : ''}`}
  >
    <span>02</span>
    PRIX DOUX
  </button>

</div>
      {filteredDesigns.length === 0 ? (
        <p className="text-neutral-500 text-center py-20">Aucun design disponible pour l'instant.</p>
      ) : (
        <div className="ab-designs-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5">
          {sorted.map(d => (
            <div
  key={d.id}
  className="ab-design-card group cursor-pointer"
  onClick={() => goTo('order', d)}
>
              <div className="aspect-[4/5] rounded-xl overflow-hidden bg-neutral-900 mb-3 lg:mb-4 border border-neutral-800 group-hover:border-neutral-600 transition-colors">
                {d.image ? <img src={d.image} alt={d.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Placeholder label={d.name} className="w-full h-full" />}
              </div>
              <h3 className="font-serif text-lg lg:text-xl text-neutral-50 mb-1" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{d.name}</h3>
              <p className="text-neutral-500 text-xs lg:text-sm mb-2 line-clamp-1">{d.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-neutral-50 font-medium">{d.price} €</span>
                <span className="text-xs text-neutral-500 group-hover:text-neutral-100 transition-colors flex items-center gap-1">Commander <ChevronRight className="w-3 h-3" /></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderForm({ design, saveOrder, goTo }) {
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [shipping, setShipping] = useState({
  name: '',
  address: '',
  address2: '',
  postalCode: '',
  city: '',
  country: 'France',
});
  const [modifications, setModifications] = useState('');
  const [shape, setShape] = useState(null);
  const [measurements, setMeasurements] = useState({});
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!design) { goTo('designs'); return null; }

  async function submit() {
    if (!isValidEmail(email)) {
  return alert('Renseignez une adresse email valide');
}
    if (!shipping.name.trim()) return alert('Renseignez votre prénom et votre nom');
    if (!shipping.address.trim()) return alert('Renseignez votre adresse');
    if (!shipping.postalCode.trim()) return alert('Renseignez votre code postal');
    if (!shipping.city.trim()) return alert('Renseignez votre ville');
    if (!shape) return alert('Choisissez une forme/longueur');
    setSubmitting(true);
    await saveOrder({
  type: 'design',
  designId: design.id,
  designName: design.name,
  designPrice: design.price,
  email: email.trim(),
instagram: instagram.trim(),
contact: email.trim(),
shipping,
modifications: modifications.trim(),
  shape,
  measurements
});
    setSubmitting(false);
  }

  return (
    <div className="ab-order-page max-w-3xl mx-auto px-5 lg:px-10 py-10 lg:py-16">
      <BackButton onClick={() => goTo('designs')} label="Retour aux designs" icon="arrow" />
      <div className="ab-order-product bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden mb-8">
        <div className="ab-order-product-inner flex flex-col sm:flex-row gap-5 p-5 lg:p-7">
          <div className="ab-order-image w-full sm:w-40 aspect-square rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0 border border-neutral-800">
            {design.image ? <img src={design.image} alt={design.name} className="w-full h-full object-cover" /> : <Placeholder label={design.name} className="w-full h-full" />}
          </div>
          <div className="ab-order-summary flex-1">
            <p className="ab-order-kicker text-xs tracking-[0.2em] uppercase text-neutral-500 mb-2">Commande</p>
            <h1
  className="ab-order-title font-serif text-2xl lg:text-3xl text-neutral-50 mb-2"
  style={{ fontFamily: 'ui-serif, Georgia, serif' }}
>
  {design.name}
</h1>
            <p className="ab-order-desc text-neutral-400 text-sm mb-2">{design.desc}</p>
            <p className="ab-order-price text-xl text-neutral-50 font-medium">{design.price} €</p>
          </div>
        </div>
      </div>
      <div className="ab-order-form space-y-5">
        <div className="ab-order-side-top">
        <Section
  title="Votre contact"
  className="ab-order-contact"
>
  <p className="text-neutral-500 text-sm mb-3">
    Votre adresse email est obligatoire pour recevoir la confirmation de commande.
  </p>

  <input
    type="email"
    value={email}
    onChange={e => setEmail(e.target.value)}
    placeholder="email@exemple.com"
    required
    className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600"
  />

  <input
    type="text"
    value={instagram}
    onChange={e => setInstagram(e.target.value)}
    placeholder="Instagram (optionnel) — @votrepseudo"
    className="w-full px-4 py-3 mt-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600"
  />

  <p className="text-neutral-500 text-xs mt-2">
    Plus pratique pour moi pour vous recontacter.
  </p>
</Section>

<Section
  title="Informations de livraison"
  className="ab-order-shipping"
>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

    <input
      type="text"
      value={shipping.name}
      onChange={(e) =>
        setShipping({ ...shipping, name: e.target.value })
      }
      placeholder="Prénom et nom"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600 md:col-span-2"
    />

    <input
      type="text"
      value={shipping.address}
      onChange={(e) =>
        setShipping({ ...shipping, address: e.target.value })
      }
      placeholder="Adresse"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600 md:col-span-2"
    />

    <input
      type="text"
      value={shipping.address2}
      onChange={(e) =>
        setShipping({ ...shipping, address2: e.target.value })
      }
      placeholder="Complément d’adresse (optionnel)"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600 md:col-span-2"
    />

    <input
      type="text"
      value={shipping.postalCode}
      onChange={(e) =>
        setShipping({ ...shipping, postalCode: e.target.value })
      }
      placeholder="Code postal"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600"
    />

    <input
      type="text"
      value={shipping.city}
      onChange={(e) =>
        setShipping({ ...shipping, city: e.target.value })
      }
      placeholder="Ville"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600"
    />

    <input
      type="text"
      value={shipping.country}
      onChange={(e) =>
        setShipping({ ...shipping, country: e.target.value })
      }
      placeholder="Pays"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600 md:col-span-2"
    />

  </div>
</Section>
</div>

<Section
  title="Modifications souhaitées"
  optional
  className="ab-order-modifications"
>
  <p className="text-neutral-500 text-sm mb-3">
    Indiquez ici les couleurs, motifs ou détails que vous souhaitez modifier.
  </p>

  <textarea
    value={modifications}
    onChange={e => setModifications(e.target.value)}
    rows={4}
    placeholder="Ex. : remplacer le orange par du rouge, retirer certains motifs..."
    className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 resize-none"
  />
</Section>

<Section
  title="Longueur & forme"
  className="ab-order-shape"
>
  <ShapeSelector value={shape} onChange={setShape} />
</Section>

<Section
  title="Vos mesures"
  optional
  className="ab-order-measurements"
>
  <p className="text-neutral-500 text-sm mb-4">
    À renseigner uniquement si vous commandez pour la première fois.
  </p>

  {!showMeasurements ? (
    <button
      onClick={() => setShowMeasurements(true)}
      className="px-5 py-2.5 border border-neutral-700 hover:border-neutral-300 text-neutral-100 text-sm rounded-full transition-colors"
    >
      Renseigner mes mesures
    </button>
  ) : (
    <MeasurementsBlock
      measurements={measurements}
      setMeasurements={setMeasurements}
    />
  )}
</Section>
        <button onClick={submit} disabled={submitting} className="ab-custom-submit w-full px-6 py-4 bg-neutral-50 text-neutral-950 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full flex items-center justify-center gap-2 text-sm tracking-wide font-medium">
          {submitting ? 'Envoi en cours...' : <>Envoyer ma commande <Send className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

function CustomOrderForm({ saveOrder, goTo }) {
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [shipping, setShipping] = useState({
  name: '',
  address: '',
  address2: '',
  postalCode: '',
  city: '',
  country: 'France',
});
  const [colors, setColors] = useState('');
  const [chrome, setChrome] = useState('');
  const [jewelry, setJewelry] = useState('');
  const [relief, setRelief] = useState('');
  const [desc, setDesc] = useState('');
  const [shape, setShape] = useState(null);
  const [inspirations, setInspirations] = useState([]);
  const [measurements, setMeasurements] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const inspRef = useRef(null);

  async function handleInspirations(e) {
    const files = Array.from(e.target.files);
    const toProcess = files.slice(0, 10 - inspirations.length);
    const compressed = await Promise.all(toProcess.map(f => compressImage(f, 800, 0.6)));
    setInspirations([...inspirations, ...compressed]);
    if (inspRef.current) inspRef.current.value = '';
  }

  async function submit() {
  if (!isValidEmail(email)) {
  return alert('Renseignez une adresse email valide');
}

  if (!shipping.name.trim()) {
    return alert('Renseignez votre prénom et votre nom');
  }

  if (!shipping.address.trim()) {
    return alert('Renseignez votre adresse');
  }

  if (!shipping.postalCode.trim()) {
    return alert('Renseignez votre code postal');
  }

  if (!shipping.city.trim()) {
    return alert('Renseignez votre ville');
  }

  if (!shape) {
    return alert('Choisissez une forme/longueur');
  }

  setSubmitting(true);

  await saveOrder({
    type: 'custom',
email: email.trim(),
instagram: instagram.trim(),
contact: email.trim(),
shipping,
    colors,
    chrome,
    jewelry,
    relief,
    desc,
    shape,
    inspirations,
    measurements
  });

  setSubmitting(false);
}

  return (
    <div className="ab-designs-page ab-custom-page-v2 max-w-7xl mx-auto px-5 lg:px-10 py-10 lg:py-16">
      <BackButton onClick={() => goTo('home')} />
      <div className="ab-designs-head flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10 lg:mb-14">
  <div className="ab-designs-intro">

    <p className="ab-designs-kicker text-xs tracking-[0.3em] uppercase text-neutral-500 mb-3">
      PERSONNALISÉ
    </p>

    <h1
      className="ab-designs-title ab-custom-title-red font-serif text-4xl lg:text-5xl mb-3"
      style={{ fontFamily: 'ui-serif, Georgia, serif' }}
    >
      COMMANDE PERSONNALISÉE
    </h1>

  </div>
</div>
      <div className="ab-custom-form space-y-5">
        <div className="ab-custom-panel ab-custom-panel-contact">
        <Section num="0" title="Votre contact" className="ab-custom-contact">
  <p className="text-neutral-500 text-sm mb-3">
    Votre adresse email est obligatoire pour recevoir la confirmation de commande.
  </p>

  <input
    type="email"
    value={email}
    onChange={e => setEmail(e.target.value)}
    placeholder="email@exemple.com"
    required
    className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600"
  />

  <input
    type="text"
    value={instagram}
    onChange={e => setInstagram(e.target.value)}
    placeholder="Instagram (optionnel) — @votrepseudo"
    className="w-full px-4 py-3 mt-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600"
  />

  <p className="text-neutral-500 text-xs mt-2">
    Plus pratique pour moi pour vous recontacter.
  </p>
</Section>
        <Section
  title="Informations de livraison"
  className="ab-custom-shipping"
>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    <input
      type="text"
      value={shipping.name}
      onChange={(e) =>
        setShipping({ ...shipping, name: e.target.value })
      }
      placeholder="Prénom et nom"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 md:col-span-2"
    />

    <input
      type="text"
      value={shipping.address}
      onChange={(e) =>
        setShipping({ ...shipping, address: e.target.value })
      }
      placeholder="Adresse"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 md:col-span-2"
    />

    <input
      type="text"
      value={shipping.address2}
      onChange={(e) =>
        setShipping({ ...shipping, address2: e.target.value })
      }
      placeholder="Complément d’adresse (optionnel)"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 md:col-span-2"
    />

    <input
      type="text"
      value={shipping.postalCode}
      onChange={(e) =>
        setShipping({ ...shipping, postalCode: e.target.value })
      }
      placeholder="Code postal"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600"
    />

    <input
      type="text"
      value={shipping.city}
      onChange={(e) =>
        setShipping({ ...shipping, city: e.target.value })
      }
      placeholder="Ville"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600"
    />

    <input
      type="text"
      value={shipping.country}
      onChange={(e) =>
        setShipping({ ...shipping, country: e.target.value })
      }
      placeholder="Pays"
      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 md:col-span-2"
    />

  </div>
</Section>
</div>

<div className="ab-custom-options">
        <Section num="1" title="Couleurs" className="ab-custom-colors">
          <textarea value={colors} onChange={e => setColors(e.target.value)} rows={2} placeholder="Décrivez les couleurs souhaitées..." className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 resize-none" />
        </Section>
        <Section num="2" title="Chrome" className="ab-custom-chrome"><ChoiceRow options={['Doré', 'Argenté', 'Les deux', 'Aucun']} value={chrome} onChange={setChrome} /></Section>
        <Section num="3" title="Bijoux (strass, perles)" className="ab-custom-jewelry"><ChoiceRow options={['Oui', 'Non']} value={jewelry} onChange={setJewelry} /></Section>
        <Section num="4" title="Relief" className="ab-custom-relief"><ChoiceRow options={['Oui', 'Non']} value={relief} onChange={setRelief} /></Section>
        </div>
        <div className="ab-custom-panel-details">
        <Section num="5" title="Descriptif personnel" className="ab-custom-description">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Décrivez-moi le niveau de détails que vous souhaitez pour vos ongles + requêtes complémentaires" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 resize-none mb-2" />
          <p className="text-neutral-500 text-sm italic">Exemple : j'aimerais des ongles tous différents, avec des spirales, mais pas d'étoiles. </p>
        </Section>
        <Section num="6" title="Longueur & forme" className="ab-custom-shape"><ShapeSelector value={shape} onChange={setShape} /></Section></div>
        <div className="ab-custom-panel-inspirations">
        <Section num="7" title="Inspirations" className="ab-custom-inspirations">
          <p className="text-neutral-500 text-sm mb-4">Importez vos photos / inspirations (10 maximum)</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
            {inspirations.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 border border-neutral-800">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setInspirations(inspirations.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/80 text-white rounded-full flex items-center justify-center hover:bg-black"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {inspirations.length < 10 && (
              <button onClick={() => inspRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-400 hover:bg-neutral-900 transition-colors flex flex-col items-center justify-center gap-1 text-neutral-500">
                <ImagePlus className="w-5 h-5" /><span className="text-xs">Ajouter</span>
              </button>
            )}
          </div>
          <input ref={inspRef} type="file" accept="image/*" multiple onChange={handleInspirations} className="hidden" />
          <p className="text-neutral-600 text-xs">{inspirations.length}/10 photos</p>
        </Section>
        </div>
        <div className="ab-custom-panel-measurements">
        <Section
  title="Vos mesures"
  optional
  className="ab-custom-measurements"
>
  <p className="text-neutral-500 text-sm mb-4">
    À renseigner uniquement si je n’ai pas déjà vos mesures enregistrées.
  </p>

  <MeasurementsBlock
    measurements={measurements}
    setMeasurements={setMeasurements}
  />
</Section>
</div>
        <button
  onClick={submit}
  disabled={submitting}
  className="ab-custom-submit"
>
  {submitting ? (
    'Envoi en cours...'
  ) : (
    <>
      ENVOYER MA COMMANDE
      <Send className="w-4 h-4" />
    </>
  )}
</button>
      </div>
    </div>
  );
}

function ConfirmationScreen({ order, goTo }) {
  const isCustom = order.type === 'custom';

  return (
    <div className="ab-confirmation-page">
      <div className="ab-confirmation-card">

        <div className="ab-confirmation-top">
          <span>CONFIRMATION</span>
          <span>ANNETTE BAKEUR</span>
        </div>

        <h1>
          COMMANDE
          <br />
          REÇUE !
        </h1>

        <div className="ab-confirmation-content">
          <div className="ab-confirmation-message">
            <p>Merci pour votre confiance.</p>

            <p>
              Je reviens vers vous via{' '}
              <strong>{order.contact}</strong>{' '}
              {isCustom
                ? 'pour le croquis et le paiement.'
                : 'pour le paiement.'}
            </p>
          </div>

          <div className="ab-confirmation-number">
            <span>NUMÉRO DE COMMANDE</span>
            <strong>#{order.id}</strong>
          </div>
        </div>

        <p className="ab-confirmation-note">
          Conservez ce numéro pour toute correspondance ultérieure.
        </p>

        <div className="ab-confirmation-actions">
          <button
            className="ab-confirmation-home"
            onClick={() => goTo('home')}
          >
            RETOUR À L’ACCUEIL
          </button>

          <button
            className="ab-confirmation-designs"
            onClick={() => goTo('designs')}
          >
            VOIR LES DESIGNS
          </button>
        </div>

      </div>
    </div>
  );
}

function Section({ title, optional, children, className = '' }) {
  return (
    <div className={`bg-neutral-900 rounded-2xl border border-neutral-800 p-5 lg:p-7 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-serif text-lg lg:text-xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{title}{optional && <span className="text-neutral-500 text-sm ml-2 italic font-sans">(Optionnel)</span>}</h3>
      </div>
      {children}
    </div>
  );
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => <button key={o} onClick={() => onChange(o)} className={`px-5 py-2.5 rounded-full text-sm transition-all ${value === o ? 'bg-neutral-50 text-neutral-950' : 'border border-neutral-700 text-neutral-300 hover:border-neutral-400'}`}>{o}</button>)}
    </div>
  );
}

function ShapeSelector({ value, onChange }) {
  const photoShapes = SHAPES.filter(shape => shape.image);
  const naturalShape = SHAPES.find(shape => shape.id === 11);

  return (
    <div>
      <p className="text-neutral-400 text-sm mb-5 leading-relaxed">
        Sélectionnez directement la forme et la longueur souhaitées.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {photoShapes.map((shape, index) => {
          const selected = value === shape.id;

          return (
            <label
              key={shape.id}
              className={`ab-shape-choice cursor-pointer border transition-all ${
                selected
                  ? 'border-neutral-50'
                  : 'border-neutral-800 hover:border-neutral-500'
              }`}
            >
              <input
                type="radio"
                name="shape-choice"
                value={shape.id}
                checked={selected}
                onChange={() => onChange(shape.id)}
                className="sr-only"
              />

              <div className="ab-shape-choice-image">
                <img
                  src={shape.image}
                  alt={shape.label}
                />

                {selected && (
                  <span className="ab-shape-check">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </div>

              <div className="ab-shape-choice-caption">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{shape.label}</strong>
              </div>
            </label>
          );
        })}
      </div>

      {naturalShape && (
        <label
          className={`ab-shape-natural cursor-pointer border transition-all ${
            value === naturalShape.id
              ? 'border-neutral-50 is-selected'
              : 'border-neutral-800 hover:border-neutral-500'
          }`}
        >
          <input
            type="radio"
            name="shape-choice"
            value={naturalShape.id}
            checked={value === naturalShape.id}
            onChange={() => onChange(naturalShape.id)}
            className="sr-only"
          />

          <span className="ab-shape-natural-number">11</span>

          <strong>ONGLE COURT, FORME NATURELLE</strong>

          {value === naturalShape.id && (
            <span className="ab-shape-natural-check">
              <Check size={14} strokeWidth={3} />
            </span>
          )}
        </label>
      )}

      {value && (
        <p className="mt-4 text-sm text-neutral-300">
          Modèle sélectionné : <strong>n° {value}</strong>
        </p>
      )}
    </div>
  );
}

function MeasurementsBlock({ measurements, setMeasurements }) {
  async function handlePhotoUpload(photoId, file) {
    if (!file) return;

    const compressed = await compressImage(file, 1000, 0.65);

    setMeasurements((currentMeasurements) => ({
      ...currentMeasurements,
      [photoId]: compressed
    }));
  }

  function removePhoto(photoId) {
    setMeasurements((currentMeasurements) => {
      const updatedMeasurements = { ...currentMeasurements };
      delete updatedMeasurements[photoId];
      return updatedMeasurements;
    });
  }

  return (
    <div>
      <p className="text-neutral-300 text-sm mb-2 leading-relaxed">
        Prenez en photo chacun de vos pouces ainsi que vos deux mains entières,
        à côté d’une pièce de monnaie en euro.
      </p>

      <p className="text-neutral-500 text-sm mb-5 leading-relaxed">
        La pièce doit être visible sur chaque photo afin de servir de référence
        pour les dimensions.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MEASUREMENT_PHOTOS.map((photo) => (
          <MeasurementUpload
            key={photo.id}
            photo={photo}
            image={measurements[photo.id]}
            onUpload={(file) => handlePhotoUpload(photo.id, file)}
            onRemove={() => removePhoto(photo.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MeasurementUpload({ photo, image, onUpload, onRemove }) {
  const inputRef = useRef(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative w-full aspect-[4/5] rounded-xl overflow-hidden transition-all ${
          image
            ? 'border border-neutral-700'
            : 'border-2 border-dashed border-neutral-700 hover:border-neutral-400 hover:bg-neutral-900'
        }`}
      >
        {image ? (
          <>
            <img
              src={image}
              alt={photo.name}
              className="w-full h-full object-cover"
            />
            <span className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-colors" />
            <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/75 flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </span>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 px-2">
            <Camera className="w-6 h-6 text-neutral-500" />
            <span className="text-[11px] text-neutral-500 text-center">
              Ajouter une photo
            </span>
          </div>
        )}
      </button>

      <p className="text-xs text-neutral-300 text-center mt-2 leading-tight min-h-[32px]">
        {photo.name}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onUpload(file);
          }

          event.target.value = '';
        }}
        className="hidden"
      />

      {image && (
        <button
          type="button"
          onClick={onRemove}
          className="block mx-auto text-xs text-neutral-500 hover:text-red-400 mt-1"
        >
          Retirer
        </button>
      )}
    </div>
  );
}

function AdminPage({
  user,
  setUser,
  orders,
  setOrders,
  gallery,
  setGallery,
  designs,
  setDesigns,
  goTo
}) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [tab, setTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');


  async function login() {
    setAuthLoading(true);
    const { user, error } = await db.signIn(email, pwd);
    setAuthLoading(false);
    if (error) alert('Identifiants incorrects');
    else setUser(user);
  }

  async function requestPasswordReset() {
    if (!resetEmail.trim()) return alert('Renseignez votre email');
    setAuthLoading(true);
    const error = await db.resetPasswordForEmail(resetEmail.trim());
    setAuthLoading(false);
    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setResetMessage('✅ Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail.');
      setResetEmail('');
      setTimeout(() => {
        setForgotPasswordMode(false);
        setResetMessage('');
      }, 3000);
    }
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-20">
        <BackButton onClick={() => goTo('home')} />
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <Lock className="w-8 h-8 text-neutral-300 mb-4" />
          <h1 className="font-serif text-2xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Espace admin</h1>
          <p className="text-neutral-500 text-sm mb-6">Connexion réservée à la gestionnaire du site.</p>
          {!forgotPasswordMode ? (
            <>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Email" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100" />
              <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Mot de passe" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100" />
              <button onClick={login} disabled={authLoading} className="w-full px-6 py-3 bg-neutral-50 text-neutral-950 rounded-full hover:bg-white text-sm font-medium disabled:opacity-50 mb-2">{authLoading ? 'Connexion...' : 'Connexion'}</button>
              <button onClick={() => setForgotPasswordMode(true)} className="w-full px-6 py-2 text-fuchsia-400 text-sm hover:text-fuchsia-300 text-center">J'ai oublié mon mot de passe</button>
            </>
          ) : (
            <>
              <p className="text-neutral-400 text-sm mb-4">Renseignez votre email, vous recevrez un lien de réinitialisation.</p>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && requestPasswordReset()} placeholder="Votre email" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100" />
              {resetMessage && <p className="text-sm text-green-400 mb-3">{resetMessage}</p>}
              <button onClick={requestPasswordReset} disabled={authLoading} className="w-full px-6 py-3 bg-neutral-50 text-neutral-950 rounded-full hover:bg-white text-sm font-medium disabled:opacity-50 mb-2">{authLoading ? 'Envoi en cours...' : 'Envoyer le lien'}</button>
              <button onClick={() => setForgotPasswordMode(false)} className="w-full px-6 py-2 text-neutral-400 text-sm hover:text-neutral-100 text-center">← Retour à la connexion</button>
            </>
          )}
        </div>
      </div>
    );
  }

  async function logout() { await db.signOut(); setUser(null); }

  return (
    <div className="max-w-6xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
      <BackButton onClick={() => goTo('home')} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-2">Admin</p>
          <h1 className="font-serif text-3xl lg:text-4xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Tableau de bord</h1>
        </div>
        <button onClick={logout} className="text-neutral-500 hover:text-neutral-200 flex items-center gap-1.5 text-sm"><LogOut className="w-4 h-4" /> Déconnexion</button>
      </div>
      <div className="flex gap-2 mb-8 border-b border-neutral-800 overflow-x-auto">
        {[{ id: 'orders', label: `Commandes (${orders.length})`, icon: Package },{ id: 'gallery', label: 'Galerie', icon: ImagePlus },{ id: 'designs', label: 'Designs', icon: Sparkles },{ id: 'settings', label: 'Paramètres', icon: Settings }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-neutral-50 text-neutral-50' : 'border-transparent text-neutral-500 hover:text-neutral-200'}`}><t.icon className="w-4 h-4" /> {t.label}</button>
        ))}
      </div>
      {tab === 'orders' && (selectedOrder ? (
        <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} onUpdate={async (status) => {
          await db.updateOrderStatus(selectedOrder.id, status);
          const updated = { ...selectedOrder, status };
          setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
          setSelectedOrder(updated);
        }} onDelete={async () => {
          if (!confirm('Supprimer cette commande ?')) return;
          await db.deleteOrder(selectedOrder.id);
          setOrders(orders.filter(o => o.id !== selectedOrder.id));
          setSelectedOrder(null);
        }} />
      ) : <OrdersList orders={orders} onSelect={setSelectedOrder} />)}
      {tab === 'gallery' && <GalleryManager gallery={gallery} setGallery={setGallery} />}
      {tab === 'designs' && <DesignsManager designs={designs} setDesigns={setDesigns} />}
      {tab === 'settings' && <SettingsPanel user={user} />}
    </div>
  );
}

function SettingsPanel({ user }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function changePassword() {
    setMessage('');

    if (newPassword.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const error = await db.updatePassword(newPassword);
    setLoading(false);

    if (error) {
      setMessage('Erreur : ' + error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setMessage('✅ Votre mot de passe a bien été modifié.');
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
            <Settings className="w-5 h-5 text-neutral-200" />
          </div>
          <div>
            <h3 className="font-serif text-xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Paramètres du compte</h3>
            <p className="text-neutral-500 text-sm">Gérez les informations de connexion à l'espace admin.</p>
          </div>
        </div>

        <div className="mb-7">
          <label className="text-xs tracking-widest uppercase text-neutral-500 block mb-2">Adresse email</label>
          <div className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200">
            {user?.email || 'Email indisponible'}
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-6">
          <h4 className="text-neutral-100 font-medium mb-1">Modifier le mot de passe</h4>
          <p className="text-neutral-500 text-sm mb-4">
            Pour des raisons de sécurité, l'ancien mot de passe ne peut jamais être affiché. Vous pouvez uniquement en définir un nouveau.
          </p>

          <div className="relative mb-3">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              autoComplete="new-password"
              className="w-full px-4 py-3 pr-12 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-200"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && changePassword()}
            placeholder="Confirmer le nouveau mot de passe"
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100 mb-3"
          />

          {message && (
            <p className={`text-sm mb-3 ${message.startsWith('✅') ? 'text-green-400' : 'text-amber-300'}`}>
              {message}
            </p>
          )}

          <button
            onClick={changePassword}
            disabled={loading}
            className="px-6 py-3 bg-neutral-50 text-neutral-950 rounded-full hover:bg-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Modification...' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdersList({ orders, onSelect }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return o.contact.toLowerCase().includes(s) || o.id.toLowerCase().includes(s) || (o.designName || '').toLowerCase().includes(s);
  });
  if (orders.length === 0) return <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-16 text-center"><Package className="w-10 h-10 text-neutral-700 mx-auto mb-3" /><p className="text-neutral-500">Aucune commande pour le moment.</p></div>;
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par contact, ID ou design..." className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-full focus:outline-none focus:border-neutral-500 text-sm text-neutral-100 placeholder-neutral-600" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-500 text-neutral-100">
          <option value="all">Toutes</option><option value="new">Nouvelles</option><option value="processing">En cours</option><option value="done">Traitées</option>
        </select>
        <button onClick={() => exportOrdersCSV(orders)} className="px-4 py-2.5 bg-neutral-50 text-neutral-950 rounded-full text-sm hover:bg-white flex items-center justify-center gap-1.5 font-medium"><Download className="w-4 h-4" /> Export CSV</button>
      </div>
      {filtered.length === 0 ? <p className="text-neutral-500 text-center py-10">Aucun résultat.</p> : (
        <div className="space-y-3">
          {filtered.map(o => (
            <button key={o.id} onClick={() => onSelect(o)} className="w-full bg-neutral-900 rounded-xl border border-neutral-800 p-5 hover:border-neutral-600 transition-colors text-left flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${o.status === 'done' ? 'bg-green-950 text-green-300 border border-green-900' : o.status === 'processing' ? 'bg-amber-950 text-amber-300 border border-amber-900' : 'bg-neutral-50 text-neutral-950'}`}>{o.status === 'done' ? 'Traitée' : o.status === 'processing' ? 'En cours' : 'Nouvelle'}</span>
                  <span className="text-xs text-neutral-500">{o.type === 'design' ? 'Design existant' : 'Sur mesure'}</span>
                </div>
                <p className="font-medium text-neutral-100 truncate">{o.type === 'design' ? `${o.designName} — ${o.designPrice}€` : 'Commande personnalisée'}</p>
                <p className="text-sm text-neutral-500 truncate">{o.contact}</p>
                <p className="text-xs text-neutral-600 font-mono mt-0.5">#{o.id}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
                <p className="text-xs text-neutral-600">{new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function OrderPhotoCard({ imageRef, label, filename, aspectClass = 'aspect-[4/5]' }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    let active = true;
    let localObjectUrl = null;

    async function preparePhoto() {
      setPhotoError('');

      if (!imageRef) return;

      try {
        if (typeof imageRef === 'string' && imageRef.startsWith('data:')) {
          const response = await fetch(imageRef);
          const blob = await response.blob();
          localObjectUrl = URL.createObjectURL(blob);

          if (active) {
            setPreviewUrl(localObjectUrl);
            setDownloadUrl(localObjectUrl);
          }
          return;
        }

        const urls = await db.getOrderPhotoUrls(imageRef, filename);

        if (active) {
          setPreviewUrl(urls.previewUrl);
          setDownloadUrl(urls.downloadUrl);
        }
      } catch (error) {
        console.error('Photo access error:', error);
        if (active) setPhotoError("Impossible de charger cette photo.");
      }
    }

    preparePhoto();

    return () => {
      active = false;
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    };
  }, [imageRef, filename]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
      <div className={`${aspectClass} bg-neutral-900 flex items-center justify-center overflow-hidden`}>
        {previewUrl ? (
          <img src={previewUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-3">
            <Camera className="w-5 h-5 mx-auto text-neutral-600 mb-2" />
            <p className="text-xs text-neutral-500">{photoError || 'Chargement…'}</p>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs text-neutral-300 mb-2 min-h-[32px]">{label}</p>

        <div className="flex gap-2">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 px-3 py-2 border border-neutral-700 rounded-full text-xs text-center hover:border-neutral-400"
            >
              Ouvrir
            </a>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={filename}
              className="flex-1 px-3 py-2 bg-neutral-50 text-neutral-950 rounded-full text-xs text-center flex items-center justify-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetail({ order, onBack, onUpdate, onDelete }) {
  const shape = SHAPES.find(s => s.id === order.shape);
  return (
    <div>
      <button onClick={onBack} className="text-neutral-500 hover:text-neutral-100 text-sm flex items-center gap-1.5 mb-6"><ArrowLeft className="w-4 h-4" /> Retour aux commandes</button>
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6 pb-6 border-b border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 mb-1 font-mono">#{order.id}</p>
            <h2 className="font-serif text-2xl text-neutral-50 mb-1" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{order.type === 'design' ? `${order.designName} — ${order.designPrice}€` : 'Commande personnalisée'}</h2>
            <p className="text-sm text-neutral-500">{new Date(order.createdAt).toLocaleString('fr-FR')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['new', 'processing', 'done'].map(s => <button key={s} onClick={() => onUpdate(s)} className={`px-3 py-1.5 text-xs rounded-full transition-colors ${order.status === s ? 'bg-neutral-50 text-neutral-950' : 'border border-neutral-700 text-neutral-400 hover:border-neutral-400'}`}>{s === 'new' ? 'Nouvelle' : s === 'processing' ? 'En cours' : 'Traitée'}</button>)}
          </div>
        </div>
        <DetailRow label="Email">
  <p className="font-medium text-neutral-100">
    {order.email || order.contact || '-'}
  </p>
</DetailRow>

{order.instagram && (
  <DetailRow label="Instagram">
    <p className="text-neutral-200">{order.instagram}</p>
  </DetailRow>
)}

{order.shipping && (
  <DetailRow label="Adresse de livraison">
    <div className="text-neutral-200 leading-relaxed">
      {order.shipping.name && <p>{order.shipping.name}</p>}
      {order.shipping.address && <p>{order.shipping.address}</p>}
      {order.shipping.address2 && <p>{order.shipping.address2}</p>}
      <p>
        {order.shipping.postalCode || ''}{' '}
        {order.shipping.city || ''}
      </p>
      {order.shipping.country && <p>{order.shipping.country}</p>}
    </div>
  </DetailRow>
)}

{shape && (
  <DetailRow label="Forme & longueur">
    <p className="text-neutral-200">
      {shape.id} — {shape.label}
    </p>
  </DetailRow>
)}

{order.type === 'design' && order.modifications && (
  <DetailRow label="Modifications souhaitées">
    <p className="text-neutral-200 whitespace-pre-wrap">
      {order.modifications}
    </p>
  </DetailRow>
)}
        {order.type === 'custom' && (<>
          {order.colors && <DetailRow label="Couleurs">{order.colors}</DetailRow>}
          {order.chrome && <DetailRow label="Chrome">{order.chrome}</DetailRow>}
          {order.jewelry && <DetailRow label="Bijoux">{order.jewelry}</DetailRow>}
          {order.relief && <DetailRow label="Relief">{order.relief}</DetailRow>}
          {order.desc && <DetailRow label="Descriptif">{order.desc}</DetailRow>}
          {order.inspirations?.length > 0 && (
            <DetailRow label="Inspirations">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
                {order.inspirations.map((img, i) => (
                  <OrderPhotoCard
                    key={`${img}-${i}`}
                    imageRef={img}
                    label={`Inspiration ${i + 1}`}
                    filename={`commande-${order.id}-inspiration-${String(i + 1).padStart(2, '0')}.jpg`}
                    aspectClass="aspect-square"
                  />
                ))}
              </div>
            </DetailRow>
          )}
        </>)}
        {Object.keys(order.measurements || {}).length > 0 && (
          <DetailRow label="Photos des mesures">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {MEASUREMENT_PHOTOS
                .filter((photo) => order.measurements?.[photo.id])
                .map((photo) => (
                  <OrderPhotoCard
                    key={photo.id}
                    imageRef={order.measurements[photo.id]}
                    label={photo.name}
                    filename={`commande-${order.id}-${photo.id}.jpg`}
                  />
                ))}
            </div>
          </DetailRow>
        )}
        <div className="mt-8 pt-6 border-t border-neutral-800">
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Supprimer cette commande</button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return <div className="py-3 border-b border-neutral-800/60 last:border-0"><p className="text-xs tracking-widest uppercase text-neutral-500 mb-1.5">{label}</p><div className="text-neutral-200 text-sm">{children}</div></div>;
}

function GalleryManager({ gallery, setGallery }) {
  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    const compressed = await Promise.all(files.map(f => compressImage(f, 900, 0.7)));
    const updated = [...gallery, ...compressed];
    await db.setSetting('gallery', updated); setGallery(updated);
  }
  async function handleRemove(i) {
    const updated = gallery.filter((_, idx) => idx !== i);
    await db.setSetting('gallery', updated); setGallery(updated);
  }
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
      <h3 className="font-serif text-xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Galerie de réalisations</h3>
      <p className="text-neutral-500 text-sm mb-5">La mosaïque visible en bas de la page d'accueil.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {gallery.map((img, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 group border border-neutral-800">
            <img src={img} alt="" className="w-full h-full object-cover" />
            <button onClick={() => handleRemove(i)} className="absolute top-2 right-2 w-7 h-7 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        ))}
        <label className="aspect-square rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
          <Plus className="w-6 h-6 text-neutral-500 mb-1" /><span className="text-xs text-neutral-400">Ajouter</span>
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        </label>
      </div>
      <p className="text-neutral-500 text-xs">{gallery.length} photo{gallery.length > 1 ? 's' : ''}</p>
    </div>
  );
}

function DesignsManager({ designs, setDesigns }) {
  const [editing, setEditing] = useState(null);
  async function save(d) {
    let updated;
    if (d.id && designs.find(x => x.id === d.id)) updated = designs.map(x => x.id === d.id ? d : x);
    else updated = [...designs, { ...d, id: uid() }];
    await db.setSetting('designs', updated); setDesigns(updated); setEditing(null);
  }
  async function remove(id) {
    if (!confirm('Supprimer ce design ?')) return;
    const updated = designs.filter(d => d.id !== id);
    await db.setSetting('designs', updated); setDesigns(updated);
  }
  if (editing) return <DesignEditor design={editing} onSave={save} onCancel={() => setEditing(null)} />;
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="font-serif text-xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Catalogue de designs</h3>
          <p className="text-neutral-500 text-sm mt-1">Vos croquis disponibles à la commande.</p>
        </div>
        <button onClick={() => setEditing({
  name: '',
  price: '',
  desc: '',
  image: null,
  category: 'original'
})} className="px-4 py-2 bg-neutral-50 text-neutral-950 rounded-full text-sm hover:bg-white flex items-center gap-1.5 font-medium"><Plus className="w-4 h-4" /> Nouveau</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {designs.map(d => (
          <div key={d.id} className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-950">
            <div className="aspect-square bg-neutral-800">{d.image ? <img src={d.image} alt={d.name} className="w-full h-full object-cover" /> : <Placeholder label={d.name} className="w-full h-full" />}</div>
            <div className="p-3">
              <p className="font-medium text-neutral-100 text-sm truncate">{d.name}</p>
              <p className="text-neutral-500 text-xs mb-2">{d.price} €</p>
              <div className="flex gap-1">
                <button onClick={() => setEditing(d)} className="flex-1 text-xs py-1.5 border border-neutral-700 hover:border-neutral-400 rounded-full flex items-center justify-center gap-1 text-neutral-200"><Edit3 className="w-3 h-3" /> Éditer</button>
                <button onClick={() => remove(d.id)} className="text-xs py-1.5 px-2 text-red-400 hover:bg-red-950/40 rounded-full"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignEditor({ design, onSave, onCancel }) {
  const [d, setD] = useState({
  ...design,
  price: design.price || '',
  category: design.category || 'original'
});
  async function handleImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const compressed = await compressImage(file, 1000, 0.75);
    setD({ ...d, image: compressed });
  }
  function submit() {
    if (!d.name.trim()) return alert('Nom requis');
    if (!d.price || isNaN(Number(d.price))) return alert('Prix invalide');
    onSave({ ...d, price: Number(d.price), name: d.name.trim(), desc: (d.desc || '').trim() });
  }
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8 max-w-2xl">
      <button onClick={onCancel} className="text-neutral-500 hover:text-neutral-100 text-sm flex items-center gap-1.5 mb-5"><ArrowLeft className="w-4 h-4" /> Retour</button>
      <h3 className="font-serif text-xl text-neutral-50 mb-5" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{design.id ? 'Modifier le design' : 'Nouveau design'}</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">Photo</label>
          {d.image ? (
            <div className="relative w-40 aspect-square rounded-lg overflow-hidden bg-neutral-800 border border-neutral-800">
              <img src={d.image} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setD({ ...d, image: null })} className="absolute top-2 right-2 w-7 h-7 bg-black/80 text-white rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className="w-40 aspect-square rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-400 flex flex-col items-center justify-center cursor-pointer">
              <Upload className="w-6 h-6 text-neutral-500 mb-1" /><span className="text-xs text-neutral-400">Importer</span>
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </label>
          )}
        </div>
        <div><label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">Nom</label><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100" /></div>
        <div><label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">Prix (€)</label><input type="number" value={d.price} onChange={e => setD({ ...d, price: e.target.value })} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100" /></div>
        <div>
  <label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">
    Catégorie
  </label>

  <select
    value={d.category}
    onChange={e => setD({ ...d, category: e.target.value })}
    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100"
  >
    <option value="original">Designs originaux</option>
    <option value="soft">Prix doux</option>
  </select>
</div>
        <div><label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">Description courte</label><textarea value={d.desc} onChange={e => setD({ ...d, desc: e.target.value })} rows={2} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 resize-none text-neutral-100" /></div>
        <div className="flex gap-2 pt-3">
          <button onClick={submit} className="px-5 py-2.5 bg-neutral-50 text-neutral-950 rounded-full text-sm hover:bg-white font-medium">Enregistrer</button>
          <button onClick={onCancel} className="px-5 py-2.5 border border-neutral-700 rounded-full text-sm hover:border-neutral-400 text-neutral-200">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function Footer({ goTo }) {
  return (
    <footer className="border-t border-neutral-900 bg-black mt-10">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <p className="font-serif text-2xl mb-3 text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{BRAND}</p>
            <p className="text-neutral-500 text-sm leading-relaxed max-w-xs">Faits main, personnalisés et réutilisables.</p>
            <div className="flex gap-3 mt-5">
              <a href={`https://instagram.com/${INSTAGRAM.replace('@', '')}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full border border-neutral-800 flex items-center justify-center hover:border-neutral-400"><svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2 text-sm">
            <button onClick={() => goTo('home')} className="text-neutral-400 hover:text-neutral-100">Accueil</button>
            <button onClick={() => goTo('designs')} className="text-neutral-400 hover:text-neutral-100">Designs</button>
            <button onClick={() => goTo('custom')} className="text-neutral-400 hover:text-neutral-100">Commande personnalisée</button>
            <p className="text-neutral-600 text-xs mt-3">{INSTAGRAM}</p>
          </div>
        </div>
        <div className="border-t border-neutral-900 mt-8 pt-6 text-xs text-neutral-600 text-center">© {new Date().getFullYear()} {BRAND}. Tous droits réservés.</div>
      </div>
    </footer>
  );
}