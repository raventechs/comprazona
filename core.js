/*
  ARCHIVO: core.js
  VERSIÓN: v0.2
  FECHA: 01/08/2026
  PROYECTO: RavenMarket — Motor de Marketplaces Locales | RavenTechs
  CHANGELOG:
  - v0.2 (01/08/2026): Conexión Firebase real (proyecto ravenmarket-c2739). Capa de datos
    Firestore: tenant, catálogo con caché local (1 h), pedidos (crear, historial del cliente,
    escucha en vivo por empresa, actualizar estado), gestión de empresa y productos, perfil de
    usuario con rol. Auth Google. Fallback automático a datos demo si el tenant aún no fue
    inicializado con setup.html. Queries sin índices compuestos (limit + filtro en cliente).
  - v0.1 (01/08/2026): Núcleo inicial en modo demo.
*/

/* ================= CONFIGURACIÓN ================= */
var RM_CONFIG = {
  DEMO: false,                      // false = Firebase real (con fallback demo si falta el seed)
  TENANT_DEFAULT: 'garrafas-agua',
  SUPER_ADMIN: 'rgaraventa@gmail.com',
  CACHE_CATALOGO_MS: 60 * 60 * 1000, // 1 hora
  FIREBASE: {
    apiKey: "AIzaSyAwsmI5H5qUZT0tj8vZYhPscTmZqHI2SQ4",
    authDomain: "ravenmarket-c2739.firebaseapp.com",
    projectId: "ravenmarket-c2739",
    storageBucket: "ravenmarket-c2739.firebasestorage.app",
    messagingSenderId: "514168931031",
    appId: "1:514168931031:web:3887e0ff2c1792ba21a692"
  }
};

/* ================= DATOS DEMO / SEED =================
   Sirven como fallback visual y como semilla inicial del
   tenant que setup.html escribe en Firestore.            */
var RM_DEMO = {
  tenant: {
    slug: 'garrafas-agua',
    nombre: 'CompraZona Catán',
    lema: 'Tu zona, tus productos',
    colores: { primario: '#F27B13', secundario: '#2E9FC4', fondo: '#FAF8F5' },
    moneda: 'ARS',
    modulosActivos: ['garrafas', 'agua'],
    scoring: { precio: 35, distancia: 25, rating: 25, rapidez: 15, boostDestacada: 6 },
    zona: 'González Catán y alrededores',
    activo: true
  },
  categorias: [
    { id: 'garrafas', nombre: 'Garrafas', icono: '🔥', orden: 1, activa: true,
      sinonimos: ['garrafa', 'gas', 'tubo', 'glp', 'butano', '10kg', '15kg', '45kg', 'carga', 'recarga', 'estufa', 'cocina'] },
    { id: 'agua', nombre: 'Agua', icono: '💧', orden: 2, activa: true,
      sinonimos: ['bidon', 'bidón', 'agua', 'dispenser', 'soda', '20 litros', '20l', '12l', 'mineral'] }
  ],
  empresas: [
    { id: 'eltano', nombre: 'Garrafas El Tano', categorias: ['garrafas'],
      whatsapp: '5491100000001', direccion: 'Av. Simón Pérez 4500, G. Catán',
      geo: { lat: -34.769, lng: -58.628 }, tiempoEstimadoMin: 40,
      ratingProm: 4.6, ratingCant: 128, destacada: false, activa: true,
      horario: { desde: '08:00', hasta: '19:00', dias: [1,2,3,4,5,6], h24: false } },
    { id: 'sanjorge', nombre: 'Distribuidora San Jorge', categorias: ['garrafas','agua'],
      whatsapp: '5491100000002', direccion: 'Ruta 21 km 29, G. Catán',
      geo: { lat: -34.776, lng: -58.641 }, tiempoEstimadoMin: 60,
      ratingProm: 4.8, ratingCant: 342, destacada: true, activa: true,
      horario: { desde: '07:30', hasta: '20:00', dias: [1,2,3,4,5,6], h24: false } },
    { id: 'aguapura', nombre: 'Agua Pura Litoral', categorias: ['agua'],
      whatsapp: '5491100000003', direccion: 'Equipo del sur 2200, Virrey del Pino',
      geo: { lat: -34.802, lng: -58.662 }, tiempoEstimadoMin: 90,
      ratingProm: 4.4, ratingCant: 89, destacada: false, activa: true,
      horario: { desde: '08:00', hasta: '17:00', dias: [1,2,3,4,5], h24: false } },
    { id: 'gasexpress', nombre: 'Gas Express 24hs', categorias: ['garrafas'],
      whatsapp: '5491100000004', direccion: 'Av. Juan M. de Rosas 12400, G. Catán',
      geo: { lat: -34.757, lng: -58.615 }, tiempoEstimadoMin: 25,
      ratingProm: 4.2, ratingCant: 57, destacada: false, activa: true,
      horario: { desde: '00:00', hasta: '23:59', dias: [0,1,2,3,4,5,6], h24: true } }
  ],
  productos: {
    eltano: [
      { id: 'g10', nombre: 'Garrafa 10 kg (canje)', precio: 22500, categoria: 'garrafas', activo: true },
      { id: 'g15', nombre: 'Garrafa 15 kg (canje)', precio: 33500, categoria: 'garrafas', activo: true },
      { id: 'g45', nombre: 'Tubo 45 kg (canje)', precio: 97000, categoria: 'garrafas', activo: true }
    ],
    sanjorge: [
      { id: 'g10', nombre: 'Garrafa 10 kg (canje)', precio: 23000, categoria: 'garrafas', activo: true },
      { id: 'g15', nombre: 'Garrafa 15 kg (canje)', precio: 34000, categoria: 'garrafas', activo: true },
      { id: 'b20', nombre: 'Bidón de agua 20 L (retornable)', precio: 5500, categoria: 'agua', activo: true },
      { id: 'b12', nombre: 'Bidón de agua 12 L', precio: 4200, categoria: 'agua', activo: true }
    ],
    aguapura: [
      { id: 'b20', nombre: 'Bidón de agua 20 L (retornable)', precio: 5200, categoria: 'agua', activo: true },
      { id: 'b12', nombre: 'Bidón de agua 12 L', precio: 4000, categoria: 'agua', activo: true },
      { id: 'disp', nombre: 'Dispenser frío/calor (alquiler mensual)', precio: 9000, categoria: 'agua', activo: true }
    ],
    gasexpress: [
      { id: 'g10', nombre: 'Garrafa 10 kg (canje)', precio: 24500, categoria: 'garrafas', activo: true },
      { id: 'g15', nombre: 'Garrafa 15 kg (canje)', precio: 35500, categoria: 'garrafas', activo: true }
    ]
  }
};

/* ================= NÚCLEO DEL MOTOR ================= */
var RM = (function () {

  var fb = { app: null, auth: null, db: null };
  var tenantId = RM_CONFIG.TENANT_DEFAULT;

  /* ---- Utilidades ---- */
  function normalizar(txt) {
    return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function formatPesos(n) {
    var v = Math.round(Number(n) || 0);
    return '$' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function distanciaKm(a, b) {
    if (!a || !b) return null;
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function estaAbierta(emp, fecha) {
    var h = emp.horario;
    if (!h) return true;
    if (h.h24) return true;
    var d = fecha || new Date();
    if (h.dias.indexOf(d.getDay()) === -1) return false;
    var ahora = d.getHours() * 60 + d.getMinutes();
    var pDesde = h.desde.split(':'), pHasta = h.hasta.split(':');
    var desde = (+pDesde[0]) * 60 + (+pDesde[1]);
    var hasta = (+pHasta[0]) * 60 + (+pHasta[1]);
    return ahora >= desde && ahora <= hasta;
  }

  function fechaTextoAhora() {
    var d = new Date();
    return d.toLocaleDateString('es-AR') + ' ' +
           d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  /* ---- Firebase ---- */
  function tieneFirebase() {
    return !RM_CONFIG.DEMO && typeof firebase !== 'undefined' && RM_CONFIG.FIREBASE.apiKey;
  }

  function initFirebase() {
    if (fb.app) return true;
    if (!tieneFirebase()) return false;
    fb.app = firebase.initializeApp(RM_CONFIG.FIREBASE);
    fb.auth = firebase.auth();
    fb.db = firebase.firestore();
    // Procesar resultado de redirect si el usuario viene de Google
    _procesarRedirect();
    return true;
  }

  function tRef() { return fb.db.collection('tenants').doc(tenantId); }

  /* ---- Auth ---- */
  function onAuth(cb) {
    if (!initFirebase()) { cb(null); return; }
    fb.auth.onAuthStateChanged(function (user) { cb(user || null); });
  }

  function login(cb) {
    if (!initFirebase()) { cb('Firebase no disponible'); return; }
    var provider = new firebase.auth.GoogleAuthProvider();
    // Redirect en lugar de popup: más natural en móvil, no hay ventana emergente.
    // El usuario va a Google, elige su cuenta y vuelve solo a la app.
    // getRedirectResult() en initFirebase captura el resultado al volver.
    localStorage.setItem('rm_login_pending', '1');
    firebase.auth().signInWithRedirect(provider);
    // cb nunca se llama acá — el flujo sigue en onAuth tras el redirect
  }

  function _procesarRedirect() {
    if (!initFirebase()) return;
    fb.auth.getRedirectResult().then(function (res) {
      if (res && res.user) {
        localStorage.removeItem('rm_login_pending');
        asegurarPerfil(res.user, function () {});
      }
    }).catch(function (e) {
      localStorage.removeItem('rm_login_pending');
      console.warn('Redirect result error:', e.message);
    });
  }

  function logout(cb) {
    if (!fb.auth) { if (cb) cb(); return; }
    fb.auth.signOut().then(function () { if (cb) cb(); });
  }

  function asegurarPerfil(user, cb) {
    var ref = tRef().collection('usuarios').doc(user.uid);
    ref.get().then(function (snap) {
      if (snap.exists) { cb(snap.data()); return; }
      var perfil = { rol: 'cliente', nombre: user.displayName || '', email: user.email || '', creado: Date.now() };
      ref.set(perfil).then(function () { cb(perfil); })
        .catch(function () { cb(perfil); }); // si rules lo impiden, seguimos igual
    }).catch(function () { cb(null); });
  }

  function perfilUsuario(uid, cb) {
    tRef().collection('usuarios').doc(uid).get()
      .then(function (s) { cb(null, s.exists ? s.data() : null); })
      .catch(function (e) { cb(e.message); });
  }

  /* ---- Tenant + catálogo (con caché) ---- */
  function aplicarBranding(tenant) {
    var r = document.documentElement.style;
    if (tenant.colores) {
      if (tenant.colores.primario) r.setProperty('--c-primario', tenant.colores.primario);
      if (tenant.colores.secundario) r.setProperty('--c-secundario', tenant.colores.secundario);
      if (tenant.colores.fondo) r.setProperty('--c-fondo', tenant.colores.fondo);
    }
    document.title = tenant.nombre;
  }

  function datosDemo() {
    return {
      tenant: RM_DEMO.tenant,
      categorias: RM_DEMO.categorias.filter(function (c) { return c.activa; })
                    .sort(function (a, b) { return a.orden - b.orden; }),
      empresas: RM_DEMO.empresas.filter(function (e) { return e.activa; }),
      productos: RM_DEMO.productos,
      modoDemo: true
    };
  }

  function initTenant(opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    opts = opts || {};
    // Slug por URL (?t=...) o default
    try {
      var m = window.location.search.match(/[?&]t=([\w-]+)/);
      if (m) tenantId = m[1];
    } catch (e) {}

    if (!tieneFirebase()) {
      var d = datosDemo();
      aplicarBranding(d.tenant);
      cb(null, d);
      return;
    }
    initFirebase();

    // Caché de catálogo (solo lecturas del cliente; opts.fresco la saltea)
    if (!opts.fresco) {
      try {
        var cache = JSON.parse(localStorage.getItem('rm_cache_' + tenantId) || 'null');
        if (cache && (Date.now() - cache.ts) < RM_CONFIG.CACHE_CATALOGO_MS) {
          aplicarBranding(cache.datos.tenant);
          cb(null, cache.datos);
          return;
        }
      } catch (e) {}
    }

    tRef().get().then(function (tSnap) {
      if (!tSnap.exists) {
        // Tenant sin inicializar: fallback demo para no romper la app pública
        var d = datosDemo();
        d.faltaSeed = true;
        aplicarBranding(d.tenant);
        cb(null, d);
        return;
      }
      var tenant = tSnap.data();
      var resultado = { tenant: tenant, categorias: [], empresas: [], productos: {}, modoDemo: false };
      tRef().collection('categorias').get().then(function (cSnap) {
        cSnap.forEach(function (doc) {
          var c = doc.data(); c.id = doc.id;
          if (c.activa) resultado.categorias.push(c);
        });
        resultado.categorias.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
        return tRef().collection('empresas').get();
      }).then(function (eSnap) {
        var lecturasProductos = [];
        eSnap.forEach(function (doc) {
          var e = doc.data(); e.id = doc.id;
          if (!e.activa) return;
          resultado.empresas.push(e);
          lecturasProductos.push(
            tRef().collection('empresas').doc(e.id).collection('productos').get()
              .then(function (pSnap) {
                var lista = [];
                pSnap.forEach(function (p) { var d2 = p.data(); d2.id = p.id; lista.push(d2); });
                resultado.productos[e.id] = lista;
              })
          );
        });
        return Promise.all(lecturasProductos);
      }).then(function () {
        aplicarBranding(resultado.tenant);
        try {
          localStorage.setItem('rm_cache_' + tenantId, JSON.stringify({ ts: Date.now(), datos: resultado }));
        } catch (e) {}
        cb(null, resultado);
      }).catch(function (e) {
        cb(e.message || 'Error leyendo el catálogo');
      });
    }).catch(function (e) {
      cb(e.message || 'Error de conexión con Firestore');
    });
  }

  function limpiarCache() {
    try { localStorage.removeItem('rm_cache_' + tenantId); } catch (e) {}
  }

  /* ---- Búsqueda por sinónimos ---- */
  function buscarCategoria(query, categorias) {
    var q = normalizar(query);
    if (!q) return null;
    var palabras = q.split(/\s+/);
    var mejor = null, mejorPuntos = 0;
    categorias.forEach(function (cat) {
      var puntos = 0;
      var claves = [normalizar(cat.nombre)].concat((cat.sinonimos || []).map(normalizar));
      claves.forEach(function (clave) {
        if (!clave) return;
        if (q.indexOf(clave) !== -1) puntos += 3;
        palabras.forEach(function (p) {
          if (p.length >= 3 && (clave.indexOf(p) === 0 || p.indexOf(clave) === 0)) puntos += 1;
        });
      });
      if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = cat; }
    });
    return mejor;
  }

  /* ---- Ranking configurable + insignias ---- */
  function precioReferencia(empresaId, categoriaId, productos) {
    var lista = (productos[empresaId] || []).filter(function (p) {
      return p.activo && p.categoria === categoriaId;
    });
    if (!lista.length) return null;
    return Math.min.apply(null, lista.map(function (p) { return p.precio; }));
  }

  function rankear(empresas, categoriaId, productos, scoring, userGeo) {
    var candidatas = empresas.filter(function (e) {
      return e.categorias.indexOf(categoriaId) !== -1;
    }).map(function (e) {
      return {
        emp: e,
        precioRef: precioReferencia(e.id, categoriaId, productos),
        dist: userGeo ? distanciaKm(userGeo, e.geo) : null,
        abierta: estaAbierta(e)
      };
    });
    if (!candidatas.length) return [];

    function normalizarFactor(vals, valor, invertir) {
      var nums = vals.filter(function (v) { return v !== null && v !== undefined; });
      if (valor === null || valor === undefined || !nums.length) return 50;
      var min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
      if (max === min) return 100;
      var n = (valor - min) / (max - min) * 100;
      return invertir ? 100 - n : n;
    }

    var precios = candidatas.map(function (c) { return c.precioRef; });
    var dists = candidatas.map(function (c) { return c.dist; });
    var ratings = candidatas.map(function (c) { return c.emp.ratingProm; });
    var tiempos = candidatas.map(function (c) { return c.emp.tiempoEstimadoMin; });
    var pesoTotal = scoring.precio + scoring.distancia + scoring.rating + scoring.rapidez;

    candidatas.forEach(function (c) {
      var fPrecio = normalizarFactor(precios, c.precioRef, true);
      var fDist = normalizarFactor(dists, c.dist, true);
      var fRating = normalizarFactor(ratings, c.emp.ratingProm, false);
      var fRapidez = normalizarFactor(tiempos, c.emp.tiempoEstimadoMin, true);
      c.puntaje = (scoring.precio * fPrecio + scoring.distancia * fDist +
                   scoring.rating * fRating + scoring.rapidez * fRapidez) / pesoTotal;
      if (c.emp.destacada) c.puntaje += (scoring.boostDestacada || 0);
      if (!c.abierta) c.puntaje -= 25;
      c.badges = [];
    });

    candidatas.reduce(function (a, b) { return b.puntaje > a.puntaje ? b : a; })
      .badges.push({ icono: '⭐', texto: 'Recomendado' });
    var conPrecio = candidatas.filter(function (c) { return c.precioRef !== null; });
    if (conPrecio.length) {
      conPrecio.reduce(function (a, b) { return b.precioRef < a.precioRef ? b : a; })
        .badges.push({ icono: '💲', texto: 'Más económico' });
    }
    candidatas.reduce(function (a, b) { return b.emp.tiempoEstimadoMin < a.emp.tiempoEstimadoMin ? b : a; })
      .badges.push({ icono: '⚡', texto: 'Más rápido' });
    var conRating = candidatas.filter(function (c) { return c.emp.ratingCant >= 20; });
    if (conRating.length) {
      conRating.reduce(function (a, b) { return b.emp.ratingProm > a.emp.ratingProm ? b : a; })
        .badges.push({ icono: '🏆', texto: 'Mejor calificado' });
    }

    candidatas.sort(function (a, b) { return b.puntaje - a.puntaje; });
    return candidatas;
  }

  /* ---- Pedidos ---- */
  function codigoPedido() {
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', c = '';
    for (var i = 0; i < 4; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    return c;
  }

  function crearPedido(pedido, cb) {
    if (!initFirebase()) { cb('Sin conexión a Firebase'); return; }
    tRef().collection('pedidos').add(pedido)
      .then(function (ref) { cb(null, ref.id); })
      .catch(function (e) { cb(e.message || 'No se pudo registrar el pedido'); });
  }

  function misPedidos(uid, cb) {
    if (!initFirebase()) { cb('Sin conexión'); return; }
    tRef().collection('pedidos').where('clienteUid', '==', uid).limit(50).get()
      .then(function (snap) {
        var lista = [];
        snap.forEach(function (d) { var p = d.data(); p.docId = d.id; lista.push(p); });
        lista.sort(function (a, b) { return b.ts - a.ts; });
        cb(null, lista);
      })
      .catch(function (e) { cb(e.message); });
  }

  function escucharPedidosEmpresa(empresaId, cb) {
    if (!initFirebase()) { cb('Sin conexión'); return null; }
    // Sin orderBy para no requerir índice compuesto: se ordena en el cliente
    return tRef().collection('pedidos').where('empresaId', '==', empresaId).limit(200)
      .onSnapshot(function (snap) {
        var lista = [];
        snap.forEach(function (d) { var p = d.data(); p.docId = d.id; lista.push(p); });
        lista.sort(function (a, b) { return b.ts - a.ts; });
        cb(null, lista);
      }, function (e) { cb(e.message || 'Error escuchando pedidos'); });
  }

  function actualizarPedido(docId, cambios, cb) {
    tRef().collection('pedidos').doc(docId).update(cambios)
      .then(function () { cb(null); })
      .catch(function (e) { cb(e.message); });
  }

  /* ---- Gestión empresa (panel) ---- */
  function guardarEmpresa(empresaId, datos, cb) {
    tRef().collection('empresas').doc(empresaId).set(datos, { merge: true })
      .then(function () { limpiarCache(); cb(null); })
      .catch(function (e) { cb(e.message); });
  }

  function guardarProducto(empresaId, prod, cb) {
    var col = tRef().collection('empresas').doc(empresaId).collection('productos');
    var id = prod.id;
    var data = { nombre: prod.nombre, precio: prod.precio, categoria: prod.categoria, activo: prod.activo !== false };
    var op = id ? col.doc(id).set(data, { merge: true }) : col.add(data);
    op.then(function (ref) { limpiarCache(); cb(null, id || ref.id); })
      .catch(function (e) { cb(e.message); });
  }

  function leerEmpresaFresca(empresaId, cb) {
    var ref = tRef().collection('empresas').doc(empresaId);
    ref.get().then(function (s) {
      if (!s.exists) { cb('La empresa no existe'); return; }
      var emp = s.data(); emp.id = s.id;
      ref.collection('productos').get().then(function (pSnap) {
        var prods = [];
        pSnap.forEach(function (p) { var d = p.data(); d.id = p.id; prods.push(d); });
        cb(null, emp, prods);
      });
    }).catch(function (e) { cb(e.message); });
  }

  function mensajeWhatsApp(pedido, tenant) {
    var lineas = [];
    lineas.push('🛒 *NUEVO PEDIDO* — ' + tenant.nombre);
    lineas.push('Pedido #' + pedido.codigo);
    lineas.push('');
    pedido.items.forEach(function (it) {
      lineas.push('▪ ' + it.cant + ' x ' + it.nombre + ' — ' + formatPesos(it.precio * it.cant));
    });
    lineas.push('');
    lineas.push('💰 *Total: ' + formatPesos(pedido.total) + '*');
    lineas.push('📍 ' + pedido.direccion);
    if (pedido.geo) lineas.push('🗺 https://maps.google.com/?q=' + pedido.geo.lat + ',' + pedido.geo.lng);
    if (pedido.nota) lineas.push('📝 ' + pedido.nota);
    lineas.push('🕐 ' + pedido.fechaTexto);
    return lineas.join('\n');
  }

  function waLink(telefono, texto) {
    return 'https://wa.me/' + String(telefono).replace(/\D/g, '') + '?text=' + encodeURIComponent(texto);
  }

  /* ---- API pública del núcleo ---- */
  return {
    normalizar: normalizar,
    formatPesos: formatPesos,
    distanciaKm: distanciaKm,
    estaAbierta: estaAbierta,
    fechaTextoAhora: fechaTextoAhora,
    initTenant: initTenant,
    limpiarCache: limpiarCache,
    onAuth: onAuth,
    login: login,
    logout: logout,
    perfilUsuario: perfilUsuario,    buscarCategoria: buscarCategoria,
    rankear: rankear,
    codigoPedido: codigoPedido,
    crearPedido: crearPedido,
    misPedidos: misPedidos,
    escucharPedidosEmpresa: escucharPedidosEmpresa,
    actualizarPedido: actualizarPedido,
    guardarEmpresa: guardarEmpresa,
    guardarProducto: guardarProducto,
    leerEmpresaFresca: leerEmpresaFresca,
    mensajeWhatsApp: mensajeWhatsApp,
    waLink: waLink,
    _internos: { tenantIdActual: function () { return tenantId; }, fb: function () { return fb; } }
  };
})();
